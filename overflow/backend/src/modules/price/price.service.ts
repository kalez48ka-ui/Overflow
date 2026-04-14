import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { OHLCVCandle, PriceUpdate, Timeframe } from '../../common/types';
import { SELL_TAX_BY_RANK } from '../../common/constants';

const BONDING_CURVE_K = 0.0001;
const BASE_PRICE = 1.0;

export class PriceService {
  private prisma: PrismaClient;
  private io: SocketServer | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  setSocket(io: SocketServer): void {
    this.io = io;
  }

  calculateBondingCurvePrice(supply: number, performanceScore: number): number {
    const performanceMultiplier = 0.5 + (performanceScore / 100);
    return BASE_PRICE + BONDING_CURVE_K * supply * supply * performanceMultiplier;
  }

  calculateSellTax(teamRanking: number): number {
    return SELL_TAX_BY_RANK[teamRanking] ?? 5;
  }

  async updatePriceAfterTrade(
    teamId: string,
    tradeType: 'BUY' | 'SELL',
    amount: number,
    price: number
  ): Promise<void> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return;

    const direction = tradeType === 'BUY' ? 1 : -1;
    const impact = amount * BONDING_CURVE_K * direction;
    const newPrice = Math.max(0.01, Number(team.currentPrice) + impact);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldPricePoint = await this.prisma.pricePoint.findFirst({
      where: {
        teamId,
        timestamp: { lte: twentyFourHoursAgo },
      },
      orderBy: { timestamp: 'desc' },
    });

    const oldPrice = Number(oldPricePoint?.close ?? team.currentPrice);
    const priceChange24h = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

    await this.prisma.team.update({
      where: { id: teamId },
      data: {
        currentPrice: newPrice,
        priceChange24h,
      },
    });

    const now = new Date();
    const candleStart = new Date(now);
    candleStart.setMinutes(0, 0, 0);

    const existingCandle = await this.prisma.pricePoint.findFirst({
      where: {
        teamId,
        timestamp: { gte: candleStart },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (existingCandle) {
      await this.prisma.pricePoint.update({
        where: { id: existingCandle.id },
        data: {
          high: Math.max(Number(existingCandle.high), newPrice),
          low: Math.min(Number(existingCandle.low), newPrice),
          close: newPrice,
          price: newPrice,
          volume: Number(existingCandle.volume) + amount * price,
        },
      });
    } else {
      await this.prisma.pricePoint.create({
        data: {
          teamId,
          price: newPrice,
          open: Number(team.currentPrice),
          high: Math.max(Number(team.currentPrice), newPrice),
          low: Math.min(Number(team.currentPrice), newPrice),
          close: newPrice,
          volume: amount * price,
          timestamp: now,
        },
      });
    }

    if (this.io) {
      const update: PriceUpdate = {
        symbol: team.symbol,
        price: newPrice,
        change24h: priceChange24h,
        timestamp: Date.now(),
      };
      this.io.emit('price:update', update);
    }
  }

  async getPriceHistory(teamId: string, timeframe: Timeframe): Promise<OHLCVCandle[]> {
    const now = new Date();
    let since: Date;

    switch (timeframe) {
      case '1h':
        since = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const points = await this.prisma.pricePoint.findMany({
      where: {
        teamId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
    });

    return points.map((p) => ({
      open: Number(p.open),
      high: Number(p.high),
      low: Number(p.low),
      close: Number(p.close),
      volume: Number(p.volume),
      timestamp: p.timestamp,
    }));
  }

  async emitAllPrices(): Promise<void> {
    if (!this.io) return;

    const teams = await this.prisma.team.findMany();
    for (const team of teams) {
      const update: PriceUpdate = {
        symbol: team.symbol,
        price: Number(team.currentPrice),
        change24h: Number(team.priceChange24h),
        timestamp: Date.now(),
      };
      this.io.emit('price:update', update);
    }
  }
}
