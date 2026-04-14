import { signAction, type WalletSignature } from "./walletSign";
import type { WalletClient } from "viem";

// Use proxy path on HTTPS (Vercel) to avoid mixed-content, direct URL on HTTP (dev)
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
const API_URL = isHttps ? "/proxy" : RAW_API_URL;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamData {
  id: string;
  name: string;
  symbol: string;
  contractAddress: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  sellTax: number;
  buyTax: number;
  wins: number;
  losses: number;
  nrr: number;
  performanceScore: number;
  ranking: number;
  /** Backend may return currentPrice alongside price. */
  currentPrice?: number;
  /** Backend may return priceChange24h alongside change24h. */
  priceChange24h?: number;
}

export interface PricePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CreateTradeDto {
  wallet: string;
  teamSymbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  txHash: string;
}

export interface TradeRecord {
  id: string;
  wallet: string;
  teamSymbol: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  total: number;
  txHash: string;
  timestamp: string;
}

export interface MatchInfo {
  id: string;
  team1Id: string;
  team1Name: string;
  team1Symbol?: string;
  team1Color?: string;
  team2Id: string;
  team2Name: string;
  team2Symbol?: string;
  team2Color?: string;
  status: "live" | "upcoming" | "completed";
  venue: string;
  startTime: string;
  endTime?: string | null;
  score1?: string | null;
  score2?: string | null;
  upsetScore?: number;
  winnerId?: string | null;
  cricApiId?: string | null;
  cricApiName?: string | null;
}

export interface PortfolioData {
  wallet: string;
  positions: PortfolioPosition[];
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
}

export interface PortfolioPosition {
  teamSymbol: string;
  teamName: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface VaultState {
  balance: number;
  totalDeposited: number;
  totalReleased: number;
  currentEpoch: number;
}

export interface UpsetRecord {
  epoch: number;
  winnerTeam: string;
  loserTeam: string;
  upsetScore: number;
  tier: string;
  releasedAmount: number;
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  totalPnl: number;
  tradeCount: number;
  totalVolume: number;
  favoriteTeam: string;
  winRate: number;
}

export interface AIAnalysis {
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  confidence: number;
  factors: string[];
  recommendation: string;
}

export interface AISignal {
  action: "buy" | "sell" | "hold";
  team: string;
  confidence: number;
  reasoning: string;
}

export interface AIQueryResponse {
  answer: string;
  sources: string[];
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchJSON<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${errorBody}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Retry wrapper for GET requests (transient failure resilience)
// ---------------------------------------------------------------------------

async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit & { signal?: AbortSignal },
  maxRetries = 2,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchJSON<T>(url, options);
    } catch (err) {
      lastError = err as Error;
      // Don't retry if the request was intentionally aborted
      if (options?.signal?.aborted) break;
      // Don't retry on client errors (4xx) — only retry on network/server errors
      if (lastError.message.includes("API error 4")) break;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/** Build headers that include the admin token when available. */
export function adminHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("overflow_admin_token")
      : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-admin-token": token } : {}),
  };
}

async function adminFetchJSON<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const headers = adminHeaders();
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${errorBody}`);
  }

  return res.json() as Promise<T>;
}


// ---------------------------------------------------------------------------
// Signed POST helper (EIP-712 wallet auth)
// ---------------------------------------------------------------------------

/**
 * Performs a signed POST request. Signs the action with the wallet's private
 * key via EIP-712, then includes `signature` and `nonce` in the JSON body
 * alongside the original payload.
 *
 * @param url           - Full API URL
 * @param walletClient  - viem WalletClient from wagmi's useWalletClient()
 * @param action        - Action label matching the backend middleware config
 * @param body          - Original request body (wallet address should be included)
 */
async function signedPost<T>(
  url: string,
  walletClient: WalletClient,
  action: string,
  body: object,
): Promise<T> {
  const { signature, nonce } = await signAction(walletClient, action);
  return fetchJSON<T>(url, {
    method: "POST",
    body: JSON.stringify({ ...body, signature, nonce }),
  });
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const api = {
  // ---- Teams ----
  teams: {
    getAll: (signal?: AbortSignal): Promise<TeamData[]> =>
      fetchWithRetry(`${API_URL}/api/teams`, { signal }),

    getBySymbol: (symbol: string, signal?: AbortSignal): Promise<TeamData> =>
      fetchWithRetry(`${API_URL}/api/teams/${encodeURIComponent(symbol)}`, { signal }),

    getPriceHistory: (
      symbol: string,
      timeframe: string = "1h",
      signal?: AbortSignal,
    ): Promise<PricePoint[]> =>
      fetchWithRetry(
        `${API_URL}/api/teams/${encodeURIComponent(symbol)}/prices?timeframe=${encodeURIComponent(timeframe)}`,
        { signal },
      ),
  },

  // ---- Trades ----
  trades: {
    create: (trade: CreateTradeDto, walletClient?: WalletClient): Promise<TradeRecord> => {
      if (walletClient) {
        return signedPost<TradeRecord>(
          `${API_URL}/api/trades`,
          walletClient,
          "trade",
          trade,
        );
      }
      return fetchJSON(`${API_URL}/api/trades`, {
        method: "POST",
        body: JSON.stringify(trade),
      });
    },

    getRecent: (limit: number = 50, signal?: AbortSignal): Promise<TradeRecord[]> =>
      fetchWithRetry(`${API_URL}/api/trades/recent?limit=${limit}`, { signal }),

    getRecentByTeam: (
      teamSymbol: string,
      limit: number = 20,
      signal?: AbortSignal,
    ): Promise<TradeRecord[]> =>
      fetchWithRetry(
        `${API_URL}/api/trades/${encodeURIComponent(teamSymbol.replace(/^\$/, ''))}/recent?limit=${limit}`,
        { signal },
      ),

    getByWallet: (wallet: string, signal?: AbortSignal): Promise<TradeRecord[]> =>
      fetchWithRetry(
        `${API_URL}/api/trades/wallet/${encodeURIComponent(wallet)}`,
        { signal },
      ),
  },

  // ---- Matches ----
  matches: {
    getLive: (signal?: AbortSignal): Promise<MatchInfo[]> =>
      fetchWithRetry(`${API_URL}/api/matches/live`, { signal }),

    getUpcoming: (signal?: AbortSignal): Promise<MatchInfo[]> =>
      fetchWithRetry(`${API_URL}/api/matches/upcoming`, { signal }),

    getAll: (signal?: AbortSignal): Promise<MatchInfo[]> =>
      fetchWithRetry(`${API_URL}/api/matches`, { signal }),

    getCompleted: (signal?: AbortSignal): Promise<MatchInfo[]> =>
      fetchWithRetry(`${API_URL}/api/matches/completed`, { signal }),

    getById: (id: string, signal?: AbortSignal): Promise<MatchInfo> =>
      fetchWithRetry(`${API_URL}/api/matches/${encodeURIComponent(id)}`, { signal }),
  },

  // ---- Portfolio ----
  portfolio: {
    get: (wallet: string, signal?: AbortSignal): Promise<PortfolioData> =>
      fetchWithRetry(
        `${API_URL}/api/portfolio/${encodeURIComponent(wallet)}`,
        { signal },
      ),

    getHistory: (
      wallet: string,
      days: number = 30,
      signal?: AbortSignal,
    ): Promise<{ date: string; value: number }[]> =>
      fetchWithRetry(
        `${API_URL}/api/portfolio/${encodeURIComponent(wallet)}/history?days=${days}`,
        { signal },
      ),
  },

  // ---- Vault ----
  vault: {
    getState: (signal?: AbortSignal): Promise<VaultState> =>
      fetchWithRetry(`${API_URL}/api/vault`, { signal }),

    getUpsets: (signal?: AbortSignal): Promise<UpsetRecord[]> =>
      fetchWithRetry(`${API_URL}/api/vault/upsets`, { signal }),
  },

  // ---- Leaderboard ----
  leaderboard: {
    get: (sort: string = 'pnl', limit: number = 50, signal?: AbortSignal): Promise<LeaderboardEntry[]> =>
      fetchWithRetry(`${API_URL}/api/leaderboard?sort=${sort}&limit=${limit}`, { signal }),
  },

  // ---- AI Engine (proxied through backend for auth & rate limiting) ----
  ai: {
    analyze: (
      homeTeam: string,
      awayTeam: string,
    ): Promise<AIAnalysis> =>
      fetchJSON(`${API_URL}/api/ai/analyze`, {
        method: "POST",
        body: JSON.stringify({ homeTeam, awayTeam }),
      }),

    signal: (matchState: Record<string, unknown>): Promise<AISignal> =>
      fetchJSON(`${API_URL}/api/ai/signal`, {
        method: "POST",
        body: JSON.stringify({ matchState }),
      }),

    query: (question: string): Promise<AIQueryResponse> =>
      fetchJSON(`${API_URL}/api/ai/query`, {
        method: "POST",
        body: JSON.stringify({ question }),
      }),
  },
};

// ---------------------------------------------------------------------------
// Admin API types
// ---------------------------------------------------------------------------

export interface AdminMatchResultResponse {
  status: string;
  match: {
    id: string;
    winnerId: string;
    isUpset: boolean;
    upsetScore: number | null;
  };
  rankings: AdminRankingEntry[];
}

export interface AdminRankingEntry {
  id: string;
  name: string;
  symbol: string;
  ranking: number;
  wins: number;
  losses: number;
  performanceScore: number;
  currentPrice: number;
  sellTaxRate: number;
}

export interface AdminUpsetResponse {
  status: string;
  upset: {
    matchId: string;
    winnerSymbol: string;
    loserSymbol: string;
    upsetScore: number;
    multiplier: number;
    releasePercent: string;
    vaultBefore: number;
    vaultAfter: number;
    released: number;
  };
}

export interface AdminRecalculateResponse {
  status: string;
  rankings: AdminRankingEntry[];
}

export interface AdminPriceUpdateResponse {
  status: string;
  team: {
    id: string;
    name: string;
    symbol: string;
    oldPrice: number;
    newPrice: number;
    change24h: number;
  };
}

// ---------------------------------------------------------------------------
// Admin API client
// ---------------------------------------------------------------------------

export const adminApi = {
  /** Verify admin token against the backend. Returns true on 200, false on 401. */
  verifyToken: async (): Promise<boolean> => {
    try {
      await adminFetchJSON(`${API_URL}/api/admin/verify`, {
        method: "GET",
      });
      return true;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("401")) return false;
      // Network errors etc. — treat as unauthenticated to be safe
      return false;
    }
  },

  submitMatchResult: (
    matchId: string,
    winnerId: string,
  ): Promise<AdminMatchResultResponse> =>
    adminFetchJSON(`${API_URL}/api/admin/match-result`, {
      method: "POST",
      body: JSON.stringify({ matchId, winnerId }),
    }),

  triggerUpset: (
    matchId: string,
    winnerSymbol: string,
    loserSymbol: string,
    upsetScore: number,
  ): Promise<AdminUpsetResponse> =>
    adminFetchJSON(`${API_URL}/api/admin/trigger-upset`, {
      method: "POST",
      body: JSON.stringify({ matchId, winnerSymbol, loserSymbol, upsetScore }),
    }),

  recalculateRankings: (): Promise<AdminRecalculateResponse> =>
    adminFetchJSON(`${API_URL}/api/admin/recalculate`, {
      method: "POST",
    }),

  updatePrice: (
    teamSymbol: string,
    newPrice: number,
  ): Promise<AdminPriceUpdateResponse> =>
    adminFetchJSON(`${API_URL}/api/admin/price-update`, {
      method: "POST",
      body: JSON.stringify({ teamSymbol, newPrice }),
    }),
};

// ---------------------------------------------------------------------------
// Fan Wars types
// ---------------------------------------------------------------------------

export interface FanWarStatus {
  id: string;
  matchId: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamSymbol: string;
  homeTeamColor: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamSymbol: string;
  awayTeamColor: string;
  totalHomeLocked: number;
  totalAwayLocked: number;
  boostPool: number;
  status: "OPEN" | "LOCKED" | "SETTLED" | "CANCELLED";
  winnerTeamId: string | null;
  marginType: string | null;
  homeBoostShare: number | null;
  awayBoostShare: number | null;
  lockDeadline: string;
  matchStartTime: string;
  matchVenue: string;
  userLock: {
    teamId: string;
    amount: number;
    boostReward: number | null;
    claimed: boolean;
  } | null;
}

export interface FanWarLock {
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;
  teamSymbol: string;
  teamColor: string;
  amount: number;
  boostReward: number | null;
  claimed: boolean;
  status: string;
  opponentTeam: string;
}

// ---------------------------------------------------------------------------
// Fan Wars API client
// ---------------------------------------------------------------------------

export const fanWarsApi = {
  getStatus: (matchId: string): Promise<FanWarStatus> =>
    fetchWithRetry(`${API_URL}/api/fanwars/${encodeURIComponent(matchId)}`),

  lock: (
    matchId: string,
    body: { wallet: string; teamId: string; amount: number },
    walletClient?: WalletClient,
  ): Promise<{ success: boolean; lockId: string }> => {
    if (walletClient) {
      return signedPost<{ success: boolean; lockId: string }>(
        `${API_URL}/api/fanwars/${encodeURIComponent(matchId)}/lock`,
        walletClient,
        "fanwar:lock",
        body,
      );
    }
    return fetchJSON(`${API_URL}/api/fanwars/${encodeURIComponent(matchId)}/lock`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  claim: (
    matchId: string,
    body: { wallet: string },
    walletClient?: WalletClient,
  ): Promise<{ success: boolean; claimed: number }> => {
    if (walletClient) {
      return signedPost<{ success: boolean; claimed: number }>(
        `${API_URL}/api/fanwars/${encodeURIComponent(matchId)}/claim`,
        walletClient,
        "fanwar:claim",
        body,
      );
    }
    return fetchJSON(`${API_URL}/api/fanwars/${encodeURIComponent(matchId)}/claim`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getActive: (): Promise<FanWarStatus[]> =>
    fetchWithRetry(`${API_URL}/api/fanwars/active`),

  getUserLocks: (wallet: string): Promise<FanWarLock[]> =>
    fetchWithRetry(
      `${API_URL}/api/fanwars/user/${encodeURIComponent(wallet)}`,
    ),

  getLeaderboard: (): Promise<
    { rank: number; wallet: string; totalBoost: number; warsWon: number }[]
  > => fetchWithRetry(`${API_URL}/api/fanwars/leaderboard`),
};

// ---------------------------------------------------------------------------
// Predictions types
// ---------------------------------------------------------------------------

export interface PredictionPoolStatus {
  id: string;
  matchId: string;
  homeTeamName: string;
  homeTeamSymbol: string;
  homeTeamColor: string;
  awayTeamName: string;
  awayTeamSymbol: string;
  awayTeamColor: string;
  entryFee: number;
  totalPool: number;
  participantCount: number;
  status: "OPEN" | "LIVE" | "SETTLED" | "CANCELLED";
  deadline: string;
  matchStartTime: string;
  matchVenue: string;
  highestScore: number | null;
  questions: PredictionQuestionData[];
  userEntry: {
    answers: { questionIndex: number; chosenOption: number; isCorrect: boolean | null; pointsEarned: number | null }[];
    totalScore: number | null;
    payout: number | null;
    claimed: boolean;
  } | null;
}

export interface PredictionQuestionData {
  questionIndex: number;
  questionText: string;
  options: string[];
  points: number;
  isLive: boolean;
  deadline: string;
  resolved: boolean;
  correctOption: number | null;
}

export interface PredictionLeaderboardEntry {
  wallet: string;
  avgScore: number;
  totalProfit: number;
  matchesPlayed: number;
  bestScore: number;
}

// ---------------------------------------------------------------------------
// Predictions API client
// ---------------------------------------------------------------------------

export const predictionsApi = {
  getActivePools: (signal?: AbortSignal): Promise<PredictionPoolStatus[]> =>
    fetchWithRetry(`${API_URL}/api/predictions/active`, { signal }),

  getPoolStatus: (matchId: string, wallet?: string, signal?: AbortSignal): Promise<PredictionPoolStatus> =>
    fetchWithRetry(`${API_URL}/api/predictions/${encodeURIComponent(matchId)}${wallet ? `?wallet=${wallet}` : ''}`, { signal }),

  enter: (matchId: string, body: { wallet: string; answers: { questionIndex: number; chosenOption: number }[] }, walletClient?: WalletClient): Promise<{ success: boolean }> => {
    if (walletClient) {
      return signedPost<{ success: boolean }>(
        `${API_URL}/api/predictions/${encodeURIComponent(matchId)}/enter`,
        walletClient,
        "prediction:enter",
        body,
      );
    }
    return fetchJSON(`${API_URL}/api/predictions/${encodeURIComponent(matchId)}/enter`, { method: "POST", body: JSON.stringify(body) });
  },

  submitLiveAnswer: (matchId: string, body: { wallet: string; questionIndex: number; chosenOption: number }, walletClient?: WalletClient): Promise<{ success: boolean }> => {
    if (walletClient) {
      return signedPost<{ success: boolean }>(
        `${API_URL}/api/predictions/${encodeURIComponent(matchId)}/live-answer`,
        walletClient,
        "prediction:live-answer",
        body,
      );
    }
    return fetchJSON(`${API_URL}/api/predictions/${encodeURIComponent(matchId)}/live-answer`, { method: "POST", body: JSON.stringify(body) });
  },

  claim: (matchId: string, body: { wallet: string }, walletClient?: WalletClient): Promise<{ payout: number }> => {
    if (walletClient) {
      return signedPost<{ payout: number }>(
        `${API_URL}/api/predictions/${encodeURIComponent(matchId)}/claim`,
        walletClient,
        "prediction:claim",
        body,
      );
    }
    return fetchJSON(`${API_URL}/api/predictions/${encodeURIComponent(matchId)}/claim`, { method: "POST", body: JSON.stringify(body) });
  },

  getUserPredictions: (wallet: string, signal?: AbortSignal): Promise<PredictionPoolStatus[]> =>
    fetchWithRetry(`${API_URL}/api/predictions/user/${encodeURIComponent(wallet)}`, { signal }),

  getLeaderboard: (limit?: number, signal?: AbortSignal): Promise<PredictionLeaderboardEntry[]> =>
    fetchWithRetry(`${API_URL}/api/predictions/leaderboard${limit ? `?limit=${limit}` : ''}`, { signal }),

  getEstimatedPayout: (matchId: string, score: number, signal?: AbortSignal): Promise<{ estimatedPayout: number }> =>
    fetchWithRetry(`${API_URL}/api/predictions/${encodeURIComponent(matchId)}/estimate/${score}`, { signal }),
};

export default api;
