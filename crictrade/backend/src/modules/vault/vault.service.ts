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
      balance: vault.balance,
      totalIn: vault.totalIn,
      totalOut: vault.totalOut,
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
    const vault = await this.getVaultState();

    const multiplier = this.getMultiplier(upsetScore);
    const releasePercent = Math.min(50, upsetScore * 0.5 * multiplier);
    const vaultRelease = vault.balance * (releasePercent / 100);
    const totalPayout = vaultRelease;

    const winnerTeam = await this.prisma.team.findUnique({
      where: { symbol: winnerSymbol },
    });

    if (!winnerTeam) {
      console.error(`[VaultService] Winner team ${winnerSymbol} not found`);
      return;
    }

    const holders = await this.prisma.position.findMany({
      where: {
        teamId: winnerTeam.id,
        amount: { gt: 0 },
      },
    });

    const holdersCount = holders.length;
    const perHolderPayout = holdersCount > 0 ? totalPayout / holdersCount : 0;

    const upsetEvent = await this.prisma.upsetEvent.create({
      data: {
        matchId,
        winnerSymbol,
        loserSymbol,
        upsetScore,
        multiplier,
        vaultRelease,
        totalPayout,
        holdersCount,
        perHolderPayout,
      },
    });

    await this.prisma.vaultState.update({
      where: { id: 'vault' },
      data: {
        balance: vault.balance - vaultRelease,
        totalOut: vault.totalOut + vaultRelease,
      },
    });

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
        perHolderPayout,
      };
      this.io.emit('upset:triggered', eventData);
      this.io.emit('vault:update', {
        balance: vault.balance - vaultRelease,
        change: -vaultRelease,
        type: 'upset_payout',
      });
    }

    console.log(
      `[VaultService] Upset processed: ${winnerSymbol} beat ${loserSymbol}. ` +
      `Score: ${upsetScore}, Payout: ${totalPayout} WIRE to ${holdersCount} holders`
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
