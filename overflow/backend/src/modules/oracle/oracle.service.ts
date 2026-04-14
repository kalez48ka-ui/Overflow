import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { Server as SocketServer } from 'socket.io';
import { config } from '../../config';
import { VaultService } from '../vault/vault.service';
import { FanWarsService } from '../fanwars/fanwars.service';
import { MarginType } from '../../common/types';
import { SELL_TAX_BY_RANK } from '../../common/constants';

/**
 * ABI matching the deployed PerformanceOracle.sol contract.
 *
 * updateMatchResult: proposes (or confirms) a performance update for a team token.
 *   Requires 2-of-3 oracle confirmations before the update is finalized on-chain.
 *   A single backend wallet can only PROPOSE — a second oracle must confirm before
 *   the composite score actually changes.
 *
 * getPerformanceScore: reads the current composite score for a team token address.
 */
const PERFORMANCE_ORACLE_ABI = [
  'function updateMatchResult(address teamToken, uint256 pointsTableScore, uint256 nrrScore, uint256 formScore, uint256 availabilityScore) external',
  'function getPerformanceScore(address teamToken) external view returns (uint256)',
];

/**
 * Deployed team token addresses on WireFluid testnet.
 * Maps backend 2-letter symbol → on-chain ERC-20 token address.
 */
const TEAM_TOKEN_ADDRESSES: Record<string, string> = {
  IU: '0x1c8a5A026A4F5CBf7BC4fdE2898d78628A199f1e',
  LQ: '0x66419e794d379E707bc83fd7214cc61F11568e4b',
  MS: '0x9AF925e33F380eEC57111Da8ED13713afD0953D8',
  KK: '0x6D36f154e3b3232a63A6aC1800f02bA233004490',
  PZ: '0x5f9B45874872796c4b2c8C09ECa7883505CB36A8',
  QG: '0xC9BC62531E5914ba2865FB4B5537B7f84AcE1713',
  HK: '0x96fC2D2B5b6749cD67158215C3Ad05C81502386A',
  RW: '0xC137B2221E8411F059a5f4E0158161402693757E',
};

export class OracleService {
  private prisma: PrismaClient;
  private io: SocketServer | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private vaultService: VaultService;
  private fanWarsService: FanWarsService;

  constructor(prisma: PrismaClient, vaultService: VaultService, fanWarsService: FanWarsService) {
    this.prisma = prisma;
    this.vaultService = vaultService;
    this.fanWarsService = fanWarsService;

    // Read private key directly from env to avoid leaking it through the shared config object
    const oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY || '';

    if (config.rpcUrl && oraclePrivateKey && oraclePrivateKey !== '0x...') {
      try {
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers.Wallet(oraclePrivateKey, this.provider);
        console.log('[OracleService] Connected to RPC:', config.rpcUrl);
      } catch (err) {
        console.warn('[OracleService] Failed to connect to RPC, running in offline mode');
      }
    } else {
      console.log('[OracleService] No RPC configured, running in offline mode');
    }
  }

  setSocket(io: SocketServer): void {
    this.io = io;
  }

  async processMatchResult(matchId: string, winnerId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match) {
      console.error(`[OracleService] Match ${matchId} not found`);
      return;
    }

    const winner = winnerId === match.homeTeamId ? match.homeTeam : match.awayTeam;
    const loser = winnerId === match.homeTeamId ? match.awayTeam : match.homeTeam;

    const winnerNewScore = Math.min(100, winner.performanceScore + 8);
    const loserNewScore = Math.max(0, loser.performanceScore - 5);

    await Promise.all([
      this.prisma.team.update({
        where: { id: winner.id },
        data: {
          performanceScore: winnerNewScore,
          wins: winner.wins + 1,
        },
      }),
      this.prisma.team.update({
        where: { id: loser.id },
        data: {
          performanceScore: loserNewScore,
          losses: loser.losses + 1,
        },
      }),
    ]);

    await this.updateOnChainScore(winner.symbol, winnerNewScore);
    await this.updateOnChainScore(loser.symbol, loserNewScore);

    await this.recalculateRankings();

    const upsetScore = this.calculateUpsetScore(winner, loser);
    if (upsetScore >= 20) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          winnerId,
          status: 'COMPLETED',
          endTime: new Date(),
          isUpset: true,
          upsetScore,
        },
      });
      await this.vaultService.processUpsetEvent(matchId, winner.symbol, loser.symbol, upsetScore);
    } else {
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          winnerId,
          status: 'COMPLETED',
          endTime: new Date(),
        },
      });
    }

    await this.updateSellTaxes();

    // Auto-settle the corresponding fan war if one exists
    try {
      const marginType = this.deriveMarginType(winner, loser);
      await this.fanWarsService.settleMatch(matchId, winnerId, marginType);
    } catch (fwErr) {
      console.error(`[OracleService] Failed to auto-settle fan war for match ${matchId}:`, fwErr);
    }
  }

  /**
   * Derive margin type from score differential between winner and loser.
   * CLOSE: ranking difference <= 1
   * DOMINANT: ranking difference >= 4
   * NORMAL: everything in between
   */
  private deriveMarginType(
    winner: { ranking: number; performanceScore: number },
    loser: { ranking: number; performanceScore: number }
  ): MarginType {
    const scoreDiff = Math.abs(winner.performanceScore - loser.performanceScore);
    if (scoreDiff <= 5) return 'CLOSE';
    if (scoreDiff >= 20) return 'DOMINANT';
    return 'NORMAL';
  }

  private calculateUpsetScore(
    winner: { ranking: number; performanceScore: number },
    loser: { ranking: number; performanceScore: number }
  ): number {
    const rankDiff = winner.ranking - loser.ranking;
    const scoreDiff = loser.performanceScore - winner.performanceScore;

    if (rankDiff <= 0) return 0;

    return Math.max(0, Math.floor(rankDiff * 10 + scoreDiff * 0.5));
  }

  /**
   * Propose a performance update on the PerformanceOracle contract.
   *
   * The on-chain contract requires 2-of-3 oracle confirmations. This backend wallet
   * acts as one oracle and can only PROPOSE the update. A second oracle must call
   * updateMatchResult with identical scores before the composite score is finalized.
   *
   * The aggregate score is decomposed into four sub-scores (pointsTable, nrr, form,
   * availability) by distributing equally, since the backend tracks a single composite.
   * The on-chain contract weights them 40/20/20/20 to recompute the composite.
   */
  private async updateOnChainScore(symbol: string, score: number): Promise<void> {
    if (!this.wallet || !this.provider || !config.oracleAddress || config.oracleAddress === '0x...') {
      console.log(`[OracleService] Offline mode: would update ${symbol} score to ${score}`);
      return;
    }

    const teamTokenAddress = TEAM_TOKEN_ADDRESSES[symbol];
    if (!teamTokenAddress) {
      console.error(`[OracleService] No token address found for symbol ${symbol}`);
      return;
    }

    try {
      const contract = new ethers.Contract(config.oracleAddress, PERFORMANCE_ORACLE_ABI, this.wallet);

      // Decompose single aggregate score into sub-scores.
      // The on-chain composite formula is: (pts*40 + nrr*20 + form*20 + avail*20) / 100
      // Setting all four sub-scores equal to the aggregate preserves the composite value:
      //   (score*40 + score*20 + score*20 + score*20) / 100 = score
      const clampedScore = Math.max(0, Math.min(100, Math.floor(score)));

      const tx = await contract.updateMatchResult(
        teamTokenAddress,
        clampedScore, // pointsTableScore
        clampedScore, // nrrScore
        clampedScore, // formScore
        clampedScore, // availabilityScore
      );
      await tx.wait();
      console.log(
        `[OracleService] Proposed on-chain score update for ${symbol} (${teamTokenAddress}): ${clampedScore}. ` +
        `Awaiting second oracle confirmation before finalization.`
      );
    } catch (err) {
      console.error(`[OracleService] Failed to propose on-chain score for ${symbol}:`, err);
    }
  }

  async recalculateRankings(): Promise<void> {
    const teams = await this.prisma.team.findMany({
      orderBy: [
        { wins: 'desc' },
        { nrr: 'desc' },
        { performanceScore: 'desc' },
      ],
    });

    // All ranking updates target independent rows — parallelize them
    await Promise.all(
      teams.map((team, i) =>
        this.prisma.team.update({
          where: { id: team.id },
          data: { ranking: i + 1 },
        })
      )
    );
  }

  private async updateSellTaxes(): Promise<void> {
    const teams = await this.prisma.team.findMany();
    const updates = teams
      .filter((team) => {
        const newTax = SELL_TAX_BY_RANK[team.ranking] ?? 5;
        return team.sellTaxRate !== newTax;
      })
      .map((team) =>
        this.prisma.team.update({
          where: { id: team.id },
          data: { sellTaxRate: SELL_TAX_BY_RANK[team.ranking] ?? 5 },
        })
      );

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  }
}
