export interface TeamWithStats {
  id: string;
  name: string;
  symbol: string;
  tokenAddress: string | null;
  color: string;
  currentPrice: number;
  priceChange24h: number;
  sellTaxRate: number;
  performanceScore: number;
  ranking: number;
  wins: number;
  losses: number;
  nrr: number;
}

export interface TradeRequest {
  teamSymbol: string;
  wallet: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  txHash?: string;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  timestamp: number;
}

export interface BallEventData {
  matchId: string;
  innings: number;
  over: number;
  ball: number;
  batter: string;
  bowler: string;
  runs: number;
  extras: number;
  isWicket: boolean;
  wicketType?: string;
  commentary?: string;
}

export interface MatchStatusUpdate {
  matchId: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  homeScore?: string;
  awayScore?: string;
  winnerId?: string;
}

export interface UpsetEventData {
  matchId: string;
  winnerSymbol: string;
  loserSymbol: string;
  upsetScore: number;
  multiplier: number;
  vaultRelease: number;
  totalPayout: number;
  holdersCount: number;
  perHolderPayout: number;
}

export interface OHLCVCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export interface PortfolioPosition {
  teamId: string;
  teamSymbol: string;
  teamName: string;
  teamColor: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface VaultInfo {
  balance: number;
  totalIn: number;
  totalOut: number;
  updatedAt: Date;
}

export interface AiSignal {
  teamSymbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  timestamp: Date;
}

export type Timeframe = '1h' | '24h' | '7d';
