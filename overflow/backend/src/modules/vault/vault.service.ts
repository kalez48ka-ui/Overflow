import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { UpsetEventData, VaultInfo } from '../../common/types';
import { getMultiplier, VAULT_INITIAL_BALANCE } from '../../common/constants';

export class VaultService {
  private prisma: PrismaClient;
  private io: SocketServer | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  setSocket(io: SocketServer): void {
    this.io = io;
  }

  async getVaultState(): Promise<VaultInfo> {
    const vault = await this.prisma.vaultState.upsert({
      where: { id: 'vault' },
      create: {
        id: 'vault',
        balance: VAULT_INITIAL_BALANCE,
        totalIn: VAULT_INITIAL_BALANCE,
        totalOut: 0,
      },
      update: {},
    });

    return {
      balance: Number(vault.balance),
      totalIn: Number(vault.totalIn),
      totalOut: Number(vault.totalOut),
      updatedAt: vault.updatedAt,
    };
  }

  /**
   * Add funds to the vault using upsert to prevent race conditions on first call.
   * Atomically creates the vault record if it doesn't exist, or increments if it does.
   */
  async addToVault(amount: number): Promise<void> {
    const updated = await this.prisma.vaultState.upsert({
      where: { id: 'vault' },
      create: {
        id: 'vault',
        balance: VAULT_INITIAL_BALANCE + amount,
        totalIn: VAULT_INITIAL_BALANCE + amount,
        totalOut: 0,
      },
      update: {
        balance: { increment: amount },
        totalIn: { increment: amount },
      },
    });

    if (this.io) {
      this.io.to('vault:subscribers').emit('vault:update', {
        balance: Number(updated.balance),
        change: amount,
        type: 'deposit',
      });
    }
  }

  async processUpsetEvent(
    matchId: string,
    winnerSymbol: string,
    loserSymbol: string,
    upsetScore: number
  ): Promise<void> {
    // Wrap the entire upset flow in a Serializable transaction to prevent
    // race conditions where two concurrent triggers both read the same vault
    // balance and both decrement, potentially draining below zero.
    const txResult = await this.prisma.$transaction(async (tx) => {
      // 1. Guard: prevent duplicate upset processing for the same match
      const existingUpset = await tx.upsetEvent.findFirst({
        where: { matchId },
      });
      if (existingUpset) {
        console.warn(`[VaultService] Upset already processed for match ${matchId}, skipping`);
        return null;
      }

      // 2. Read vault state within the transaction
      let vault = await tx.vaultState.findUnique({
        where: { id: 'vault' },
      });

      if (!vault) {
        vault = await tx.vaultState.create({
          data: {
            id: 'vault',
            balance: 1000,
            totalIn: 1000,
            totalOut: 0,
          },
        });
      }

      // 3. Compute payout
      const multiplier = getMultiplier(upsetScore);
      const releasePercent = Math.min(50, upsetScore * 0.5 * multiplier);
      let vaultRelease = Number(vault.balance) * (releasePercent / 100);

      // Guard: prevent vault from going negative
      if (vaultRelease > Number(vault.balance)) {
        vaultRelease = Number(vault.balance);
      }
      if (vaultRelease <= 0) {
        console.warn(`[VaultService] Vault release is zero or negative, skipping payout`);
        return null;
      }

      const totalPayout = vaultRelease;

      const winnerTeam = await tx.team.findUnique({
        where: { symbol: winnerSymbol },
      });

      if (!winnerTeam) {
        console.error(`[VaultService] Winner team ${winnerSymbol} not found`);
        return null;
      }

      const holders = await tx.position.findMany({
        where: {
          teamId: winnerTeam.id,
          amount: { gt: 0 },
        },
      });

      const holdersCount = holders.length;
      const totalHeld = holders.reduce((sum, h) => sum + Number(h.amount), 0);

      // 4. Create upset event record
      await tx.upsetEvent.create({
        data: {
          matchId,
          winnerSymbol,
          loserSymbol,
          upsetScore,
          multiplier,
          vaultRelease,
          totalPayout,
          holdersCount,
          perHolderPayout: totalHeld > 0 ? totalPayout / holdersCount : 0,
        },
      });

      // 5. Update vault balance atomically within the serializable transaction
      const updatedVault = await tx.vaultState.update({
        where: { id: 'vault' },
        data: {
          balance: { decrement: vaultRelease },
          totalOut: { increment: vaultRelease },
        },
      });

      // 6. Return data needed for socket emissions (performed outside transaction)
      return {
        holders,
        holdersCount,
        totalHeld,
        totalPayout,
        vaultRelease,
        multiplier,
        updatedVaultBalance: updatedVault.balance,
      };
    }, { isolationLevel: 'Serializable' });

    // Transaction returned null means we skipped (duplicate or zero payout)
    if (!txResult) return;

    const {
      holders,
      holdersCount,
      totalHeld,
      totalPayout,
      vaultRelease,
      multiplier,
      updatedVaultBalance,
    } = txResult;

    // Socket emissions outside the transaction (non-critical, should not block)
    if (this.io) {
      const eventData: UpsetEventData = {
        matchId,
        winnerSymbol,
        loserSymbol,
        upsetScore,
        multiplier,
        vaultRelease,
        totalPayout,
        holdersCount,
        avgHolderPayout: totalHeld > 0 ? totalPayout / holdersCount : 0,
      };
      this.io.to('vault:subscribers').emit('upset:triggered', eventData);
      this.io.to('vault:subscribers').emit('vault:update', {
        balance: updatedVaultBalance,
        change: -vaultRelease,
        type: 'upset_payout',
      });
    }

    console.log(
      `[VaultService] Upset processed: ${winnerSymbol} beat ${loserSymbol}. ` +
      `Score: ${upsetScore}, Payout: ${totalPayout} WIRE to ${holdersCount} holders (proportional)`
    );
  }

  async getUpsetEvents(limit = 50, offset = 0) {
    const events = await this.prisma.upsetEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return events.map((e) => ({
      id: e.id,
      matchId: e.matchId,
      winnerTeam: e.winnerSymbol,
      loserTeam: e.loserSymbol,
      upsetScore: e.upsetScore,
      releasedAmount: Number(e.totalPayout),
      vaultRelease: Number(e.vaultRelease),
      holdersCount: e.holdersCount,
      avgHolderPayout: Number(e.perHolderPayout),
      timestamp: e.createdAt.toISOString(),
    }));
  }
}
