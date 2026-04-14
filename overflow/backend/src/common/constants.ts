/**
 * Symbol translation between backend/frontend short symbols and on-chain registered symbols.
 *
 * The smart contracts were deployed with 3-letter city-based symbols (ISU, LHQ, MLS, etc.)
 * while the rest of the stack uses the familiar 2-letter abbreviations (IU, LQ, MS, etc.).
 */
export const SYMBOL_TO_ONCHAIN: Record<string, string> = {
  IU: 'ISU',
  LQ: 'LHQ',
  MS: 'MLS',
  KK: 'KRK',
  PZ: 'PSZ',
  QG: 'QTG',
  HK: 'HKM',
  RW: 'RWP',
};

export const ONCHAIN_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_TO_ONCHAIN).map(([k, v]) => [v, k]),
);

/**
 * Translate a backend symbol to its on-chain equivalent.
 * Returns the input unchanged if no mapping exists (forward-compatible).
 */
export function toOnChainSymbol(symbol: string): string {
  return SYMBOL_TO_ONCHAIN[symbol] ?? symbol;
}

/**
 * Translate an on-chain symbol back to the backend equivalent.
 * Returns the input unchanged if no mapping exists (forward-compatible).
 */
export function fromOnChainSymbol(onChainSymbol: string): string {
  return ONCHAIN_TO_SYMBOL[onChainSymbol] ?? onChainSymbol;
}

/**
 * Sell tax percentage by team ranking (1 = best, 8 = worst).
 * Higher-ranked teams have lower sell tax to reward holders of top performers.
 * Single source of truth — used by seed, PriceService, and OracleService.
 */
export const SELL_TAX_BY_RANK: Record<number, number> = {
  1: 2,
  2: 3,
  3: 5,
  4: 7,
  5: 9,
  6: 12,
  7: 15,
  8: 15,
};

// ---------------------------------------------------------------------------
// Vault constants
// ---------------------------------------------------------------------------

/** Initial vault balance on creation (in WIRE) */
export const VAULT_INITIAL_BALANCE = 1000;

// ---------------------------------------------------------------------------
// Oracle / performance score constants
// ---------------------------------------------------------------------------

/** Performance score delta added to the winner after a match */
export const WIN_SCORE_DELTA = 8;

/** Performance score delta subtracted from the loser after a match */
export const LOSS_SCORE_DELTA = 5;

/** Minimum upset score threshold to trigger vault payout */
export const UPSET_THRESHOLD = 20;

// ---------------------------------------------------------------------------
// Bonding curve constants
// ---------------------------------------------------------------------------

/** Bonding curve steepness coefficient */
export const BONDING_CURVE_K = 0.0001;

/** Base price floor for all team tokens (in WIRE) */
export const BASE_PRICE = 1.0;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Map an upset score to its payout multiplier.
 * Used by VaultService and admin trigger-upset endpoint.
 */
export function getMultiplier(upsetScore: number): number {
  if (upsetScore >= 80) return 5;
  if (upsetScore >= 60) return 4;
  if (upsetScore >= 40) return 3;
  if (upsetScore >= 20) return 2;
  return 1;
}
