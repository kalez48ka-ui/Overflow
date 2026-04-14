-- Migration: Float to Decimal for all monetary/financial fields
-- Eliminates IEEE 754 rounding errors in financial calculations

-- Team: currentPrice
ALTER TABLE "Team" ALTER COLUMN "currentPrice" TYPE DECIMAL(18, 8) USING "currentPrice"::DECIMAL(18, 8);

-- Trade: amount, price, totalValue, fee
ALTER TABLE "Trade" ALTER COLUMN "amount" TYPE DECIMAL(18, 8) USING "amount"::DECIMAL(18, 8);
ALTER TABLE "Trade" ALTER COLUMN "price" TYPE DECIMAL(18, 8) USING "price"::DECIMAL(18, 8);
ALTER TABLE "Trade" ALTER COLUMN "totalValue" TYPE DECIMAL(18, 2) USING "totalValue"::DECIMAL(18, 2);
ALTER TABLE "Trade" ALTER COLUMN "fee" TYPE DECIMAL(18, 2) USING "fee"::DECIMAL(18, 2);

-- Position: amount, avgBuyPrice
ALTER TABLE "Position" ALTER COLUMN "amount" TYPE DECIMAL(18, 8) USING "amount"::DECIMAL(18, 8);
ALTER TABLE "Position" ALTER COLUMN "avgBuyPrice" TYPE DECIMAL(18, 8) USING "avgBuyPrice"::DECIMAL(18, 8);

-- PricePoint: price, volume, open, high, low, close
ALTER TABLE "PricePoint" ALTER COLUMN "price" TYPE DECIMAL(18, 8) USING "price"::DECIMAL(18, 8);
ALTER TABLE "PricePoint" ALTER COLUMN "volume" TYPE DECIMAL(18, 2) USING "volume"::DECIMAL(18, 2);
ALTER TABLE "PricePoint" ALTER COLUMN "open" TYPE DECIMAL(18, 8) USING "open"::DECIMAL(18, 8);
ALTER TABLE "PricePoint" ALTER COLUMN "high" TYPE DECIMAL(18, 8) USING "high"::DECIMAL(18, 8);
ALTER TABLE "PricePoint" ALTER COLUMN "low" TYPE DECIMAL(18, 8) USING "low"::DECIMAL(18, 8);
ALTER TABLE "PricePoint" ALTER COLUMN "close" TYPE DECIMAL(18, 8) USING "close"::DECIMAL(18, 8);

-- UpsetEvent: vaultRelease, totalPayout, perHolderPayout
ALTER TABLE "UpsetEvent" ALTER COLUMN "vaultRelease" TYPE DECIMAL(18, 2) USING "vaultRelease"::DECIMAL(18, 2);
ALTER TABLE "UpsetEvent" ALTER COLUMN "totalPayout" TYPE DECIMAL(18, 2) USING "totalPayout"::DECIMAL(18, 2);
ALTER TABLE "UpsetEvent" ALTER COLUMN "perHolderPayout" TYPE DECIMAL(18, 8) USING "perHolderPayout"::DECIMAL(18, 8);

-- VaultState: balance, totalIn, totalOut
ALTER TABLE "VaultState" ALTER COLUMN "balance" TYPE DECIMAL(18, 2) USING "balance"::DECIMAL(18, 2);
ALTER TABLE "VaultState" ALTER COLUMN "totalIn" TYPE DECIMAL(18, 2) USING "totalIn"::DECIMAL(18, 2);
ALTER TABLE "VaultState" ALTER COLUMN "totalOut" TYPE DECIMAL(18, 2) USING "totalOut"::DECIMAL(18, 2);

-- FanWar: totalHomeLocked, totalAwayLocked, boostPool
ALTER TABLE "FanWar" ALTER COLUMN "totalHomeLocked" TYPE DECIMAL(18, 2) USING "totalHomeLocked"::DECIMAL(18, 2);
ALTER TABLE "FanWar" ALTER COLUMN "totalAwayLocked" TYPE DECIMAL(18, 2) USING "totalAwayLocked"::DECIMAL(18, 2);
ALTER TABLE "FanWar" ALTER COLUMN "boostPool" TYPE DECIMAL(18, 2) USING "boostPool"::DECIMAL(18, 2);

-- FanWarLock: amount, boostReward
ALTER TABLE "FanWarLock" ALTER COLUMN "amount" TYPE DECIMAL(18, 2) USING "amount"::DECIMAL(18, 2);
ALTER TABLE "FanWarLock" ALTER COLUMN "boostReward" TYPE DECIMAL(18, 2) USING "boostReward"::DECIMAL(18, 2);
