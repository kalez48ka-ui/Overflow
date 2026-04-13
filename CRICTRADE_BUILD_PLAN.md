# CricTrade — 48-Hour Build Plan: Open Source Tools & Integration Map

## LAYER 1: SMART CONTRACTS (Solidity 0.8.x on WireFluid/Cosmos EVM)

### 1.1 Bonding Curve + Token Factory
| Tool | GitHub | What We Use |
|------|--------|-------------|
| **Pump.sol** (James Bachini) | https://github.com/jamesbachini/Pump.sol | **PRIMARY** — EVM Pump.fun clone with `MemeTokenFactory` + `MemeToken` ERC-20 bonding curve. Fork & modify for asymmetric curves |
| **syedashar1/pump-fun** | https://github.com/syedashar1/pump-fun | Reference for bonding curve math & Solidity patterns |
| **Bancor Contracts v3** | https://github.com/bancorprotocol/contracts-solidity | Bancor formula math for production bonding curves |
| **OpenZeppelin Clones** | https://github.com/OpenZeppelin/openzeppelin-contracts | EIP-1167 minimal proxy for gas-efficient factory deploys |
| **PRBMath** | https://github.com/paulrberg/prb-math | Fixed-point math (UD60x18) for precise curve calculations |
| **ABDKMath64x64** | https://github.com/abdk-consulting/abdk-libraries-solidity | `exp`, `ln`, `pow` for exponential curve formulas |

**Integration Plan:** Fork Pump.sol → replace linear curve with asymmetric polynomial (`buyPrice = a * supply^1.5`, `sellPrice = a * supply^1.2`) → add 6 team tokens via factory → deploy on WireFluid testnet.

### 1.2 Anti-Whale + Dynamic Tax + Circuit Breaker
| Tool | GitHub | What We Use |
|------|--------|-------------|
| **DeFi Circuit Breaker v1** | https://github.com/DeFi-Circuit-Breaker/v1-core | Protocol-agnostic ERC-20 rate-limiting with withdrawal limits and cooldown periods |
| **OpenZeppelin ERC-20 Extensions** | https://github.com/OpenZeppelin/openzeppelin-contracts | `ERC20Pausable`, `Ownable`, `ReentrancyGuard` base contracts |
| **Commit-Reveal Pattern** | https://github.com/jarrodwatts/rock-paper-scissors | Reference implementation of commit-reveal in Solidity (adapt for live match trading) |

**Integration Plan:** Custom `AntiWhale.sol` with max tx limit (1% supply), progressive sell tax (time-based: 12%→8%→5%→3%), circuit breaker (15% drop in 5min = pause). Dynamic sell tax from `PerformanceOracle.sol` updates after each match.

### 1.3 Reward Distribution + Upset Vault
| Tool | GitHub | What We Use |
|------|--------|-------------|
| **Synthetix StakingRewards** | https://github.com/Synthetixio/synthetix | Gold standard for holder reward distribution (`earned()`, `getReward()`) |
| **OpenZeppelin PaymentSplitter** | Built-in OZ | Fee splitting across pools (30% platform, 25% rewards, 15% vault, etc.) |

**Integration Plan:** Fork StakingRewards pattern for `RewardDistributor.sol`. Separate `UpsetVault.sol` that accumulates 15% of fees and releases on upset trigger (oracle-fed upset score).

---

## LAYER 2: BLOCKCHAIN INFRA (WireFluid / Cosmos EVM)

| Tool | Link | What We Use |
|------|------|-------------|
| **Cosmos EVM** | https://github.com/cosmos/evm | Reference implementation — WireFluid is built on this stack |
| **Cosmos EVM Docs** | https://evm.cosmos.network/ | Technical architecture, JSON-RPC endpoints, deployment guide |
| **Evmos** | https://github.com/evmos/evmos | Flagship Cosmos EVM chain — reference for testnet setup & tooling |
| **Hardhat** | https://hardhat.org/ | Contract compilation, testing, deployment scripts |

**Integration Plan:** Configure Hardhat with WireFluid testnet RPC. Standard EVM deployment — Solidity compiles the same. Use Cosmos EVM JSON-RPC for wallet/frontend integration.

---

## LAYER 3: CRICKET DATA & ORACLES

### 3.1 Live Score APIs
| API | URL | Plan/Cost | What We Use |
|-----|-----|-----------|-------------|
| **CricAPI** | https://www.cricapi.com/ | Free: 100K hits/hour | Ball-by-ball live scores, player stats, match info — **PRIMARY for live data** |
| **CricketData.org** | https://cricketdata.org/ | Free tier | Backup live score API, JSON scorecards |
| **Entity Sport** | https://www.entitysport.com/cricket-api/ | Free tier | PSL coverage specifically mentioned, live scores |
| **Roanuz Cricket API** | https://www.cricketapi.com/ | Paid (webhook/WebSocket) | **WebSocket support** for real-time ball-by-ball push |
| **Sportmonks Cricket** | https://www.sportmonks.com/cricket-api/ | Free tier | Comprehensive global cricket coverage |

### 3.2 Historical Data (for AI/RAG)
| Source | URL | What We Use |
|--------|-----|-------------|
| **Cricsheet** | https://cricsheet.org/downloads/ | **21,500+ matches** ball-by-ball data in JSON/YAML — includes PSL, IPL, T20I. **FREE** |
| **Cricsheet GitHub** | https://github.com/cricsheet | Structured data repos for all formats |
| **cricketdata R/Python package** | https://github.com/robjhyndman/cricketdata | Pre-processed Cricsheet + ESPN data, ready to analyze |
| **Kaggle T20 Dataset** | https://www.kaggle.com/datasets/jamiewelsh2/ball-by-ball-it20 | Cleaned ball-by-ball T20I data 2003-2023 |

### 3.3 Cricket Score Scrapers (Backup)
| Tool | GitHub | What We Use |
|------|--------|-------------|
| **tarun7r/Cricket-API** | https://github.com/tarun7r/Cricket-API | Unofficial scraper for live scores, fixtures, player stats |

**Integration Plan:** CricAPI (free) as primary live feed → poll every 30 seconds → push to WebSocket server → frontend + oracle. Cricsheet data downloaded and embedded in vector DB for AI RAG pipeline.

---

## LAYER 4: BACKEND (Node.js + Express + WebSocket)

| Tool | GitHub/Link | What We Use |
|------|-------------|-------------|
| **Express.js** | https://github.com/expressjs/express | REST API for user data, portfolio, match info |
| **Socket.io** | https://github.com/socketio/socket.io | WebSocket server for live price updates & match events |
| **Prisma ORM** | https://github.com/prisma/prisma | PostgreSQL ORM — already used in BlockVigil |
| **Bull/BullMQ** | https://github.com/taskforcesh/bullmq | Job queue for oracle updates, reward calculations |
| **ethers.js** | https://github.com/ethers-io/ethers.js | Contract interaction from backend (oracle updates, admin) |
| **node-cron** | https://github.com/node-cron/node-cron | Scheduled tasks (poll cricket API, update sell taxes) |

**Integration Plan:** Express API + Socket.io for real-time. Prisma for PostgreSQL (user profiles, portfolios, match history). BullMQ for background jobs (oracle updates after each match, reward distribution triggers).

---

## LAYER 5: FRONTEND (Next.js + React + TailwindCSS)

### 5.1 Web3 Boilerplate
| Tool | GitHub | Stars | What We Use |
|------|--------|-------|-------------|
| **scaffold-eth-2** | https://github.com/scaffold-eth/scaffold-eth-2 | 2K+ | **PRIMARY** — Next.js + wagmi + viem + RainbowKit + Hardhat + Tailwind. Gold standard for EVM dApps |
| **nexth** | https://github.com/wslyvh/nexth | 1.8K+ | Alternative — Next.js + Viem + Wagmi + Web3Modal + Tailwind + daisyUI |
| **ETHGlobal Starter** | https://github.com/ethglobal/nextjs-wagmi-viem-starter | — | Minimal starter from ETHGlobal hackathon |

### 5.2 Pump.fun Frontend Reference
| Tool | GitHub | Stars | What We Use |
|------|--------|-------|-------------|
| **cutupdev/Solana-Pumpfun-Frontend** | https://github.com/cutupdev/Solana-Pumpfun-Frontend | 214 | Pump.fun UI clone — bonding curve trading interface patterns |
| **cutupdev/EVM-Pumpfun-Smart-Contract** | https://github.com/cutupdev/EVM-Pumpfun-Smart-Contract | 255 | EVM version of pump.fun (four.meme style) — Solidity reference |

### 5.3 Trading Charts
| Tool | GitHub | Stars | What We Use |
|------|--------|-------|-------------|
| **TradingView Lightweight Charts** | https://github.com/tradingview/lightweight-charts | 10K+ | **Real-time candlestick/line charts** for token prices. Apache 2.0 |
| **lightweight-charts-react** | https://github.com/tradingview-tools/lightweight-charts-react | — | React wrapper for TradingView charts |
| **Crypto-Derivatives** | https://github.com/karan0805/Crypto-Derivatives | — | Next.js + TradingView + Prisma + Tailwind — shows exact wiring we need |

### 5.4 Dashboard UI
| Tool | GitHub | Stars | What We Use |
|------|--------|-------|-------------|
| **TailAdmin** | https://github.com/TailAdmin/free-nextjs-admin-dashboard | 2.3K | **Dashboard base** — Next.js + Tailwind with charts, tables, dark mode |
| **shadcn/ui** | https://ui.shadcn.com/ | — | Beautiful Tailwind components — cards, dialogs, tabs, toasts |
| **Recharts** | https://recharts.org/ | — | Pie charts (fee splits), bar charts (standings) |
| **Framer Motion** | https://www.framer.com/motion/ | — | Animations for live match events, price changes |

**Integration Plan:** Fork `scaffold-eth-2` → merge TailAdmin dashboard layout → add TradingView charts for token prices → shadcn/ui for components → reference cutupdev pump.fun frontend for bonding curve trading UX patterns.

---

## LAYER 6: AI ENGINE (RAG + Cricket Analytics)

### 6.1 RAG Framework
| Tool | GitHub | Stars | What We Use |
|------|--------|-------|-------------|
| **LangChain Python** | https://github.com/langchain-ai/langchain | 133K | **PRIMARY** — RAG pipeline with CSV/JSON loaders, Claude integration, RetrievalQA chain |
| **LlamaIndex** | https://github.com/run-llama/llama_index | 48K | `PandasQueryEngine` for structured cricket queries without embeddings |
| **ChromaDB** | https://github.com/chroma-core/chroma | 27K | Dev vector DB — zero config, `pip install chromadb` |
| **pgvector** | https://github.com/pgvector/pgvector | 20K | **PRODUCTION** — PostgreSQL extension, SQL + vector in one DB |
| **Pathway** | https://github.com/pathwaycom/pathway | 63K | **Real-time RAG** — stream processing for live ball-by-ball signal generation |
| **LangGraph** | https://github.com/langchain-ai/langgraph | 29K | Multi-step cricket analysis agent with state management |

### 6.2 Cricket ML Models
| Tool | GitHub | What We Use |
|------|--------|-------------|
| **CricketScorePredictor** | https://github.com/codophobia/CricketScorePredictor | First innings score prediction — adapt for live win probability |
| **CricketChasingProbability** | https://github.com/codophobia/CricketChasingProbability | Win probability for chasing team — **core for live trading signals** |
| **IPL Win Predictor** | https://github.com/rajatrawal/ipl-win-predictor | Logistic regression win probability — adapt for PSL |
| **fantasy-sports-prediction** | https://github.com/pankajrawat9075/fantasy-sports-prediction | 48 stars — XGBoost/RF player performance prediction |
| **T20 LSTM Score Prediction** | https://github.com/sahi0008/Toss2target-t20-cricket-score-prediction | Deep learning (LSTM) + Monte Carlo for T20 score prediction |
| **cricketstats** | https://github.com/nsaranga/cricketstats | Clean Python API over Cricsheet data — skip manual CSV parsing |

### 6.3 Directly Relevant AI + Sports Projects
| Tool | GitHub | What We Use |
|------|--------|-------------|
| **sports-analytics-agent** | https://github.com/navinsreyas/sports-analytics-agent | **CLOSEST MATCH** — IPL Cricket AI agent with PostgreSQL + ChromaDB + Neo4j. Study its routing logic |
| **pitch-iq** | https://github.com/amangupta982/pitch-iq | AI cricket coaching: real-time win probability + batting/bowling analysis |
| **boundary-graph** | https://github.com/sidagarwal04/boundary-graph | IPL analytics platform with Neo4j knowledge graph + Nuxt.js + FastAPI |
| **NiftyAI Trading Agent** | https://github.com/Suraj80/nifty-ai-trading-agent | Quant + LLM fusion for trading signals — **adapt architecture for cricket** |

### 6.4 RAG Pipeline Architecture
```
Cricsheet JSON (PSL matches) → cricketstats package → Clean DataFrames
    → Multi-granularity text generation (per-ball, per-over, per-innings summaries)
    → ChromaDB Embeddings with metadata (match_id, venue, teams, phase)
    → LangChain RetrievalQA + Claude API
    → Pre-match reports + Live match signals
    → Serve via Express API → Frontend display

Real-time path (Pathway):
    Live CricAPI feed → Pathway stream processor
    → Incremental vector index update after each delivery
    → Compare current match situation to historical patterns
    → Emit trading signal when similarity to known collapse/pump patterns > threshold
```

**Integration Plan:**
1. Download all PSL data from Cricsheet → use `cricketstats` for clean access
2. Embed in ChromaDB (dev) / pgvector (prod) at 3 granularities (ball, over, innings)
3. LangChain RAG pipeline with Claude → pre-match reports auto-generated 2h before each match
4. Pathway for real-time streaming RAG during live matches
5. Dual-stream signals: ML model (win probability) + LLM (match narrative analysis via RAG)

---

## LAYER 7: DEPLOYMENT & INFRA

| Tool | Link | What We Use |
|------|------|-------------|
| **Vercel** | https://vercel.com | Frontend deployment (Next.js native) |
| **Railway / Render** | https://railway.app | Backend + PostgreSQL + Redis |
| **Docker** | Standard | Containerize backend + AI engine |

---

## 48-HOUR SPRINT PLAN

### Phase 1: Foundation (Hours 0-12)
- [ ] Fork `nexth` → setup Next.js + wagmi + viem + Tailwind frontend
- [ ] Fork `Pump.sol` → modify for asymmetric bonding curve + 6 team tokens
- [ ] Setup Hardhat → configure WireFluid testnet
- [ ] Setup Express + Prisma + PostgreSQL backend
- [ ] Register CricAPI free tier → test live score endpoints

### Phase 2: Smart Contracts (Hours 12-24)
- [ ] `TeamTokenFactory.sol` — create 6 PSL team ERC-20 tokens with bonding curves
- [ ] `PerformanceOracle.sol` — accept match results, calculate sell tax rates
- [ ] `RewardDistributor.sol` — match rewards + performance pool
- [ ] `UpsetVault.sol` — fee accumulation + upset release logic
- [ ] `AntiWhale.sol` — max tx, progressive tax, circuit breaker
- [ ] Deploy all contracts to WireFluid testnet

### Phase 3: Frontend + Live Data (Hours 24-36)
- [ ] Token trading page — buy/sell with TradingView price charts
- [ ] Live match dashboard — ball-by-ball feed from CricAPI
- [ ] Team standings + dynamic sell tax display
- [ ] Portfolio view — positions, P&L, rewards
- [ ] Upset Vault tracker — current vault size, countdown
- [ ] Wallet connect (MetaMask / WalletConnect via Web3Modal)

### Phase 4: AI + Polish (Hours 36-48)
- [ ] Download Cricsheet PSL data → embed in ChromaDB
- [ ] LangChain RAG pipeline → Claude API pre-match reports
- [ ] AI analysis panel on frontend
- [ ] Mobile responsive design
- [ ] Demo flow: buy token → simulate match → see dynamic tax change → upset vault release
- [ ] Record demo video

---

## KEY REPOS TO CLONE IMMEDIATELY

```bash
# Smart Contracts
git clone https://github.com/jamesbachini/Pump.sol.git
git clone https://github.com/DeFi-Circuit-Breaker/v1-core.git

# Frontend
git clone https://github.com/wslyvh/nexth.git

# Charts
npm install lightweight-charts

# AI/Data
pip install langchain chromadb anthropic
# Download Cricsheet PSL data
wget https://cricsheet.org/downloads/psl_json.zip

# Cricket API
# Register at https://www.cricapi.com/ for free API key
```

---

## COST ESTIMATE (48-hour hackathon)

| Item | Cost |
|------|------|
| CricAPI free tier | $0 |
| Cricsheet data | $0 (open data) |
| Claude API (RAG) | ~$5-10 |
| WireFluid testnet | $0 (testnet) |
| Vercel (frontend) | $0 (hobby tier) |
| Railway (backend) | $0 (trial) |
| **Total** | **~$5-10** |
