import { requireWalletAuth } from '../middleware/walletAuth';
import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { PriceService } from '../modules/price/price.service';
import { VaultService } from '../modules/vault/vault.service';

/** Prisma Trade with the `team` relation included (symbol, name, color). */
type TradeWithTeam = Prisma.TradeGetPayload<{
  include: { team: { select: { symbol: true; name: true; color: true } } };
}>;

/**
 * Maps a Prisma trade record (with included team relation) to the frontend
 * TradeRecord shape: { id, wallet, teamSymbol, side, amount, price, total, txHash, timestamp }
 */
function mapTradeToFrontend(trade: TradeWithTeam) {
  const teamSymbol = trade.team?.symbol ?? '';
  return {
    id: trade.id,
    wallet: trade.wallet,
    teamSymbol,
    side: (trade.type as string).toLowerCase() as 'buy' | 'sell',
    amount: Number(trade.amount),
    price: Number(trade.price),
    total: Number(trade.totalValue),
    fee: Number(trade.fee),
    txHash: trade.txHash ?? '',
    timestamp: trade.createdAt.toISOString(),
  };
}

export function createTradesRouter(
  prisma: PrismaClient,
  priceService: PriceService,
  vaultService: VaultService,
  io: SocketServer
): Router {
  const router = Router();

  router.post('/', requireWalletAuth('trade'), async (req: Request, res: Response) => {
    try {
      const body = req.body;

      // Accept both frontend `side` (lowercase) and backend `type` (uppercase)
      let type: string | undefined = body.type;
      if (!type && body.side) {
        type = (body.side as string).toUpperCase();
      }

      const { teamSymbol, amount, price, txHash } = body;
      let wallet: string | undefined = req.verifiedWallet;

      if (!teamSymbol || !wallet || !type || !amount || !price) {
        res.status(400).json({
          error: 'Missing required fields: teamSymbol, wallet, side/type, amount, price',
        });
        return;
      }

      // Validate and normalize wallet address
      if (typeof wallet !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }
      wallet = wallet.toLowerCase();

      // Validate teamSymbol format (alphanumeric, max 10 chars)
      if (typeof teamSymbol !== 'string' || !/^[A-Za-z0-9$]{1,10}$/.test(teamSymbol)) {
        res.status(400).json({ error: 'Invalid teamSymbol format' });
        return;
      }

      if (type !== 'BUY' && type !== 'SELL') {
        res.status(400).json({ error: 'side must be buy or sell (or type must be BUY or SELL)' });
        return;
      }

      // Validate amount: must be a finite positive number within bounds
      const numAmount = Number(amount);
      const numPrice = Number(price);
      if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount > 1_000_000) {
        res.status(400).json({ error: 'amount must be a finite positive number (max 1,000,000)' });
        return;
      }
      if (!Number.isFinite(numPrice) || numPrice <= 0 || numPrice > 1_000_000) {
        res.status(400).json({ error: 'price must be a finite positive number (max 1,000,000)' });
        return;
      }

      // Validate optional txHash format
      if (txHash !== undefined && txHash !== null && txHash !== '') {
        if (typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
          res.status(400).json({ error: 'Invalid txHash format' });
          return;
        }
      }

      // Wrap the entire trade flow in a serializable transaction to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        const team = await tx.team.findUnique({
          where: { symbol: teamSymbol.toUpperCase() },
        });

        if (!team) {
          return { error: 'Team not found', status: 404 } as const;
        }

        // For SELL orders, validate that the user holds enough tokens inside the transaction
        if (type === 'SELL') {
          const existingPosition = await tx.position.findUnique({
            where: { wallet_teamId: { wallet: wallet!, teamId: team.id } },
          });

          if (!existingPosition || Number(existingPosition.amount) <= 0) {
            return {
              error: 'No position found for this token. Cannot sell tokens you do not hold.',
              status: 400,
            } as const;
          }

          if (Number(existingPosition.amount) < amount) {
            return {
              error: `Insufficient balance. You hold ${existingPosition.amount} but tried to sell ${amount}.`,
              status: 400,
            } as const;
          }
        }

        // Use market price (team.currentPrice) for economic calculations, not user-supplied price
        // Keep calculations in Decimal space to avoid JS Number precision loss
        const marketPrice = team.currentPrice; // Prisma Decimal
        const decAmount = new Prisma.Decimal(amount);
        const taxRate = type === 'SELL' ? team.sellTaxRate : new Prisma.Decimal(0);
        const totalValue = decAmount.mul(marketPrice);
        const fee = totalValue.mul(taxRate).div(100);

        const trade = await tx.trade.create({
          data: {
            teamId: team.id,
            wallet: wallet!,
            type: type!,
            amount,
            price: marketPrice,
            totalValue: totalValue,
            fee: fee,
            taxRate: taxRate,
            txHash: txHash || null,
          },
        });

        if (type === 'BUY') {
          const existing = await tx.position.findUnique({
            where: { wallet_teamId: { wallet: wallet!, teamId: team.id } },
          });

          if (existing) {
            const existingAmount = new Prisma.Decimal(existing.amount);
            const newAmount = existingAmount.add(decAmount);
            const newAvg = new Prisma.Decimal(existing.avgBuyPrice)
              .mul(existingAmount)
              .add(marketPrice.mul(decAmount))
              .div(newAmount);
            await tx.position.update({
              where: { id: existing.id },
              data: { amount: newAmount, avgBuyPrice: newAvg },
            });
          } else {
            await tx.position.create({
              data: {
                wallet: wallet!,
                teamId: team.id,
                amount: decAmount,
                avgBuyPrice: marketPrice,
              },
            });
          }
        } else {
          const existing = await tx.position.findUnique({
            where: { wallet_teamId: { wallet: wallet!, teamId: team.id } },
          });

          if (!existing) {
            return {
              error: 'No position found for this token. Cannot sell tokens you do not hold.',
              status: 400,
            } as const;
          }

          const newAmount = new Prisma.Decimal(existing.amount).sub(decAmount);
          if (newAmount.lte(0)) {
            await tx.position.delete({ where: { id: existing.id } });
          } else {
            await tx.position.update({
              where: { id: existing.id },
              data: { amount: newAmount },
            });
          }
        }

        return { trade, team, marketPrice, totalValue, fee } as const;
      }, { isolationLevel: 'RepeatableRead' });

      // Handle error results from the transaction
      if ('error' in result && result.status) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      const { trade, team, marketPrice, totalValue, fee } = result;

      // Convert Decimals to numbers for side-effects that expect Number
      const numFee = Number(fee);
      const numMarketPrice = Number(marketPrice);
      const numTotalValue = Number(totalValue);

      // Side effects outside the transaction (vault, price updates, websocket)
      if (numFee > 0) {
        await vaultService.addToVault(numFee);
      }

      await priceService.updatePriceAfterTrade(team.id, type as 'BUY' | 'SELL', amount, numMarketPrice);

      io.to(`team:${team.symbol}`).emit('trade:new', {
        id: trade.id,
        teamSymbol: team.symbol,
        teamName: team.name,
        type,
        amount,
        price: numMarketPrice,
        totalValue: numTotalValue,
        fee: numFee,
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

  // Trades by wallet address (paginated)
  router.get('/wallet/:wallet', async (req: Request, res: Response) => {
    try {
      const wallet = String(req.params.wallet).toLowerCase();

      // Validate wallet format
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      const limit = Math.min(parseInt(String(req.query.limit || '50')) || 50, 200);
      const offset = Math.max(parseInt(String(req.query.offset || '0')) || 0, 0);

      const trades = await prisma.trade.findMany({
        where: { wallet },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
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
