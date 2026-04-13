import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import {
  FanWarStatus,
  FanWarLockInfo,
  FanWarClaimResult,
  LeaderboardEntry,
  MarginType,
} from '../../common/types';

export class FanWarsService {
  private prisma: PrismaClient;
  private io: SocketServer | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  setSocket(io: SocketServer): void {
    this.io = io;
  }

  /**
   * Create a Fan War entry when a match is detected/created.
   * lockDeadline is set to 1 hour before the match startTime.
   */
  async createFanWar(matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      console.error(`[FanWars] Match ${matchId} not found, skipping fan war creation`);
      return;
    }

    // Skip if a fan war already exists for this match
    const existing = await this.prisma.fanWar.findUnique({
      where: { matchId },
    });

    if (existing) {
      return;
    }

    const lockDeadline = new Date(match.startTime.getTime() - 60 * 60 * 1000);

    await this.prisma.fanWar.create({
      data: {
        matchId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        lockDeadline,
        status: 'OPEN',
      },
    });

    console.log(`[FanWars] Created fan war for match ${matchId}`);
  }

  /**
   * Lock tokens for a team in a match fan war.
   * One lock per wallet per fan war. Must pick one team.
   */
  async lockTokens(
    matchId: string,
    wallet: string,
    teamId: string,
    amount: number
  ): Promise<FanWarLockInfo> {
    if (amount <= 0) {
      throw new Error('Lock amount must be positive');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const fanWar = await tx.fanWar.findUnique({
        where: { matchId },
      });

      if (!fanWar) {
        throw new Error(`No fan war found for match ${matchId}`);
      }

      if (fanWar.status !== 'OPEN') {
        throw new Error(`Fan war is ${fanWar.status}, not accepting locks`);
      }

      if (new Date() >= fanWar.lockDeadline) {
        throw new Error('Lock deadline has passed');
      }

      if (teamId !== fanWar.homeTeamId && teamId !== fanWar.awayTeamId) {
        throw new Error('Invalid team selection — must be home or away team');
      }

      // Check for existing lock (one per wallet per fan war)
      const existingLock = await tx.fanWarLock.findUnique({
        where: { fanWarId_wallet: { fanWarId: fanWar.id, wallet } },
      });

      if (existingLock) {
        throw new Error('You have already locked tokens for this fan war');
      }

      // Create the lock
      const lock = await tx.fanWarLock.create({
        data: {
          fanWarId: fanWar.id,
          wallet,
          teamId,
          amount,
        },
      });

      // Update fan war totals
      const isHome = teamId === fanWar.homeTeamId;
      await tx.fanWar.update({
        where: { id: fanWar.id },
        data: {
          totalHomeLocked: isHome ? { increment: amount } : undefined,
          totalAwayLocked: !isHome ? { increment: amount } : undefined,
          boostPool: { increment: amount * 0.05 }, // 5% of each lock goes to boost pool
        },
      });

      return lock;
    });

    // Emit socket event outside the transaction
    if (this.io) {
      this.io.emit(`fanwar:${matchId}`, {
        type: 'lock',
        wallet: wallet.slice(0, 6) + '...' + wallet.slice(-4),
        teamId,
        amount,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      id: result.id,
      wallet: result.wallet,
      teamId: result.teamId,
      amount: result.amount,
      boostReward: result.boostReward,
      claimed: result.claimed,
      createdAt: result.createdAt,
    };
  }

  /**
   * Settle a fan war after match result is determined.
   * Distributes boost pool based on margin type:
   *   CLOSE:    55% winner, 35% loser, 10% rollover
   *   NORMAL:   60% winner, 30% loser, 10% rollover
   *   DOMINANT: 65% winner, 25% loser, 10% rollover
   * Per-user boost = (userLocked / totalTeamLocked) * teamBoostShare
   */
  async settleMatch(
    matchId: string,
    winnerTeamId: string,
    marginType: MarginType
  ): Promise<void> {
    const fanWar = await this.prisma.fanWar.findUnique({
      where: { matchId },
      include: { locks: true },
    });

    if (!fanWar) {
      console.warn(`[FanWars] No fan war found for match ${matchId}, skipping settlement`);
      return;
    }

    if (fanWar.status === 'SETTLED') {
      console.warn(`[FanWars] Fan war for match ${matchId} already settled, skipping`);
      return;
    }

    // Determine boost split percentages
    const splits = this.getBoostSplits(marginType);
    const boostPool = fanWar.boostPool;

    const winnerShare = boostPool * splits.winner;
    const loserShare = boostPool * splits.loser;
    // rollover = boostPool * splits.rollover (stays in platform)

    const isHomeWinner = winnerTeamId === fanWar.homeTeamId;
    const totalWinnerLocked = isHomeWinner ? fanWar.totalHomeLocked : fanWar.totalAwayLocked;
    const totalLoserLocked = isHomeWinner ? fanWar.totalAwayLocked : fanWar.totalHomeLocked;

    // Calculate per-user boost rewards
    const lockUpdates: Array<{ id: string; boostReward: number }> = [];

    for (const lock of fanWar.locks) {
      let reward = 0;
      const isWinnerSide = lock.teamId === winnerTeamId;

      if (isWinnerSide && totalWinnerLocked > 0) {
        reward = (lock.amount / totalWinnerLocked) * winnerShare;
      } else if (!isWinnerSide && totalLoserLocked > 0) {
        reward = (lock.amount / totalLoserLocked) * loserShare;
      }

      lockUpdates.push({ id: lock.id, boostReward: reward });
    }

    // Batch update in a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const update of lockUpdates) {
        await tx.fanWarLock.update({
          where: { id: update.id },
          data: { boostReward: update.boostReward },
        });
      }

      await tx.fanWar.update({
        where: { id: fanWar.id },
        data: {
          status: 'SETTLED',
          winnerTeamId,
          marginType,
          homeBoostShare: isHomeWinner ? winnerShare : loserShare,
          awayBoostShare: isHomeWinner ? loserShare : winnerShare,
          settledAt: new Date(),
        },
      });
    });

    console.log(
      `[FanWars] Settled fan war for match ${matchId}. ` +
      `Winner: ${winnerTeamId}, Margin: ${marginType}, Pool: ${boostPool}`
    );

    if (this.io) {
      this.io.emit('fanwar:settled', {
        matchId,
        winnerTeamId,
        marginType,
        boostPool,
        winnerShare,
        loserShare,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Claim boost rewards for a wallet in a settled fan war.
   * Returns locked tokens + boost reward.
   */
  async claimBoost(matchId: string, wallet: string): Promise<FanWarClaimResult> {
    const fanWar = await this.prisma.fanWar.findUnique({
      where: { matchId },
    });

    if (!fanWar) {
      throw new Error(`No fan war found for match ${matchId}`);
    }

    if (fanWar.status !== 'SETTLED') {
      throw new Error(`Fan war is ${fanWar.status}, cannot claim yet`);
    }

    const lock = await this.prisma.fanWarLock.findUnique({
      where: { fanWarId_wallet: { fanWarId: fanWar.id, wallet } },
    });

    if (!lock) {
      throw new Error('No lock found for this wallet in this fan war');
    }

    if (lock.claimed) {
      throw new Error('Boost already claimed');
    }

    await this.prisma.fanWarLock.update({
      where: { id: lock.id },
      data: {
        claimed: true,
        claimedAt: new Date(),
      },
    });

    const boostReward = lock.boostReward ?? 0;
    const tokensReturned = lock.amount;

    if (this.io) {
      this.io.emit(`fanwar:${matchId}`, {
        type: 'claim',
        wallet: wallet.slice(0, 6) + '...' + wallet.slice(-4),
        boostReward,
        tokensReturned,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[FanWars] Claim processed: wallet ${wallet.slice(0, 6)}... ` +
      `boost=${boostReward.toFixed(2)}, returned=${tokensReturned}`
    );

    return { boostReward, tokensReturned };
  }

  /**
   * Get full status for a fan war by matchId.
   */
  async getStatus(matchId: string): Promise<FanWarStatus> {
    const fanWar = await this.prisma.fanWar.findUnique({
      where: { matchId },
      include: { locks: { orderBy: { createdAt: 'desc' } } },
    });

    if (!fanWar) {
      throw new Error(`No fan war found for match ${matchId}`);
    }

    return {
      id: fanWar.id,
      matchId: fanWar.matchId,
      homeTeamId: fanWar.homeTeamId,
      awayTeamId: fanWar.awayTeamId,
      totalHomeLocked: fanWar.totalHomeLocked,
      totalAwayLocked: fanWar.totalAwayLocked,
      boostPool: fanWar.boostPool,
      status: fanWar.status,
      winnerTeamId: fanWar.winnerTeamId,
      marginType: fanWar.marginType,
      homeBoostShare: fanWar.homeBoostShare,
      awayBoostShare: fanWar.awayBoostShare,
      lockDeadline: fanWar.lockDeadline,
      settledAt: fanWar.settledAt,
      locks: fanWar.locks.map((l) => ({
        id: l.id,
        wallet: l.wallet,
        teamId: l.teamId,
        amount: l.amount,
        boostReward: l.boostReward,
        claimed: l.claimed,
        createdAt: l.createdAt,
      })),
    };
  }

  /**
   * Get all locks for a specific wallet across all fan wars.
   */
  async getUserLocks(wallet: string): Promise<FanWarLockInfo[]> {
    const locks = await this.prisma.fanWarLock.findMany({
      where: { wallet },
      orderBy: { createdAt: 'desc' },
    });

    return locks.map((l) => ({
      id: l.id,
      wallet: l.wallet,
      teamId: l.teamId,
      amount: l.amount,
      boostReward: l.boostReward,
      claimed: l.claimed,
      createdAt: l.createdAt,
    }));
  }

  /**
   * Get aggregated leaderboard: top participants by total locked and total boost earned.
   */
  async getLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
    const aggregated = await this.prisma.fanWarLock.groupBy({
      by: ['wallet'],
      _sum: {
        amount: true,
        boostReward: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: limit,
    });

    return aggregated.map((entry) => ({
      wallet: entry.wallet,
      totalLocked: entry._sum.amount ?? 0,
      totalBoost: entry._sum.boostReward ?? 0,
      warCount: entry._count.id,
    }));
  }

  /**
   * Get all active (OPEN or LOCKED) fan wars with match details.
   */
  async getActiveFanWars() {
    return this.prisma.fanWar.findMany({
      where: {
        status: { in: ['OPEN', 'LOCKED'] },
      },
      include: {
        match: {
          include: {
            homeTeam: { select: { id: true, name: true, symbol: true, color: true } },
            awayTeam: { select: { id: true, name: true, symbol: true, color: true } },
          },
        },
      },
      orderBy: { lockDeadline: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private getBoostSplits(marginType: MarginType): {
    winner: number;
    loser: number;
    rollover: number;
  } {
    switch (marginType) {
      case 'CLOSE':
        return { winner: 0.55, loser: 0.35, rollover: 0.10 };
      case 'NORMAL':
        return { winner: 0.60, loser: 0.30, rollover: 0.10 };
      case 'DOMINANT':
        return { winner: 0.65, loser: 0.25, rollover: 0.10 };
      default:
        return { winner: 0.60, loser: 0.30, rollover: 0.10 };
    }
  }
}
