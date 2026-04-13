import { Router, Request, Response } from 'express';
import { FanWarsService } from '../modules/fanwars/fanwars.service';

export function createFanWarsRouter(fanWarsService: FanWarsService): Router {
  const router = Router();

  /**
   * GET /api/fanwars/active
   * Returns all active (OPEN / LOCKED) fan wars.
   * NOTE: This route MUST be defined before /:matchId to avoid param collision.
   */
  router.get('/active', async (_req: Request, res: Response) => {
    try {
      const active = await fanWarsService.getActiveFanWars();
      res.json(active);
    } catch (err) {
      console.error('[FanWars] GET /active error:', err);
      res.status(500).json({ error: 'Failed to fetch active fan wars' });
    }
  });

  /**
   * GET /api/fanwars/leaderboard
   * Returns top participants ranked by total locked amount.
   */
  router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '25')) || 25, 100);
      const leaderboard = await fanWarsService.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (err) {
      console.error('[FanWars] GET /leaderboard error:', err);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  /**
   * GET /api/fanwars/user/:wallet
   * Returns all fan war locks for a given wallet.
   */
  router.get('/user/:wallet', async (req: Request, res: Response) => {
    try {
      const wallet = String(req.params.wallet).toLowerCase();

      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      const locks = await fanWarsService.getUserLocks(wallet);
      res.json(locks);
    } catch (err) {
      console.error('[FanWars] GET /user/:wallet error:', err);
      res.status(500).json({ error: 'Failed to fetch user locks' });
    }
  });

  /**
   * GET /api/fanwars/:matchId
   * Returns full fan war status for a specific match.
   */
  router.get('/:matchId', async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);
      const status = await fanWarsService.getStatus(matchId);
      res.json(status);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('No fan war found')) {
        res.status(404).json({ error: message });
      } else {
        console.error('[FanWars] GET /:matchId error:', err);
        res.status(500).json({ error: 'Failed to fetch fan war status' });
      }
    }
  });

  /**
   * POST /api/fanwars/:matchId/lock
   * Lock tokens for a team in a fan war.
   * Body: { wallet: string, teamId: string, amount: number }
   */
  router.post('/:matchId/lock', async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);
      const { wallet, teamId, amount } = req.body;

      if (!wallet || !teamId || amount === undefined) {
        res.status(400).json({ error: 'Missing required fields: wallet, teamId, amount' });
        return;
      }

      const normalizedWallet = String(wallet).toLowerCase();

      if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedWallet)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ error: 'Amount must be a positive number' });
        return;
      }

      const lock = await fanWarsService.lockTokens(matchId, normalizedWallet, teamId, numAmount);
      res.status(201).json(lock);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (
        message.includes('No fan war found') ||
        message.includes('not accepting locks') ||
        message.includes('deadline has passed') ||
        message.includes('Invalid team selection') ||
        message.includes('already locked tokens')
      ) {
        res.status(400).json({ error: message });
      } else {
        console.error('[FanWars] POST /:matchId/lock error:', err);
        res.status(500).json({ error: 'Failed to lock tokens' });
      }
    }
  });

  /**
   * POST /api/fanwars/:matchId/claim
   * Claim boost rewards after a fan war has settled.
   * Body: { wallet: string }
   */
  router.post('/:matchId/claim', async (req: Request, res: Response) => {
    try {
      const matchId = String(req.params.matchId);
      const { wallet } = req.body;

      if (!wallet) {
        res.status(400).json({ error: 'Missing required field: wallet' });
        return;
      }

      const normalizedWallet = String(wallet).toLowerCase();

      if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedWallet)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      const result = await fanWarsService.claimBoost(matchId, normalizedWallet);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (
        message.includes('No fan war found') ||
        message.includes('cannot claim yet') ||
        message.includes('No lock found') ||
        message.includes('already claimed')
      ) {
        res.status(400).json({ error: message });
      } else {
        console.error('[FanWars] POST /:matchId/claim error:', err);
        res.status(500).json({ error: 'Failed to claim boost' });
      }
    }
  });

  return router;
}
