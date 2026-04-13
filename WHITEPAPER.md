# OVERFLOW

### The PSL Player & Team Trading Platform

*Built on WireFluid Blockchain*

**Author:** Khalid Mehmood
**Version:** 1.0
**Date:** March 2026
**WireFluid Hackathon 2026 | March 24-26**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [The Overflow Solution](#3-the-overflow-solution)
4. [Economic Model](#4-economic-model)
5. [Upset Vault System](#5-upset-vault-system)
6. [Anti-Whale Protection](#6-anti-whale-protection)
7. [Security & Exploit Protection](#7-security--exploit-protection)
8. [AI Integration](#8-ai-integration)
9. [WireFluid Network — Why We Build Here](#9-wirefluid-network--why-we-build-here)
10. [Halal Compliance Framework](#10-halal-compliance-framework)
11. [Live Match Trading Flow](#11-live-match-trading-flow)
12. [Season Lifecycle](#12-season-lifecycle)
13. [Technical Architecture](#13-technical-architecture)
14. [Implementation Blueprint](#14-implementation-blueprint)
15. [Conclusion & Vision](#15-conclusion--vision)

---

## 1. Executive Summary

Overflow is a decentralized PSL (Pakistan Super League) team token trading platform built on the WireFluid blockchain. It transforms cricket fan engagement into a real-time financial experience where fans buy and sell team tokens whose economics are directly driven by on-field performance. Unlike traditional betting platforms, Overflow operates on Islamic trading principles (Tijarat) — users own real digital assets, can exit at any time, and even losing positions retain value through performance rewards and upset bonuses.

The platform introduces three groundbreaking mechanisms:

- **Dynamic Performance-Linked Sell Tax** — underperforming teams become expensive to abandon, creating natural price stability
- **Upset Vault Rewards** — massive bonus payouts when underdogs defeat favorites, rewarding conviction
- **AI-Powered Cricket Analytics** — providing traders with institutional-grade analysis of matchups, form, and value opportunities

The platform earns revenue through trading fees on every transaction — regardless of match outcomes. All treasury and reward mechanisms are governed by immutable smart contracts on WireFluid, ensuring transparency and zero platform risk.

| $0.01 | ~5 sec | 6 | 10M PKR |
|-------|--------|---|---------|
| WireFluid Tx Fee | Transaction Finality | PSL Team Tokens | Hackathon Prize Pool |

---

## 2. Problem Statement

### 2.1 Why Betting is Haram in Islam

Traditional sports betting is classified as **Qimar (gambling)** in Islamic jurisprudence and is explicitly prohibited in the Quran (Surah Al-Maidah 5:90-91). The fundamental characteristics that make betting haram are:

| Characteristic | Why It Is Haram |
|----------------|-----------------|
| No Asset Ownership | Bettor receives nothing tangible — just a promise of payout based on outcome |
| Binary Loss | If the predicted outcome is wrong, 100% of the stake is lost with nothing remaining |
| Chance-Based | Outcome depends on uncontrollable external events, not productive effort |
| Zero-Sum | One party must lose for another to gain — no collective value is created |
| No Exit Option | Once a bet is placed, the participant cannot exit or modify their position |

### 2.2 The Market Gap

Cricket fans in Pakistan (and globally across 2.5 billion cricket followers) have enormous passion for the sport but extremely limited avenues for financial engagement. The existing options are either:

1. **Illegal betting apps** — Widely used in Pakistan despite being both illegal under Pakistani law and haram in Islam. Estimated $50B+ annual market in South Asian cricket betting, mostly unregulated.
2. **Fantasy cricket (Dream11 etc.)** — Technically not available in Pakistan. Even where available, Islamic scholars debate its permissibility since the entry fee + prize pool structure mirrors gambling.
3. **Failed crypto attempts** — Rario ($120M raised, shut down), FanCraze ($117M raised, faded), Cricket Foundation (token went to zero). All failed because they sold speculative static collectibles, not real-time engagement tools.

**The gap:** There is no Sharia-compliant, legally defensible, real-time financial engagement platform for cricket fans. Overflow fills this gap by converting the betting model into a trading model — preserving the excitement and economic incentives while replacing every haram element with a halal alternative.

---

## 3. The Overflow Solution

### 3.1 Core Mechanics

At the start of each PSL season, six team tokens are created — one for each franchise. These tokens trade on bonding curves deployed on WireFluid. The price of each token is determined purely by market supply and demand, but the platform's economic mechanisms ensure that real-world cricket performance is the PRIMARY driver of demand, not speculation.

| Step | What Happens |
|------|-------------|
| **1. Season Start** | Six team tokens launch on bonding curves at equal base prices (Fair Launch Phase) |
| **2. Pre-Match** | Fans analyze matchups, buy team tokens based on their cricket knowledge and AI insights |
| **3. Live Match** | Real-time trading continues. Token prices move with match momentum as fans react to events |
| **4. Match End** | Performance scores calculated. Sell taxes recalibrate. Reward pools distribute to holders |
| **5. Upsets** | When underdogs win, Upset Vault releases massive bonus rewards to underdog token holders |
| **6. Season End** | Grand Prize distributed. Tokens become season collectibles. New season launches fresh tokens |

### 3.2 Per-Match Token Lifecycle

Every PSL match creates a fresh trading cycle. Before the match, fans take positions based on analysis. During the match, prices fluctuate as wickets fall, runs are scored, and momentum shifts. Each swing generates trading volume, and every trade generates platform fees. After the match, the performance score oracle updates all team metrics, recalibrating the dynamic sell tax and distributing performance rewards.

### 3.3 Asymmetric Bonding Curve

Overflow uses an asymmetric bonding curve — the buy curve is steeper than the sell curve. This means buying pushes the price up faster, but selling brings it down more slowly. The spread between the two curves is the platform's structural protection against manipulation. Quick flips result in guaranteed losses due to the asymmetry, while longer holds allow the curves to converge, reducing the spread penalty.

**Buy Price Formula:**
```
price(x) = BASE_PRICE + K_BUY * x
where BASE_PRICE = 0.01 WIRE, K_BUY = 0.001 WIRE
```

**Sell Price Formula:**
```
price(x) = BASE_PRICE + K_SELL * x
where BASE_PRICE = 0.01 WIRE, K_SELL = 0.0007 WIRE
```

**Integral Cost for n tokens starting at supply s:**
```
Buy Cost  = BASE_PRICE * n + K_BUY  * n * (2s + n) / 2
Sell Return = BASE_PRICE * n + K_SELL * n * (2s - n) / 2
```

---

## 4. Economic Model

### 4.1 Dynamic Performance-Linked Sell Tax

The most innovative feature of Overflow is the dynamic sell tax that adjusts based on real team performance. The best-performing team in the PSL has the lowest sell tax (2%), making it easy and cheap to trade. The worst performing team has the highest sell tax (15%), making it expensive to abandon. This creates a natural economic incentive to HOLD underperforming teams rather than panic-sell, stabilizing prices and creating real trading decisions based on analysis rather than impulse.

| Rank | Sell Tax | Basis Points |
|------|----------|-------------|
| 1st (Best) | 2.0% | 200 bps |
| 2nd | 4.6% | 460 bps |
| 3rd | 7.2% | 720 bps |
| 4th | 9.8% | 980 bps |
| 5th | 12.4% | 1240 bps |
| 6th (Worst) | 15.0% | 1500 bps |

**Formula:** `sellTaxBps = 200 + (rank - 1) * 260`

The sell tax recalculates automatically after every match based on the team's updated Performance Score:

| Metric | Weight | Description |
|--------|--------|-------------|
| Points Table Position | 40% | Direct league standing (1st = highest score, 6th = lowest) |
| Net Run Rate (NRR) | 20% | Overall tournament NRR, normalized to 0-100 scale |
| Last 3 Match Form | 20% | Win = 20 points each, Loss = 0 points. Maximum 60 points |
| Player Availability | 20% | Key player injuries, bans, and replacement quality index |

### 4.2 Performance Reward Distribution

After each match, the Performance Reward Pool (25% of all collected fees) distributes to token holders based on their team's league position. Top-ranked team holders receive the largest share, creating a passive income stream for those who correctly identified strong teams early.

| Place | Reward Pool Share |
|-------|------------------|
| 1st Place | 35% |
| 2nd Place | 25% |
| 3rd Place | 20% |
| 4th Place | 12% |
| 5th Place | 5% |
| 6th Place | 3% |

### 4.3 Fee Revenue Split

Every trade on Overflow generates a fee. The buy fee is a flat 2%, while the sell tax ranges from 2% to 15% depending on the team's performance ranking. All collected fees are split across five pools:

| Pool | Share | Purpose |
|------|-------|---------|
| Platform Revenue | 30% | Operational costs, development, team |
| Performance Rewards | 25% | Distributed to holders based on team rank |
| Floor Price Backing | 20% | Treasury-backed minimum price for all tokens |
| Upset Vault | 15% | Accumulates for upset bonus payouts |
| Season Grand Prize | 10% | End-of-season distribution to champion holders |

### 4.4 Complete Money Flow

```
Users Buy/Sell → Trading Fees (per trade) → Fee Distribution:
                                             ├── Platform Revenue     30%
                                             ├── Performance Rewards  25%
                                             ├── Floor Price Backing  20%
                                             ├── Upset Vault          15%
                                             └── Grand Prize          10%
```

The platform earns revenue on EVERY trade regardless of match outcome. When teams win, their fans trade actively. When teams lose, sell taxes are higher, generating more fee revenue per transaction. The platform's incentives are perfectly aligned with maximum fan engagement — not with any particular team winning.

---

## 5. Upset Vault System

The Upset Vault is Overflow's signature innovation — a mechanism that creates explosive reward events when underdogs defeat favorites. It is designed to reward conviction and create viral moments that drive platform growth.

### 5.1 Upset Multiplier Mechanics

The Upset Score is calculated as the difference between the winning team's sell tax and the losing team's sell tax. When a team with a high sell tax (poor performer) defeats a team with a low sell tax (strong performer), the gap represents the magnitude of the upset. This gap determines the reward multiplier:

| Upset Level | Score Range | Multiplier | Vault Release % | Example Scenario |
|-------------|-------------|------------|-----------------|------------------|
| Normal | 0-3 | 1x | 0% (regular rewards) | 3rd beats 4th |
| Big Upset | 4-6 | 3x | 15% of vault | 5th beats 2nd |
| Huge Upset | 7-9 | 5x | 30% of vault | 6th beats 3rd |
| GIANT KILLER | 10-13 | 10x | 60% of vault | 6th beats 1st |

### 5.2 Vault Build & Release Cycle

The Upset Vault continuously accumulates 15% of all platform fees. When expected results occur (strong teams beating weak teams), the vault grows larger. This creates anticipation — the longer the vault builds without an upset, the larger the eventual payout will be. When an upset finally triggers, the vault releases a percentage proportional to the upset magnitude.

### 5.3 Giant Killer Scenario

Consider this real-world scenario: It is Match Day 15. The top-ranked team sits at the top of the table with a 2% sell tax. The bottom-ranked team has 15% sell tax. The Upset Vault has accumulated 800,000 WIRE over 14 matches of mostly expected results.

A small group of astute fans noticed that the bottom team's bowling attack matches up well against the top team's batting lineup. They quietly buy tokens at 0.02 WIRE — near the floor price.

**Result: The bottom team wins.** Upset Score = 15 - 2 = 13 (GIANT KILLER). The Upset Vault releases 60% of its balance = 480,000 WIRE, plus the normal match reward of 50,000 WIRE with a 10x multiplier. The 200 remaining bottom-team holders receive approximately 2,650 WIRE each. Those who bought at 0.02 WIRE spent 100 WIRE to buy tokens and received 2,650+ WIRE in upset rewards — a 26x return on a single match, not counting the token price appreciation.

---

## 6. Anti-Whale Protection

Overflow implements six layers of whale protection to prevent market manipulation and protect retail traders:

| Layer | Mechanism | Effect on Whale |
|-------|-----------|-----------------|
| 1. Asymmetric Curve | Sell curve flatter than buy curve | Quick flips guarantee losses due to spread |
| 2. Progressive Sell Tax | 12% within 5 min, 8% within 30 min, 5% within 2 hrs, 3% after | Fast dumps are extremely expensive |
| 3. Max Transaction Limit | 1% of total supply per sell + 60 second cooldown | 100+ transactions needed for full exit |
| 4. Performance Floor | Treasury-backed minimum price. Auto-buy at floor level | Cannot crash price below floor |
| 5. Protection Pool | Whale sell taxes distributed to remaining holders | Whale dump = airdrop for holders |
| 6. Circuit Breaker | 15% drop in 5 min = 3 min pause. 25% in 15 min = 10 min pause | Dump momentum broken, panic prevented |

---

## 7. Security & Exploit Protection

Overflow's security model addresses 12 identified attack vectors across smart contract, economic, and operational layers:

| Attack Vector | Risk | Protection |
|---------------|------|-----------|
| Multi-Wallet Sybil | HIGH | Phone/CNIC + AI verification |
| Transfer Tax Dodge | CRITICAL | Transfer = Sell (same dynamic sell tax applies) |
| Flash Loan | HIGH | 24hr Delay + Hold Requirement for rewards |
| Whale Dump | HIGH | Circuit Breaker + Floor Price |
| Spread All Underdogs | MEDIUM | Diminishing Returns across positions |
| Front-Running | HIGH | Commit-Reveal Batch ordering |
| Oracle Manipulation | CRITICAL | Multi-Source + Multisig verification |
| Last-Min Reward Grab | MEDIUM | Match-Start Snapshot for eligibility |

### Key Security Mechanisms

- **Transfer = Sell:** All token transfers incur the same dynamic sell tax as market sells. This eliminates the most dangerous exploit — transferring tokens to a secondary wallet to avoid sell tax. Receiving wallets inherit zero hold duration.
- **Flash Loan Defense:** Rewards distribute in a 24-hour claim window, not within the same block. Combined with hold duration requirements, flash loan attacks become mathematically unprofitable.
- **Commit-Reveal Trading:** During live matches, orders are submitted in encrypted form (commit phase) and revealed simultaneously in 30-second batches. This eliminates front-running and MEV extraction.
- **Multi-Source Oracle:** Match data is verified by 2-out-of-3 independent sources (CricAPI, Cricbuzz, ESPN). If sources conflict, trading pauses for manual review via multisig.
- **Match-Start Snapshot:** Reward eligibility is determined at the time of the first ball, not match end. This prevents last-minute reward-grabbing.

---

## 8. AI Integration

AI is not an add-on feature in Overflow — it is a core component that makes the platform's complex economic dynamics navigable for users. Without AI-powered analysis, the dynamic sell tax, upset vault, and multi-team portfolio management would be overwhelming for casual fans. The AI serves as each user's personal cricket trading analyst.

### 8.1 Pre-Match Analysis

Before each match, the AI generates comprehensive research reports using a RAG (Retrieval-Augmented Generation) pipeline. Historical PSL ball-by-ball data (21,000+ matches from Cricsheet) is embedded in a vector database. The AI retrieves relevant historical matchups, venue statistics, and bowling-batting head-to-head records to produce institutional-grade analysis.

### 8.2 Live Match Intelligence

During matches, the AI processes ball-by-ball data and provides real-time trading signals with reasoning. It monitors momentum shifts, identifies overreactions in token prices, and alerts users to opportunities. The AI also tracks the Upset Score trajectory — estimating how likely an upset payout is as the match progresses.

### 8.3 Portfolio Management

Post-match, the AI generates portfolio performance reports, analyzes entry/exit timing quality, and recommends rebalancing strategies. It factors in remaining fixtures, strength of schedule, and sell tax trajectories to advise whether to hold, reduce, or increase positions in each team.

---

## 9. WireFluid Network — Why We Build Here

Overflow is purpose-built for WireFluid. The same product would not work on Ethereum, Polygon, or Solana due to the unique combination of requirements that only WireFluid satisfies.

### 9.1 Network Specifications

| Parameter | Value |
|-----------|-------|
| **Network Name** | WireFluid Testnet |
| **EVM Chain ID** | 92533 |
| **Cosmos Chain ID** | wire-1 |
| **Native Currency** | WIRE (18 decimals, base unit: awire) |
| **Consensus** | CometBFT (Byzantine Fault Tolerant) |
| **Block Time** | ~5 seconds |
| **Finality** | Immediate single-block commit (no reorgs) |
| **Throughput** | ~1,000 TPS |
| **Min Gas Price** | 10 Gwei |
| **Tx Fee** | ~$0.01 per transaction |
| **EVM Compatibility** | Full — Solidity, Vyper, all Ethereum opcodes |
| **Supported Tx Types** | Legacy, EIP-1559, EIP-7702 |

### 9.2 RPC Endpoints & Developer Resources

| Resource | URL |
|----------|-----|
| **Primary EVM RPC** | `https://evm.wirefluid.com` |
| **RPC (Load Balanced)** | `https://evm2.wirefluid.com` through `https://evm5.wirefluid.com` |
| **WebSocket** | `wss://ws.wirefluid.com` |
| **Block Explorer** | `https://wirefluidscan.com` |
| **Faucet** | `https://faucet.wirefluid.com` (10 WIRE per request, 1 request per 12 hours) |
| **Documentation** | `https://docs.wirefluid.com` |
| **GitHub** | `https://github.com/wirefluid-protocol` |

### 9.3 Supported Ethereum JSON-RPC Methods

WireFluid supports all standard Ethereum JSON-RPC methods:

- **Network:** `net_version`, `net_listening`, `net_peerCount`
- **Blockchain:** `eth_blockNumber`, `eth_getBlockByNumber`, `eth_getBlockByHash`
- **Accounts:** `eth_accounts`, `eth_getBalance`, `eth_getTransactionCount`, `eth_getCode`
- **Transactions:** `eth_sendRawTransaction`, `eth_sendTransaction`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_estimateGas`
- **Contracts:** `eth_call`, `eth_getLogs`, `eth_newFilter`, `eth_getFilterLogs`
- **Gas:** `eth_gasPrice`, `eth_feeHistory`, `eth_maxPriorityFeePerGas`

### 9.4 Why Not Other Chains?

| Requirement | WireFluid | Ethereum | Polygon | Solana |
|-------------|-----------|----------|---------|--------|
| Tx Fee | $0.01 | $5-50 per tx (kills micro-trading) | $0.01-0.10 | $0.00025 |
| Finality | ~5 sec, absolute | ~13 min, probabilistic | ~2 sec, reorg risk | ~0.4 sec |
| Reorg Risk | Impossible (CometBFT) | Low but possible | Low but possible | Possible |
| EVM Compatible | Full Solidity/Hardhat/MetaMask | Native | Native | No (Rust/Anchor required) |
| MEV/Front-running | No mempool (CometBFT) | Major problem | Exists | Exists |
| Cross-Chain | Native IBC to 50+ chains | Fragile bridges | Bridges | Wormhole (hacked $326M) |
| Dev Tooling | Hardhat, Foundry, Remix, Ethers, Viem | Same | Same | Different ecosystem |

**Key advantages for Overflow:**
- **$0.01 fees** make 10-50 micro-trades per match economically viable
- **~5 second absolute finality** means trades during live matches reflect real-time action
- **No MEV** means CometBFT validators order transactions fairly — no front-running bots extracting value from traders
- **IBC** enables future expansion to users on other Cosmos chains

### 9.5 MetaMask Configuration

```
Network Name:    WireFluid Testnet
RPC URL:         https://evm.wirefluid.com
Chain ID:        92533
Currency Symbol: WIRE
Explorer:        https://wirefluidscan.com
```

### 9.6 Hardhat Configuration

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    wirefluid: {
      url: "https://evm.wirefluid.com",
      chainId: 92533,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },
};
```

### 9.7 Viem Chain Definition (Frontend)

```typescript
import { defineChain } from "viem";

export const wirefluid = defineChain({
  id: 92533,
  name: "WireFluid Testnet",
  nativeCurrency: { name: "WIRE", symbol: "WIRE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evm.wirefluid.com"] },
  },
  blockExplorers: {
    default: { name: "WireScan", url: "https://wirefluidscan.com" },
  },
  testnet: true,
});
```

---

## 10. Halal Compliance Framework

Overflow is designed from the ground up to comply with Islamic finance principles. Every mechanism was evaluated against the criteria that distinguish halal trade (Tijarat) from haram gambling (Qimar):

| Feature | Traditional Betting | Overflow |
|---------|-------------------|----------|
| Asset Ownership | None | Full Token Ownership |
| Loss Scenario | 100% Loss | Partial + Rewards |
| Exit Anytime | No | Yes |
| Skill Based | Mostly Luck | Analysis + Knowledge |
| Sharia Compliance | Haram (Qimar) | Halal (Tijarat) |
| Platform Risk | Against Users | Zero Directional |

### Detailed Halal Justification

| Islamic Principle | Overflow Implementation |
|-------------------|----------------------|
| **Ownership (Milkiyat)** | User receives tokens recorded on the blockchain. They hold full ownership of a real digital asset |
| **Voluntary Exit (Ikhtiyar)** | Users can sell their tokens at any time. There is no lock-in period. The sell tax is a cost of trading, not a restriction |
| **No Total Loss (Ilm)** | Token value may decrease, but floor price mechanism ensures non-zero value. Reward distributions provide additional value |
| **Knowledge-Based** | Successful trading requires cricket knowledge, analytical ability, and market understanding — productive skill |
| **No Gharar (Excessive Uncertainty)** | All mechanics are transparent and defined in smart contracts. No hidden terms, no counterparty risk |
| **Collective Value** | Unlike betting where losers fund winners, Overflow creates a shared engagement economy. Platform fees fund rewards for ALL participants |

---

## 11. Live Match Trading Flow

The most exciting aspect of Overflow is the live match trading experience. As the match unfolds over by over, token prices fluctuate in real-time based on fan reactions, AI signals, and match events.

### Match Trading Timeline

| Phase | Time | Activity |
|-------|------|----------|
| Pre-Match Window | 2 hours before | Fans analyze teams, AI reports published, initial positions taken |
| Toss & Team Announce | 30 min before | Sell pause until teams announced. Then trading resumes with full info |
| Powerplay (Overs 1-6) | Match start | High volatility. Boundaries and wickets cause rapid price swings |
| Middle Overs (7-15) | Mid-match | Price trends establish. Momentum becomes clearer. Smart repositioning |
| Death Overs (16-20) | Late match | Maximum trading volume. Outcome becoming clear. Massive price movement |
| Match Settlement | 1 min after end | Oracle updates scores. Sell taxes recalibrate. Rewards queue for 24hr claim |
| Post-Match Trading | 24 hours after | Reflection trades. Position building for next match. Reward claims open |

---

## 12. Season Lifecycle

| Phase | Duration | Details |
|-------|----------|---------|
| **Token Launch** | Day 1 | Six team tokens mint via Fair Launch (24hr fixed-price phase, max 10K WIRE per wallet) |
| **Bonding Curve Active** | Day 2+ | Price discovery begins. Sell taxes start at 5% for all teams |
| **League Stage** | ~30 matches | Full trading cycle per match. Taxes/rewards recalibrate after each game |
| **Playoff Qualification** | After league | Eliminated team tokens: sell tax freezes. Qualified teams: tax drops to minimum 2% |
| **Playoffs** | 4 matches | Trading intensity peaks. Upset Vault at maximum. Highest volume period |
| **Final** | 1 match | Championship match trading. Maximum reward multipliers possible |
| **Season Settlement** | Post-final | Grand Prize Pool distributes. Champion holders get 50%. All tokens become collectibles |
| **Off-Season** | Until next PSL | Tokens remain tradeable as collectibles. Next season launches fresh token set |

### Season-End Grand Prize Distribution

| Placement | Prize Pool Share | Additional Reward |
|-----------|-----------------|-------------------|
| Champion Team Holders | 50% | Champion NFT Badge (tradeable) |
| Runner-Up Holders | 25% | Finalist NFT Badge |
| 3rd/4th Place Holders | 15% | Playoff NFT Badge |
| 5th/6th Place Holders | 10% (consolation) | Season Memorabilia Token |

---

## 13. Technical Architecture

### 13.1 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Blockchain** | WireFluid Testnet (Chain 92533) | Settlement, state, token custody |
| **Smart Contracts** | Solidity 0.8.28, OpenZeppelin 5.x | Core trading logic, oracle, rewards |
| **Contract Framework** | Hardhat v3 + Ignition | Compilation, testing, deployment |
| **Frontend** | Next.js 14 (App Router) | Server/client rendering, API routes |
| **UI Framework** | Tailwind CSS 3.4 + custom design tokens | Dark theme, responsive, PSL team colors |
| **Charts** | Recharts 2.x | Price charts, sparklines, vault visualization |
| **Wallet** | Wagmi 2.x + Viem 2.x | Contract reads/writes, wallet connection |
| **Wallet Connector** | MetaMask | Primary wallet for WireFluid |
| **State/Cache** | TanStack React Query 5.x | Server state, caching, refetching |
| **AI Engine** | Claude API (Anthropic) | Pre-match analysis, live signals, portfolio advice |
| **Language** | TypeScript 5.x (strict) | End-to-end type safety |

### 13.2 Smart Contract Architecture

Three contracts deployed on WireFluid:

**OverflowCore** — The main trading engine
- Manages 6 team token pools (internal balances, not ERC-20)
- Asymmetric linear bonding curve (K_BUY=0.001, K_SELL=0.0007)
- 2% flat buy fee, dynamic sell tax (2%-15% from oracle)
- Anti-whale: 1% max sell per tx, 60-second cooldown
- Holder tracking for reward distribution
- Pausable (circuit breaker), ReentrancyGuard, Ownable

**PerformanceOracle** — On-chain data feed
- Stores team rankings (1-6) set by owner (backend/multisig)
- Records match results with upset score calculation
- Provides sell tax computation: `200 + (rank - 1) * 260` bps
- Team names and metadata

**RewardDistributor** — Fee collection and payout
- Receives fees from OverflowCore, splits into 3 pools:
  - 60% liquidity backing
  - 25% performance rewards
  - 15% upset vault
- Performance distribution weighted by rank (35%/25%/20%/12%/5%/3%)
- Upset vault release to winning team holders on upsets
- Pull-based claiming (users call `claimRewards()`)

### 13.3 Contract Interaction Flow

```
User calls buyTokens(teamId, amount) with WIRE
  → OverflowCore calculates bonding curve cost
  → 2% fee deducted → sent to RewardDistributor.receiveFees()
  → RewardDistributor splits: 60% liquidity, 25% performance, 15% vault
  → Tokens credited to user balance
  → Excess WIRE refunded

User calls sellTokens(teamId, amount)
  → OverflowCore checks: balance, max sell (1%), cooldown (60s)
  → Queries oracle for team rank → calculates dynamic sell tax
  → Sell tax portion → sent to RewardDistributor.receiveFees()
  → Net WIRE returned to user

Owner calls recordMatchResult() on Oracle
  → Ranks updated → sell taxes recalibrated
  → Owner calls distributePerformanceRewards() on Distributor
  → If upset detected: releaseUpsetVault() distributes to winning team holders
  → Users call claimRewards() to withdraw accumulated rewards
```

### 13.4 Frontend Architecture

```
app/
├── app/
│   ├── layout.tsx          — Root layout with Providers
│   ├── page.tsx            — Homepage: hero, team grid, features, vault
│   ├── trading/page.tsx    — Trading: team cards, buy/sell, charts
│   ├── match/page.tsx      — Matches: schedule, standings, upset history
│   ├── portfolio/page.tsx  — Portfolio: holdings, P&L, claim rewards
│   ├── admin/page.tsx      — Admin: oracle controls for demo
│   ├── providers.tsx       — Wagmi + React Query + WireFluid chain
│   └── api/ai/
│       └── analyze/route.ts — AI analysis API (Claude)
├── components/
│   ├── Navbar.tsx          — Navigation + wallet + vault indicator
│   ├── TeamCard.tsx        — Team trading card with chart
│   ├── TradeModal.tsx      — Buy/sell transaction modal
│   ├── PriceChart.tsx      — Recharts area chart
│   ├── UpsetVault.tsx      — Vault visualization
│   ├── LiveMatch.tsx       — Live match simulation
│   ├── RewardPanel.tsx     — Claim rewards UI
│   └── AIAnalysis.tsx      — AI analysis display
├── lib/
│   ├── contracts.ts        — Contract configs (address + ABI)
│   ├── mockData.ts         — Mock data for development
│   └── hooks/
│       ├── useTeamData.ts      — Batch read all 6 teams
│       ├── useUserHoldings.ts  — User balances + rewards
│       ├── useTokenEvents.ts   — Watch buy/sell events
│       ├── useMatchData.ts     — Oracle match data
│       └── useAIAnalysis.ts    — AI analysis API hook
shared/
├── addresses.ts            — Deployed contract addresses
├── types/index.ts          — Team enums, interfaces
└── abis/index.ts           — Contract ABI exports
```

### 13.5 Key Frontend Patterns

**Contract Reads (Wagmi):**
```typescript
import { useReadContracts } from "wagmi";

// Batch read all 6 team prices, supply, ranks
const { data } = useReadContracts({
  contracts: teamIds.flatMap(id => [
    { ...coreContract, functionName: "getTeamSupply", args: [id] },
    { ...coreContract, functionName: "getBuyCost", args: [id, 1n] },
    { ...oracleContract, functionName: "getTeamRank", args: [id] },
  ]),
});
```

**Contract Writes (Wagmi):**
```typescript
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

const { writeContract, data: hash } = useWriteContract();
const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

// Buy tokens
writeContract({
  ...coreContract,
  functionName: "buyTokens",
  args: [teamId, amount],
  value: totalCost, // WIRE sent with transaction
});
```

---

## 14. Implementation Blueprint

### Day 1 (March 24) — Foundation

| # | Task | Hours | Priority |
|---|------|-------|----------|
| 1 | Smart contract finalization and testing | 3h | MUST |
| 2 | Deploy all 3 contracts to WireFluid testnet | 0.5h | MUST |
| 3 | ABI exports + contract config setup in frontend | 1h | MUST |
| 4 | Frontend contract read hooks (prices, supply, ranks) | 2h | MUST |
| 5 | Homepage with live on-chain team data | 1h | MUST |
| 6 | Trading page showing real prices and balances | 1.5h | MUST |

### Day 2 (March 25) — Core Trading + Features

| # | Task | Hours | Priority |
|---|------|-------|----------|
| 7 | TradeModal with buy/sell transaction flow | 3h | MUST |
| 8 | Price charts (Recharts) on trading page | 1.5h | SHOULD |
| 9 | Match page with oracle data + standings table | 2h | SHOULD |
| 10 | Portfolio page with holdings and P&L | 2h | SHOULD |
| 11 | Reward claiming UI (claimRewards) | 1h | SHOULD |
| 12 | Admin page for oracle controls (demo) | 1h | MUST |

### Day 3 (March 26) — AI + Polish + Demo

| # | Task | Hours | Priority |
|---|------|-------|----------|
| 13 | AI pre-match analysis (Claude API route) | 2h | NICE |
| 14 | Upset Vault visualization component | 1.5h | SHOULD |
| 15 | Live match simulation view | 1.5h | NICE |
| 16 | UI polish, animations, mobile responsive | 2h | SHOULD |
| 17 | Demo setup script (seed trades, set ranks) | 1h | MUST |
| 18 | Demo rehearsal and presentation prep | 1h | MUST |

### Priority Legend
- **MUST** — Without this, demo doesn't work
- **SHOULD** — Significantly improves demo quality
- **NICE** — Impressive but can be skipped under time pressure

---

## 15. Conclusion & Vision

Overflow transforms how cricket fans engage with the sport they love. By replacing the haram mechanics of betting with halal trading principles, we unlock a massive underserved market — the 2.5 billion cricket fans worldwide who currently have no legitimate, Sharia-compliant way to financially participate in match outcomes.

Built on WireFluid's high-performance EVM with $0.01 fees and 5-second finality, Overflow delivers the real-time trading experience that cricket's fast-paced format demands. The platform's novel economic mechanisms — dynamic performance-linked sell tax, upset vault rewards, and AI-powered analytics — create a uniquely engaging experience that rewards cricket knowledge, analytical skill, and conviction.

**The vision extends beyond PSL:**
- **IPL, BBL, CPL, The Hundred** — Same model, different leagues
- **Football (EPL, La Liga)** — Seasonal team token trading
- **Multi-chain via IBC** — WireFluid's native Cosmos interoperability enables cross-chain expansion
- **Player-level tokens** — Individual player performance tokens for deeper engagement

Overflow is not just a hackathon project — it is the foundation for a new category of sports financial engagement, built on the principles of transparency, fairness, and Islamic finance compliance.

---

*Overflow Whitepaper v1.0 | Prepared by Khalid Mehmood | WireFluid Hackathon 2026*
