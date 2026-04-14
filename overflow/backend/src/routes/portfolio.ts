import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export function createPortfolioRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/:wallet', async (req: Request, res: Response) => {
    try {
      const wallet = String(req.params.wallet).toLowerCase();
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      const positions = await prisma.position.findMany({
        where: { wallet, amount: { gt: 0 } },
        include: {
          team: {
            select: {
              id: true,
              symbol: true,
              name: true,
              color: true,
              currentPrice: true,
            },
          },
        },
      });

      const portfolio = positions.map((p) => {
        const value = Number(p.amount) * Number(p.team.currentPrice);
        const costBasis = Number(p.amount) * Number(p.avgBuyPrice);
        const pnl = value - costBasis;
        const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        return {
          teamSymbol: p.team.symbol,
          teamName: p.team.name,
          amount: Number(p.amount),
          avgBuyPrice: Number(p.avgBuyPrice),
          currentPrice: Number(p.team.currentPrice),
          value,
          pnl,
          pnlPercent,
        };
      });

      const totalValue = portfolio.reduce((sum, p) => sum + p.value, 0);
      const totalPnl = portfolio.reduce((sum, p) => sum + p.pnl, 0);
      const totalCostBasis = portfolio.reduce(
        (sum, p) => sum + Number(p.amount) * Number(p.avgBuyPrice),
        0
      );
      const totalPnlPercent = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

      res.json({
        wallet,
        positions: portfolio,
        totalValue,
        totalPnl,
        totalPnlPercent,
      });
    } catch (err) {
      console.error('[Portfolio] GET /:wallet error:', err);
      res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
  });

  router.get('/:wallet/history', async (req: Request, res: Response) => {
    try {
      const wallet = String(req.params.wallet).toLowerCase();
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }
      const days = Math.min(Math.max(1, parseInt(String(req.query.days || '30')) || 30), 365);

      // Return portfolio value history as mark-to-market snapshots at each trade.
      // For each trade, we reconstruct what positions the user held, then value
      // all positions at the trade-time price to get a mark-to-market portfolio value.
      const since = new Date();
      since.setDate(since.getDate() - days);

      const trades = await prisma.trade.findMany({
        where: {
          wallet,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'asc' },
        take: 5000,
        include: {
          team: {
            select: { id: true, symbol: true, name: true, currentPrice: true },
          },
        },
      });

      // Running position map: teamId -> { amount, avgCost }
      const positions = new Map<string, { amount: number; avgCost: number }>();
      // Track the price of each team at the time of its most recent trade
      const latestTeamPrice = new Map<string, number>();
      // Running cost basis (total money invested minus money withdrawn)
      let totalCostBasis = 0;

      const history: Array<{ date: string; portfolioValue: number; costBasis: number }> = [];
      // Use a map to keep only the last snapshot per date
      const dateMap = new Map<string, { portfolioValue: number; costBasis: number }>();

      for (const trade of trades) {
        const teamId = trade.team.id;
        const pos = positions.get(teamId) || { amount: 0, avgCost: 0 };

        if (trade.type === 'BUY') {
          // Update weighted average cost
          const totalExisting = pos.amount * pos.avgCost;
          const newTotal = totalExisting + Number(trade.totalValue);
          pos.amount += Number(trade.amount);
          pos.avgCost = pos.amount > 0 ? newTotal / pos.amount : 0;
          totalCostBasis += Number(trade.totalValue);
        } else {
          // SELL — reduce position, reduce cost basis proportionally
          const sellCostBasis = pos.avgCost * Number(trade.amount);
          pos.amount = Math.max(0, pos.amount - Number(trade.amount));
          totalCostBasis = Math.max(0, totalCostBasis - sellCostBasis);
          // avgCost stays the same on sells
        }

        positions.set(teamId, pos);
        // Record the trade-time price for this team (trade.pricePerToken or derive from totalValue/amount)
        const tradePrice = Number(trade.amount) > 0 ? Number(trade.totalValue) / Number(trade.amount) : 0;
        latestTeamPrice.set(teamId, tradePrice);

        // Compute mark-to-market: sum all positions * their last known trade price
        let portfolioValue = 0;
        for (const [tid, p] of positions.entries()) {
          if (p.amount <= 0) continue;
          const price = latestTeamPrice.get(tid) || 0;
          portfolioValue += p.amount * price;
        }

        const dateStr = trade.createdAt.toISOString().split('T')[0]!;
        dateMap.set(dateStr, { portfolioValue, costBasis: totalCostBasis });
      }

      // Add current-day snapshot using live prices for all held positions
      if (positions.size > 0) {
        const teamPriceMap = new Map(
          trades.map(t => [t.team.id, Number(t.team.currentPrice)])
        );

        let currentValue = 0;
        for (const [teamId, pos] of positions.entries()) {
          if (pos.amount <= 0) continue;
          const livePrice = teamPriceMap.get(teamId) || latestTeamPrice.get(teamId) || 0;
          currentValue += pos.amount * livePrice;
        }
        const todayStr = new Date().toISOString().split('T')[0]!;
        dateMap.set(todayStr, { portfolioValue: currentValue, costBasis: totalCostBasis });
      }

      for (const [date, snapshot] of dateMap.entries()) {
        history.push({ date, ...snapshot });
      }

      // Sort by date ascending
      history.sort((a, b) => a.date.localeCompare(b.date));

      res.json(history);
    } catch (err) {
      console.error('[Portfolio] GET /:wallet/history error:', err);
      res.status(500).json({ error: 'Failed to fetch portfolio history' });
    }
  });

  return router;
}
