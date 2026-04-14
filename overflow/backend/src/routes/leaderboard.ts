import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  totalPnl: number;
  tradeCount: number;
  totalVolume: number;
  favoriteTeam: string;
  winRate: number;
}

type SortMode = 'pnl' | 'volume' | 'activity';

// ---------------------------------------------------------------------------
// In-memory cache with 30-second TTL per sort mode
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: LeaderboardEntry[];
  timestamp: number;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<SortMode, CacheEntry>();

function getCached(sort: SortMode): LeaderboardEntry[] | null {
  const entry = cache.get(sort);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

function setCache(sort: SortMode, data: LeaderboardEntry[]): void {
  cache.set(sort, { data, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Aggregation queries (database-level, no large fetches)
// ---------------------------------------------------------------------------

async function aggregatePnl(prisma: PrismaClient): Promise<LeaderboardEntry[]> {
  // Realized P&L: SUM sell proceeds minus SUM buy costs, grouped by wallet
  // SELL contributes +(totalValue - fee), BUY contributes -(totalValue)
  const rows = await prisma.$queryRaw<
    Array<{
      wallet: string;
      total_pnl: number;
      trade_count: bigint;
      total_volume: number;
      sell_count: bigint;
      win_count: bigint;
      favorite_team: string | null;
    }>
  >`
    WITH wallet_pnl AS (
      SELECT
        wallet,
        SUM(CASE WHEN type = 'SELL' THEN "totalValue" - fee ELSE -"totalValue" END) AS total_pnl,
        COUNT(*)::bigint AS trade_count,
        SUM("totalValue") AS total_volume,
        COUNT(*) FILTER (WHERE type = 'SELL')::bigint AS sell_count
      FROM "Trade"
      GROUP BY wallet
    ),
    unrealized AS (
      SELECT
        p.wallet,
        SUM((t."currentPrice" - p."avgBuyPrice") * p.amount) AS unrealized_pnl
      FROM "Position" p
      JOIN "Team" t ON t.id = p."teamId"
      WHERE p.amount > 0
      GROUP BY p.wallet
    ),
    win_counts AS (
      SELECT
        s.wallet,
        COUNT(*) FILTER (WHERE s.price > COALESCE(b.avg_buy, 0))::bigint AS win_count
      FROM "Trade" s
      LEFT JOIN LATERAL (
        SELECT AVG(price) AS avg_buy
        FROM "Trade" b2
        WHERE b2.wallet = s.wallet AND b2."teamId" = s."teamId" AND b2.type = 'BUY'
      ) b ON true
      WHERE s.type = 'SELL'
      GROUP BY s.wallet
    ),
    fav_team AS (
      SELECT DISTINCT ON (wallet)
        tr.wallet,
        tm.symbol AS favorite_team
      FROM "Trade" tr
      JOIN "Team" tm ON tm.id = tr."teamId"
      GROUP BY tr.wallet, tm.symbol
      ORDER BY tr.wallet, COUNT(*) DESC
    )
    SELECT
      wp.wallet,
      (wp.total_pnl + COALESCE(u.unrealized_pnl, 0)) AS total_pnl,
      wp.trade_count,
      wp.total_volume,
      wp.sell_count,
      COALESCE(wc.win_count, 0) AS win_count,
      ft.favorite_team
    FROM wallet_pnl wp
    LEFT JOIN unrealized u ON u.wallet = wp.wallet
    LEFT JOIN win_counts wc ON wc.wallet = wp.wallet
    LEFT JOIN fav_team ft ON ft.wallet = wp.wallet
    ORDER BY total_pnl DESC
    LIMIT 100
  `;

  return rows.map((r, i) => {
    const sellCount = Number(r.sell_count);
    const winCount = Number(r.win_count);
    const winRate = sellCount > 0 ? (winCount / sellCount) * 100 : 0;
    return {
      rank: i + 1,
      wallet: r.wallet,
      totalPnl: Math.round(Number(r.total_pnl) * 100) / 100,
      tradeCount: Number(r.trade_count),
      totalVolume: Math.round(Number(r.total_volume) * 100) / 100,
      favoriteTeam: r.favorite_team ?? '',
      winRate: Math.round(winRate * 10) / 10,
    };
  });
}

async function aggregateVolume(prisma: PrismaClient): Promise<LeaderboardEntry[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      wallet: string;
      total_volume: number;
      trade_count: bigint;
      total_pnl: number;
      favorite_team: string | null;
    }>
  >`
    WITH wallet_stats AS (
      SELECT
        wallet,
        SUM("totalValue") AS total_volume,
        COUNT(*)::bigint AS trade_count,
        SUM(CASE WHEN type = 'SELL' THEN "totalValue" - fee ELSE -"totalValue" END) AS total_pnl
      FROM "Trade"
      GROUP BY wallet
    ),
    fav_team AS (
      SELECT DISTINCT ON (wallet)
        tr.wallet,
        tm.symbol AS favorite_team
      FROM "Trade" tr
      JOIN "Team" tm ON tm.id = tr."teamId"
      GROUP BY tr.wallet, tm.symbol
      ORDER BY tr.wallet, COUNT(*) DESC
    )
    SELECT
      ws.wallet,
      ws.total_volume,
      ws.trade_count,
      ws.total_pnl,
      ft.favorite_team
    FROM wallet_stats ws
    LEFT JOIN fav_team ft ON ft.wallet = ws.wallet
    ORDER BY ws.total_volume DESC
    LIMIT 100
  `;

  return rows.map((r, i) => ({
    rank: i + 1,
    wallet: r.wallet,
    totalPnl: Math.round(Number(r.total_pnl) * 100) / 100,
    tradeCount: Number(r.trade_count),
    totalVolume: Math.round(Number(r.total_volume) * 100) / 100,
    favoriteTeam: r.favorite_team ?? '',
    winRate: 0,
  }));
}

async function aggregateActivity(prisma: PrismaClient): Promise<LeaderboardEntry[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      wallet: string;
      trade_count: bigint;
      total_volume: number;
      total_pnl: number;
      favorite_team: string | null;
    }>
  >`
    WITH wallet_stats AS (
      SELECT
        wallet,
        COUNT(*)::bigint AS trade_count,
        SUM("totalValue") AS total_volume,
        SUM(CASE WHEN type = 'SELL' THEN "totalValue" - fee ELSE -"totalValue" END) AS total_pnl
      FROM "Trade"
      GROUP BY wallet
    ),
    fav_team AS (
      SELECT DISTINCT ON (wallet)
        tr.wallet,
        tm.symbol AS favorite_team
      FROM "Trade" tr
      JOIN "Team" tm ON tm.id = tr."teamId"
      GROUP BY tr.wallet, tm.symbol
      ORDER BY tr.wallet, COUNT(*) DESC
    )
    SELECT
      ws.wallet,
      ws.trade_count,
      ws.total_volume,
      ws.total_pnl,
      ft.favorite_team
    FROM wallet_stats ws
    LEFT JOIN fav_team ft ON ft.wallet = ws.wallet
    ORDER BY ws.trade_count DESC
    LIMIT 100
  `;

  return rows.map((r, i) => ({
    rank: i + 1,
    wallet: r.wallet,
    totalPnl: Math.round(Number(r.total_pnl) * 100) / 100,
    tradeCount: Number(r.trade_count),
    totalVolume: Math.round(Number(r.total_volume) * 100) / 100,
    favoriteTeam: r.favorite_team ?? '',
    winRate: 0,
  }));
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const VALID_SORTS: SortMode[] = ['pnl', 'volume', 'activity'];

export function createLeaderboardRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '50')) || 50, 100);
      const rawSort = String(req.query.sort || 'pnl');

      if (!VALID_SORTS.includes(rawSort as SortMode)) {
        res.status(400).json({ error: `Invalid sort parameter. Allowed: ${VALID_SORTS.join(', ')}` });
        return;
      }

      const sort = rawSort as SortMode;

      // Return cached result if fresh
      const cached = getCached(sort);
      if (cached) {
        res.json(cached.slice(0, limit));
        return;
      }

      // Run the appropriate aggregation query
      let entries: LeaderboardEntry[];
      switch (sort) {
        case 'volume':
          entries = await aggregateVolume(prisma);
          break;
        case 'activity':
          entries = await aggregateActivity(prisma);
          break;
        case 'pnl':
        default:
          entries = await aggregatePnl(prisma);
          break;
      }

      // Cache the full top-100 result, return requested slice
      setCache(sort, entries);
      res.json(entries.slice(0, limit));
    } catch (err) {
      console.error('[Leaderboard] GET / error:', err);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  return router;
}
