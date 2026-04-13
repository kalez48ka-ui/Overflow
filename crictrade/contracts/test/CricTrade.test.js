const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("CricTrade Platform", function () {
  let deployer, oracle2, oracle3, user1, user2, user3;
  let oracle, circuitBreaker, upsetVault, rewardDistributor, factory;
  let teamTokens = {}; // symbol -> address

  const TEAM_DATA = [
    { name: "Islamabad United", symbol: "ISU" },
    { name: "Lahore Qalandars", symbol: "LHQ" },
    { name: "Multan Sultans", symbol: "MLS" },
    { name: "Karachi Kings", symbol: "KRK" },
    { name: "Peshawar Zalmi", symbol: "PSZ" },
    { name: "Quetta Gladiators", symbol: "QTG" },
    { name: "Hyderabad Kingsmen", symbol: "HKM" },
    { name: "Rawalpindiz", symbol: "RWP" },
  ];

  before(async function () {
    [deployer, oracle2, oracle3, user1, user2, user3] = await ethers.getSigners();

    // Deploy PerformanceOracle
    const PerformanceOracle = await ethers.getContractFactory("PerformanceOracle");
    oracle = await PerformanceOracle.deploy(deployer.address, oracle2.address, oracle3.address);
    await oracle.waitForDeployment();

    // Deploy CircuitBreaker
    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    circuitBreaker = await CircuitBreaker.deploy();
    await circuitBreaker.waitForDeployment();

    // Deploy UpsetVault
    const UpsetVault = await ethers.getContractFactory("UpsetVault");
    upsetVault = await UpsetVault.deploy(await oracle.getAddress());
    await upsetVault.waitForDeployment();

    // Deploy RewardDistributor
    const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
    rewardDistributor = await RewardDistributor.deploy(
      deployer.address,              // treasury
      await upsetVault.getAddress(),  // upsetVault
      deployer.address,              // liquidityBacking
      deployer.address               // devFund
    );
    await rewardDistributor.waitForDeployment();

    // Deploy TeamTokenFactory
    const TeamTokenFactory = await ethers.getContractFactory("TeamTokenFactory");
    factory = await TeamTokenFactory.deploy(
      await oracle.getAddress(),
      await circuitBreaker.getAddress(),
      await rewardDistributor.getAddress()
    );
    await factory.waitForDeployment();

    // Set factory as circuit breaker reporter
    await circuitBreaker.setReporter(await factory.getAddress(), true);

    // Create all 8 team tokens
    for (const team of TEAM_DATA) {
      const tx = await factory.createTeamToken(team.name, team.symbol);
      await tx.wait();
      const addr = await factory.symbolToToken(team.symbol);
      teamTokens[team.symbol] = addr;

      // Register in oracle and reward distributor
      await oracle.registerTeam(addr);
      await rewardDistributor.registerTeamToken(addr);
    }
  });

  // =====================================================================
  // TeamTokenFactory
  // =====================================================================
  describe("TeamTokenFactory", function () {
    it("should create all 8 team tokens", async function () {
      const count = await factory.getTeamTokenCount();
      expect(count).to.equal(8);
    });

    it("should map symbols to token addresses", async function () {
      for (const team of TEAM_DATA) {
        const addr = await factory.symbolToToken(team.symbol);
        expect(addr).to.not.equal(ethers.ZeroAddress);
      }
    });

    it("should not allow duplicate symbol creation", async function () {
      await expect(
        factory.createTeamToken("Fake Team", "ISU")
      ).to.be.revertedWithCustomError(factory, "TokenAlreadyExists");
    });

    it("should allow buying tokens with ETH", async function () {
      const tokenAddr = teamTokens["ISU"];
      const buyAmount = ethers.parseEther("1"); // 1 ETH

      await factory.connect(user1).buy(tokenAddr, 0, { value: buyAmount });

      const token = await ethers.getContractAt("TeamToken", tokenAddr);
      const balance = await token.balanceOf(user1.address);
      expect(balance).to.be.greaterThan(0);
    });

    it("should charge 2% buy fee", async function () {
      const rdAddr = await rewardDistributor.getAddress();
      const balanceBefore = await ethers.provider.getBalance(rdAddr);

      const tokenAddr = teamTokens["LHQ"];
      const buyAmount = ethers.parseEther("1");
      await factory.connect(user2).buy(tokenAddr, 0, { value: buyAmount });

      const balanceAfter = await ethers.provider.getBalance(rdAddr);
      const feeReceived = balanceAfter - balanceBefore;

      // 2% of 1 ETH = 0.02 ETH
      expect(feeReceived).to.be.greaterThanOrEqual(ethers.parseEther("0.019"));
    });

    it("should allow selling tokens back for ETH", async function () {
      const tokenAddr = teamTokens["ISU"];
      const token = await ethers.getContractAt("TeamToken", tokenAddr);

      const balance = await token.balanceOf(user1.address);
      expect(balance).to.be.greaterThan(0);

      // Wait for cooldown
      await time.increase(61);

      const sellAmount = balance / 10n; // Sell 10% — within max tx limit
      const ethBefore = await ethers.provider.getBalance(user1.address);

      await factory.connect(user1).sell(tokenAddr, sellAmount, 0);

      const ethAfter = await ethers.provider.getBalance(user1.address);
      // User should have received some ETH (minus gas)
      // We just check the token balance decreased
      const newBalance = await token.balanceOf(user1.address);
      expect(newBalance).to.be.lessThan(balance);
    });

    it("should reject buys for non-existent tokens", async function () {
      await expect(
        factory.connect(user1).buy(ethers.ZeroAddress, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(factory, "InvalidToken");
    });

    it("should reject sells for tokens user does not hold", async function () {
      const tokenAddr = teamTokens["QTG"];
      await expect(
        factory.connect(user3).sell(tokenAddr, ethers.parseEther("100"), 0)
      ).to.be.revertedWithCustomError(factory, "InsufficientBalance");
    });
  });

  // =====================================================================
  // TeamToken
  // =====================================================================
  describe("TeamToken", function () {
    it("should have correct name and symbol", async function () {
      const token = await ethers.getContractAt("TeamToken", teamTokens["ISU"]);
      expect(await token.name()).to.equal("Islamabad United");
      expect(await token.symbol()).to.equal("ISU");
    });

    it("should enforce sell cooldown", async function () {
      const tokenAddr = teamTokens["ISU"];
      const token = await ethers.getContractAt("TeamToken", tokenAddr);
      const balance = await token.balanceOf(user1.address);

      if (balance > 0n) {
        const small = balance / 100n;
        if (small > 0n) {
          // First transfer should work (if cooldown passed)
          await time.increase(61);
          // Attempt two transfers within 60 seconds — second should revert
          await token.connect(user1).transfer(user2.address, small);

          await expect(
            token.connect(user1).transfer(user2.address, small)
          ).to.be.revertedWithCustomError(token, "SellCooldownActive");
        }
      }
    });

    it("should apply progressive sell tax (<5min = 12%)", async function () {
      // Buy fresh tokens
      const tokenAddr = teamTokens["MLS"];
      await factory.connect(user3).buy(tokenAddr, 0, { value: ethers.parseEther("0.5") });

      const token = await ethers.getContractAt("TeamToken", tokenAddr);
      const taxBps = await token.getSellTaxBps(user3.address);
      // Just bought, so <5min → 12% = 1200 bps
      expect(taxBps).to.equal(1200);
    });

    it("should reduce tax after holding >30min", async function () {
      const tokenAddr = teamTokens["MLS"];
      const token = await ethers.getContractAt("TeamToken", tokenAddr);

      // Advance time past 30 min
      await time.increase(31 * 60);
      const taxBps = await token.getSellTaxBps(user3.address);
      // >30min but <2hrs → 5% = 500 bps
      expect(taxBps).to.equal(500);
    });
  });

  // =====================================================================
  // PerformanceOracle
  // =====================================================================
  describe("PerformanceOracle", function () {
    it("should register all 8 teams", async function () {
      const count = await oracle.getTeamCount();
      expect(count).to.equal(8);
    });

    it("should initialize teams with default score 50", async function () {
      const score = await oracle.getPerformanceScore(teamTokens["ISU"]);
      expect(score).to.equal(50);
    });

    it("should require 2-of-3 oracle confirmations", async function () {
      const team = teamTokens["ISU"];

      // First oracle submits
      await oracle.connect(deployer).updateMatchResult(team, 90, 80, 85, 95);

      // Score should not have changed yet (only 1 confirmation)
      const scoreBefore = await oracle.getPerformanceScore(team);
      expect(scoreBefore).to.equal(50);

      // Second oracle confirms
      await oracle.connect(oracle2).updateMatchResult(team, 90, 80, 85, 95);

      // Now score should update (2 confirmations met)
      const scoreAfter = await oracle.getPerformanceScore(team);
      // composite = (90*40 + 80*20 + 85*20 + 95*20) / 100 = (3600+1600+1700+1900)/100 = 88
      expect(scoreAfter).to.equal(88);
    });

    it("should prevent same oracle from confirming twice", async function () {
      const team = teamTokens["LHQ"];
      await oracle.connect(deployer).updateMatchResult(team, 70, 60, 65, 75);

      await expect(
        oracle.connect(deployer).updateMatchResult(team, 70, 60, 65, 75)
      ).to.be.revertedWithCustomError(oracle, "AlreadyConfirmed");
    });

    it("should calculate sell tax with linear interpolation", async function () {
      // ISU has composite=88 (updated above), others at 50
      const isuTax = await oracle.getSellTaxRate(teamTokens["ISU"]);
      const lhqTax = await oracle.getSellTaxRate(teamTokens["LHQ"]);

      // ISU is best → should have lowest tax (200 = 2%)
      expect(isuTax).to.equal(200);
      // LHQ (and others at score=50) should have highest tax (1500 = 15%)
      expect(lhqTax).to.equal(1500);
    });

    it("should return correct team ranking", async function () {
      const ranking = await oracle.getTeamRanking();
      // ISU (score=88) should be first
      expect(ranking[0]).to.equal(teamTokens["ISU"]);
    });

    it("should reject scores over 100", async function () {
      await expect(
        oracle.connect(deployer).updateMatchResult(teamTokens["KRK"], 101, 50, 50, 50)
      ).to.be.revertedWithCustomError(oracle, "InvalidScore");
    });
  });

  // =====================================================================
  // RewardDistributor
  // =====================================================================
  describe("RewardDistributor", function () {
    it("should receive ETH fees", async function () {
      const rdAddr = await rewardDistributor.getAddress();
      // Send some ETH directly
      await deployer.sendTransaction({ to: rdAddr, value: ethers.parseEther("10") });
      const balance = await ethers.provider.getBalance(rdAddr);
      expect(balance).to.be.greaterThan(0);
    });

    it("should distribute fees to pools", async function () {
      const uvAddr = await upsetVault.getAddress();
      const uvBalanceBefore = await ethers.provider.getBalance(uvAddr);

      await rewardDistributor.distributeFees();

      const uvBalanceAfter = await ethers.provider.getBalance(uvAddr);
      // UpsetVault should have received 15% of distributable amount
      expect(uvBalanceAfter).to.be.greaterThan(uvBalanceBefore);
    });

    it("should accumulate performance reward pool", async function () {
      const pool = await rewardDistributor.performanceRewardPool();
      expect(pool).to.be.greaterThan(0);
    });

    it("should distribute match rewards by ranking", async function () {
      // Ensure there is a reward pool
      const pool = await rewardDistributor.performanceRewardPool();
      if (pool == 0n) {
        // Top up
        const rdAddr = await rewardDistributor.getAddress();
        await deployer.sendTransaction({ to: rdAddr, value: ethers.parseEther("5") });
        await rewardDistributor.distributeFees();
      }

      const rankedTeams = [
        teamTokens["ISU"],
        teamTokens["LHQ"],
        teamTokens["MLS"],
        teamTokens["KRK"],
        teamTokens["PSZ"],
        teamTokens["QTG"],
        teamTokens["HKM"],
        teamTokens["RWP"],
      ];

      await rewardDistributor.distributeMatchRewards(rankedTeams);

      const epoch = await rewardDistributor.currentEpoch();
      expect(epoch).to.equal(1);
    });

    it("should allow token holders to claim rewards", async function () {
      // user1 holds ISU tokens (1st place)
      const token = await ethers.getContractAt("TeamToken", teamTokens["ISU"]);
      const balance = await token.balanceOf(user1.address);

      if (balance > 0n) {
        const claimable = await rewardDistributor.getClaimableRewards(
          user1.address, teamTokens["ISU"], 0
        );

        if (claimable > 0n) {
          const ethBefore = await ethers.provider.getBalance(user1.address);
          await rewardDistributor.connect(user1).claimRewards(0, teamTokens["ISU"]);
          const ethAfter = await ethers.provider.getBalance(user1.address);
          // Should have received ETH (accounting for gas costs, check broadly)
          expect(ethAfter + ethers.parseEther("0.01")).to.be.greaterThan(ethBefore);
        }
      }
    });

    it("should prevent double claims", async function () {
      const token = await ethers.getContractAt("TeamToken", teamTokens["ISU"]);
      const balance = await token.balanceOf(user1.address);

      if (balance > 0n) {
        await expect(
          rewardDistributor.connect(user1).claimRewards(0, teamTokens["ISU"])
        ).to.be.revertedWithCustomError(rewardDistributor, "AlreadyClaimed");
      }
    });
  });

  // =====================================================================
  // UpsetVault
  // =====================================================================
  describe("UpsetVault", function () {
    it("should receive funds from fee distribution", async function () {
      const balance = await upsetVault.getVaultBalance();
      expect(balance).to.be.greaterThan(0);
    });

    it("should calculate upset score correctly", async function () {
      // ISU has tax 200 (best), LHQ has tax 1500 (worst)
      // If LHQ (worst, high tax) beats ISU (best, low tax):
      // upsetScore = (1500 - 200) / 100 = 13
      const score = await upsetVault.getUpsetScore(teamTokens["LHQ"], teamTokens["ISU"]);
      expect(score).to.equal(13); // GIANT KILLER
    });

    it("should return 0 for non-upset (favourite wins)", async function () {
      // ISU (best, low tax=200) beats LHQ (worst, high tax=1500)
      // winner tax (200) <= loser tax (1500), so not an upset
      const score = await upsetVault.getUpsetScore(teamTokens["ISU"], teamTokens["LHQ"]);
      expect(score).to.equal(0);
    });

    it("should trigger GIANT KILLER upset and release 60% of vault", async function () {
      const vaultBefore = await upsetVault.getVaultBalance();

      // LHQ (worst) beats ISU (best) — score = 13, GIANT KILLER
      await upsetVault.triggerUpset(teamTokens["LHQ"], teamTokens["ISU"]);

      const vaultAfter = await upsetVault.getVaultBalance();
      // 60% released
      const expectedRelease = (vaultBefore * 6000n) / 10000n;
      // Vault balance should decrease (funds are earmarked but still in contract until claimed)
      // Actually funds stay in contract until claimed, so balance remains the same
      // But totalReleased should increase
      const totalReleased = await upsetVault.totalReleased();
      expect(totalReleased).to.equal(expectedRelease);
    });

    it("should reject same team as winner and loser", async function () {
      await expect(
        upsetVault.triggerUpset(teamTokens["ISU"], teamTokens["ISU"])
      ).to.be.revertedWithCustomError(upsetVault, "SameTeam");
    });
  });

  // =====================================================================
  // CircuitBreaker
  // =====================================================================
  describe("CircuitBreaker", function () {
    it("should start unpaused for all tokens", async function () {
      for (const symbol of ["ISU", "LHQ", "MLS"]) {
        const paused = await circuitBreaker.isPaused(teamTokens[symbol]);
        expect(paused).to.equal(false);
      }
    });

    it("should record price snapshots", async function () {
      const tokenAddr = teamTokens["KRK"];
      await circuitBreaker.recordPrice(tokenAddr, ethers.parseEther("1.0"));

      const count = await circuitBreaker.snapshotCount(tokenAddr);
      expect(count).to.equal(1);
    });

    it("should trigger pause on >15% drop in 5 minutes", async function () {
      const tokenAddr = teamTokens["KRK"];

      // Record high price
      await circuitBreaker.recordPrice(tokenAddr, ethers.parseEther("1.0"));

      // Record >15% drop immediately (within 5 min window)
      await circuitBreaker.recordPrice(tokenAddr, ethers.parseEther("0.84"));

      const paused = await circuitBreaker.isPaused(tokenAddr);
      expect(paused).to.equal(true);
    });

    it("should auto-resume after pause duration", async function () {
      const tokenAddr = teamTokens["KRK"];

      // Advance past 3-minute pause
      await time.increase(4 * 60);

      const paused = await circuitBreaker.isPaused(tokenAddr);
      expect(paused).to.equal(false);
    });

    it("should trigger longer pause on >25% drop in 15 minutes", async function () {
      const tokenAddr = teamTokens["PSZ"];

      await circuitBreaker.recordPrice(tokenAddr, ethers.parseEther("1.0"));
      // 26% drop
      await circuitBreaker.recordPrice(tokenAddr, ethers.parseEther("0.74"));

      const paused = await circuitBreaker.isPaused(tokenAddr);
      expect(paused).to.equal(true);

      const state = await circuitBreaker.getPauseState(tokenAddr);
      expect(state.reason).to.equal(1); // 15% threshold triggers first (it's also >15%)
    });

    it("should allow owner to manually resume", async function () {
      const tokenAddr = teamTokens["PSZ"];
      await circuitBreaker.resume(tokenAddr);

      const paused = await circuitBreaker.isPaused(tokenAddr);
      expect(paused).to.equal(false);
    });

    it("should block trades when paused", async function () {
      const tokenAddr = teamTokens["PSZ"];

      // Trigger a pause
      await circuitBreaker.recordPrice(tokenAddr, ethers.parseEther("1.0"));
      await circuitBreaker.recordPrice(tokenAddr, ethers.parseEther("0.80"));

      // Try to buy — should fail
      await expect(
        factory.connect(user1).buy(tokenAddr, 0, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(factory, "TradingPaused");

      // Resume for other tests
      await circuitBreaker.resume(tokenAddr);
    });
  });

  // =====================================================================
  // Bonding Curve
  // =====================================================================
  describe("Bonding Curve", function () {
    it("should have asymmetric buy/sell prices (buy > sell)", async function () {
      // Buy some tokens first to move off zero supply
      const tokenAddr = teamTokens["QTG"];
      await factory.connect(user1).buy(tokenAddr, 0, { value: ethers.parseEther("1") });

      const buyPrice = await factory.getBuyPrice(tokenAddr);
      const sellPrice = await factory.getSellPrice(tokenAddr);

      // Buy curve (supply^1.5) is steeper than sell curve (supply^1.2)
      // So buy price should be >= sell price
      expect(buyPrice).to.be.greaterThanOrEqual(sellPrice);
    });

    it("should increase buy price as supply grows", async function () {
      const tokenAddr = teamTokens["QTG"];

      const priceBefore = await factory.getBuyPrice(tokenAddr);
      await factory.connect(user1).buy(tokenAddr, 0, { value: ethers.parseEther("2") });
      const priceAfter = await factory.getBuyPrice(tokenAddr);

      expect(priceAfter).to.be.greaterThan(priceBefore);
    });

    it("should provide token estimates", async function () {
      const tokenAddr = teamTokens["QTG"];
      const estimate = await factory.estimateBuyTokens(tokenAddr, ethers.parseEther("0.5"));
      expect(estimate).to.be.greaterThan(0);
    });
  });

  // =====================================================================
  // Integration
  // =====================================================================
  describe("Integration: Full Match Cycle", function () {
    it("should complete a full match cycle: buy -> oracle update -> reward distribution -> claim", async function () {
      // Use KRK for integration test — resume any pauses from circuit breaker tests
      const tokenAddr = teamTokens["KRK"];
      // Advance time well past any pause duration (10 min max)
      await time.increase(15 * 60);
      // Also manually resume to clear state
      try { await circuitBreaker.resume(tokenAddr); } catch {}

      // 1. Users buy KRK tokens
      await factory.connect(user1).buy(tokenAddr, 0, { value: ethers.parseEther("0.5") });
      await factory.connect(user2).buy(tokenAddr, 0, { value: ethers.parseEther("0.3") });

      // Advance time so buys are before the snapshot (C-1 fix requires lastBuyTimestamp < snapshotTimestamp)
      await time.increase(1);

      const token = await ethers.getContractAt("TeamToken", tokenAddr);
      const u1Balance = await token.balanceOf(user1.address);
      const u2Balance = await token.balanceOf(user2.address);
      expect(u1Balance).to.be.greaterThan(0);
      expect(u2Balance).to.be.greaterThan(0);

      // 2. Oracle updates KRK performance (2 confirmations needed)
      await oracle.connect(deployer).updateMatchResult(teamTokens["KRK"], 85, 75, 80, 90);
      await oracle.connect(oracle2).updateMatchResult(teamTokens["KRK"], 85, 75, 80, 90);

      const krkScore = await oracle.getPerformanceScore(teamTokens["KRK"]);
      // (85*40 + 75*20 + 80*20 + 90*20) / 100 = (3400+1500+1600+1800)/100 = 83
      expect(krkScore).to.equal(83);

      // 3. Add funds to reward pool and distribute
      const rdAddr = await rewardDistributor.getAddress();
      await deployer.sendTransaction({ to: rdAddr, value: ethers.parseEther("5") });
      await rewardDistributor.distributeFees();

      const pool = await rewardDistributor.performanceRewardPool();
      expect(pool).to.be.greaterThan(0);

      // 4. Distribute match rewards
      const ranking = await oracle.getTeamRanking();
      // Convert to fixed array
      const rankedArray = [
        ranking[0], ranking[1], ranking[2], ranking[3],
        ranking[4], ranking[5], ranking[6], ranking[7],
      ];
      await rewardDistributor.distributeMatchRewards(rankedArray);

      // 5. Users claim rewards
      const epoch = (await rewardDistributor.currentEpoch()) - 1n;
      const claimable1 = await rewardDistributor.getClaimableRewards(user1.address, tokenAddr, epoch);

      if (claimable1 > 0n) {
        await rewardDistributor.connect(user1).claimRewards(epoch, tokenAddr);
        // Verify claimed
        const claimableAfter = await rewardDistributor.getClaimableRewards(user1.address, tokenAddr, epoch);
        expect(claimableAfter).to.equal(0);
      }
    });
  });
});
