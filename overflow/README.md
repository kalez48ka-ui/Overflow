# Overflow

**PSL cricket team token trading platform on WireFluid blockchain.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Express](https://img.shields.io/badge/Express-5-000?logo=express)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)
![WireFluid](https://img.shields.io/badge/WireFluid-Testnet-6C3FC5)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)

---

## What is Overflow?

Overflow lets cricket fans trade PSL team tokens whose prices move in real-time based on actual match performance. When a team takes a wicket, hits a six, or wins an upset, token prices react instantly through on-chain bonding curves. Your cricket knowledge becomes a financial edge.

---

## Features

- **8 PSL Team Tokens** -- Islamabad United (IU), Lahore Qalandars (LQ), Multan Sultans (MS), Karachi Kings (KK), Peshawar Zalmi (PZ), Quetta Gladiators (QG), Haris Khan XI (HK), Rawalpindi Warriors (RW)
- **Bonding Curve Pricing** -- Buy pressure drives the price up, sell pressure drives it down. Pure supply-demand mechanics on-chain.
- **Progressive Sell Tax** -- Starts at 12%, decays to 3% over 2 hours. Discourages flash-dumping, rewards conviction.
- **Upset Vault** -- A portion of every trade fee flows into the vault. When an underdog wins, the vault releases funds to that team's token holders.
- **Fan Wars** -- Lock your tokens before a match. If your team wins, you earn a boost from the opposing side's locked pool.
- **Predict & Earn** -- Answer match prediction questions. Payouts split 10% (safety floor) / 30% (platform) / 60% (accuracy pool).
- **AI-Powered Trading Signals** -- RAG pipeline with LangChain + ChromaDB analyzes historical data and live match context to generate trading signals.
- **Live Match Data** -- Real-time scores from CricAPI with ball-by-ball updates streamed via Socket.io.
- **Circuit Breaker** -- Automatically pauses trading when a token drops 15% in a short window. Protects against panic cascades.
- **2-of-3 Multisig Oracle** -- Score updates require 2-of-3 oracle signatures. No single point of trust.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, wagmi, RainbowKit |
| **Backend** | Express 5, TypeScript, Prisma ORM, Socket.io, Helmet, Rate Limiting |
| **Smart Contracts** | Solidity 0.8.24, Hardhat, OpenZeppelin 5.x, ethers.js 6 |
| **AI Engine** | Flask 3.1, LangChain, ChromaDB, sentence-transformers, scikit-learn |
| **Database** | PostgreSQL (via Prisma) |
| **Blockchain** | WireFluid Testnet (Chain ID: 92533, RPC: `https://evm.wirefluid.com`) |

---

## Architecture

Overflow runs as four independent services that communicate through REST APIs and WebSocket connections:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend   │────▶│  PostgreSQL  │
│  Next.js 16  │◀────│  Express 5  │     │   (Prisma)   │
│  :3000       │ ws  │  :3001      │     └─────────────┘
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
      ┌─────────────┐ ┌────────┐ ┌──────────┐
      │  AI Engine   │ │CricAPI │ │WireFluid │
      │  Flask 3.1   │ │  Live  │ │  Chain   │
      │  :5001       │ │ Scores │ │  92533   │
      └─────────────┘ └────────┘ └──────────┘
```

- **Frontend** connects to the backend via REST for data and WebSocket for live updates (prices, match events, trades).
- **Backend** polls CricAPI for live match data with adaptive intervals (10s during live matches, 5min when idle), processes trades, and emits real-time events.
- **AI Engine** runs a RAG pipeline over historical match data and team statistics to generate pre-match analysis and live trading signals.
- **Smart Contracts** handle token minting/burning via bonding curves, the upset vault, fan wars locking, prediction pools, and circuit breaker logic -- all on WireFluid.

---

## Smart Contracts

All contracts are deployed and verified on WireFluid Testnet:

| Contract | Address |
|----------|---------|
| TeamTokenFactory | `0x7FB2270dC9aBBaEfE37e12fdC177Af543646b3e6` |
| PerformanceOracle | `0xDd3b0e06374ac97EB8043aEB78946DAEe5E165cF` |
| RewardDistributor | `0x0A1B77B0240AD4456d7B1D9525390D7dE5A88B68` |
| UpsetVault | `0xFec31718e8EC8f731Fc23D704E393F448D252DaE` |
| CircuitBreaker | `0xF74D8f4159326E0aB055b07E470FAe843300a016` |
| FanWars | `0xC634E9Ec20d9A43D4b546d10216982FE780CbF80` |
| PredictionPool | Pending deployment |

---

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Markets | Team cards with search, sort, and live price updates |
| `/trade/[team]` | Trading | TradingView chart, buy/sell panel, order book |
| `/match` | Live Match | Live scorecard, ball-by-ball commentary, AI signals |
| `/match/history` | Match History | Tabs: All / Completed / Upcoming / Live |
| `/standings` | Points Table | Sortable standings, season progress, fixtures |
| `/portfolio` | Portfolio | Open positions, P&L tracking, reward claims |
| `/vault` | Upset Vault | Vault balance, payout history, multiplier tiers |
| `/fan-wars` | Fan Wars | Lock tokens, view matchups, claim boosts |
| `/predictions` | Predict & Earn | Match questions, accuracy scoring, payout split |
| `/leaderboard` | Top Traders | Rankings by P&L, volume, and activity |
| `/how-it-works` | Mechanics Guide | Animated visuals, donut chart, podium, timeline |
| `/admin` | Oracle Panel | Submit match results, trigger upsets, update prices |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Python 3.11+
- npm or yarn

### 1. Clone the repository

```bash
git clone git@github.com:kalez48ka-ui/Overflow.git
cd Overflow/overflow
```

### 2. Set up environment variables

Create `.env` files in `backend/`, `frontend/`, `contracts/`, and `ai-engine/`:

```bash
# backend/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/overflow"
CRICAPI_KEY="your-cricapi-key"
ADMIN_SECRET="your-admin-secret"
WIREFLUID_RPC_URL="https://evm.wirefluid.com"
DEPLOYER_PRIVATE_KEY="your-deployer-key"

# frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
NEXT_PUBLIC_CHAIN_ID="92533"

# ai-engine/.env
ANTHROPIC_API_KEY="your-api-key"
FLASK_PORT=5001
```

### 3. Install dependencies

```bash
# Backend
cd backend && npm install && npx prisma generate && npx prisma db push && cd ..

# Frontend
cd frontend && npm install && cd ..

# Contracts
cd contracts && npm install && cd ..

# AI Engine
cd ai-engine && pip install -r requirements.txt && cd ..
```

### 4. Seed the database

```bash
cd backend && npm run seed
```

### 5. Run all services

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# Terminal 3 — AI Engine
cd ai-engine && python server.py

# Or use the ecosystem config:
npx pm2 start ecosystem.config.js
```

The app will be available at `http://localhost:3000`.

---

## Testing

**262 tests** across contracts and backend:

```bash
# Smart contract tests (164 tests — 140 core + 24 PredictionPool)
cd contracts && npx hardhat test

# Backend API + service tests (98 tests)
cd backend && npx vitest run

# Backend test coverage
cd backend && npx vitest run --coverage
```

---

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | [overflow-app.vercel.app](https://overflow-app.vercel.app) |
| Backend API | [overflow-api.onrender.com](https://overflow-api.onrender.com) |
| WireFluid Explorer | [explorer.wirefluid.com](https://explorer.wirefluid.com) |

---

## Project Structure

```
overflow/
├── frontend/          # Next.js 16 app (React 19, TypeScript)
│   ├── src/app/       # App router pages
│   ├── src/components/# UI components
│   ├── src/hooks/     # Custom React hooks
│   └── src/lib/       # Utilities, ABIs, config
├── backend/           # Express 5 API server
│   ├── src/           # Route handlers, services, middleware
│   └── prisma/        # Schema, migrations, seed
├── contracts/         # Solidity smart contracts
│   ├── contracts/     # 8 .sol files
│   └── test/          # Hardhat test suites
├── ai-engine/         # Flask + LangChain RAG pipeline
│   ├── rag/           # Vector store, signals, reports
│   ├── models/        # Win probability model
│   └── data/          # Ingestion scripts
└── docker-compose.yml # Full stack orchestration
```

---

## License

MIT

---

Built with ❤️ from Pakistan
