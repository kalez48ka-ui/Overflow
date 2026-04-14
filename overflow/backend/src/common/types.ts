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
  avgHolderPayout: number;
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

export type MarginType = 'CLOSE' | 'NORMAL' | 'DOMINANT';

export interface FanWarStatus {
  id: string;
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  totalHomeLocked: number;
  totalAwayLocked: number;
  boostPool: number;
  status: string;
  winnerTeamId: string | null;
  marginType: string | null;
  homeBoostShare: number | null;
  awayBoostShare: number | null;
  lockDeadline: Date;
  settledAt: Date | null;
  locks: FanWarLockInfo[];
}

export interface FanWarLockInfo {
  id: string;
  wallet: string;
  teamId: string;
  amount: number;
  boostReward: number | null;
  claimed: boolean;
  createdAt: Date;
}

export interface LeaderboardEntry {
  wallet: string;
  totalLocked: number;
  totalBoost: number;
  warCount: number;
}

export interface FanWarClaimResult {
  boostReward: number;
  tokensReturned: number;
}

export interface PredictionPoolStatus {
  id: string;
  matchId: string;
  entryFee: number;
  totalPool: number;
  participantCount: number;
  status: string;
  deadline: Date;
  settledAt: Date | null;
  claimDeadline: Date | null;
  highestScore: number | null;
  questions: PredictionQuestionInfo[];
  userEntry?: PredictionEntryInfo | null;
}

export interface PredictionQuestionInfo {
  id: string;
  questionIndex: number;
  questionText: string;
  options: string[];
  correctOption: number | null;
  points: number;
  isLive: boolean;
  deadline: Date;
  resolved: boolean;
}

export interface PredictionEntryInfo {
  id: string;
  wallet: string;
  totalScore: number | null;
  payout: number | null;
  claimed: boolean;
  answers: PredictionAnswerInfo[];
}

export interface PredictionAnswerInfo {
  questionIndex: number;
  chosenOption: number;
  isCorrect: boolean | null;
  pointsEarned: number | null;
}

export interface PredictionClaimResult {
  payout: number;
  matchId: string;
}

export interface PredictionLeaderboardEntry {
  wallet: string;
  totalEarnings: number;
  totalPools: number;
  avgScore: number;
}
