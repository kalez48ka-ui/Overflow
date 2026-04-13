import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  totalPnl: number;
  tradeCount: number;
  totalVolume: number;
  favoriteTeam: string;
  winRate: number;
}

export function createLeaderboardRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '50')) || 50, 100);
      const sort = String(req.query.sort || 'pnl');

      // Fetch recent trades with team data (bounded to prevent loading entire table)
      const maxTrades = 10000;
      const trades = await prisma.trade.findMany({
        include: {
          team: { select: { symbol: true, currentPrice: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: maxTrades,
      });

      // Aggregate per wallet
      const walletMap = new Map<
        string,
        {
          totalPnl: number;
          tradeCount: number;
          totalVolume: number;
          teamCounts: Map<string, number>;
          wins: number;
        }
      >();

      // Group trades by wallet to compute P&L from buy/sell pairs
      for (const trade of trades) {
        const entry = walletMap.get(trade.wallet) || {
          totalPnl: 0,
          tradeCount: 0,
          totalVolume: 0,
          teamCounts: new Map<string, number>(),
          wins: 0,
        };

        entry.tradeCount += 1;
        entry.totalVolume += trade.totalValue;

        const symbol = trade.team?.symbol || 'UNKNOWN';
        entry.teamCounts.set(symbol, (entry.teamCounts.get(symbol) || 0) + 1);

        // For SELL trades, calculate realized P&L:
        // The fee is already deducted, so P&L = totalValue - fee (net proceeds) vs cost basis
        // Since we track avgBuyPrice on Position, use a simpler approach:
        // SELL P&L contribution = (sellPrice - avgBuyPrice) * amount - fee
        // For BUY trades, no realized P&L yet
        if (trade.type === 'SELL') {
          // Approximate: the trade was profitable if net proceeds > 0 after fee
          // We count it as a "win" if the trade price is higher than the average buy price
          // For aggregate P&L we use (totalValue - fee) as a contribution metric
          entry.totalPnl += trade.totalValue - trade.fee;
          entry.wins += 1; // We'll refine below
        } else {
          // BUY: subtract cost from P&L (will be offset by SELL proceeds)
          entry.totalPnl -= trade.totalValue;
        }

        walletMap.set(trade.wallet, entry);
      }

      // Add unrealized P&L from current positions
      const positions = await prisma.position.findMany({
        where: { amount: { gt: 0 } },
        include: { team: { select: { symbol: true, currentPrice: true } } },
      });

      for (const pos of positions) {
        const entry = walletMap.get(pos.wallet);
        if (entry) {
          // Unrealized P&L: (currentPrice - avgBuyPrice) * amount
          const unrealized = (pos.team.currentPrice - pos.avgBuyPrice) * pos.amount;
          entry.totalPnl += unrealized;
        }
      }

      // Compute win rate properly: for each wallet, count sell trades where price > avgBuyPrice
      // Re-scan sell trades with position context
      const sellTrades = trades.filter((t) => t.type === 'SELL');
      const positionMap = new Map<string, Map<string, number>>();

      // Build a map of wallet -> teamId -> avgBuyPrice from buy trades
      const buyTrades = trades.filter((t) => t.type === 'BUY');
      for (const bt of buyTrades) {
        if (!positionMap.has(bt.wallet)) positionMap.set(bt.wallet, new Map());
        const teamAvg = positionMap.get(bt.wallet)!;
        // Use the trade price as proxy for avg buy price
        if (!teamAvg.has(bt.teamId)) {
          teamAvg.set(bt.teamId, bt.price);
        }
      }

      // Recalculate wins per wallet
      for (const [wallet, entry] of walletMap) {
        const walletSells = sellTrades.filter((t) => t.wallet === wallet);
        let wins = 0;
        for (const st of walletSells) {
          const avgBuy = positionMap.get(wallet)?.get(st.teamId);
          if (avgBuy && st.price > avgBuy) {
            wins += 1;
          }
        }
        entry.wins = wins;
      }

      // Build leaderboard entries
      const entries: LeaderboardEntry[] = [];
      for (const [wallet, data] of walletMap) {
        const sellCount = sellTrades.filter((t) => t.wallet === wallet).length;
        const winRate = sellCount > 0 ? (data.wins / sellCount) * 100 : 0;

        // Find favorite team (most traded)
        let favoriteTeam = '';
        let maxCount = 0;
        for (const [symbol, count] of data.teamCounts) {
          if (count > maxCount) {
            maxCount = count;
            favoriteTeam = symbol;
          }
        }

        entries.push({
          rank: 0,
          wallet,
          totalPnl: Math.round(data.totalPnl * 100) / 100,
          tradeCount: data.tradeCount,
          totalVolume: Math.round(data.totalVolume * 100) / 100,
          favoriteTeam,
          winRate: Math.round(winRate * 10) / 10,
        });
      }

      // Sort
      switch (sort) {
        case 'volume':
          entries.sort((a, b) => b.totalVolume - a.totalVolume);
          break;
        case 'trades':
          entries.sort((a, b) => b.tradeCount - a.tradeCount);
          break;
        case 'pnl':
        default:
          entries.sort((a, b) => b.totalPnl - a.totalPnl);
          break;
      }

      // Assign ranks and limit
      const limited = entries.slice(0, limit).map((e, i) => ({
        ...e,
        rank: i + 1,
      }));

      res.json(limited);
    } catch (err) {
      console.error('[Leaderboard] GET / error:', err);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  return router;
}
