import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { UpsetEventData, VaultInfo } from '../../common/types';

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
    let vault = await this.prisma.vaultState.findUnique({
      where: { id: 'vault' },
    });

    if (!vault) {
      vault = await this.prisma.vaultState.create({
        data: {
          id: 'vault',
          balance: 1000,
          totalIn: 1000,
          totalOut: 0,
        },
      });
    }

    return {
      balance: Number(vault.balance),
      totalIn: Number(vault.totalIn),
      totalOut: Number(vault.totalOut),
      updatedAt: vault.updatedAt,
    };
  }

  async addToVault(amount: number): Promise<void> {
    // Ensure vault record exists before atomic increment
    await this.getVaultState();

    const updated = await this.prisma.vaultState.update({
      where: { id: 'vault' },
      data: {
        balance: { increment: amount },
        totalIn: { increment: amount },
      },
    });

    if (this.io) {
      this.io.emit('vault:update', {
        balance: updated.balance,
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
      const multiplier = this.getMultiplier(upsetScore);
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
      this.io.emit('upset:triggered', eventData);
      this.io.emit('vault:update', {
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

  private getMultiplier(upsetScore: number): number {
    if (upsetScore >= 80) return 5;
    if (upsetScore >= 60) return 4;
    if (upsetScore >= 40) return 3;
    if (upsetScore >= 20) return 2;
    return 1;
  }

  async getUpsetEvents() {
    return this.prisma.upsetEvent.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
