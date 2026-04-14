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
    wallet = wallet.toLowerCase();

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

      const now = new Date();
      if (now >= fanWar.lockDeadline) {
        // Auto-transition to LOCKED when someone tries to lock after deadline
        await tx.fanWar.update({
          where: { id: fanWar.id },
          data: { status: 'LOCKED' },
        });
        throw new Error('Lock window has closed — fan war is now locked');
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

      // Verify wallet holds enough tokens to lock
      const position = await tx.position.findUnique({
        where: { wallet_teamId: { wallet, teamId } },
      });

      if (!position || Number(position.amount) < amount) {
        throw new Error('Insufficient token balance to lock');
      }

      // Deduct locked tokens from position
      await tx.position.update({
        where: { id: position.id },
        data: { amount: { decrement: amount } },
      });

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
      this.io.emit('fanwar:lock', {
        matchId,
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
      amount: Number(result.amount),
      boostReward: result.boostReward != null ? Number(result.boostReward) : null,
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

    // Transition through LOCKED state before settling (if still OPEN)
    if (fanWar.status === 'OPEN') {
      await this.prisma.fanWar.update({
        where: { id: fanWar.id },
        data: { status: 'LOCKED' },
      });
      console.log(`[FanWars] Transitioned fan war for match ${matchId} from OPEN to LOCKED`);
    }

    // Determine boost split percentages
    const splits = this.getBoostSplits(marginType);
    const boostPool = fanWar.boostPool;

    const winnerShare = Number(boostPool) * splits.winner;
    const loserShare = Number(boostPool) * splits.loser;
    // rollover = boostPool * splits.rollover (stays in platform)

    const isHomeWinner = winnerTeamId === fanWar.homeTeamId;
    const totalWinnerLocked = Number(isHomeWinner ? fanWar.totalHomeLocked : fanWar.totalAwayLocked);
    const totalLoserLocked = Number(isHomeWinner ? fanWar.totalAwayLocked : fanWar.totalHomeLocked);

    // Calculate per-user boost rewards
    const lockUpdates: Array<{ id: string; boostReward: number }> = [];

    for (const lock of fanWar.locks) {
      let reward = 0;
      const isWinnerSide = lock.teamId === winnerTeamId;

      if (isWinnerSide && totalWinnerLocked > 0) {
        reward = (Number(lock.amount) / totalWinnerLocked) * winnerShare;
      } else if (!isWinnerSide && totalLoserLocked > 0) {
        reward = (Number(lock.amount) / totalLoserLocked) * loserShare;
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
      this.io.emit('fanwar:settle', {
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
    wallet = wallet.toLowerCase();

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

    const boostReward = lock.boostReward ?? 0;
    const tokensReturned = lock.amount;

    // Return locked tokens to the user's position and mark as claimed
    await this.prisma.$transaction(async (tx) => {
      await tx.fanWarLock.update({
        where: { id: lock.id },
        data: {
          claimed: true,
          claimedAt: new Date(),
        },
      });

      // Return locked tokens back to the user's position
      const position = await tx.position.findUnique({
        where: { wallet_teamId: { wallet, teamId: lock.teamId } },
      });

      if (position) {
        await tx.position.update({
          where: { id: position.id },
          data: { amount: { increment: tokensReturned } },
        });
      } else {
        // Position was deleted (e.g. sold everything before locking was enforced)
        // Recreate it with the returned tokens
        await tx.position.create({
          data: {
            wallet,
            teamId: lock.teamId,
            amount: tokensReturned,
            avgBuyPrice: 0,
          },
        });
      }
    });

    if (this.io) {
      this.io.emit('fanwar:claim', {
        matchId,
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

    return { boostReward: Number(boostReward), tokensReturned: Number(tokensReturned) };
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
      totalHomeLocked: Number(fanWar.totalHomeLocked),
      totalAwayLocked: Number(fanWar.totalAwayLocked),
      boostPool: Number(fanWar.boostPool),
      status: fanWar.status,
      winnerTeamId: fanWar.winnerTeamId,
      marginType: fanWar.marginType,
      homeBoostShare: fanWar.homeBoostShare,
      awayBoostShare: fanWar.awayBoostShare,
      lockDeadline: fanWar.lockDeadline,
      settledAt: fanWar.settledAt,
      locks: fanWar.locks.map((l) => ({
        id: l.id,
        wallet: l.wallet.slice(0, 6) + '...' + l.wallet.slice(-4),
        teamId: l.teamId,
        amount: Number(l.amount),
        boostReward: l.boostReward != null ? Number(l.boostReward) : null,
        claimed: l.claimed,
        createdAt: l.createdAt,
      })),
    };
  }

  /**
   * Get all locks for a specific wallet across all fan wars.
   */
  async getUserLocks(wallet: string): Promise<FanWarLockInfo[]> {
    wallet = wallet.toLowerCase();

    const locks = await this.prisma.fanWarLock.findMany({
      where: { wallet },
      orderBy: { createdAt: 'desc' },
    });

    return locks.map((l) => ({
      id: l.id,
      wallet: l.wallet,
      teamId: l.teamId,
      amount: Number(l.amount),
      boostReward: l.boostReward != null ? Number(l.boostReward) : null,
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
      totalLocked: Number(entry._sum.amount ?? 0),
      totalBoost: Number(entry._sum.boostReward ?? 0),
      warCount: entry._count.id,
    }));
  }

  /**
   * Get all active (OPEN or LOCKED) fan wars with match details.
   * Auto-transitions OPEN wars past their lockDeadline to LOCKED status.
   * Returns wars grouped: OPEN ones are lockable, LOCKED ones are awaiting settlement.
   */
  async getActiveFanWars() {
    const wars = await this.prisma.fanWar.findMany({
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

    // Auto-transition any OPEN wars whose lock deadline has passed
    const now = new Date();
    for (const war of wars) {
      if (war.status === 'OPEN' && now >= war.lockDeadline) {
        await this.prisma.fanWar.update({
          where: { id: war.id },
          data: { status: 'LOCKED' },
        });
        (war as { status: string }).status = 'LOCKED';
        console.log(`[FanWars] Auto-locked fan war ${war.id} (deadline passed)`);
      }
    }

    return wars;
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
