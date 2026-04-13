const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:5001";

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
  options?: RequestInit,
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

/** Build headers that include the admin token when available. */
export function adminHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("overflow_admin_token")
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
// API client
// ---------------------------------------------------------------------------

export const api = {
  // ---- Teams ----
  teams: {
    getAll: (): Promise<TeamData[]> =>
      fetchJSON(`${API_URL}/api/teams`),

    getBySymbol: (symbol: string): Promise<TeamData> =>
      fetchJSON(`${API_URL}/api/teams/${encodeURIComponent(symbol)}`),

    getPriceHistory: (
      symbol: string,
      timeframe: string = "1h",
    ): Promise<PricePoint[]> =>
      fetchJSON(
        `${API_URL}/api/teams/${encodeURIComponent(symbol)}/prices?timeframe=${encodeURIComponent(timeframe)}`,
      ),
  },

  // ---- Trades ----
  trades: {
    create: (trade: CreateTradeDto): Promise<TradeRecord> =>
      fetchJSON(`${API_URL}/api/trades`, {
        method: "POST",
        body: JSON.stringify(trade),
      }),

    getRecent: (limit: number = 50): Promise<TradeRecord[]> =>
      fetchJSON(`${API_URL}/api/trades/recent?limit=${limit}`),

    getByWallet: (wallet: string): Promise<TradeRecord[]> =>
      fetchJSON(
        `${API_URL}/api/trades/wallet/${encodeURIComponent(wallet)}`,
      ),
  },

  // ---- Matches ----
  matches: {
    getLive: (): Promise<MatchInfo[]> =>
      fetchJSON(`${API_URL}/api/matches/live`),

    getUpcoming: (): Promise<MatchInfo[]> =>
      fetchJSON(`${API_URL}/api/matches/upcoming`),

    getAll: (): Promise<MatchInfo[]> =>
      fetchJSON(`${API_URL}/api/matches`),

    getCompleted: (): Promise<MatchInfo[]> =>
      fetchJSON(`${API_URL}/api/matches/completed`),

    getById: (id: string): Promise<MatchInfo> =>
      fetchJSON(`${API_URL}/api/matches/${encodeURIComponent(id)}`),
  },

  // ---- Portfolio ----
  portfolio: {
    get: (wallet: string): Promise<PortfolioData> =>
      fetchJSON(
        `${API_URL}/api/portfolio/${encodeURIComponent(wallet)}`,
      ),

    getHistory: (
      wallet: string,
      days: number = 30,
    ): Promise<{ date: string; value: number }[]> =>
      fetchJSON(
        `${API_URL}/api/portfolio/${encodeURIComponent(wallet)}/history?days=${days}`,
      ),
  },

  // ---- Vault ----
  vault: {
    getState: (): Promise<VaultState> =>
      fetchJSON(`${API_URL}/api/vault`),

    getUpsets: (): Promise<UpsetRecord[]> =>
      fetchJSON(`${API_URL}/api/vault/upsets`),
  },

  // ---- Leaderboard ----
  leaderboard: {
    get: (sort: string = 'pnl', limit: number = 50): Promise<LeaderboardEntry[]> =>
      fetchJSON(`${API_URL}/api/leaderboard?sort=${sort}&limit=${limit}`),
  },

  // ---- AI Engine ----
  ai: {
    analyze: (
      homeTeam: string,
      awayTeam: string,
    ): Promise<AIAnalysis> =>
      fetchJSON(`${AI_API_URL}/api/ai/analyze`, {
        method: "POST",
        body: JSON.stringify({ homeTeam, awayTeam }),
      }),

    signal: (matchState: Record<string, unknown>): Promise<AISignal> =>
      fetchJSON(`${AI_API_URL}/api/ai/signal`, {
        method: "POST",
        body: JSON.stringify({ matchState }),
      }),

    query: (question: string): Promise<AIQueryResponse> =>
      fetchJSON(`${AI_API_URL}/api/ai/query`, {
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
      await adminFetchJSON(`${API_URL}/api/admin/recalculate`, {
        method: "POST",
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
    fetchJSON(`${API_URL}/api/fanwars/${encodeURIComponent(matchId)}`),

  lock: (
    matchId: string,
    body: { wallet: string; teamId: string; amount: number },
  ): Promise<{ success: boolean; lockId: string }> =>
    fetchJSON(`${API_URL}/api/fanwars/${encodeURIComponent(matchId)}/lock`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  claim: (
    matchId: string,
    body: { wallet: string },
  ): Promise<{ success: boolean; claimed: number }> =>
    fetchJSON(`${API_URL}/api/fanwars/${encodeURIComponent(matchId)}/claim`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getActive: (): Promise<FanWarStatus[]> =>
    fetchJSON(`${API_URL}/api/fanwars/active`),

  getUserLocks: (wallet: string): Promise<FanWarLock[]> =>
    fetchJSON(
      `${API_URL}/api/fanwars/user/${encodeURIComponent(wallet)}`,
    ),

  getLeaderboard: (): Promise<
    { rank: number; wallet: string; totalBoost: number; warsWon: number }[]
  > => fetchJSON(`${API_URL}/api/fanwars/leaderboard`),
};

export default api;
