export interface PSLTeam {
  id: string;
  name: string;
  symbol: string;
  color: string;
  secondaryColor: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  sellTax: number;
  buyTax: number;
  contractAddress: string;
  wins: number;
  losses: number;
  nrr: number;
  performanceScore: number;
  ranking: number;
  sparklineData: number[];
}

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeOrder {
  id: string;
  side: "buy" | "sell";
  price: number;
  amount: number;
  timestamp: number;
  txHash: string;
  trader: string;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface Position {
  teamId: string;
  teamName: string;
  symbol: string;
  color: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnlPercent: number;
  unrealizedPnl: number;
  value: number;
}

export interface Reward {
  id: string;
  description: string;
  amount: number;
  token: string;
  claimable: boolean;
  earnedAt: number;
}

export interface Transaction {
  id: string;
  type: "buy" | "sell" | "claim";
  teamSymbol: string;
  amount: number;
  price: number;
  total: number;
  timestamp: number;
  txHash: string;
  status: "confirmed" | "pending" | "failed";
}

export interface MatchData {
  id: string;
  team1: BattingTeamData;
  team2: BattingTeamData;
  status: "live" | "upcoming" | "completed";
  matchType: string;
  venue: string;
  currentBowler: string;
  currentOver: string;
  upsetScore: number;
  vaultBalance: number;
}

export interface BattingTeamData {
  teamId: string;
  teamName: string;
  symbol: string;
  color: string;
  runs: number;
  wickets: number;
  overs: string;
  runRate: number;
  requiredRunRate?: number;
  target?: number;
  isBatting: boolean;
}

export interface BallEvent {
  id: string;
  over: number;
  ball: number;
  runs: number;
  isWicket: boolean;
  isExtra: boolean;
  extraType?: string;
  description: string;
  timestamp: number;
}

export interface UpsetEvent {
  id: string;
  match: string;
  date: number;
  favoriteTeam: string;
  upsetTeam: string;
  multiplier: number;
  vaultSnapshot: number;
  totalPayout: number;
  upsetScore: number;
}

export interface VaultData {
  currentBalance: number;
  totalPayouts: number;
  upsetEvents: UpsetEvent[];
  nextMatchCountdown: number;
  currentMultiplier: number;
}
