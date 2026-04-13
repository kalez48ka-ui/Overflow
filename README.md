# Overflow

**Decentralized PSL Cricket Team Token Trading Platform on WireFluid Blockchain**

Trade PSL (Pakistan Super League) team tokens with prices driven by real match performance. Features asymmetric bonding curves, dynamic sell-tax, an Upset Vault for underdog rewards, and an AI-powered analysis engine.

Built for **WireFluid 2026 Hackathon** (48-hour build).

---

## Architecture

```
┌─────────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
│   Frontend          │   │   Backend            │   │   AI Engine      │
│   Next.js 16        │──>│   Express 5 +        │──>│   Flask 3.1 +    │
│   React 19          │   │   Prisma 6           │   │   ChromaDB 0.5   │
│   Port 3000         │   │   Port 3001          │   │   Port 5001      │
│   wagmi + viem      │   │   PostgreSQL 16      │   │   LangChain 0.3  │
└────────┬────────────┘   └──────────┬───────────┘   └──────────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────▼──────────┐
              │  WireFluid Chain │
              │  Chain ID: 7777  │
              │  6 Contracts     │
              └─────────────────┘
```

| Layer | Tech | Source Files | Lines |
|-------|------|:------------:|------:|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin 5.6, Hardhat | 9 | ~2,567 |
| Backend | TypeScript, Express 5, Prisma 6, Socket.io, ethers.js | 15 | ~2,652 |
| Frontend | Next.js 16, React 19, Tailwind 4, wagmi 2, Framer Motion | 30 | ~12,515 |
| AI Engine | Python 3.12, Flask, LangChain, ChromaDB, scikit-learn | 11 | ~3,354 |
| **Total** | | **65** | **~21,088** |

---

## Pages

Overflow ships with **10 pages** across trading, analytics, and information.

| Route | Page | Description |
|-------|------|-------------|
| `/` | Markets | Landing page with all 8 PSL team cards. Search, sort by rank/price/volume/24h change. |
| `/trade/[team]` | Trade | Per-team trading view with TradingView chart, buy/sell panel, and live stats. |
| `/match` | Live Match | Live scorecard with ball-by-ball feed streamed via Socket.io. |
| `/match/history` | Match History | Tabbed view (All / Completed / Upcoming / Live) of all PSL matches. |
| `/standings` | Standings | Points table for all 8 PSL teams with sortable columns. |
| `/portfolio` | Portfolio | Wallet holdings, P&L breakdown, and position cards per team. |
| `/vault` | Upset Vault | Vault balance, upset event history, and claim interface. |
| `/how-it-works` | How It Works | Full mechanics guide covering bonding curves, vault, taxes, anti-whale, and rewards. |

Additional pages accessible via the navbar "More" dropdown: Match History and How It Works.

---

## Features

### Trading
- **Asymmetric Bonding Curve** -- Buy price rises faster than sell price (`buy = supply^1.5`, `sell = supply^1.2`), protecting against pump-and-dump
- **Dynamic Sell Tax** -- Top-ranked team: 2% tax (easy exit), bottom-ranked: 15% tax (discourages panic selling)
- **Real-Time Charts** -- TradingView candlestick charts with live price updates via Socket.io
- **Anti-Whale** -- Max transaction capped at 1% of token supply
- **Toast Notifications** -- Instant transaction feedback (success, failure, pending) via sonner

### Cricket Integration
- **Live Scores** -- CricAPI polling every 30 seconds during matches
- **Ball-by-Ball Feed** -- Real-time match events streamed to frontend
- **Performance Oracle** -- 2-of-3 multisig updates team rankings after each match
- **8 PSL Teams** -- Islamabad United, Lahore Qalandars, Karachi Kings, Peshawar Zalmi, Quetta Gladiators, Multan Sultans, Hyderabad Kingsmen, Rawalpindiz
- **Match History** -- Tabbed history view with filtering by status (All/Completed/Upcoming/Live)
- **Points Table** -- Sortable standings for all teams

### Upset Vault
- Accumulates 15% of all trading fees
- Releases rewards when an underdog wins (lower-ranked beats higher-ranked)
- Payout tiers: Normal (0%), Big Upset (15%), Huge Upset (30%), Giant Killer (60%)
- 48-hour claim window for holders of the winning team token

### AI Engine
- **RAG Pipeline** -- LangChain + ChromaDB with 21,500+ Cricsheet matches embedded
- **Match Analysis** -- Pre-match reports powered by LLM
- **Trading Signals** -- BUY/SELL/HOLD signals with confidence scores
- **Win Probability** -- Logistic regression model trained on historical PSL data
- **Free-Form Q&A** -- Ask anything about teams, matchups, or strategy

### UI/UX
- **Custom Hexagonal Logo** -- SVG brand mark with rising wave motif
- **Professional Navbar** -- 5 primary links (Markets, Live, Standings, Portfolio, Vault) + "More" dropdown (Match History, How It Works)
- **CSS Custom Properties** -- Full brand theme system with design tokens for colors, backgrounds, borders, and status indicators
- **Framer Motion Animations** -- Smooth transitions and interactive elements
- **Team Sorting & Filtering** -- Search teams by name, sort by rank, price, volume, or 24h change on the Markets page
- **Responsive Layout** -- Mobile-first with collapsible navigation

### Security
- Circuit Breaker -- Auto-pause trading if price drops >15% in 5 minutes
- Reentrancy guards on all fund-moving functions
- Slippage protection parameters on all trades
- Oracle multisig (2-of-3 confirmations required)
- Wallet connect works without WalletConnect project ID (MetaMask injected provider fallback)

---

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| `TeamTokenFactory` | Creates team tokens, manages bonding curve trading (buy/sell), fee routing |
| `TeamToken` | ERC-20 token with dynamic sell tax and last-buy-time tracking |
| `PerformanceOracle` | 2-of-3 multisig oracle, updates team scores, calculates sell tax rates |
| `RewardDistributor` | Collects fees (2% buy + dynamic sell), distributes to holders by ranking |
| `UpsetVault` | Accumulates 15% of fees, releases on upset triggers with tiered multipliers |
| `CircuitBreaker` | Emergency pause if price drops >15% in 5 min window |

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
team:{symbol}    -> Live price updates
match:{matchId}  -> Ball-by-ball events
vault:update     -> Vault balance changes
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
RPC_URL=https://testnet-rpc.wirefluid.com
CRICKET_API_KEY=<your-cricapi-key>          # Get from cricapi.com
ORACLE_PRIVATE_KEY=<oracle-wallet-key>

# Contract Addresses (after deployment)
FACTORY_ADDRESS=
ORACLE_ADDRESS=
REWARDS_ADDRESS=
VAULT_ADDRESS=
CIRCUIT_BREAKER_ADDRESS=

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

```bash
cd overflow/contracts
npx hardhat compile
npx hardhat test                    # 41 tests passing
npx hardhat run scripts/deploy.js   # Deploy to WireFluid testnet
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

---

## Project Structure

```
Overflow/
├── overflow/
│   ├── contracts/                  # Solidity smart contracts
│   │   ├── contracts/              # 6 .sol files
│   │   ├── test/                   # Hardhat tests (41 passing)
│   │   └── scripts/                # Deploy scripts
│   ├── backend/                    # Express + Prisma API
│   │   ├── src/
│   │   │   ├── modules/            # price, cricket, oracle, vault
│   │   │   ├── config/             # Environment config
│   │   │   └── index.ts            # Entry point
│   │   └── prisma/
│   │       ├── schema.prisma       # Database schema
│   │       └── seed.ts             # Seed data (8 teams)
│   ├── frontend/                   # Next.js 16 app
│   │   └── src/
│   │       ├── app/                # 10 pages (see Pages table above)
│   │       │   ├── page.tsx        # Markets (landing)
│   │       │   ├── trade/[team]/   # Per-team trading
│   │       │   ├── match/          # Live match
│   │       │   ├── match/history/  # Match history (tabbed)
│   │       │   ├── standings/      # Points table
│   │       │   ├── portfolio/      # Wallet portfolio
│   │       │   ├── vault/          # Upset Vault
│   │       │   ├── how-it-works/   # Mechanics guide
│   │       │   ├── globals.css     # CSS custom properties theme
│   │       │   └── layout.tsx      # App shell + navbar
│   │       ├── components/         # 14 UI components
│   │       │   ├── Navbar.tsx      # 5 primary links + "More" dropdown
│   │       │   ├── TeamCard.tsx    # Team card with stats
│   │       │   ├── TradingChart.tsx# TradingView integration
│   │       │   ├── BuySellPanel.tsx# Trade execution
│   │       │   ├── ToastProvider.tsx# Sonner toast notifications
│   │       │   └── ...            # 9 more components
│   │       ├── hooks/              # wagmi contract hooks
│   │       ├── lib/                # API client, mock data, utils
│   │       ├── types/              # TypeScript type definitions
│   │       ├── config/             # wagmi config
│   │       └── contracts/          # ABIs
│   ├── ai-engine/                  # Python AI service
│   │   ├── rag/                    # RAG pipeline, signals, vector store
│   │   ├── models/                 # ML models (win probability)
│   │   ├── data/                   # Data ingestion (Cricsheet)
│   │   ├── config.py               # Team metadata, Flask config
│   │   └── server.py               # Flask API entry point
│   ├── docker-compose.yml          # Production deployment
│   ├── ecosystem.config.js         # PM2 process manager
│   └── .env.example                # Environment template
├── OVERFLOW_BUILD_PLAN.md          # Technical build roadmap
├── WHITEPAPER.md                   # Whitepaper (markdown)
└── README.md                       # This file
```

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Blockchain** | Solidity 0.8.24, OpenZeppelin 5.6, Hardhat 2.22, WireFluid (Cosmos EVM) |
| **Backend** | TypeScript, Express 5, Prisma 6, Socket.io 4, ethers.js 6, node-cron |
| **Frontend** | Next.js 16, React 19, Tailwind 4, wagmi 2, viem 2, Framer Motion 12 |
| **Notifications** | sonner 2 (toast system) |
| **Charts** | TradingView Lightweight Charts 5, Recharts 3 |
| **AI/ML** | Python 3.12, Flask 3, LangChain 0.3, ChromaDB 0.5, scikit-learn 1.5 |
| **LLM** | Anthropic API (via LangChain), Sentence Transformers |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Infra** | Docker Compose, PM2, gunicorn |

---

## Halal Compliance

Overflow is designed with Islamic finance principles:

- **Asset Ownership** -- Users own real ERC-20 tokens, not abstract positions
- **Non-Binary Outcomes** -- Prices vary continuously based on performance, not binary bets
- **Productive Value** -- Performance scores tied to real cricket metrics
- **Exit Option** -- Can sell at any time (with dynamic tax based on team ranking)
- **No Qimar** -- Zero-sum gambling converted to market-based trading

---

## Testing

```bash
# Smart contract tests (41 passing)
cd overflow/contracts
npx hardhat test

# Backend
cd overflow/backend
npm test

# Frontend
cd overflow/frontend
npm test
```

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
