const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Cross-Contract Integration", function () {
  let deployer, oracle2, oracle3, keeper, user1, user2, user3;
  let oracle, circuitBreaker, upsetVault, rewardDistributor, factory, fanWars;
  let homeTokenAddr, awayTokenAddr;
  let homeToken, awayToken;

  before(async function () {
    [deployer, oracle2, oracle3, keeper, user1, user2, user3] =
      await ethers.getSigners();

    // Deploy PerformanceOracle
    const PerformanceOracle =
      await ethers.getContractFactory("PerformanceOracle");
    oracle = await PerformanceOracle.deploy(
      deployer.address,
      oracle2.address,
      oracle3.address
    );
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
    const RewardDistributor =
      await ethers.getContractFactory("RewardDistributor");
    rewardDistributor = await RewardDistributor.deploy(
      deployer.address,
      await upsetVault.getAddress(),
      deployer.address,
      deployer.address
    );
    await rewardDistributor.waitForDeployment();

    // Deploy TeamTokenFactory
    const TeamTokenFactory =
      await ethers.getContractFactory("TeamTokenFactory");
    factory = await TeamTokenFactory.deploy(
      await oracle.getAddress(),
      await circuitBreaker.getAddress(),
      await rewardDistributor.getAddress()
    );
    await factory.waitForDeployment();
    await circuitBreaker.setReporter(await factory.getAddress(), true);

    // Deploy FanWars
    const FanWars = await ethers.getContractFactory("FanWars");
    fanWars = await FanWars.deploy();
    await fanWars.waitForDeployment();
    await fanWars.setKeeper(keeper.address, true);

    // Create 8 team tokens to satisfy ranking requirements
    const teams = [
      { name: "Alpha Lions", symbol: "ALN" },
      { name: "Beta Bears", symbol: "BBR" },
      { name: "Gamma Eagles", symbol: "GEG" },
      { name: "Delta Sharks", symbol: "DSK" },
      { name: "Epsilon Hawks", symbol: "EHK" },
      { name: "Zeta Wolves", symbol: "ZWL" },
      { name: "Eta Panthers", symbol: "EPN" },
      { name: "Theta Tigers", symbol: "TTG" },
    ];

    const teamAddrs = [];
    for (const team of teams) {
      const tx = await factory.createTeamToken(team.name, team.symbol);
      await tx.wait();
      const addr = await factory.symbolToToken(team.symbol);
      teamAddrs.push(addr);
      await oracle.registerTeam(addr);
      await rewardDistributor.registerTeamToken(addr);
    }

    homeTokenAddr = teamAddrs[0]; // ALN
    awayTokenAddr = teamAddrs[1]; // BBR
    homeToken = await ethers.getContractAt("TeamToken", homeTokenAddr);
    awayToken = await ethers.getContractAt("TeamToken", awayTokenAddr);

    // Exempt FanWars and users from token transfer restrictions
    const fanWarsAddr = await fanWars.getAddress();
    await factory.setTokenExempt(homeTokenAddr, fanWarsAddr, true);
    await factory.setTokenExempt(awayTokenAddr, fanWarsAddr, true);
    await factory.setTokenExempt(homeTokenAddr, user1.address, true);
    await factory.setTokenExempt(homeTokenAddr, user2.address, true);
    await factory.setTokenExempt(awayTokenAddr, user2.address, true);
    await factory.setTokenExempt(awayTokenAddr, user3.address, true);
  });

  // =====================================================================
  // Full Flow: Buy -> Lock in FanWars -> Settle -> Claim -> Verify balance
  // =====================================================================
  describe("Full Flow: Buy -> FanWars Lock -> Settle -> Claim", function () {
    const MATCH_ID = 50001;

    it("Step 1: Users buy team tokens via factory bonding curve", async function () {
      // user1 buys home team tokens
      await factory
        .connect(user1)
        .buy(homeTokenAddr, 1, { value: ethers.parseEther("2") });
      const u1Balance = await homeToken.balanceOf(user1.address);
      expect(u1Balance).to.be.greaterThan(0);

      // user2 buys away team tokens
      await factory
        .connect(user2)
        .buy(awayTokenAddr, 1, { value: ethers.parseEther("2") });
      const u2Balance = await awayToken.balanceOf(user2.address);
      expect(u2Balance).to.be.greaterThan(0);
    });

    it("Step 2: Fund boost pool and create FanWars match", async function () {
      await fanWars.fundBoostPool({ value: ethers.parseEther("5") });
      const pool = await fanWars.boostPoolBalance();
      expect(pool).to.equal(ethers.parseEther("5"));

      const deadline = (await time.latest()) + 3600;
      await fanWars
        .connect(keeper)
        .createMatchWar(MATCH_ID, homeTokenAddr, awayTokenAddr, deadline);

      const status = await fanWars.getMatchWarStatus(MATCH_ID);
      expect(status.homeTeamToken).to.equal(homeTokenAddr);
      expect(status.awayTeamToken).to.equal(awayTokenAddr);
      expect(status.settled).to.equal(false);
    });

    it("Step 3: Users lock tokens in FanWars", async function () {
      const fanWarsAddr = await fanWars.getAddress();

      // user1 locks home tokens
      const u1Balance = await homeToken.balanceOf(user1.address);
      const lockAmount = u1Balance / 2n; // Lock half
      await homeToken.connect(user1).approve(fanWarsAddr, lockAmount);
      await fanWars
        .connect(user1)
        .lockTokens(MATCH_ID, homeTokenAddr, lockAmount);

      const u1Lock = await fanWars.getUserLock(MATCH_ID, user1.address);
      expect(u1Lock.amount).to.equal(lockAmount);
      expect(u1Lock.teamToken).to.equal(homeTokenAddr);

      // user2 locks away tokens
      const u2Balance = await awayToken.balanceOf(user2.address);
      const lockAmount2 = u2Balance / 2n;
      await awayToken.connect(user2).approve(fanWarsAddr, lockAmount2);
      await fanWars
        .connect(user2)
        .lockTokens(MATCH_ID, awayTokenAddr, lockAmount2);

      const u2Lock = await fanWars.getUserLock(MATCH_ID, user2.address);
      expect(u2Lock.amount).to.equal(lockAmount2);
    });

    it("Step 4: Settle match (home wins) and verify boost distribution", async function () {
      await fanWars
        .connect(keeper)
        .settleMatch(MATCH_ID, homeTokenAddr, 1); // NORMAL margin

      const status = await fanWars.getMatchWarStatus(MATCH_ID);
      expect(status.settled).to.equal(true);
      expect(status.winnerToken).to.equal(homeTokenAddr);
      expect(status.marginType).to.equal(1);
    });

    it("Step 5: Winner claims boost + tokens, loser claims boost + tokens", async function () {
      // Record balances before claim
      const u1TokensBefore = await homeToken.balanceOf(user1.address);
      const u1EthBefore = await ethers.provider.getBalance(user1.address);

      const u1Lock = await fanWars.getUserLock(MATCH_ID, user1.address);
      const lockedAmount = u1Lock.amount;

      // user1 (winner) claims
      const tx1 = await fanWars.connect(user1).claimBoost(MATCH_ID);
      const receipt1 = await tx1.wait();
      const gas1 = receipt1.gasUsed * receipt1.gasPrice;

      const u1TokensAfter = await homeToken.balanceOf(user1.address);
      const u1EthAfter = await ethers.provider.getBalance(user1.address);

      // Tokens returned
      expect(u1TokensAfter - u1TokensBefore).to.equal(lockedAmount);

      // ETH boost received (winner side)
      const ethGain1 = u1EthAfter - u1EthBefore + gas1;
      expect(ethGain1).to.be.greaterThan(0);

      // user2 (loser) claims
      const u2TokensBefore = await awayToken.balanceOf(user2.address);
      const u2EthBefore = await ethers.provider.getBalance(user2.address);

      const u2Lock = await fanWars.getUserLock(MATCH_ID, user2.address);

      const tx2 = await fanWars.connect(user2).claimBoost(MATCH_ID);
      const receipt2 = await tx2.wait();
      const gas2 = receipt2.gasUsed * receipt2.gasPrice;

      const u2TokensAfter = await awayToken.balanceOf(user2.address);
      const u2EthAfter = await ethers.provider.getBalance(user2.address);

      // Tokens returned for loser too
      expect(u2TokensAfter - u2TokensBefore).to.equal(u2Lock.amount);

      // Loser also gets some boost (NORMAL: 30%)
      const ethGain2 = u2EthAfter - u2EthBefore + gas2;
      expect(ethGain2).to.be.greaterThan(0);

      // Winner gets more boost than loser
      expect(ethGain1).to.be.greaterThan(ethGain2);
    });

    it("Step 6: Verify end-to-end token balances are consistent", async function () {
      // After claiming, locked tokens were returned. User1 should have their
      // original balance back (pre-lock balance + returned lock amount).
      const u1Balance = await homeToken.balanceOf(user1.address);
      expect(u1Balance).to.be.greaterThan(0);

      const u2Balance = await awayToken.balanceOf(user2.address);
      expect(u2Balance).to.be.greaterThan(0);

      // Verify user locks are marked claimed
      const u1Lock = await fanWars.getUserLock(MATCH_ID, user1.address);
      expect(u1Lock.claimed).to.equal(true);

      const u2Lock = await fanWars.getUserLock(MATCH_ID, user2.address);
      expect(u2Lock.claimed).to.equal(true);
    });
  });

  // =====================================================================
  // Flow: Buy -> Sell -> RewardDistributor receives fees -> Distribute
  // =====================================================================
  describe("Flow: Trading Fees -> RewardDistributor -> Team Rewards", function () {
    it("should collect fees from trades and distribute to pools", async function () {
      const rdAddr = await rewardDistributor.getAddress();

      // Buy generates fees
      const rdBalBefore = await ethers.provider.getBalance(rdAddr);
      await factory
        .connect(user1)
        .buy(homeTokenAddr, 1, { value: ethers.parseEther("3") });
      const rdBalAfter = await ethers.provider.getBalance(rdAddr);

      // RewardDistributor should have received the 2% buy fee
      const feeReceived = rdBalAfter - rdBalBefore;
      expect(feeReceived).to.be.greaterThan(0);

      // Distribute fees
      const uvAddr = await upsetVault.getAddress();
      const uvBalBefore = await ethers.provider.getBalance(uvAddr);

      await rewardDistributor.distributeFees();

      const uvBalAfter = await ethers.provider.getBalance(uvAddr);
      // UpsetVault should have received 15% of the distributable amount
      expect(uvBalAfter).to.be.greaterThan(uvBalBefore);
    });
  });

  // =====================================================================
  // Flow: Buy -> Oracle update -> Sell tax changes
  // =====================================================================
  describe("Flow: Oracle Score Update -> Dynamic Sell Tax", function () {
    it("should update sell tax based on oracle performance scores", async function () {
      // Use a fresh token (DSK) that has not had oracle updates
      const freshTokenAddr = await factory.symbolToToken("DSK");
      const initialTax = await oracle.getSellTaxRate(freshTokenAddr);
      // All teams start at score 50. Tax depends on relative ranking.
      expect(initialTax).to.be.greaterThan(0);

      // Update this team to be the best performer
      await oracle
        .connect(deployer)
        .updateMatchResult(freshTokenAddr, 99, 95, 95, 99);
      await time.increase(31);
      await oracle
        .connect(oracle2)
        .updateMatchResult(freshTokenAddr, 99, 95, 95, 99);

      // Tax should now be lower (better performing = lower sell tax)
      const updatedTax = await oracle.getSellTaxRate(freshTokenAddr);
      expect(updatedTax).to.be.lessThan(initialTax);
      // Best team should get the minimum tax rate of 200 (2%)
      expect(updatedTax).to.equal(200);
    });
  });

  // =====================================================================
  // Flow: Buy -> CircuitBreaker price tracking -> Pause on crash
  // =====================================================================
  describe("Flow: Trading -> CircuitBreaker Triggers on Price Crash", function () {
    it("should pause trading when circuit breaker detects >15% price drop", async function () {
      // Use a fresh token for clean circuit breaker state
      const targetAddr = await factory.symbolToToken("GEG");

      // Buy to establish a price
      await factory
        .connect(user1)
        .buy(targetAddr, 1, { value: ethers.parseEther("1") });

      // Manually record a high price then a crashed price via circuit breaker
      await circuitBreaker.recordPrice(
        targetAddr,
        ethers.parseEther("1.0")
      );
      await circuitBreaker.recordPrice(
        targetAddr,
        ethers.parseEther("0.80")
      );

      // Token should now be paused
      const paused = await circuitBreaker.isPaused(targetAddr);
      expect(paused).to.equal(true);

      // Trading should be blocked
      await expect(
        factory
          .connect(user1)
          .buy(targetAddr, 1, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(factory, "TradingPaused");

      // Resume for cleanup
      await circuitBreaker.resume(targetAddr);
    });
  });
});
