import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { PriceService } from '../modules/price/price.service';
import { VaultService } from '../modules/vault/vault.service';

/**
 * Maps a Prisma trade record (with included team relation) to the frontend
 * TradeRecord shape: { id, wallet, teamSymbol, side, amount, price, total, txHash, timestamp }
 */
function mapTradeToFrontend(trade: any) {
  const teamSymbol = trade.team?.symbol ?? trade.teamSymbol ?? '';
  return {
    id: trade.id,
    wallet: trade.wallet,
    teamSymbol,
    side: (trade.type as string).toLowerCase() as 'buy' | 'sell',
    amount: trade.amount,
    price: trade.price,
    total: trade.totalValue,
    txHash: trade.txHash ?? '',
    timestamp: trade.createdAt?.toISOString?.() ?? trade.createdAt,
  };
}

export function createTradesRouter(
  prisma: PrismaClient,
  priceService: PriceService,
  vaultService: VaultService,
  io: SocketServer
): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const body = req.body;

      // Accept both frontend `side` (lowercase) and backend `type` (uppercase)
      let type: string | undefined = body.type;
      if (!type && body.side) {
        type = (body.side as string).toUpperCase();
      }

      const { teamSymbol, wallet, amount, price, txHash } = body;

      if (!teamSymbol || !wallet || !type || !amount || !price) {
        res.status(400).json({
          error: 'Missing required fields: teamSymbol, wallet, side/type, amount, price',
        });
        return;
      }

      if (type !== 'BUY' && type !== 'SELL') {
        res.status(400).json({ error: 'side must be buy or sell (or type must be BUY or SELL)' });
        return;
      }

      if (amount <= 0 || price <= 0) {
        res.status(400).json({ error: 'amount and price must be positive' });
        return;
      }

      const team = await prisma.team.findUnique({
        where: { symbol: teamSymbol.toUpperCase() },
      });

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      // For SELL orders, validate that the user holds enough tokens before proceeding
      if (type === 'SELL') {
        const existingPosition = await prisma.position.findUnique({
          where: { wallet_teamId: { wallet, teamId: team.id } },
        });

        if (!existingPosition || existingPosition.amount <= 0) {
          res.status(400).json({
            error: 'No position found for this token. Cannot sell tokens you do not hold.',
          });
          return;
        }

        if (existingPosition.amount < amount) {
          res.status(400).json({
            error: `Insufficient balance. You hold ${existingPosition.amount} but tried to sell ${amount}.`,
          });
          return;
        }
      }

      // Use market price (team.currentPrice) for economic calculations, not user-supplied price
      const marketPrice = team.currentPrice;
      const taxRate = type === 'SELL' ? team.sellTaxRate : 0;
      const totalValue = amount * marketPrice;
      const fee = totalValue * (taxRate / 100);

      const trade = await prisma.trade.create({
        data: {
          teamId: team.id,
          wallet,
          type,
          amount,
          price: marketPrice,
          totalValue,
          fee,
          taxRate,
          txHash: txHash || null,
        },
      });

      if (type === 'BUY') {
        const existing = await prisma.position.findUnique({
          where: { wallet_teamId: { wallet, teamId: team.id } },
        });

        if (existing) {
          const newAmount = existing.amount + amount;
          const newAvg =
            (existing.avgBuyPrice * existing.amount + marketPrice * amount) / newAmount;
          await prisma.position.update({
            where: { id: existing.id },
            data: { amount: newAmount, avgBuyPrice: newAvg },
          });
        } else {
          await prisma.position.create({
            data: {
              wallet,
              teamId: team.id,
              amount,
              avgBuyPrice: marketPrice,
            },
          });
        }
      } else {
        // Position existence and sufficient balance already validated above
        const existing = await prisma.position.findUnique({
          where: { wallet_teamId: { wallet, teamId: team.id } },
        });

        if (!existing) {
          // This should not happen due to pre-validation, but guard defensively
          res.status(400).json({
            error: 'No position found for this token. Cannot sell tokens you do not hold.',
          });
          return;
        }

        const newAmount = existing.amount - amount;
        if (newAmount <= 0) {
          await prisma.position.delete({ where: { id: existing.id } });
        } else {
          await prisma.position.update({
            where: { id: existing.id },
            data: { amount: newAmount },
          });
        }
      }

      if (fee > 0) {
        await vaultService.addToVault(fee);
      }

      await priceService.updatePriceAfterTrade(team.id, type, amount, marketPrice);

      io.emit('trade:new', {
        id: trade.id,
        teamSymbol: team.symbol,
        teamName: team.name,
        type,
        amount,
        price: marketPrice,
        totalValue,
        fee,
        wallet: wallet.slice(0, 6) + '...' + wallet.slice(-4),
        timestamp: trade.createdAt,
      });

      // Return the trade in frontend TradeRecord shape
      res.status(201).json({
        id: trade.id,
        wallet: trade.wallet,
        teamSymbol: team.symbol,
        side: type.toLowerCase() as 'buy' | 'sell',
        amount: trade.amount,
        price: trade.price,
        total: trade.totalValue,
        txHash: trade.txHash ?? '',
        timestamp: trade.createdAt.toISOString(),
      });
    } catch (err) {
      console.error('[Trades] POST / error:', err);
      res.status(500).json({ error: 'Failed to record trade' });
    }
  });

  router.get('/recent', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '20')) || 20, 100);

      const trades = await prisma.trade.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { team: { select: { symbol: true, name: true, color: true } } },
      });

      res.json(trades.map(mapTradeToFrontend));
    } catch (err) {
      console.error('[Trades] GET /recent error:', err);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  // Trades by wallet address
  router.get('/wallet/:wallet', async (req: Request, res: Response) => {
    try {
      const wallet = String(req.params.wallet);

      const trades = await prisma.trade.findMany({
        where: { wallet },
        orderBy: { createdAt: 'desc' },
        include: { team: { select: { symbol: true, name: true, color: true } } },
      });

      res.json(trades.map(mapTradeToFrontend));
    } catch (err) {
      console.error('[Trades] GET /wallet/:wallet error:', err);
      res.status(500).json({ error: 'Failed to fetch trades for wallet' });
    }
  });

  router.get('/:teamSymbol/recent', async (req: Request, res: Response) => {
    try {
      const teamSymbol = String(req.params.teamSymbol).toUpperCase();
      const limit = Math.min(parseInt(String(req.query.limit || '20')) || 20, 100);

      const team = await prisma.team.findUnique({
        where: { symbol: teamSymbol },
      });

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      const trades = await prisma.trade.findMany({
        where: { teamId: team.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { team: { select: { symbol: true, name: true, color: true } } },
      });

      res.json(trades.map(mapTradeToFrontend));
    } catch (err) {
      console.error('[Trades] GET /:teamSymbol/recent error:', err);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  return router;
}
