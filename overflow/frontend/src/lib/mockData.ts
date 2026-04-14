import type {
  PSLTeam,
  CandlestickData,
  TradeOrder,
  OrderBook,
  Position,
  Reward,
  Transaction,
  MatchData,
  BallEvent,
  UpsetEvent,
  VaultData,
} from "@/types";

// Seeded PRNG (mulberry32) to avoid hydration mismatches from Math.random()
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fixed base timestamp to avoid Date.now() hydration mismatches
const BASE_TIMESTAMP = 1712966400000; // 2024-04-13T00:00:00.000Z
const BASE_TIMESTAMP_SEC = Math.floor(BASE_TIMESTAMP / 1000);

// Create a global seeded random instance for deterministic mock data
const seededRandom = mulberry32(42);

export const PSL_TEAMS: PSLTeam[] = [
  {
    id: "IU",
    name: "Islamabad United",
    symbol: "$IU",
    color: "#E4002B",
    secondaryColor: "#1C1C1C",
    price: 0.0842,
    change24h: 12.4,
    volume24h: 48200,
    marketCap: 842000,
    sellTax: 5,
    buyTax: 3,
    contractAddress: "0x1c8a5A026A4F5CBf7BC4fdE2898d78628A199f1e",
    wins: 7,
    losses: 3,
    nrr: 0.842,
    performanceScore: 87,
    ranking: 1,
    sparklineData: [0.071, 0.074, 0.069, 0.078, 0.08, 0.079, 0.082, 0.0842],
  },
  {
    id: "LQ",
    name: "Lahore Qalandars",
    symbol: "$LQ",
    color: "#00A651",
    secondaryColor: "#1C3A2A",
    price: 0.0631,
    change24h: -3.2,
    volume24h: 31500,
    marketCap: 631000,
    sellTax: 4,
    buyTax: 2,
    contractAddress: "0x66419e794d379E707bc83fd7214cc61F11568e4b",
    wins: 5,
    losses: 5,
    nrr: 0.123,
    performanceScore: 62,
    ranking: 4,
    sparklineData: [0.068, 0.065, 0.067, 0.064, 0.062, 0.065, 0.063, 0.0631],
  },
  {
    id: "MS",
    name: "Multan Sultans",
    symbol: "$MS",
    color: "#00529B",
    secondaryColor: "#001F3F",
    price: 0.0758,
    change24h: 7.8,
    volume24h: 55900,
    marketCap: 758000,
    sellTax: 6,
    buyTax: 3,
    contractAddress: "0x9AF925e33F380eEC57111Da8ED13713afD0953D8",
    wins: 6,
    losses: 4,
    nrr: 0.567,
    performanceScore: 74,
    ranking: 2,
    sparklineData: [0.068, 0.071, 0.073, 0.07, 0.072, 0.074, 0.076, 0.0758],
  },
  {
    id: "KK",
    name: "Karachi Kings",
    symbol: "$KK",
    color: "#00A6DC",
    secondaryColor: "#003D54",
    price: 0.0412,
    change24h: -8.1,
    volume24h: 18200,
    marketCap: 412000,
    sellTax: 7,
    buyTax: 4,
    contractAddress: "0x6D36f154e3b3232a63A6aC1800f02bA233004490",
    wins: 3,
    losses: 7,
    nrr: -0.921,
    performanceScore: 38,
    ranking: 6,
    sparklineData: [0.049, 0.046, 0.044, 0.047, 0.043, 0.042, 0.044, 0.0412],
  },
  {
    id: "PZ",
    name: "Peshawar Zalmi",
    symbol: "$PZ",
    color: "#FDB913",
    secondaryColor: "#3D2E00",
    price: 0.0694,
    change24h: 2.1,
    volume24h: 27800,
    marketCap: 694000,
    sellTax: 5,
    buyTax: 3,
    contractAddress: "0x5f9B45874872796c4b2c8C09ECa7883505CB36A8",
    wins: 5,
    losses: 5,
    nrr: 0.234,
    performanceScore: 61,
    ranking: 3,
    sparklineData: [0.067, 0.068, 0.066, 0.069, 0.067, 0.07, 0.069, 0.0694],
  },
  {
    id: "QG",
    name: "Quetta Gladiators",
    symbol: "$QG",
    color: "#6A0DAD",
    secondaryColor: "#2A0050",
    price: 0.0527,
    change24h: -1.5,
    volume24h: 22100,
    marketCap: 527000,
    sellTax: 5,
    buyTax: 3,
    contractAddress: "0xC9BC62531E5914ba2865FB4B5537B7f84AcE1713",
    wins: 4,
    losses: 6,
    nrr: -0.312,
    performanceScore: 48,
    ranking: 5,
    sparklineData: [0.055, 0.053, 0.056, 0.054, 0.052, 0.054, 0.053, 0.0527],
  },
  {
    id: "HK",
    name: "Hyderabad Kingsmen",
    symbol: "$HK",
    color: "#D4AF37",
    secondaryColor: "#3D2E00",
    price: 0.0495,
    change24h: -5.3,
    volume24h: 15800,
    marketCap: 495000,
    sellTax: 10,
    buyTax: 4,
    contractAddress: "0x96fC2D2B5b6749cD67158215C3Ad05C81502386A",
    wins: 3,
    losses: 6,
    nrr: -0.48,
    performanceScore: 42,
    ranking: 7,
    sparklineData: [0.056, 0.053, 0.051, 0.054, 0.05, 0.049, 0.051, 0.0495],
  },
  {
    id: "RW",
    name: "Rawalpindiz",
    symbol: "$RW",
    color: "#FF6B35",
    secondaryColor: "#3D1A00",
    price: 0.037,
    change24h: -9.8,
    volume24h: 12400,
    marketCap: 370000,
    sellTax: 12,
    buyTax: 5,
    contractAddress: "0xC137B2221E8411F059a5f4E0158161402693757E",
    wins: 2,
    losses: 7,
    nrr: -0.78,
    performanceScore: 35,
    ranking: 8,
    sparklineData: [0.048, 0.045, 0.043, 0.041, 0.04, 0.039, 0.038, 0.037],
  },
];

function generateCandlestickData(
  basePrice: number,
  count: number = 60
): CandlestickData[] {
  const data: CandlestickData[] = [];
  let currentPrice = basePrice * 0.7;
  const now = BASE_TIMESTAMP_SEC;
  const interval = 5 * 60;

  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * interval;
    const volatility = 0.03;
    const change = (seededRandom() - 0.48) * volatility;
    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + seededRandom() * 0.01);
    const low = Math.min(open, close) * (1 - seededRandom() * 0.01);
    const volume = seededRandom() * 10000 + 2000;

    data.push({ time, open, high, low, close, volume });
    currentPrice = close;
  }
  return data;
}

export const CANDLESTICK_DATA: Record<string, CandlestickData[]> = {
  IU: generateCandlestickData(0.0842),
  LQ: generateCandlestickData(0.0631),
  MS: generateCandlestickData(0.0758),
  KK: generateCandlestickData(0.0412),
  PZ: generateCandlestickData(0.0694),
  QG: generateCandlestickData(0.0527),
  HK: generateCandlestickData(0.0495),
  RW: generateCandlestickData(0.037),
};

function generateRecentTrades(teamId: string): TradeOrder[] {
  const team = PSL_TEAMS.find((t) => t.id === teamId)!;
  const trades: TradeOrder[] = [];
  const now = BASE_TIMESTAMP;

  for (let i = 0; i < 20; i++) {
    const r1 = seededRandom();
    const r2 = seededRandom();
    const r3 = seededRandom();
    const r4 = seededRandom();
    const r5 = seededRandom();
    trades.push({
      id: `trade-${teamId}-${i}`,
      side: r1 > 0.5 ? "buy" : "sell",
      price: team.price * (1 + (r2 - 0.5) * 0.02),
      amount: r3 * 5000 + 500,
      timestamp: now - i * 45000,
      txHash: `0x${Math.floor(r4 * 0xffffffff).toString(16).padStart(8, "0")}...`,
      trader: `0x${Math.floor(r5 * 0xffffff).toString(16).padStart(6, "0")}...`,
    });
  }
  return trades;
}

export const RECENT_TRADES: Record<string, TradeOrder[]> = {
  IU: generateRecentTrades("IU"),
  LQ: generateRecentTrades("LQ"),
  MS: generateRecentTrades("MS"),
  KK: generateRecentTrades("KK"),
  PZ: generateRecentTrades("PZ"),
  QG: generateRecentTrades("QG"),
  HK: generateRecentTrades("HK"),
  RW: generateRecentTrades("RW"),
};

function generateOrderBook(basePrice: number): OrderBook {
  const bids = [];
  const asks = [];

  for (let i = 0; i < 10; i++) {
    const bidPrice = basePrice * (1 - (i + 1) * 0.002);
    const askPrice = basePrice * (1 + (i + 1) * 0.002);
    const bidAmount = seededRandom() * 8000 + 1000;
    const askAmount = seededRandom() * 8000 + 1000;

    bids.push({ price: bidPrice, amount: bidAmount, total: bidPrice * bidAmount });
    asks.push({ price: askPrice, amount: askAmount, total: askPrice * askAmount });
  }

  return { bids, asks };
}

export const ORDER_BOOKS: Record<string, OrderBook> = {
  IU: generateOrderBook(0.0842),
  LQ: generateOrderBook(0.0631),
  MS: generateOrderBook(0.0758),
  KK: generateOrderBook(0.0412),
  PZ: generateOrderBook(0.0694),
  QG: generateOrderBook(0.0527),
  HK: generateOrderBook(0.0495),
  RW: generateOrderBook(0.037),
};

export const USER_POSITIONS: Position[] = [
  {
    teamId: "IU",
    teamName: "Islamabad United",
    symbol: "$IU",
    color: "#E4002B",
    amount: 12500,
    avgBuyPrice: 0.0712,
    currentPrice: 0.0842,
    pnlPercent: 18.26,
    unrealizedPnl: 162.5,
    value: 1052.5,
  },
  {
    teamId: "MS",
    teamName: "Multan Sultans",
    symbol: "$MS",
    color: "#00529B",
    amount: 8000,
    avgBuyPrice: 0.0801,
    currentPrice: 0.0758,
    pnlPercent: -5.37,
    unrealizedPnl: -34.4,
    value: 606.4,
  },
  {
    teamId: "PZ",
    teamName: "Peshawar Zalmi",
    symbol: "$PZ",
    color: "#FDB913",
    amount: 5500,
    avgBuyPrice: 0.0658,
    currentPrice: 0.0694,
    pnlPercent: 5.47,
    unrealizedPnl: 19.8,
    value: 381.7,
  },
];

export const USER_REWARDS: Reward[] = [
  {
    id: "r1",
    description: "Upset Prediction Bonus — IU beat LQ",
    amount: 0.42,
    token: "WIRE",
    claimable: true,
    earnedAt: BASE_TIMESTAMP - 86400000,
  },
  {
    id: "r2",
    description: "Staking Rewards — Week 8",
    amount: 0.18,
    token: "WIRE",
    claimable: true,
    earnedAt: BASE_TIMESTAMP - 172800000,
  },
  {
    id: "r3",
    description: "Trading Volume Rebate",
    amount: 0.09,
    token: "WIRE",
    claimable: false,
    earnedAt: BASE_TIMESTAMP - 259200000,
  },
];

export const USER_TRANSACTIONS: Transaction[] = [
  {
    id: "tx1",
    type: "buy",
    teamSymbol: "$IU",
    amount: 5000,
    price: 0.0712,
    total: 356,
    timestamp: BASE_TIMESTAMP - 3600000,
    txHash: "0xabc123...",
    status: "confirmed",
  },
  {
    id: "tx2",
    type: "sell",
    teamSymbol: "$LQ",
    amount: 3000,
    price: 0.0658,
    total: 197.4,
    timestamp: BASE_TIMESTAMP - 86400000,
    txHash: "0xdef456...",
    status: "confirmed",
  },
  {
    id: "tx3",
    type: "buy",
    teamSymbol: "$MS",
    amount: 8000,
    price: 0.0801,
    total: 640.8,
    timestamp: BASE_TIMESTAMP - 172800000,
    txHash: "0xghi789...",
    status: "confirmed",
  },
  {
    id: "tx4",
    type: "claim",
    teamSymbol: "WIRE",
    amount: 0.42,
    price: 1,
    total: 0.42,
    timestamp: BASE_TIMESTAMP - 259200000,
    txHash: "0xjkl012...",
    status: "confirmed",
  },
];

export const LIVE_MATCH: MatchData = {
  id: "match-2026-04-13",
  team1: {
    teamId: "IU",
    teamName: "Islamabad United",
    symbol: "$IU",
    color: "#E4002B",
    runs: 187,
    wickets: 4,
    overs: "18.3",
    runRate: 10.11,
    requiredRunRate: 7.24,
    isBatting: true,
  },
  team2: {
    teamId: "LQ",
    teamName: "Lahore Qalandars",
    symbol: "$LQ",
    color: "#00A651",
    runs: 152,
    wickets: 10,
    overs: "20.0",
    runRate: 7.6,
    isBatting: false,
    target: 188,
  },
  status: "live",
  matchType: "T20 — PSL 2026 Eliminator",
  venue: "National Stadium, Karachi",
  currentBowler: "S. Amir",
  currentOver: "18.3",
  upsetScore: 68,
  vaultBalance: 42800,
};

export const BALL_BY_BALL: BallEvent[] = [
  {
    id: "b1",
    over: 18,
    ball: 3,
    runs: 6,
    isWicket: false,
    isExtra: false,
    description: "SIX! Shadab Khan launches it over long-on! Massive hit!",
    timestamp: BASE_TIMESTAMP - 30000,
  },
  {
    id: "b2",
    over: 18,
    ball: 2,
    runs: 1,
    isWicket: false,
    isExtra: false,
    description: "Pushed to mid-off, quick single taken.",
    timestamp: BASE_TIMESTAMP - 75000,
  },
  {
    id: "b3",
    over: 18,
    ball: 1,
    runs: 4,
    isWicket: false,
    isExtra: false,
    description: "FOUR! Drive through covers, beautiful timing from Azam Khan!",
    timestamp: BASE_TIMESTAMP - 120000,
  },
  {
    id: "b4",
    over: 17,
    ball: 6,
    runs: 0,
    isWicket: true,
    isExtra: false,
    description: "WICKET! Caught at deep mid-wicket! Rauf departs for 34.",
    timestamp: BASE_TIMESTAMP - 180000,
  },
  {
    id: "b5",
    over: 17,
    ball: 5,
    runs: 2,
    isWicket: false,
    isExtra: false,
    description: "Swept fine, two runs collected.",
    timestamp: BASE_TIMESTAMP - 225000,
  },
  {
    id: "b6",
    over: 17,
    ball: 4,
    runs: 0,
    isWicket: false,
    isExtra: true,
    extraType: "wide",
    description: "Wide! Down the leg side, one extra added.",
    timestamp: BASE_TIMESTAMP - 270000,
  },
  {
    id: "b7",
    over: 17,
    ball: 3,
    runs: 6,
    isWicket: false,
    isExtra: false,
    description: "SIX! Pulled over square leg! IU in the ascendancy!",
    timestamp: BASE_TIMESTAMP - 315000,
  },
  {
    id: "b8",
    over: 17,
    ball: 2,
    runs: 1,
    isWicket: false,
    isExtra: false,
    description: "Driven to long-off, single taken.",
    timestamp: BASE_TIMESTAMP - 360000,
  },
];

export const UPSET_HISTORY: UpsetEvent[] = [
  {
    id: "u1",
    match: "KK vs IU — Final",
    date: BASE_TIMESTAMP - 7 * 86400000,
    favoriteTeam: "IU",
    upsetTeam: "KK",
    multiplier: 3.2,
    vaultSnapshot: 38400,
    totalPayout: 122880,
    upsetScore: 82,
  },
  {
    id: "u2",
    match: "QG vs MS — Qualifier 2",
    date: BASE_TIMESTAMP - 14 * 86400000,
    favoriteTeam: "MS",
    upsetTeam: "QG",
    multiplier: 2.8,
    vaultSnapshot: 29100,
    totalPayout: 81480,
    upsetScore: 74,
  },
  {
    id: "u3",
    match: "LQ vs PZ — Group Stage",
    date: BASE_TIMESTAMP - 21 * 86400000,
    favoriteTeam: "LQ",
    upsetTeam: "PZ",
    multiplier: 2.1,
    vaultSnapshot: 21600,
    totalPayout: 45360,
    upsetScore: 61,
  },
];

export const VAULT_DATA: VaultData = {
  currentBalance: 42800,
  totalPayouts: 249720,
  upsetEvents: UPSET_HISTORY,
  nextMatchCountdown: BASE_TIMESTAMP + 4 * 3600000 + 23 * 60000,
  currentMultiplier: 1.8,
};

// ---------------------------------------------------------------------------
// Fan Wars mock data
// ---------------------------------------------------------------------------

export const MOCK_FAN_WARS = [
  {
    id: "fw-1",
    matchId: "match-2026-04-13",
    homeTeamId: "IU",
    homeTeamName: "Islamabad United",
    homeTeamSymbol: "$IU",
    homeTeamColor: "#E4002B",
    awayTeamId: "LQ",
    awayTeamName: "Lahore Qalandars",
    awayTeamSymbol: "$LQ",
    awayTeamColor: "#00A651",
    totalHomeLocked: 12500,
    totalAwayLocked: 8200,
    boostPool: 5420,
    status: "OPEN" as const,
    winnerTeamId: null,
    marginType: null,
    homeBoostShare: null,
    awayBoostShare: null,
    lockDeadline: new Date(BASE_TIMESTAMP + 2 * 3600000 + 34 * 60000).toISOString(),
    matchStartTime: new Date(BASE_TIMESTAMP + 4 * 3600000).toISOString(),
    matchVenue: "National Stadium, Karachi",
    userLock: null,
  },
  {
    id: "fw-2",
    matchId: "match-2026-04-14",
    homeTeamId: "MS",
    homeTeamName: "Multan Sultans",
    homeTeamSymbol: "$MS",
    homeTeamColor: "#00529B",
    awayTeamId: "PZ",
    awayTeamName: "Peshawar Zalmi",
    awayTeamSymbol: "$PZ",
    awayTeamColor: "#FDB913",
    totalHomeLocked: 9800,
    totalAwayLocked: 11400,
    boostPool: 3890,
    status: "OPEN" as const,
    winnerTeamId: null,
    marginType: null,
    homeBoostShare: null,
    awayBoostShare: null,
    lockDeadline: new Date(BASE_TIMESTAMP + 26 * 3600000).toISOString(),
    matchStartTime: new Date(BASE_TIMESTAMP + 28 * 3600000).toISOString(),
    matchVenue: "Multan Cricket Stadium",
    userLock: null,
  },
  {
    id: "fw-3",
    matchId: "match-2026-04-12",
    homeTeamId: "QG",
    homeTeamName: "Quetta Gladiators",
    homeTeamSymbol: "$QG",
    homeTeamColor: "#6A0DAD",
    awayTeamId: "KK",
    awayTeamName: "Karachi Kings",
    awayTeamSymbol: "$KK",
    awayTeamColor: "#00A6DC",
    totalHomeLocked: 7600,
    totalAwayLocked: 5200,
    boostPool: 2840,
    status: "SETTLED" as const,
    winnerTeamId: "QG",
    marginType: "DOMINANT",
    homeBoostShare: 1840,
    awayBoostShare: 1000,
    lockDeadline: new Date(BASE_TIMESTAMP - 24 * 3600000).toISOString(),
    matchStartTime: new Date(BASE_TIMESTAMP - 22 * 3600000).toISOString(),
    matchVenue: "Bugti Stadium, Quetta",
    userLock: null,
  },
];

export const MOCK_FAN_WAR_LEADERBOARD = [
  { rank: 1, wallet: "0x7A3b...9F2c", totalBoost: 4280, warsWon: 12 },
  { rank: 2, wallet: "0xB1d4...3E8a", totalBoost: 3150, warsWon: 9 },
  { rank: 3, wallet: "0x2C9f...7D1b", totalBoost: 2870, warsWon: 11 },
  { rank: 4, wallet: "0xE5a2...1C6d", totalBoost: 2340, warsWon: 8 },
  { rank: 5, wallet: "0x8F6e...4B9a", totalBoost: 1920, warsWon: 7 },
];

export const GLOBAL_STATS = {
  totalVolume: 2840000,
  activeTraders: 3847,
  upsetVaultBalance: 42800,
  nextMatchTime: BASE_TIMESTAMP + 4 * 3600000 + 23 * 60000,
};

// ---------------------------------------------------------------------------
// Predictions mock data
// ---------------------------------------------------------------------------

const PREDICTION_BASE = BASE_TIMESTAMP;

export const MOCK_PREDICTION_POOLS = [
  {
    id: "pred-1",
    matchId: "match-2026-04-14-pred",
    homeTeamName: "Islamabad United",
    homeTeamSymbol: "$IU",
    homeTeamColor: "#E4002B",
    awayTeamName: "Lahore Qalandars",
    awayTeamSymbol: "$LQ",
    awayTeamColor: "#00A651",
    entryFee: 25,
    totalPool: 3750,
    participantCount: 150,
    status: "OPEN" as const,
    deadline: new Date(PREDICTION_BASE + 3 * 3600000).toISOString(),
    matchStartTime: new Date(PREDICTION_BASE + 4 * 3600000).toISOString(),
    matchVenue: "National Stadium, Karachi",
    highestScore: null,
    questions: [
      {
        questionIndex: 0,
        questionText: "Who will win the toss?",
        options: ["Islamabad United", "Lahore Qalandars"],
        points: 10,
        isLive: false,
        deadline: new Date(PREDICTION_BASE + 3 * 3600000).toISOString(),
        resolved: false,
        correctOption: null,
      },
      {
        questionIndex: 1,
        questionText: "Total runs in the first innings?",
        options: ["Under 150", "150-170", "171-190", "Above 190"],
        points: 20,
        isLive: false,
        deadline: new Date(PREDICTION_BASE + 3 * 3600000).toISOString(),
        resolved: false,
        correctOption: null,
      },
      {
        questionIndex: 2,
        questionText: "Highest individual score in the match?",
        options: ["Under 40", "40-60", "61-80", "Above 80"],
        points: 20,
        isLive: false,
        deadline: new Date(PREDICTION_BASE + 3 * 3600000).toISOString(),
        resolved: false,
        correctOption: null,
      },
      {
        questionIndex: 3,
        questionText: "Total sixes in the match?",
        options: ["Under 8", "8-12", "13-18", "Above 18"],
        points: 25,
        isLive: false,
        deadline: new Date(PREDICTION_BASE + 3 * 3600000).toISOString(),
        resolved: false,
        correctOption: null,
      },
      {
        questionIndex: 4,
        questionText: "Match winner?",
        options: ["Islamabad United", "Lahore Qalandars"],
        points: 25,
        isLive: false,
        deadline: new Date(PREDICTION_BASE + 3 * 3600000).toISOString(),
        resolved: false,
        correctOption: null,
      },
    ],
    userEntry: null,
  },
  {
    id: "pred-2",
    matchId: "match-2026-04-13-pred",
    homeTeamName: "Multan Sultans",
    homeTeamSymbol: "$MS",
    homeTeamColor: "#00529B",
    awayTeamName: "Peshawar Zalmi",
    awayTeamSymbol: "$PZ",
    awayTeamColor: "#FDB913",
    entryFee: 25,
    totalPool: 5200,
    participantCount: 208,
    status: "LIVE" as const,
    deadline: new Date(PREDICTION_BASE - 1 * 3600000).toISOString(),
    matchStartTime: new Date(PREDICTION_BASE - 0.5 * 3600000).toISOString(),
    matchVenue: "Multan Cricket Stadium",
    highestScore: 75,
    questions: [
      {
        questionIndex: 0,
        questionText: "Who will win the toss?",
        options: ["Multan Sultans", "Peshawar Zalmi"],
        points: 10,
        isLive: false,
        deadline: new Date(PREDICTION_BASE - 1 * 3600000).toISOString(),
        resolved: true,
        correctOption: 0,
      },
      {
        questionIndex: 1,
        questionText: "Total runs in the first innings?",
        options: ["Under 150", "150-170", "171-190", "Above 190"],
        points: 20,
        isLive: false,
        deadline: new Date(PREDICTION_BASE - 1 * 3600000).toISOString(),
        resolved: true,
        correctOption: 2,
      },
      {
        questionIndex: 2,
        questionText: "Will there be a wicket in the next over?",
        options: ["Yes", "No"],
        points: 15,
        isLive: true,
        deadline: new Date(PREDICTION_BASE + 0.05 * 3600000).toISOString(),
        resolved: false,
        correctOption: null,
      },
      {
        questionIndex: 3,
        questionText: "Highest individual score in the match?",
        options: ["Under 40", "40-60", "61-80", "Above 80"],
        points: 25,
        isLive: false,
        deadline: new Date(PREDICTION_BASE - 1 * 3600000).toISOString(),
        resolved: false,
        correctOption: null,
      },
      {
        questionIndex: 4,
        questionText: "Match winner?",
        options: ["Multan Sultans", "Peshawar Zalmi"],
        points: 30,
        isLive: false,
        deadline: new Date(PREDICTION_BASE - 1 * 3600000).toISOString(),
        resolved: false,
        correctOption: null,
      },
    ],
    userEntry: {
      answers: [
        { questionIndex: 0, chosenOption: 0, isCorrect: true, pointsEarned: 10 },
        { questionIndex: 1, chosenOption: 2, isCorrect: true, pointsEarned: 20 },
        { questionIndex: 2, chosenOption: -1, isCorrect: null, pointsEarned: null },
        { questionIndex: 3, chosenOption: 2, isCorrect: null, pointsEarned: null },
        { questionIndex: 4, chosenOption: 0, isCorrect: null, pointsEarned: null },
      ],
      totalScore: null,
      payout: null,
      claimed: false,
    },
  },
  {
    id: "pred-3",
    matchId: "match-2026-04-12-pred",
    homeTeamName: "Quetta Gladiators",
    homeTeamSymbol: "$QG",
    homeTeamColor: "#6A0DAD",
    awayTeamName: "Karachi Kings",
    awayTeamSymbol: "$KK",
    awayTeamColor: "#00A6DC",
    entryFee: 25,
    totalPool: 4500,
    participantCount: 180,
    status: "SETTLED" as const,
    deadline: new Date(PREDICTION_BASE - 25 * 3600000).toISOString(),
    matchStartTime: new Date(PREDICTION_BASE - 24 * 3600000).toISOString(),
    matchVenue: "Bugti Stadium, Quetta",
    highestScore: 90,
    questions: [
      {
        questionIndex: 0,
        questionText: "Who will win the toss?",
        options: ["Quetta Gladiators", "Karachi Kings"],
        points: 10,
        isLive: false,
        deadline: new Date(PREDICTION_BASE - 25 * 3600000).toISOString(),
        resolved: true,
        correctOption: 0,
      },
      {
        questionIndex: 1,
        questionText: "Total runs in the first innings?",
        options: ["Under 150", "150-170", "171-190", "Above 190"],
        points: 20,
        isLive: false,
        deadline: new Date(PREDICTION_BASE - 25 * 3600000).toISOString(),
        resolved: true,
        correctOption: 3,
      },
      {
        questionIndex: 2,
        questionText: "Highest individual score in the match?",
        options: ["Under 40", "40-60", "61-80", "Above 80"],
        points: 20,
        isLive: false,
        deadline: new Date(PREDICTION_BASE - 25 * 3600000).toISOString(),
        resolved: true,
        correctOption: 3,
      },
      {
        questionIndex: 3,
        questionText: "Total sixes in the match?",
        options: ["Under 8", "8-12", "13-18", "Above 18"],
        points: 25,
        isLive: false,
        deadline: new Date(PREDICTION_BASE - 25 * 3600000).toISOString(),
        resolved: true,
        correctOption: 2,
      },
      {
        questionIndex: 4,
        questionText: "Match winner?",
        options: ["Quetta Gladiators", "Karachi Kings"],
        points: 25,
        isLive: false,
        deadline: new Date(PREDICTION_BASE - 25 * 3600000).toISOString(),
        resolved: true,
        correctOption: 0,
      },
    ],
    userEntry: {
      answers: [
        { questionIndex: 0, chosenOption: 0, isCorrect: true, pointsEarned: 10 },
        { questionIndex: 1, chosenOption: 2, isCorrect: false, pointsEarned: 0 },
        { questionIndex: 2, chosenOption: 3, isCorrect: true, pointsEarned: 20 },
        { questionIndex: 3, chosenOption: 2, isCorrect: true, pointsEarned: 25 },
        { questionIndex: 4, chosenOption: 0, isCorrect: true, pointsEarned: 25 },
      ],
      totalScore: 80,
      payout: 112.5,
      claimed: false,
    },
  },
];

export const MOCK_PREDICTION_LEADERBOARD = [
  { wallet: "0x7A3b...9F2c", avgScore: 82.4, totalProfit: 1240, matchesPlayed: 18, bestScore: 100 },
  { wallet: "0xB1d4...3E8a", avgScore: 78.1, totalProfit: 980, matchesPlayed: 15, bestScore: 95 },
  { wallet: "0x2C9f...7D1b", avgScore: 74.6, totalProfit: 860, matchesPlayed: 20, bestScore: 90 },
  { wallet: "0xE5a2...1C6d", avgScore: 71.2, totalProfit: 720, matchesPlayed: 14, bestScore: 85 },
  { wallet: "0x8F6e...4B9a", avgScore: 68.9, totalProfit: 610, matchesPlayed: 16, bestScore: 90 },
  { wallet: "0xD3c7...2A5f", avgScore: 65.3, totalProfit: 480, matchesPlayed: 12, bestScore: 80 },
  { wallet: "0xA9e1...8B4c", avgScore: 62.7, totalProfit: 350, matchesPlayed: 11, bestScore: 85 },
  { wallet: "0x1F8d...6C3e", avgScore: 59.4, totalProfit: 220, matchesPlayed: 13, bestScore: 75 },
  { wallet: "0x4B2a...9D7f", avgScore: 55.8, totalProfit: 140, matchesPlayed: 10, bestScore: 70 },
  { wallet: "0x6E5c...1A8b", avgScore: 52.1, totalProfit: 80, matchesPlayed: 8, bestScore: 65 },
];
