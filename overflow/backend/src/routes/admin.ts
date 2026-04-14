import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { OracleService } from '../modules/oracle/oracle.service';
import { VaultService } from '../modules/vault/vault.service';
import { getMultiplier } from '../common/constants';

// ---------------------------------------------------------------------------
// Startup validation: warn if ADMIN_SECRET is missing or weak
// ---------------------------------------------------------------------------
const KNOWN_WEAK_DEFAULTS = ['overflow2026'];
const MIN_SECRET_LENGTH = 32;

(function validateAdminSecret(): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    console.warn(
      '[Security] ADMIN_SECRET is not set. Admin endpoints will return 500 until configured.',
    );
    return;
  }
  if (KNOWN_WEAK_DEFAULTS.includes(secret)) {
    console.warn(
      '[Security] ADMIN_SECRET is set to a known weak default. Replace it with a strong random value (>= 32 chars).',
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    console.warn(
      `[Security] ADMIN_SECRET is only ${secret.length} characters. Use at least ${MIN_SECRET_LENGTH} characters for production.`,
    );
  }
})();

// ---------------------------------------------------------------------------
// Brute-force protection state
// ---------------------------------------------------------------------------
const AUTH_MAX_FAILURES = 5;
const AUTH_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const GLOBAL_MAX_FAILURES = 50;
const GLOBAL_LOCKOUT_MS = 15 * 60 * 1000;

interface AuthAttempt {
  failures: number;
  lockedUntil: number;
}

const authAttempts = new Map<string, AuthAttempt>();

// Global lockout — protects against distributed brute-force across many IPs
let globalFailures = 0;
let globalLockedUntil = 0;
let globalFailureWindowStart = Date.now();

// Periodic cleanup of expired lockout entries to prevent unbounded Map growth.
// Runs every 15 minutes and removes IPs whose lockout period has elapsed.
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of authAttempts) {
    if (attempt.lockedUntil > 0 && attempt.lockedUntil < now) {
      authAttempts.delete(ip);
    }
  }
}, 15 * 60 * 1000).unref(); // unref() so the timer doesn't keep the process alive on shutdown

function getClientIP(req: Request): string {
  return req.socket.remoteAddress || req.ip || 'unknown';
}

/** Timing-safe token comparison to prevent timing attacks */
function safeTokenCompare(supplied: string, expected: string): boolean {
  // Ensure both buffers are the same length for timingSafeEqual
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Compare against a same-length dummy to avoid leaking length info via timing
    const dummy = Buffer.alloc(a.length);
    crypto.timingSafeEqual(a, dummy);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/** Middleware: verify x-admin-token header against ADMIN_SECRET env var */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  // Check global lockout first
  if (globalLockedUntil > Date.now()) {
    const remainingSec = Math.ceil((globalLockedUntil - Date.now()) / 1000);
    res.status(429).json({
      error: `Admin endpoint temporarily locked due to excessive failed attempts. Retry in ${remainingSec}s.`,
    });
    return;
  }

  const clientIP = getClientIP(req);
  const attempt = authAttempts.get(clientIP);

  // Check per-IP lockout
  if (attempt && attempt.lockedUntil > Date.now()) {
    const remainingSec = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
    res.status(429).json({
      error: `Too many failed attempts. Locked out for ${remainingSec} seconds.`,
    });
    return;
  }

  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    console.error('[Security] Admin request rejected: ADMIN_SECRET environment variable is not set');
    res.status(500).json({ error: 'Server misconfigured: admin authentication is unavailable' });
    return;
  }

  const token = req.headers['x-admin-token'];

  if (!token || typeof token !== 'string' || !safeTokenCompare(token, secret)) {
    // Track per-IP failed attempt
    const current = authAttempts.get(clientIP) || { failures: 0, lockedUntil: 0 };
    current.failures += 1;
    if (current.failures >= AUTH_MAX_FAILURES) {
      current.lockedUntil = Date.now() + AUTH_LOCKOUT_MS;
      current.failures = 0;
      console.warn(`[Admin] IP ${clientIP} locked out after ${AUTH_MAX_FAILURES} failed auth attempts`);
    }
    authAttempts.set(clientIP, current);

    // Track global failures (reset window if expired)
    const now = Date.now();
    if (now - globalFailureWindowStart > GLOBAL_LOCKOUT_MS) {
      globalFailures = 0;
      globalFailureWindowStart = now;
    }
    globalFailures++;
    if (globalFailures >= GLOBAL_MAX_FAILURES) {
      globalLockedUntil = now + GLOBAL_LOCKOUT_MS;
      globalFailures = 0;
      console.warn(`[Admin] GLOBAL lockout triggered after ${GLOBAL_MAX_FAILURES} total failures`);
    }

    res.status(401).json({ error: 'Unauthorized: invalid or missing admin token' });
    return;
  }

  // Successful auth -- clear any failure tracking
  authAttempts.delete(clientIP);
  next();
}

export function createAdminRouter(
  prisma: PrismaClient,
  oracleService: OracleService,
  vaultService: VaultService,
): Router {
  const router = Router();

  // Lightweight token verification endpoint (no state mutation)
  router.get('/verify', requireAdminAuth, (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // All admin routes require authentication
  router.use(requireAdminAuth);

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

      // Validate string types and length limits
      if (typeof matchId !== 'string' || matchId.length > 128) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }
      if (typeof winnerId !== 'string' || winnerId.length > 128) {
        res.status(400).json({ error: 'Invalid winnerId format' });
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

      // Validate string types and lengths
      if (typeof matchId !== 'string' || matchId.length > 128) {
        res.status(400).json({ error: 'Invalid matchId format' });
        return;
      }
      if (typeof winnerSymbol !== 'string' || !/^[A-Za-z0-9$]{1,10}$/.test(winnerSymbol)) {
        res.status(400).json({ error: 'Invalid winnerSymbol format' });
        return;
      }
      if (typeof loserSymbol !== 'string' || !/^[A-Za-z0-9$]{1,10}$/.test(loserSymbol)) {
        res.status(400).json({ error: 'Invalid loserSymbol format' });
        return;
      }

      const score = Number(upsetScore);
      if (!Number.isFinite(score) || score < 0 || score > 130) {
        res.status(400).json({ error: 'upsetScore must be a finite number between 0 and 130' });
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

      if (typeof teamSymbol !== 'string' || !/^[$A-Za-z0-9]{1,10}$/.test(teamSymbol)) {
        res.status(400).json({ error: 'Invalid teamSymbol format' });
        return;
      }

      const price = Number(newPrice);
      if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
        res.status(400).json({ error: 'newPrice must be a finite positive number (max 1,000,000)' });
        return;
      }

      const symbol = String(teamSymbol).toUpperCase().replace(/^\$/, '');

      const team = await prisma.team.findUnique({ where: { symbol } });
      if (!team) {
        res.status(404).json({ error: `Team with symbol ${symbol} not found` });
        return;
      }

      const oldPrice = Number(team.currentPrice);
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

