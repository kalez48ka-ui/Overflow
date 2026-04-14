-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "tokenAddress" TEXT,
    "color" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceChange24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "ranking" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "nrr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "homeScore" TEXT,
    "awayScore" TEXT,
    "toss" TEXT,
    "venue" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "winnerId" TEXT,
    "upsetScore" INTEGER,
    "isUpset" BOOLEAN NOT NULL DEFAULT false,
    "aiAnalysis" TEXT,
    "cricApiId" TEXT,
    "cricApiName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BallEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "innings" INTEGER NOT NULL,
    "over" INTEGER NOT NULL,
    "ball" INTEGER NOT NULL,
    "batter" TEXT NOT NULL,
    "bowler" TEXT NOT NULL,
    "runs" INTEGER NOT NULL,
    "extras" INTEGER NOT NULL DEFAULT 0,
    "isWicket" BOOLEAN NOT NULL DEFAULT false,
    "wicketType" TEXT,
    "commentary" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "avgBuyPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricePoint" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsetEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "winnerSymbol" TEXT NOT NULL,
    "loserSymbol" TEXT NOT NULL,
    "upsetScore" INTEGER NOT NULL,
    "multiplier" INTEGER NOT NULL,
    "vaultRelease" DOUBLE PRECISION NOT NULL,
    "totalPayout" DOUBLE PRECISION NOT NULL,
    "holdersCount" INTEGER NOT NULL,
    "perHolderPayout" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpsetEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultState" (
    "id" TEXT NOT NULL DEFAULT 'vault',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanWar" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "totalHomeLocked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAwayLocked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boostPool" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "winnerTeamId" TEXT,
    "marginType" TEXT,
    "homeBoostShare" DOUBLE PRECISION,
    "awayBoostShare" DOUBLE PRECISION,
    "settledAt" TIMESTAMP(3),
    "lockDeadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FanWar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanWarLock" (
    "id" TEXT NOT NULL,
    "fanWarId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "boostReward" DOUBLE PRECISION,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FanWarLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_symbol_key" ON "Team"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Match_cricApiId_key" ON "Match"("cricApiId");

-- CreateIndex
CREATE INDEX "BallEvent_matchId_timestamp_idx" ON "BallEvent"("matchId", "timestamp");

-- CreateIndex
CREATE INDEX "Trade_wallet_createdAt_idx" ON "Trade"("wallet", "createdAt");

-- CreateIndex
CREATE INDEX "Trade_teamId_createdAt_idx" ON "Trade"("teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Position_wallet_teamId_key" ON "Position"("wallet", "teamId");

-- CreateIndex
CREATE INDEX "PricePoint_teamId_timestamp_idx" ON "PricePoint"("teamId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "FanWar_matchId_key" ON "FanWar"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "FanWarLock_fanWarId_wallet_key" ON "FanWarLock"("fanWarId", "wallet");

-- CreateIndex
CREATE INDEX "FanWarLock_wallet_idx" ON "FanWarLock"("wallet");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricePoint" ADD CONSTRAINT "PricePoint_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanWar" ADD CONSTRAINT "FanWar_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanWarLock" ADD CONSTRAINT "FanWarLock_fanWarId_fkey" FOREIGN KEY ("fanWarId") REFERENCES "FanWar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
