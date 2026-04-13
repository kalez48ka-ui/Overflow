# Overflow

**Decentralized PSL Cricket Team Token Trading Platform on WireFluid Blockchain**

Trade PSL (Pakistan Super League) team tokens with prices driven by real match performance. Features asymmetric bonding curves, dynamic sell-tax, an Upset Vault for underdog rewards, Fan Wars for match-day engagement, and an AI-powered analysis engine.

Built for **WireFluid 2026 Hackathon** (48-hour build).

---

## Architecture

```
┌─────────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
│   Frontend          │   │   Backend            │   │   AI Engine      │
│   Next.js 16        │──>│   Express 5 +        │──>│   Flask 3.1 +    │
│   React 19          │   │   Prisma 6           │   │   ChromaDB 0.5   │
│   Port 3000         │   │   PostgreSQL 16      │   │   LangChain 0.3  │
│   wagmi + viem      │   │   Port 3001          │   │   Port 5001      │
└────────┬────────────┘   └──────────┬───────────┘   └──────────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────▼───────────────┐
              │  WireFluid Testnet    │
              │  Chain ID: 92533     │
              │  7 Contracts +       │
              │  8 Team Tokens       │
              └──────────────────────┘
```

| Layer | Tech | Source Files | Lines |
|-------|------|:------------:|------:|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin 5.6, Hardhat | 12 | ~2,257 |
| Backend | TypeScript, Express 5, Prisma 6, Socket.io, ethers.js | 18 | ~3,700 |
| Frontend | Next.js 16, React 19, Tailwind 4, wagmi 2, Framer Motion | 53 | ~18,091 |
| AI Engine | Python 3.12, Flask, LangChain, ChromaDB, scikit-learn | 11 | ~3,354 |
| **Total** | | **94** | **~27,402** |

---

## Pages

Overflow ships with **13 pages** across trading, analytics, engagement, and administration.

| Route | Page | Description |
|-------|------|-------------|
| `/` | Markets | Landing with all 8 PSL team cards. Search, sort by rank/price/volume/24h change. |
| `/trade/[team]` | Trade | Per-team trading view with TradingView chart, buy/sell panel, and live stats. |
| `/match` | Live Match | Live scorecard with ball-by-ball feed streamed via Socket.io. |
| `/match/history` | Match History | Tabbed view (All / Completed / Upcoming / Live) of all PSL matches. |
| `/standings` | Standings | Points table for all 8 PSL teams with sortable columns. |
| `/portfolio` | Portfolio | Wallet holdings, P&L breakdown, and position cards per team. |
| `/vault` | Upset Vault | Vault balance, upset event history, and claim interface. |
| `/how-it-works` | How It Works | Full mechanics guide covering bonding curves, vault, taxes, anti-whale, and rewards. |
| `/fan-wars` | Fan Wars | Lock team tokens before matches, earn boost rewards from platform fees. |
| `/leaderboard` | Leaderboard | Top traders ranked by P&L, volume, or trade count. |
| `/admin` | Admin Panel | Oracle controls for match results, upset triggers, price updates, and rank recalculation. |

---

## Features

### Trading
- **Asymmetric Bonding Curve** -- Buy price rises faster than sell price (`buy = supply^1.5`, `sell = supply^1.2`), protecting against pump-and-dump
- **Dynamic Sell Tax** -- Top-ranked team: 2% tax (easy exit), bottom-ranked: 15% tax (discourages panic selling)
- **Real-Time Charts** -- TradingView candlestick charts with live price updates via Socket.io
- **Anti-Whale** -- Max transaction capped at 1% of token supply
- **Toast Notifications** -- Instant transaction feedback (success, failure, pending) via sonner

### Fan Wars

Fan Wars is a **non-betting** engagement system. It is NOT gambling -- locked tokens are always returned 100%.

**How it works:**
1. A Fan War is auto-created for every upcoming match
2. Fans lock their team tokens before the match (deadline: 1 hour before start)
3. Platform trading fees fund a Boost Pool
4. After the match settles, BOTH sides receive rewards from the Boost Pool:

| Margin | Winner Share | Loser Share | Rollover |
|--------|:-----------:|:-----------:|:--------:|
| Close | 55% | 35% | 10% |
| Normal | 60% | 30% | 10% |
| Dominant | 65% | 25% | 10% |

5. Users claim locked tokens + boost reward within a 24-hour window
6. 10% of each pool rolls over to fuel future matches

**Key point:** Nobody loses their tokens. The boost is entirely funded by platform fees. This is fan engagement, not wagering.

### Cricket Integration
- **Live Scores** -- CricAPI polling with adaptive intervals (10s during live matches, 5min when idle)
- **Ball-by-Ball Feed** -- Real-time match events streamed to frontend
- **Performance Oracle** -- 2-of-3 multisig updates team rankings after each match
- **8 PSL Teams** -- Islamabad United, Lahore Qalandars, Karachi Kings, Peshawar Zalmi, Quetta Gladiators, Multan Sultans, Hyderabad Kingsmen, Rawalpindiz
- **Match History** -- Tabbed history view with filtering by status
- **Points Table** -- Sortable standings for all teams

### Upset Vault
- Accumulates 15% of all trading fees
- Releases rewards when an underdog wins (lower-ranked beats higher-ranked)
- Payout tiers: Normal (0%), Big Upset (15%), Huge Upset (30%), Giant Killer (60%)
- 48-hour claim window for holders of the winning team token

### Leaderboard
- Rankings by P&L, total volume, or trade count
- Tracks win rate, favorite team, and realized + unrealized P&L per wallet
- Capped query (10k recent trades) to keep response times fast

### AI Engine
- **RAG Pipeline** -- LangChain + ChromaDB with 21,500+ Cricsheet matches embedded
- **Match Analysis** -- Pre-match reports powered by LLM
- **Trading Signals** -- BUY/SELL/HOLD signals with confidence scores
- **Win Probability** -- Logistic regression model trained on historical PSL data
- **Free-Form Q&A** -- Ask anything about teams, matchups, or strategy

### UI/UX & Animation System
- **Loading Screen** -- Cricket ball SVG animation with blockchain pulse network, fades out after 2.5s
- **Framer Motion Components** -- MouseTrackCard, CountUp, StaggerReveal, LayoutGrid
- **Aceternity UI** -- 3D Card, Moving Border, Spotlight, Meteors
- **Custom Effects** -- TextScramble, GlitchPrice, LiquidBlobs, MagneticButton, RevealText
- **Custom Hexagonal Logo** -- SVG brand mark with rising wave motif
- **Professional Navbar** -- Primary links + "More" dropdown
- **CSS Custom Properties** -- Full brand theme system with design tokens
- **Responsive Layout** -- Mobile-first with collapsible navigation

---

## Smart Contracts

All contracts are deployed to **WireFluid Testnet** (Chain ID `92533`, RPC: `https://evm.wirefluid.com`).

Deployer: `0xE342e5cB60b985ee48E8a44d76b07130D57F5BA8`

### Core Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| `TeamTokenFactory` | `0x1e4d8f427d7f564A9f7F13A52632D179B02eEAF4` | Creates team tokens, manages bonding curve trading (buy/sell), fee routing |
| `PerformanceOracle` | `0xb594EB4656B18b1aD32eEF55291ae7a67CB710E5` | 2-of-3 multisig oracle, updates team scores, calculates sell tax rates |
| `RewardDistributor` | `0x595Bfd3Dfc1A7b2703CFF9E566473d670Efcaf0F` | Collects fees (2% buy + dynamic sell), distributes to holders by ranking |
| `UpsetVault` | `0x3bFB19F2a451De7651789b6ea24F12DbC6911244` | Accumulates 15% of fees, releases on upset triggers with tiered multipliers |
| `CircuitBreaker` | `0x5D1E4E0398b9dFF7Ad5b4954755d2478A0CE1b80` | Emergency pause if price drops >15% in 5 min window |
| `FanWars` | Pending deployment | Match-based fan engagement with boost pool distribution |
| `TeamToken` | (created per team) | ERC-20 token with dynamic sell tax and last-buy-time tracking |

### Team Token Addresses

| Team | Symbol | Address |
|------|--------|---------|
| Islamabad United | IU | `0x076d247a5A3b838ec68a2Bf10FC6A0cc7f49dC24` |
| Lahore Qalandars | LQ | `0xB7E34088c2E9E59Cd2B0adFB30f31EcDFfD051ea` |
| Multan Sultans | MS | `0x031f9BA7bee2B754572872433ACDe0aC2046A4A2` |
| Karachi Kings | KK | `0xea731ba7CF237FFe4a2f578937051eB46E732F70` |
| Peshawar Zalmi | PZ | `0x93DC25Bf930b9056D0c5E085143C41771E465F83` |
| Quetta Gladiators | QG | `0x8B27Bd65478b325AFE920D962161386b199437Ed` |
| Hyderabad Kingsmen | HK | `0xa55D8838351706E3bcd5F737CC1d72B08c11eC0c` |
| Rawalpindiz | RW | `0xE296c537A982922ca2c4a6bfc8c4EE9C9B717CE8` |

### Fee Distribution
```
Buy Fee:  2% (flat)
Sell Fee: 2-15% (dynamic, based on team ranking)

Distribution:
  30% -> Platform Treasury
  25% -> Reward Pool (holder rewards)
  15% -> Upset Vault
  30% -> Treasury Reserve
```

### Performance Score Formula
```
Composite = (pointsTableScore * 40%) +
            (nrrScore * 20%) +
            (formScore * 20%) +
            (availabilityScore * 20%)
```

---

## API Endpoints

### Teams
```
GET  /api/teams                  -> All teams with stats
GET  /api/teams/:symbol          -> Single team (e.g., IU, LQ, HK, RW)
GET  /api/teams/:symbol/prices   -> OHLCV price history
```

### Trading
```
POST /api/trades                 -> Execute buy/sell
GET  /api/trades                 -> Recent trades
GET  /api/trades/:wallet         -> Wallet trade history
GET  /api/trades/team/:symbol    -> Team trade history
```

### Matches
```
GET  /api/matches                -> All matches
GET  /api/matches/live           -> Live matches
GET  /api/matches/upcoming       -> Scheduled matches
GET  /api/matches/completed      -> Finished matches
```

### Portfolio
```
GET  /api/portfolio/:wallet      -> Holdings, P&L, allocation
GET  /api/portfolio/:wallet/history -> Trade history
```

### Vault
```
GET  /api/vault/state            -> Current vault balance
GET  /api/vault/events           -> Upset event history
```

### Fan Wars
```
GET  /api/fanwars/active            -> All active (OPEN / LOCKED) fan wars
GET  /api/fanwars/leaderboard       -> Top participants by total locked amount
GET  /api/fanwars/user/:wallet      -> All locks for a wallet
GET  /api/fanwars/:matchId          -> Fan war status for a match
POST /api/fanwars/:matchId/lock     -> Lock tokens for a team { wallet, teamId, amount }
POST /api/fanwars/:matchId/claim    -> Claim boost rewards { wallet }
```

### Leaderboard
```
GET  /api/leaderboard               -> Top traders (sort: pnl | volume | trades)
```

### Admin (requires `x-admin-token` header)
```
POST /api/admin/match-result     -> Submit match result { matchId, winnerId }
POST /api/admin/trigger-upset    -> Manual upset trigger { matchId, winnerSymbol, loserSymbol, upsetScore }
POST /api/admin/recalculate      -> Recalculate all team rankings
POST /api/admin/price-update     -> Set team price { teamSymbol, newPrice }
```

### AI
```
POST /api/ai/analyze             -> Pre-match analysis (LLM-powered)
GET  /api/ai/signals             -> Trading signals for live matches
POST /api/ai/query               -> Free-form RAG question
GET  /api/ai/report/:matchId     -> Pre-match report
GET  /api/ai/health              -> AI engine status
```

### WebSocket Events (Socket.io)
```
team:{symbol}      -> Live price updates
match:{matchId}    -> Ball-by-ball events
vault:update       -> Vault balance changes
fanwar:{matchId}   -> Fan war lock/settle events
```

---

## Security

| Layer | Protection |
|-------|-----------|
| **Trades** | Executed inside Prisma transactions to prevent double-spend race conditions |
| **Admin** | All admin routes require `x-admin-token` header authentication |
| **Rate Limiting** | 100/min global, 20/min trades, 10/min admin |
| **Input Validation** | Wallet address regex validation and normalization on all endpoints |
| **WebSocket** | Alphanumeric pattern validation on room subscription parameters |
| **Circuit Breaker** | Auto-pause trading if price drops >15% in 5 minutes |
| **Reentrancy** | Guards on all fund-moving contract functions |
| **Slippage** | Protection parameters on all trade executions |
| **Oracle** | 2-of-3 multisig confirmations required |
| **Anti-Whale** | Max transaction capped at 1% of token supply |

---

## Testing

**140 passing tests** across two test suites:

| Suite | Tests | File |
|-------|------:|------|
| Overflow (core contracts) | ~115 | `overflow/contracts/test/Overflow.test.js` |
| FanWars | ~25 | `overflow/contracts/test/FanWars.test.js` |

```bash
cd overflow/contracts
npx hardhat test
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL 16
- Docker + Docker Compose (optional)

### 1. Clone & Install

```bash
git clone git@github.com:kalez48ka-ui/Overflow.git
cd Overflow

# Install all dependencies (backend + frontend + contracts)
npm run install:all
```

### 2. Environment Setup

```bash
cp overflow/.env.example overflow/.env
```

Edit `overflow/.env` with your values:

```env
# Database
POSTGRES_USER=overflow
POSTGRES_PASSWORD=<your-strong-password>

# Backend
BACKEND_PORT=3001
RPC_URL=https://evm.wirefluid.com
CRICKET_API_KEY=<your-cricapi-key>          # Get from cricapi.com
ORACLE_PRIVATE_KEY=<oracle-wallet-key>
ADMIN_SECRET=<your-admin-secret>

# Contract Addresses (deployed on WireFluid Testnet)
FACTORY_ADDRESS=0x1e4d8f427d7f564A9f7F13A52632D179B02eEAF4
ORACLE_ADDRESS=0xb594EB4656B18b1aD32eEF55291ae7a67CB710E5
REWARDS_ADDRESS=0x595Bfd3Dfc1A7b2703CFF9E566473d670Efcaf0F
VAULT_ADDRESS=0x3bFB19F2a451De7651789b6ea24F12DbC6911244
CIRCUIT_BREAKER_ADDRESS=0x5D1E4E0398b9dFF7Ad5b4954755d2478A0CE1b80

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_AI_API_URL=http://localhost:5001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=       # Optional — MetaMask works without it

# AI Engine
AI_ENGINE_PORT=5001
ANTHROPIC_API_KEY=<your-anthropic-key>
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHROMADB_PATH=/data/chromadb
```

### 3. Database Setup

```bash
cd overflow/backend
npx prisma generate
npx prisma db push
```

### 4. Smart Contract Deployment

Contracts are already deployed to WireFluid Testnet. To redeploy:

```bash
cd overflow/contracts
npx hardhat compile
npx hardhat test                                        # 140 tests passing
npx hardhat run scripts/deploy.js --network wirefluid   # Deploy core contracts
npx hardhat run scripts/deploy-remaining.js --network wirefluid  # Deploy remaining team tokens
```

### 5. Run Development

```bash
# All services at once
npm run dev:all

# Or individually:
cd overflow/backend && npm run dev      # Port 3001
cd overflow/frontend && npm run dev     # Port 3000
cd overflow/ai-engine && python server.py  # Port 5001
```

### 6. Docker (Production)

```bash
cd overflow
docker compose up -d

# Services:
# Frontend  -> http://localhost:3000
# Backend   -> http://localhost:3001
# AI Engine -> http://localhost:5001
# Postgres  -> localhost:5432
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `Team` | 8 PSL teams -- price, sell tax, performance score, ranking |
| `Match` | Match records -- home/away teams, status, scores |
| `BallEvent` | Ball-by-ball events -- runs, wickets, commentary |
| `Trade` | Buy/sell transactions -- wallet, amount, price, fee |
| `Position` | User holdings -- wallet x team |
| `PricePoint` | OHLCV candles -- indexed by teamId + timestamp |
| `UpsetEvent` | Upset triggers -- payout details, claim window |
| `VaultState` | Global vault balance (singleton) |
| `FanWar` | Fan War entries -- match link, status, pool sizes, deadlines |
| `FanWarLock` | Individual token locks -- wallet, team, amount, claim status |

---

## Project Structure

```
Overflow/
├── overflow/
│   ├── contracts/                     # Solidity smart contracts
│   │   ├── contracts/                 # 7 .sol files (including FanWars.sol)
│   │   ├── test/                      # Hardhat tests (140 passing)
│   │   └── scripts/                   # Deploy scripts (deploy.js + deploy-remaining.js)
│   ├── backend/                       # Express + Prisma API
│   │   ├── src/
│   │   │   ├── modules/               # price, cricket, oracle, vault, fanwars
│   │   │   ├── routes/                # teams, trades, matches, portfolio,
│   │   │   │                          #   vault, ai, admin, leaderboard, fanwars
│   │   │   ├── common/                # Shared types
│   │   │   ├── config/                # Environment config
│   │   │   └── index.ts               # Entry point
│   │   └── prisma/
│   │       ├── schema.prisma          # 10 models
│   │       └── seed.ts                # Seed data (8 teams)
│   ├── frontend/                      # Next.js 16 app
│   │   └── src/
│   │       ├── app/                   # 13 pages
│   │       │   ├── page.tsx           # Markets (landing)
│   │       │   ├── trade/[team]/      # Per-team trading
│   │       │   ├── match/             # Live match
│   │       │   ├── match/history/     # Match history
│   │       │   ├── standings/         # Points table
│   │       │   ├── portfolio/         # Wallet portfolio
│   │       │   ├── vault/             # Upset Vault
│   │       │   ├── how-it-works/      # Mechanics guide
│   │       │   ├── fan-wars/          # Fan Wars dashboard
│   │       │   ├── leaderboard/       # Top traders
│   │       │   ├── admin/             # Oracle admin panel
│   │       │   ├── globals.css        # CSS custom properties theme
│   │       │   └── layout.tsx         # App shell + navbar + loading screen
│   │       ├── components/            # 17 UI components + 3 subdirectories
│   │       │   ├── effects/           # CricketBallLoader, BlockchainPulse,
│   │       │   │                      #   GlitchPrice, LiquidBlobs, MagneticButton,
│   │       │   │                      #   RevealText, TextScramble
│   │       │   ├── motion/            # CountUp, LayoutGrid, MouseTrackCard, StaggerReveal
│   │       │   ├── ui/                # 3D Card, Moving Border, Spotlight, Meteors
│   │       │   ├── FanWarCard.tsx     # Fan War engagement card
│   │       │   ├── LoadingScreen.tsx  # Cricket ball + blockchain pulse animation
│   │       │   ├── Navbar.tsx         # Primary links + "More" dropdown
│   │       │   └── ...               # 14 more components
│   │       ├── hooks/                 # wagmi contract hooks
│   │       ├── lib/                   # API client, mock data, utils
│   │       ├── types/                 # TypeScript type definitions
│   │       ├── config/                # wagmi config (WireFluid chain definition)
│   │       └── contracts/             # ABIs
│   ├── ai-engine/                     # Python AI service
│   │   ├── rag/                       # RAG pipeline, signals, vector store
│   │   ├── models/                    # ML models (win probability)
│   │   ├── data/                      # Data ingestion (Cricsheet)
│   │   ├── config.py                  # Team metadata, Flask config
│   │   └── server.py                  # Flask API entry point
│   ├── docker-compose.yml             # Production deployment
│   ├── ecosystem.config.js            # PM2 process manager
│   └── .env.example                   # Environment template
├── OVERFLOW_BUILD_PLAN.md             # Technical build roadmap
├── WHITEPAPER.md                      # Whitepaper (markdown)
└── README.md                          # This file
```

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Blockchain** | Solidity 0.8.24, OpenZeppelin 5.6, Hardhat 2.22, WireFluid Testnet (Chain 92533) |
| **Backend** | TypeScript, Express 5, Prisma 6, Socket.io 4, ethers.js 6, node-cron, express-rate-limit |
| **Frontend** | Next.js 16, React 19, Tailwind 4, wagmi 2, viem 2, Framer Motion 12 |
| **Notifications** | sonner 2 (toast system) |
| **Charts** | TradingView Lightweight Charts 5, Recharts 3 |
| **Animation** | Framer Motion 12, Aceternity UI, custom SVG effects |
| **AI/ML** | Python 3.12, Flask 3, LangChain 0.3, ChromaDB 0.5, scikit-learn 1.5 |
| **LLM** | Anthropic API (via LangChain), Sentence Transformers |
| **Database** | PostgreSQL 16, Prisma ORM (10 models) |
| **Infra** | Docker Compose, PM2, gunicorn |

---

## Halal Compliance

Overflow is designed with Islamic finance principles:

- **Asset Ownership** -- Users own real ERC-20 tokens, not abstract positions
- **Non-Binary Outcomes** -- Prices vary continuously based on performance, not binary bets
- **Productive Value** -- Performance scores tied to real cricket metrics
- **Exit Option** -- Can sell at any time (with dynamic tax based on team ranking)
- **No Qimar** -- Zero-sum gambling converted to market-based trading
- **Fan Wars** -- Locked tokens are returned in full; boost rewards come from platform fees, not from other participants

---

## PM2 Production

```bash
cd overflow

# Build all
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

---

## License

Built for WireFluid 2026 Hackathon.
