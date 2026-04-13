# Overflow - Complete Technical Audit Report

**Date**: April 13, 2026
**Platform**: PSL Cricket Team Token Trading on WireFluid Blockchain
**Type**: 48-Hour Hackathon Project

---

## 1. Project Overview

Overflow is a full-stack decentralized platform where users trade PSL (Pakistan Super League) cricket team tokens whose prices are driven by real match performance. It features asymmetric bonding curves, a dynamic sell-tax system, an Upset Vault that rewards holders when underdogs win, and an AI engine for match analysis and trading signals.

### Architecture

```
+------------------+     +------------------+     +------------------+
|    Frontend      |     |    Backend        |     |    AI Engine      |
|  Next.js 16.2    |<--->|  Express + Prisma |<--->|  Flask + ChromaDB |
|  Port 3000       |     |  Port 3001        |     |  Port 5001        |
|  React 19 + wagmi|     |  PostgreSQL       |     |  LangChain + Claude|
+------------------+     +------------------+     +------------------+
         |                        |
         v                        v
+------------------+     +------------------+
|  WireFluid Chain |     |   PostgreSQL DB   |
|  Chain ID: 7777  |     |   8 tables        |
|  6 Smart Contracts|     |   Prisma ORM      |
+------------------+     +------------------+
```

### Total Codebase

| Layer | Files | Lines of Code |
|-------|-------|---------------|
| Backend (TypeScript) | 12 source files | 1,799 |
| Frontend (TypeScript/React) | 22 source files | 5,554 |
| AI Engine (Python) | 8 source files | 3,354 |
| Smart Contracts (Solidity) | 6 contracts + 1 test | 2,279 |
| Infrastructure | 3 config files | 276 |
| **Total** | **51 files** | **13,262** |

---

## 2. Layer-by-Layer Breakdown

### 2.1 Smart Contracts (6 contracts, 1,698 lines Solidity)

| Contract | Lines | Purpose |
|----------|-------|---------|
| TeamTokenFactory | 448 | Asymmetric bonding curve (buy=supply^1.5, sell=supply^1.2) |
| TeamToken | 207 | ERC-20 with progressive sell tax + anti-whale limits |
| PerformanceOracle | 280 | 2-of-3 multisig oracle for match scores |
| RewardDistributor | 289 | Fee collection + ranking-based reward distribution |
| UpsetVault | 259 | Fee accumulation + upset-triggered payouts to holders |
| CircuitBreaker | 215 | Price-movement based emergency pause mechanism |

**Test Suite**: 581 lines, 41/41 tests passing.

### 2.2 Backend API (Express.js + Prisma, 1,799 lines)

| Route | Endpoints | Purpose |
|-------|-----------|---------|
| `/api/teams` | 3 GET | Team listings, details, price history (OHLCV) |
| `/api/trades` | 4 GET + 1 POST | Execute trades, recent trades, wallet trades |
| `/api/matches` | 4 GET | Live/upcoming matches, ball events |
| `/api/portfolio` | 2 GET | Holdings, P&L, allocation, history |
| `/api/vault` | 2 GET | Vault state, upset event history |
| `/api/ai` | 2 GET | Mock AI analysis + trading signals |

**Services**: PriceService (bonding curve), CricketDataService (live polling + mock), VaultService (fee routing), OracleService (rankings + tax)

**Database**: PostgreSQL with 8 Prisma models (Team, Match, BallEvent, Trade, Position, PricePoint, UpsetEvent, VaultState)

### 2.3 Frontend (Next.js 16 + React 19, 5,554 lines)

| Page | Lines | Features |
|------|-------|----------|
| Home `/` | 277 | Hero, team cards grid, how-it-works, vault explainer |
| Trade `/trade/[team]` | 387 | Candlestick chart, order book, buy/sell panel, team stats |
| Match `/match` | 316 | Live scorecard, ball-by-ball, upset tracker, AI signals |
| Portfolio `/portfolio` | 332 | Holdings table, pie chart, P&L, rewards panel |
| Vault `/vault` | 344 | Vault balance, upset history, multiplier table |

**Components**: 12 reusable components (Navbar, TeamCard, TradingChart, BuySellPanel, LiveScorecard, BallByBall, AIAnalysis, UpsetVaultDisplay, PositionCard, RewardsPanel, StatsBar, WalletProvider)

**Web3**: wagmi + RainbowKit with 606-line hooks file covering all 6 contract ABIs.

### 2.4 AI Engine (Flask + ChromaDB, 3,354 lines)

| Module | Lines | Purpose |
|--------|-------|---------|
| server.py | 361 | Flask API with 7 endpoints, lazy initialization |
| pipeline.py | 434 | LangChain RAG with Claude, template fallback |
| signals.py | 439 | Live trading signal generator (heuristic + ML) |
| report_generator.py | 330 | Pre-match analysis reports |
| win_probability.py | 402 | Logistic regression model trained on Cricsheet data |
| vector_store.py | 233 | ChromaDB with 3 collections (matches, innings, players) |
| ingest.py | 993 | Cricsheet PSL data parser with demo fallback |
| config.py | 162 | Team metadata, Flask config, trading context |

**Data**: 1,436 documents ingested (333 matches, 671 innings, 432 players from PSL history)

---

## 3. What's Working (COMPLETE)

1. **Full UI rendering** - All 5 pages render with polished dark theme, responsive design
2. **Mock trading flow** - Buy/sell panels with amount input, fee calculation, success feedback
3. **Candlestick charts** - TradingView Lightweight Charts with OHLCV data
4. **Live scorecard** - Simulated ball-by-ball cricket feed with runs, wickets, commentary
5. **Upset vault display** - Vault balance, multiplier tiers, countdown timer
6. **Portfolio dashboard** - Holdings, pie chart allocation, P&L calculations
7. **Backend API** - All 16 endpoints responding, data properly formatted for frontend
8. **Database** - 6 PSL teams seeded, price history, matches, vault initialized
9. **AI engine** - Health endpoint live, vector store populated, win probability model trained
10. **WebSocket** - Price updates every 10s, match events, trade notifications
11. **Smart contracts** - 41/41 tests passing, full bonding curve + vault mechanics
12. **Wallet connect** - RainbowKit modal with WireFluid chain config
13. **PM2 deployment** - All 3 services running on public IP
14. **Docker compose** - Full stack config with healthchecks

---

## 4. Remaining Gaps

### 4.1 CRITICAL Gaps (Demo Breakers)

#### Gap 1: Frontend Uses Mock Data Only - No Real API Integration
**Impact**: The entire UI shows hardcoded mock data. Changes in the backend (new trades, price updates, match results) are NOT reflected in the frontend.

**Details**:
- All pages import from `mockData.ts` instead of calling `api.ts`
- The `api.ts` client is fully built (250 lines) but never imported by any page/component
- Portfolio shows fake positions regardless of wallet
- Vault history shows hardcoded upset events
- Trade history shows pre-generated fake trades

**Files affected**: All 5 pages + most components
**Effort to fix**: Medium - need to replace mock data imports with `useEffect` + `api.ts` calls in each page

#### Gap 2: Buy/Sell Panel Does NOT Execute Real Transactions
**Impact**: Clicking "Buy" or "Sell" shows a fake success animation but no blockchain transaction occurs.

**Details**:
- `BuySellPanel.tsx:37-47` uses `setTimeout(2000)` to simulate a transaction
- The `useContracts.ts` hooks (`useBuyTokens`, `useSellTokens`) are fully implemented (606 lines) but never called
- No wallet balance check before trade
- No actual contract interaction

**File**: `frontend/src/components/BuySellPanel.tsx`
**Effort to fix**: Medium - wire up the existing hooks

#### Gap 3: Smart Contracts Not Deployed
**Impact**: Even if frontend calls contracts, all addresses are `0x0000...0000` placeholders.

**Details**:
- `FACTORY_ADDRESS=""` in backend `.env`
- `CONTRACTS` in `wagmi.ts` uses `0x...0001` through `0x...0015`
- `useContracts.ts` uses `0x0000000000000000000000000000000000000000` defaults
- Deploy script exists but hasn't been run on WireFluid testnet

**Effort to fix**: Low - run deploy script, update env vars

#### Gap 4: No User Authentication
**Impact**: Any user can submit trades for any wallet address. No signature verification.

**Details**:
- Trade endpoint accepts any `wallet` string in request body
- No JWT, session, or wallet signature verification
- Any caller can view/modify any wallet's data

**Effort to fix**: Medium - add EIP-712 signature verification on trade endpoints

### 4.2 HIGH Gaps (Functionality Incomplete)

#### Gap 5: Backend AI Route is Mock-Only
**Impact**: The backend's `/api/ai/analysis/:matchId` generates hardcoded reports, not real AI analysis.

**Details**:
- `routes/ai.ts` (153 lines) generates template analysis without calling the AI engine
- The AI engine on port 5001 has real RAG capabilities but is never called by the backend
- Frontend's AI section uses additional hardcoded mock data

**Effort to fix**: Low - replace mock with HTTP calls to `http://localhost:5001/api/ai/analyze`

#### Gap 6: AI Engine LLM Not Connected
**Impact**: AI endpoints work but return template-based responses, not Claude-generated analysis.

**Details**:
- `ANTHROPIC_API_KEY=""` in ecosystem.config.js
- RAG pipeline falls back to template responses when no API key
- Win probability model works (trained on Cricsheet data)
- Signal generation uses heuristics only

**Effort to fix**: Low - add API key to env

#### Gap 7: Cricket Data is Mock-Only
**Impact**: No real match data flows into the system.

**Details**:
- `CRICKET_API_KEY=""` in backend .env
- `CricketDataService` falls back to mock ball generation
- Mock matches are created with random scores
- Real Cricapi.com integration code exists but is untested

**Effort to fix**: Low - add API key, but PSL season timing matters

#### Gap 8: Rewards/Vault Claims Not Wired
**Impact**: Users see claimable rewards but "Claim" buttons are non-functional.

**Details**:
- `RewardsPanel.tsx` uses `setTimeout` to simulate claims
- `useContracts.ts` has `useClaimRewards()` and `useClaimUpsetReward()` hooks ready
- No contract deployed to claim from

**Effort to fix**: Low (once contracts deployed)

#### Gap 9: No Error Boundaries in Frontend
**Impact**: Any JavaScript error crashes the entire page.

**Details**:
- No React error boundaries in any page
- If TradingChart fails to load, whole trade page crashes
- No fallback UI for API failures

**Effort to fix**: Low - add ErrorBoundary wrapper component

#### Gap 10: WalletConnect Project ID Invalid
**Impact**: Mobile wallet QR code connections will fail.

**Details**:
- `projectId: "overflow-hackathon-2026"` in wagmi.ts
- WalletConnect requires a valid UUID from cloud.walletconnect.com
- MetaMask browser extension still works (uses injected provider)

**Effort to fix**: Trivial - register and get valid ID

### 4.3 MEDIUM Gaps (Polish & Hardening)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 11 | No rate limiting on any endpoint | DoS/spam vulnerability | Low |
| 12 | CORS wide open (`origin: *`) on backend + AI | Any website can call API | Low |
| 13 | No request body size limit | Memory exhaustion possible | Trivial |
| 14 | Socket.IO rooms accept unvalidated input | Memory exhaustion via fake rooms | Low |
| 15 | No database seeding script visible | Manual team insertion required | Low |
| 16 | Bonding curve formula dead code | `calculateBondingCurvePrice` never called; linear model used instead | Medium |
| 17 | Price history aggregation untested | OHLCV grouping logic not verified | Low |
| 18 | No request timeout in frontend `fetchJSON` | API calls hang if backend down | Low |
| 19 | `recharts` bundle (200KB) for single pie chart | Portfolio page load time | Low |
| 20 | No favicon or OG images | Missing branding in browser tab | Trivial |

### 4.4 LOW Gaps (Nice-to-Have)

| # | Gap | Note |
|---|-----|------|
| 21 | Float used for monetary values (should be Decimal) | Acceptable for hackathon |
| 22 | No backend unit tests | Only contract tests exist |
| 23 | No E2E tests | Manual testing only |
| 24 | Duplicate `CONTRACTS` exports in wagmi.ts vs useContracts.ts | Confusing but not breaking |
| 25 | Mismatched ABI function names (`buyTokens` vs `buy`) | Only matters when contracts deploy |
| 26 | No graceful shutdown wait for in-flight requests | Minor data consistency risk |
| 27 | AI bowler team assignment bug | Bowlers listed under wrong franchise in vector store |
| 28 | AI overs-to-balls conversion bug | Slightly incorrect win probability features |

---

## 5. Bugs Fixed in This Audit

### Backend (9 fixes applied)

| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 1 | Sell without balance check | CRITICAL | Added pre-validation for position existence + sufficient amount |
| 2 | User-supplied price for fee calc | CRITICAL | Now uses `team.currentPrice` for all economics |
| 3 | Vault payout exceeds release | HIGH | Multiplier applied to releasePercent, totalPayout capped |
| 4 | Vault addToVault race condition | HIGH | Replaced read-then-write with atomic `{ increment }` |
| 5 | Match never determines winner | HIGH | Parses scores, compares runs, sets winnerId |
| 6 | parseInt NaN on query params | MEDIUM | Added `\|\| defaultValue` fallback |
| 7 | No unhandled rejection handler | MEDIUM | Added process error handlers |
| 8 | Upset score can go negative | MEDIUM | Clamped with `Math.max(0, ...)` |
| 9 | Sell of non-existent position | MEDIUM | Returns 400 error instead of silent success |

### Frontend (7 fixes applied)

| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 1 | Hydration mismatch (Math.random) | CRITICAL | Seeded PRNG (mulberry32) for deterministic data |
| 2 | TradingChart zombie instances | HIGH | Ref-based cleanup prevents chart stacking |
| 3 | Portfolio division by zero | HIGH | Safe costBasis guard |
| 4 | Navbar ping dot mispositioned | HIGH | Added `relative` class to parent span |
| 5 | Full-page reload navigation | MEDIUM | Replaced `window.location.href` with `router.push()` |
| 6 | Unused imports | LOW | Removed `useMemo`, dead `action` state |
| 7 | BuySellPanel sell display | MEDIUM | Shows "WIRE" instead of "$" for sell proceeds |

### API Contract Mismatches (7 fixes applied)

| # | Mismatch | Fix |
|---|----------|-----|
| 1 | Response wrapped in `{success, data}` | Removed envelope, return raw data |
| 2 | Trade DTO: `side` vs `type` | Backend accepts both, normalizes |
| 3 | Team field names differ | Maps `currentPrice`->`price`, `tokenAddress`->`contractAddress`, etc. |
| 4 | Price history path: `/prices` vs `/price-history` | Added `/prices` route alias |
| 5 | No wallet trades endpoint | Added `GET /api/trades/wallet/:wallet` |
| 6 | Vault field names differ | Maps `totalIn`->`totalDeposited`, adds `currentEpoch` |
| 7 | Match/Portfolio response shape | Mapped to frontend interfaces |

---

## 6. Smart Contract Security Findings (Not Yet Fixed)

These are in the deployed Solidity contracts. Since contracts are NOT yet deployed, these should be fixed before deployment.

| Severity | Issue | Contract |
|----------|-------|----------|
| CRITICAL | Reward drain via flash-bought tokens (snapshot attack) | RewardDistributor |
| CRITICAL | Vault insolvency from multiple upsets before claims | UpsetVault |
| CRITICAL | Factory ETH insolvency (fees drain buy reserves) | TeamTokenFactory |
| CRITICAL | Unbounded gas in `_calculateBuyTokens` loop | TeamTokenFactory |
| HIGH | Oracle confirmation doesn't verify matching scores | PerformanceOracle |
| HIGH | No upper bound on `setBaseSellTax` (can set 100%) | TeamToken |
| HIGH | Admin centralization (owner can drain all funds) | Multiple |
| HIGH | Front-running distribution/upset triggers | RewardDistributor, UpsetVault |

---

## 7. Priority Recommendations

### For Hackathon Demo (Next 24 hours)

1. **Wire frontend to real API** (Gap 1) - Replace mock data with `api.ts` calls
2. **Deploy contracts** (Gap 3) - Run deploy script on WireFluid testnet
3. **Wire BuySellPanel to contracts** (Gap 2) - Use existing `useContracts.ts` hooks
4. **Add Anthropic API key** (Gap 6) - Enable real AI analysis
5. **Fix WalletConnect ID** (Gap 10) - Register at cloud.walletconnect.com
6. **Add error boundary** (Gap 9) - Wrap pages in ErrorBoundary

### For Production (Post-Hackathon)

1. Fix all 8 smart contract vulnerabilities (especially snapshot attack + insolvency)
2. Add wallet signature verification (EIP-712)
3. Add rate limiting + CORS restrictions
4. Replace Float with Decimal for monetary values
5. Add comprehensive test suites (backend unit + frontend E2E)
6. Implement proper bonding curve (replace linear model)
7. Add monitoring/alerting (Sentry, Grafana)

---

## 8. Service Status (Live)

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Frontend | 3000 | http://149.102.129.143:3000 | ONLINE |
| Backend | 3001 | http://149.102.129.143:3001/api/health | ONLINE |
| AI Engine | 5001 | http://149.102.129.143:5001/health | ONLINE |
| PostgreSQL | 5432 | localhost only | ONLINE |

All managed by PM2 with auto-restart and log rotation.

---

*Report generated by Claude Opus 4.6 - Comprehensive codebase audit with 6 specialized agents*
