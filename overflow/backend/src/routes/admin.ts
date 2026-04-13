import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OracleService } from '../modules/oracle/oracle.service';
import { VaultService } from '../modules/vault/vault.service';

export function createAdminRouter(
  prisma: PrismaClient,
  oracleService: OracleService,
  vaultService: VaultService,
): Router {
  const router = Router();

  /**
   * POST /api/admin/match-result
   * Submit a match result — updates scores, rankings, and triggers upset if applicable.
   */
  router.post('/match-result', async (req: Request, res: Response) => {
    try {
      const { matchId, winnerId } = req.body;

      if (!matchId || !winnerId) {
        res.status(400).json({ error: 'matchId and winnerId are required' });
        return;
      }

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { homeTeam: true, awayTeam: true },
      });

      if (!match) {
        res.status(404).json({ error: `Match ${matchId} not found` });
        return;
      }

      await oracleService.processMatchResult(matchId, winnerId);

      const updatedTeams = await prisma.team.findMany({
        orderBy: { ranking: 'asc' },
      });

      const updatedMatch = await prisma.match.findUnique({
        where: { id: matchId },
        include: { homeTeam: true, awayTeam: true },
      });

      res.json({
        status: 'ok',
        match: {
          id: updatedMatch?.id,
          winnerId: updatedMatch?.winnerId,
          isUpset: updatedMatch?.isUpset,
          upsetScore: updatedMatch?.upsetScore,
        },
        rankings: updatedTeams.map((t) => ({
          id: t.id,
          name: t.name,
          symbol: t.symbol,
          ranking: t.ranking,
          wins: t.wins,
          losses: t.losses,
          performanceScore: t.performanceScore,
          currentPrice: t.currentPrice,
          sellTaxRate: t.sellTaxRate,
        })),
      });
    } catch (err) {
      console.error('[Admin] POST /match-result error:', err);
      res.status(500).json({ error: 'Failed to process match result' });
    }
  });

  /**
   * POST /api/admin/trigger-upset
   * Manually trigger an upset event for demo purposes.
   */
  router.post('/trigger-upset', async (req: Request, res: Response) => {
    try {
      const { matchId, winnerSymbol, loserSymbol, upsetScore } = req.body;

      if (!matchId || !winnerSymbol || !loserSymbol || upsetScore === undefined) {
        res.status(400).json({
          error: 'matchId, winnerSymbol, loserSymbol, and upsetScore are required',
        });
        return;
      }

      const score = Number(upsetScore);
      if (isNaN(score) || score < 0 || score > 130) {
        res.status(400).json({ error: 'upsetScore must be between 0 and 130' });
        return;
      }

      const vaultBefore = await vaultService.getVaultState();
      await vaultService.processUpsetEvent(matchId, winnerSymbol, loserSymbol, score);
      const vaultAfter = await vaultService.getVaultState();

      // Calculate what was released
      const multiplier = getMultiplier(score);
      const releasePercent = Math.min(50, score * 0.5 * multiplier);

      res.json({
        status: 'ok',
        upset: {
          matchId,
          winnerSymbol,
          loserSymbol,
          upsetScore: score,
          multiplier,
          releasePercent: releasePercent.toFixed(2),
          vaultBefore: vaultBefore.balance,
          vaultAfter: vaultAfter.balance,
          released: vaultBefore.balance - vaultAfter.balance,
        },
      });
    } catch (err) {
      console.error('[Admin] POST /trigger-upset error:', err);
      res.status(500).json({ error: 'Failed to trigger upset' });
    }
  });

  /**
   * POST /api/admin/recalculate
   * Recalculate all team rankings based on current stats.
   */
  router.post('/recalculate', async (_req: Request, res: Response) => {
    try {
      await oracleService.recalculateRankings();

      const teams = await prisma.team.findMany({
        orderBy: { ranking: 'asc' },
      });

      res.json({
        status: 'ok',
        rankings: teams.map((t) => ({
          id: t.id,
          name: t.name,
          symbol: t.symbol,
          ranking: t.ranking,
          wins: t.wins,
          losses: t.losses,
          performanceScore: t.performanceScore,
          currentPrice: t.currentPrice,
          sellTaxRate: t.sellTaxRate,
        })),
      });
    } catch (err) {
      console.error('[Admin] POST /recalculate error:', err);
      res.status(500).json({ error: 'Failed to recalculate rankings' });
    }
  });

  /**
   * POST /api/admin/price-update
   * Directly set a team's price in the database.
   */
  router.post('/price-update', async (req: Request, res: Response) => {
    try {
      const { teamSymbol, newPrice } = req.body;

      if (!teamSymbol || newPrice === undefined) {
        res.status(400).json({ error: 'teamSymbol and newPrice are required' });
        return;
      }

      const price = Number(newPrice);
      if (isNaN(price) || price <= 0) {
        res.status(400).json({ error: 'newPrice must be a positive number' });
        return;
      }

      const symbol = String(teamSymbol).toUpperCase().replace(/^\$/, '');

      const team = await prisma.team.findUnique({ where: { symbol } });
      if (!team) {
        res.status(404).json({ error: `Team with symbol ${symbol} not found` });
        return;
      }

      const oldPrice = team.currentPrice;
      const change24h = oldPrice > 0 ? ((price - oldPrice) / oldPrice) * 100 : 0;

      const updated = await prisma.team.update({
        where: { symbol },
        data: {
          currentPrice: price,
          priceChange24h: change24h,
        },
      });

      res.json({
        status: 'ok',
        team: {
          id: updated.id,
          name: updated.name,
          symbol: updated.symbol,
          oldPrice,
          newPrice: updated.currentPrice,
          change24h: updated.priceChange24h,
        },
      });
    } catch (err) {
      console.error('[Admin] POST /price-update error:', err);
      res.status(500).json({ error: 'Failed to update price' });
    }
  });

  return router;
}

/** Mirror of VaultService.getMultiplier for response calculation */
function getMultiplier(upsetScore: number): number {
  if (upsetScore >= 80) return 5;
  if (upsetScore >= 60) return 4;
  if (upsetScore >= 40) return 3;
  if (upsetScore >= 20) return 2;
  return 1;
}
