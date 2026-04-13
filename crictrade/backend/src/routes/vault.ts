import { Router, Request, Response } from 'express';
import { VaultService } from '../modules/vault/vault.service';

export function createVaultRouter(vaultService: VaultService): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const state = await vaultService.getVaultState();
      res.json({
        balance: state.balance,
        totalDeposited: state.totalIn,
        totalReleased: state.totalOut,
        currentEpoch: 1,
      });
    } catch (err) {
      console.error('[Vault] GET / error:', err);
      res.status(500).json({ error: 'Failed to fetch vault state' });
    }
  });

  router.get('/upsets', async (_req: Request, res: Response) => {
    try {
      const upsets = await vaultService.getUpsetEvents();
      res.json(upsets);
    } catch (err) {
      console.error('[Vault] GET /upsets error:', err);
      res.status(500).json({ error: 'Failed to fetch upset events' });
    }
  });

  return router;
}
