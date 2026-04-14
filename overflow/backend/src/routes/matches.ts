import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireAdminAuth } from './admin';
import { CricketDataService } from '../modules/cricket/cricket-data.service';

/** Prisma Match with both homeTeam and awayTeam relations included. */
type MatchWithTeams = Prisma.MatchGetPayload<{
  include: { homeTeam: true; awayTeam: true };
}>;

function mapMatchToFrontend(match: MatchWithTeams) {
  return {
    id: match.id,
    team1Id: match.homeTeam?.symbol ?? match.homeTeamId,
    team1Name: match.homeTeam?.name ?? '',
    team1Symbol: match.homeTeam?.symbol ?? '',
    team1Color: match.homeTeam?.color ?? '',
    team2Id: match.awayTeam?.symbol ?? match.awayTeamId,
    team2Name: match.awayTeam?.name ?? '',
    team2Symbol: match.awayTeam?.symbol ?? '',
    team2Color: match.awayTeam?.color ?? '',
    status: (match.status as string).toLowerCase() as 'live' | 'upcoming' | 'completed',
    venue: match.venue ?? '',
    startTime: match.startTime?.toISOString?.() ?? match.startTime,
    endTime: match.endTime?.toISOString?.() ?? null,
    score1: match.homeScore ?? null,
    score2: match.awayScore ?? null,
    upsetScore: match.upsetScore ?? null,
    winnerId: match.winnerId ?? null,
    cricApiId: match.cricApiId ?? null,
    cricApiName: match.cricApiName ?? null,
  };
}

export function createMatchesRouter(cricketService: CricketDataService): Router {
  const router = Router();

  // All matches (paginated)
  router.get('/', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Math.max(1, parseInt(String(req.query.limit || '50')) || 50), 200);
      const offset = Math.max(0, parseInt(String(req.query.offset || '0')) || 0);
      const matches = await cricketService.getAllMatches(limit, offset);
      res.json(matches.map(mapMatchToFrontend));
    } catch (err) {
      console.error('[Matches] GET / error:', err);
      res.status(500).json({ error: 'Failed to fetch matches' });
    }
  });

  // Live matches
  router.get('/live', async (_req: Request, res: Response) => {
    try {
      const matches = await cricketService.getLiveMatches();
      res.json(matches.map(mapMatchToFrontend));
    } catch (err) {
      console.error('[Matches] GET /live error:', err);
      res.status(500).json({ error: 'Failed to fetch live matches' });
    }
  });

  // Upcoming matches
  router.get('/upcoming', async (_req: Request, res: Response) => {
    try {
      const matches = await cricketService.getUpcomingMatches();
      res.json(matches.map(mapMatchToFrontend));
    } catch (err) {
      console.error('[Matches] GET /upcoming error:', err);
      res.status(500).json({ error: 'Failed to fetch upcoming matches' });
    }
  });

  // Completed matches
  router.get('/completed', async (_req: Request, res: Response) => {
    try {
      const matches = await cricketService.getCompletedMatches();
      res.json(matches.map(mapMatchToFrontend));
    } catch (err) {
      console.error('[Matches] GET /completed error:', err);
      res.status(500).json({ error: 'Failed to fetch completed matches' });
    }
  });

  // API stats (CricAPI usage info)
  router.get('/api-stats', (_req: Request, res: Response) => {
    res.json(cricketService.getApiStats());
  });

  // Force sync PSL matches from CricAPI (admin only)
  router.post('/sync', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      await cricketService.syncPSLMatches();
      res.json({ status: 'ok', message: 'PSL matches synced' });
    } catch (err) {
      console.error('[Matches] POST /sync error:', err);
      res.status(500).json({ error: 'Failed to sync matches' });
    }
  });

  // Force refresh a specific match from CricAPI (admin only)
  router.post('/refresh/:cricApiId', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { cricApiId } = req.params;
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(cricApiId as string)) {
        res.status(400).json({ error: 'Invalid cricApiId format' });
        return;
      }
      const result = await cricketService.forceRefreshMatch(cricApiId as string);
      if (!result) {
        res.status(404).json({ error: 'Match not found or API not configured' });
        return;
      }
      res.json({ status: 'ok', match: result });
    } catch (err) {
      console.error('[Matches] POST /refresh error:', err);
      res.status(500).json({ error: 'Failed to refresh match' });
    }
  });

  // Single match by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!/^[0-9a-f-]{1,64}$/i.test(id)) {
        res.status(400).json({ error: 'Invalid match ID format' });
        return;
      }
      const match = await cricketService.getMatchById(id);

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      res.json(mapMatchToFrontend(match));
    } catch (err) {
      console.error('[Matches] GET /:id error:', err);
      res.status(500).json({ error: 'Failed to fetch match' });
    }
  });

  // Ball-by-ball events for a match
  router.get('/:id/balls', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!/^[0-9a-f-]{1,64}$/i.test(id)) {
        res.status(400).json({ error: 'Invalid match ID format' });
        return;
      }
      const balls = await cricketService.getMatchBalls(id);
      res.json(balls);
    } catch (err) {
      console.error('[Matches] GET /:id/balls error:', err);
      res.status(500).json({ error: 'Failed to fetch ball events' });
    }
  });

  return router;
}
