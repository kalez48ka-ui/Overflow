# Overflow

**Decentralized PSL Cricket Team Token Trading Platform on WireFluid Blockchain**

Trade PSL (Pakistan Super League) team tokens with prices driven by real match performance. Features asymmetric bonding curves, dynamic sell-tax, an Upset Vault for underdog rewards, and an AI-powered analysis engine.

Built for **WireFluid 2026 Hackathon** (48-hour build).

---

## Architecture

```
┌─────────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
│   Frontend          │   │   Backend            │   │   AI Engine      │
│   Next.js 16        │──▶│   Express 5 +        │──▶│   Flask 3.1 +    │
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

| Layer | Tech | Files | Lines |
|-------|------|-------|-------|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin 5.6, Hardhat | 6 contracts + tests | ~2,279 |
| Backend | TypeScript, Express 5, Prisma 6, Socket.io, ethers.js | 12 source files | ~1,799 |
| Frontend | Next.js 16, React 19, Tailwind 4, wagmi 2, RainbowKit 2 | 22 source files | ~5,554 |
| AI Engine | Python 3.12, Flask, LangChain, ChromaDB, scikit-learn | 8 source files | ~3,354 |
| **Total** | | **51 files** | **~13,262** |

---

## Features

### Trading
- **Asymmetric Bonding Curve** — Buy price rises faster than sell price (`buy = supply^1.5`, `sell = supply^1.2`), protecting against pump-and-dump
- **Dynamic Sell Tax** — Top-ranked team: 2% tax (easy exit), bottom-ranked: 15% tax (discourages panic selling)
- **Real-Time Charts** — TradingView candlestick charts with live price updates via Socket.io
- **Anti-Whale** — Max transaction capped at 1% of token supply

### Cricket Integration
- **Live Scores** — CricAPI polling every 30 seconds during matches
- **Ball-by-Ball Feed** — Real-time match events streamed to frontend
- **Performance Oracle** — 2-of-3 multisig updates team rankings after each match
- **6 PSL Teams** — Islamabad United, Lahore Qalandars, Karachi Kings, Peshawar Zalmi, Quetta Gladiators, Multan Sultans

### Upset Vault
- Accumulates 15% of all trading fees
- Releases rewards when an underdog wins (lower-ranked beats higher-ranked)
- Payout tiers: Normal (0%), Big Upset (15%), Huge Upset (30%), Giant Killer (60%)
- 48-hour claim window for holders of the winning team token

### AI Engine
- **RAG Pipeline** — LangChain + ChromaDB with 21,500+ Cricsheet matches embedded
- **Match Analysis** — Pre-match reports powered by Claude 3.5 Sonnet
- **Trading Signals** — BUY/SELL/HOLD signals with confidence scores
- **Win Probability** — Logistic regression model trained on historical PSL data
- **Free-Form Q&A** — Ask anything about teams, matchups, or strategy

### Security
- Circuit Breaker — Auto-pause trading if price drops >15% in 5 minutes
- Reentrancy guards on all fund-moving functions
- Slippage protection parameters on all trades
- Oracle multisig (2-of-3 confirmations required)

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
  30% → Platform Treasury
  25% → Reward Pool (holder rewards)
  15% → Upset Vault
  30% → Treasury Reserve
```

### Performance Score Formula
```
Composite = (pointsTableScore × 40%) +
            (nrrScore × 20%) +
            (formScore × 20%) +
            (availabilityScore × 20%)
```

---

## API Endpoints

### Teams
```
GET  /api/teams                  → All teams with stats
GET  /api/teams/:symbol          → Single team (e.g., IU, LQ)
GET  /api/teams/:symbol/prices   → OHLCV price history
```

### Trading
```
POST /api/trades                 → Execute buy/sell
GET  /api/trades                 → Recent trades
GET  /api/trades/:wallet         → Wallet trade history
GET  /api/trades/team/:symbol    → Team trade history
```

### Matches
```
GET  /api/matches                → All matches
GET  /api/matches/live           → Live matches
GET  /api/matches/upcoming       → Scheduled matches
GET  /api/matches/completed      → Finished matches
```

### Portfolio
```
GET  /api/portfolio/:wallet      → Holdings, P&L, allocation
GET  /api/portfolio/:wallet/history → Trade history
```

### Vault
```
GET  /api/vault/state            → Current vault balance
GET  /api/vault/events           → Upset event history
```

### AI
```
POST /api/ai/analyze             → Pre-match analysis (LLM-powered)
GET  /api/ai/signals             → Trading signals for live matches
POST /api/ai/query               → Free-form RAG question
GET  /api/ai/report/:matchId     → Pre-match report
GET  /api/ai/health              → AI engine status
```

### WebSocket Events (Socket.io)
```
team:{symbol}    → Live price updates
match:{matchId}  → Ball-by-ball events
vault:update     → Vault balance changes
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
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-project-id>

# AI Engine
AI_ENGINE_PORT=5001
ANTHROPIC_API_KEY=<your-anthropic-key>
CLAUDE_MODEL=claude-sonnet-4-20250514
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
# Frontend  → http://localhost:3000
# Backend   → http://localhost:3001
# AI Engine → http://localhost:5001
# Postgres  → localhost:5432
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `Team` | 6 PSL teams — price, sell tax, performance score, ranking |
| `Match` | Match records — home/away teams, status, scores |
| `BallEvent` | Ball-by-ball events — runs, wickets, commentary |
| `Trade` | Buy/sell transactions — wallet, amount, price, fee |
| `Position` | User holdings — wallet × team |
| `PricePoint` | OHLCV candles — indexed by teamId + timestamp |
| `UpsetEvent` | Upset triggers — payout details, claim window |
| `VaultState` | Global vault balance (singleton) |

---

## Project Structure

```
Overflow/
├── overflow/
│   ├── contracts/              # Solidity smart contracts
│   │   ├── contracts/          # 6 .sol files
│   │   ├── test/               # Hardhat tests (41 passing)
│   │   └── scripts/            # Deploy scripts
│   ├── backend/                # Express + Prisma API
│   │   ├── src/
│   │   │   ├── modules/        # price, cricket, oracle, vault
│   │   │   ├── config/         # Environment config
│   │   │   └── index.ts        # Entry point
│   │   └── prisma/
│   │       ├── schema.prisma   # Database schema
│   │       └── seed.ts         # Seed data
│   ├── frontend/               # Next.js 16 app
│   │   └── src/
│   │       ├── app/            # Pages (home, trade, match, portfolio, vault)
│   │       ├── components/     # UI components
│   │       ├── hooks/          # wagmi contract hooks
│   │       ├── config/         # wagmi config
│   │       └── contracts/      # ABIs
│   ├── ai-engine/              # Python AI service
│   │   ├── rag/                # RAG pipeline, signals, vector store
│   │   ├── models/             # ML models (win probability)
│   │   ├── data/               # Data ingestion (Cricsheet)
│   │   ├── config.py           # Team metadata, Flask config
│   │   └── server.py           # Flask API entry point
│   ├── docker-compose.yml      # Production deployment
│   ├── ecosystem.config.js     # PM2 process manager
│   └── .env.example            # Environment template
├── OVERFLOW_BUILD_PLAN.md      # Technical build roadmap
├── CricTrade Whitepaper v1.pdf # Whitepaper (original PDF, pre-rename)
├── WHITEPAPER.md               # Whitepaper (markdown)
└── README.md                   # This file
```

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Blockchain** | Solidity 0.8.24, OpenZeppelin 5.6, Hardhat 2.22, WireFluid (Cosmos EVM) |
| **Backend** | TypeScript, Express 5, Prisma 6, Socket.io 4, ethers.js 6, node-cron |
| **Frontend** | Next.js 16, React 19, Tailwind 4, wagmi 2, viem 2, RainbowKit 2 |
| **Charts** | TradingView Lightweight Charts 5, Recharts 3 |
| **AI/ML** | Python 3.12, Flask 3, LangChain 0.3, ChromaDB 0.5, scikit-learn 1.5 |
| **LLM** | Anthropic Claude (via LangChain), Sentence Transformers |
| **Database** | PostgreSQL 16, Prisma ORM |
| **Infra** | Docker Compose, PM2, gunicorn |

---

## Halal Compliance

Overflow is designed with Islamic finance principles:

- **Asset Ownership** — Users own real ERC-20 tokens, not abstract positions
- **Non-Binary Outcomes** — Prices vary continuously based on performance, not binary bets
- **Productive Value** — Performance scores tied to real cricket metrics
- **Exit Option** — Can sell at any time (with dynamic tax based on team ranking)
- **No Qimar** — Zero-sum gambling converted to market-based trading

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
