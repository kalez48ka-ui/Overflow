import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { PriceService } from '../modules/price/price.service';
import { Timeframe } from '../common/types';

/** Prisma Team model (no relations needed for team list/detail). */
type TeamRecord = Prisma.TeamGetPayload<{}>;

function mapTeamToFrontend(team: TeamRecord) {
  return {
    id: team.id,
    name: team.name,
    symbol: team.symbol,
    contractAddress: team.tokenAddress ?? '',
    tokenAddress: team.tokenAddress,
    price: team.currentPrice,
    currentPrice: team.currentPrice,
    change24h: team.priceChange24h,
    priceChange24h: team.priceChange24h,
    volume24h: 0,
    marketCap: 0,
    sellTax: team.sellTaxRate,
    sellTaxRate: team.sellTaxRate,
    buyTax: 0,
    wins: team.wins,
    losses: team.losses,
    nrr: team.nrr,
    performanceScore: team.performanceScore,
    ranking: team.ranking,
  };
}

export function createTeamsRouter(prisma: PrismaClient, priceService: PriceService): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const teams = await prisma.team.findMany({
        orderBy: { ranking: 'asc' },
      });
      res.json(teams.map(mapTeamToFrontend));
    } catch (err) {
      console.error('[Teams] GET / error:', err);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  });

  router.get('/:symbol', async (req: Request, res: Response) => {
    try {
      const symbol = String(req.params.symbol).toUpperCase();
      const team = await prisma.team.findUnique({
        where: { symbol },
      });

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      res.json(mapTeamToFrontend(team));
    } catch (err) {
      console.error('[Teams] GET /:symbol error:', err);
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  });

  // Price history handler shared by both route paths
  const priceHistoryHandler = async (req: Request, res: Response) => {
    try {
      const symbol = String(req.params.symbol).toUpperCase();
      const ALLOWED_TIMEFRAMES: Timeframe[] = ['1h', '24h', '7d'];
      const rawTimeframe = String(req.query.timeframe || '24h');
      if (!ALLOWED_TIMEFRAMES.includes(rawTimeframe as Timeframe)) {
        res.status(400).json({ error: `Invalid timeframe. Allowed: ${ALLOWED_TIMEFRAMES.join(', ')}` });
        return;
      }
      const timeframe = rawTimeframe as Timeframe;

      const team = await prisma.team.findUnique({
        where: { symbol },
      });

      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      const history = await priceService.getPriceHistory(team.id, timeframe);
      res.json(history);
    } catch (err) {
      console.error('[Teams] GET /:symbol/prices error:', err);
      res.status(500).json({ error: 'Failed to fetch price history' });
    }
  };

  router.get('/:symbol/prices', priceHistoryHandler);
  router.get('/:symbol/price-history', priceHistoryHandler);

  return router;
}
