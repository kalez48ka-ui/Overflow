import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { Server as SocketServer } from 'socket.io';
import { config } from '../../config';
import { VaultService } from '../vault/vault.service';

const PERFORMANCE_ORACLE_ABI = [
  'function updateScore(string symbol, uint256 score) external',
  'function getScore(string symbol) external view returns (uint256)',
];

export class OracleService {
  private prisma: PrismaClient;
  private io: SocketServer | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private vaultService: VaultService;

  constructor(prisma: PrismaClient, vaultService: VaultService) {
    this.prisma = prisma;
    this.vaultService = vaultService;

    if (config.rpcUrl && config.oraclePrivateKey && config.oraclePrivateKey !== '0x...') {
      try {
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers.Wallet(config.oraclePrivateKey, this.provider);
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

    await this.prisma.team.update({
      where: { id: winner.id },
      data: {
        performanceScore: winnerNewScore,
        wins: winner.wins + 1,
      },
    });

    await this.prisma.team.update({
      where: { id: loser.id },
      data: {
        performanceScore: loserNewScore,
        losses: loser.losses + 1,
      },
    });

    await this.updateOnChainScore(winner.symbol, winnerNewScore);
    await this.updateOnChainScore(loser.symbol, loserNewScore);

    await this.recalculateRankings();

    const upsetScore = this.calculateUpsetScore(winner, loser);
    if (upsetScore >= 20) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          winnerId,
          isUpset: true,
          upsetScore,
        },
      });
      await this.vaultService.processUpsetEvent(matchId, winner.symbol, loser.symbol, upsetScore);
    } else {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { winnerId },
      });
    }

    await this.updateSellTaxes();
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

  private async updateOnChainScore(symbol: string, score: number): Promise<void> {
    if (!this.wallet || !this.provider || !config.factoryAddress || config.factoryAddress === '0x...') {
      console.log(`[OracleService] Offline mode: would update ${symbol} score to ${score}`);
      return;
    }

    try {
      const contract = new ethers.Contract(config.factoryAddress, PERFORMANCE_ORACLE_ABI, this.wallet);
      const tx = await contract.updateScore(symbol, Math.floor(score));
      await tx.wait();
      console.log(`[OracleService] Updated on-chain score for ${symbol}: ${score}`);
    } catch (err) {
      console.error(`[OracleService] Failed to update on-chain score for ${symbol}:`, err);
    }
  }

  private async recalculateRankings(): Promise<void> {
    const teams = await this.prisma.team.findMany({
      orderBy: [
        { wins: 'desc' },
        { nrr: 'desc' },
        { performanceScore: 'desc' },
      ],
    });

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      if (team) {
        await this.prisma.team.update({
          where: { id: team.id },
          data: { ranking: i + 1 },
        });
      }
    }
  }

  private async updateSellTaxes(): Promise<void> {
    const teams = await this.prisma.team.findMany();
    for (const team of teams) {
      const taxMap: Record<number, number> = {
        1: 2, 2: 3, 3: 5, 4: 7, 5: 9, 6: 12,
      };
      const newTax = taxMap[team.ranking] ?? 5;
      if (team.sellTaxRate !== newTax) {
        await this.prisma.team.update({
          where: { id: team.id },
          data: { sellTaxRate: newTax },
        });
      }
    }
  }
}
