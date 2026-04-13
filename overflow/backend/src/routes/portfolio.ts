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
        const value = p.amount * p.team.currentPrice;
        const costBasis = p.amount * p.avgBuyPrice;
        const pnl = value - costBasis;
        const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        return {
          teamSymbol: p.team.symbol,
          teamName: p.team.name,
          amount: p.amount,
          avgBuyPrice: p.avgBuyPrice,
          currentPrice: p.team.currentPrice,
          value,
          pnl,
          pnlPercent,
        };
      });

      const totalValue = portfolio.reduce((sum, p) => sum + p.value, 0);
      const totalPnl = portfolio.reduce((sum, p) => sum + p.pnl, 0);
      const totalCostBasis = portfolio.reduce(
        (sum, p) => sum + p.amount * p.avgBuyPrice,
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
      const days = Math.min(parseInt(String(req.query.days || '30')) || 30, 365);

      // Return portfolio value history as { date, value } array
      // For now, derive from trade history
      const since = new Date();
      since.setDate(since.getDate() - days);

      const trades = await prisma.trade.findMany({
        where: {
          wallet,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          team: {
            select: { symbol: true, name: true, currentPrice: true },
          },
        },
      });

      // Group trades by date and compute a simple cumulative value
      const dateMap = new Map<string, number>();
      let runningValue = 0;

      for (const trade of trades) {
        const dateStr = trade.createdAt.toISOString().split('T')[0]!;
        if (trade.type === 'BUY') {
          runningValue += trade.totalValue;
        } else {
          runningValue -= trade.totalValue;
        }
        dateMap.set(dateStr, Math.max(0, runningValue));
      }

      const history = Array.from(dateMap.entries()).map(([date, value]) => ({
        date,
        value,
      }));

      res.json(history);
    } catch (err) {
      console.error('[Portfolio] GET /:wallet/history error:', err);
      res.status(500).json({ error: 'Failed to fetch portfolio history' });
    }
  });

  return router;
}
