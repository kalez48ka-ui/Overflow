-- CreateTable: PredictionPool
CREATE TABLE "PredictionPool" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "entryFee" DECIMAL(18,8) NOT NULL,
    "totalPool" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "platformShare" DECIMAL(18,2),
    "safetyFloorPool" DECIMAL(18,2),
    "accuracyPool" DECIMAL(18,2),
    "totalScoreSum" DECIMAL(18,2),
    "highestScore" DECIMAL(18,2),
    "deadline" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "claimDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PredictionQuestion
CREATE TABLE "PredictionQuestion" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" TEXT[],
    "correctOption" INTEGER,
    "points" INTEGER NOT NULL,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "deadline" TIMESTAMP(3) NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PredictionEntry
CREATE TABLE "PredictionEntry" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "totalScore" DECIMAL(18,2),
    "payout" DECIMAL(18,2),
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PredictionAnswer
CREATE TABLE "PredictionAnswer" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "chosenOption" INTEGER NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsEarned" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraints
CREATE UNIQUE INDEX "PredictionPool_matchId_key" ON "PredictionPool"("matchId");
CREATE UNIQUE INDEX "PredictionQuestion_poolId_questionIndex_key" ON "PredictionQuestion"("poolId", "questionIndex");
CREATE UNIQUE INDEX "PredictionEntry_poolId_wallet_key" ON "PredictionEntry"("poolId", "wallet");
CREATE UNIQUE INDEX "PredictionAnswer_entryId_questionId_key" ON "PredictionAnswer"("entryId", "questionId");

-- CreateIndex: Performance indexes
CREATE INDEX "PredictionEntry_wallet_idx" ON "PredictionEntry"("wallet");

-- AddForeignKey: PredictionPool -> Match
ALTER TABLE "PredictionPool" ADD CONSTRAINT "PredictionPool_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PredictionQuestion -> PredictionPool
ALTER TABLE "PredictionQuestion" ADD CONSTRAINT "PredictionQuestion_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PredictionPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PredictionEntry -> PredictionPool
ALTER TABLE "PredictionEntry" ADD CONSTRAINT "PredictionEntry_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "PredictionPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PredictionAnswer -> PredictionEntry
ALTER TABLE "PredictionAnswer" ADD CONSTRAINT "PredictionAnswer_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "PredictionEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PredictionAnswer -> PredictionQuestion
ALTER TABLE "PredictionAnswer" ADD CONSTRAINT "PredictionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PredictionQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
