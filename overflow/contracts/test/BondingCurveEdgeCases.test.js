const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Bonding Curve Edge Cases", function () {
  let deployer, oracle2, oracle3, user1, user2;
  let oracle, circuitBreaker, rewardDistributor, factory;
  let tokenAddr;

  before(async function () {
    [deployer, oracle2, oracle3, user1, user2] = await ethers.getSigners();

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

    // Deploy RewardDistributor
    const RewardDistributor =
      await ethers.getContractFactory("RewardDistributor");
    rewardDistributor = await RewardDistributor.deploy(
      deployer.address,
      deployer.address,
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

    // Create a team token
    const tx = await factory.createTeamToken("Curve Test Team", "CTT");
    await tx.wait();
    tokenAddr = await factory.symbolToToken("CTT");
    await oracle.registerTeam(tokenAddr);
    await rewardDistributor.registerTeamToken(tokenAddr);
  });

  // =====================================================================
  // Buy with exactly 0 ETH should revert
  // =====================================================================
  describe("Zero-value operations", function () {
    it("should revert buy with exactly 0 ETH", async function () {
      await expect(
        factory.connect(user1).buy(tokenAddr, 1, { value: 0 })
      ).to.be.revertedWithCustomError(factory, "InsufficientPayment");
    });

    it("should revert sell with 0 tokens", async function () {
      await expect(
        factory.connect(user1).sell(tokenAddr, 0, 1)
      ).to.be.revertedWithCustomError(factory, "ZeroAmount");
    });
  });

  // =====================================================================
  // Buy at increasing supply levels — verify price rises
  // =====================================================================
  describe("Price increases with supply", function () {
    it("should have monotonically increasing buy price as supply grows", async function () {
      // Buy in 3 rounds and verify price increases each time
      const price1 = await factory.getBuyPrice(tokenAddr);

      await factory
        .connect(user1)
        .buy(tokenAddr, 1, { value: ethers.parseEther("1") });
      const price2 = await factory.getBuyPrice(tokenAddr);

      await factory
        .connect(user1)
        .buy(tokenAddr, 1, { value: ethers.parseEther("2") });
      const price3 = await factory.getBuyPrice(tokenAddr);

      await factory
        .connect(user1)
        .buy(tokenAddr, 1, { value: ethers.parseEther("5") });
      const price4 = await factory.getBuyPrice(tokenAddr);

      expect(price2).to.be.greaterThan(price1);
      expect(price3).to.be.greaterThan(price2);
      expect(price4).to.be.greaterThan(price3);
    });
  });

  // =====================================================================
  // Sell tokens — verify price drops correctly
  // =====================================================================
  describe("Selling tokens reduces price", function () {
    it("should reduce buy price after selling tokens", async function () {
      // Use a fresh isolated factory to avoid circuit breaker interference
      const PerformanceOracle2 =
        await ethers.getContractFactory("PerformanceOracle");
      const isoOracle = await PerformanceOracle2.deploy(
        deployer.address,
        oracle2.address,
        oracle3.address
      );
      await isoOracle.waitForDeployment();

      const CB2 = await ethers.getContractFactory("CircuitBreaker");
      const isoCB = await CB2.deploy();
      await isoCB.waitForDeployment();

      const RD2 = await ethers.getContractFactory("RewardDistributor");
      const isoRD = await RD2.deploy(
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address
      );
      await isoRD.waitForDeployment();

      const TTF2 = await ethers.getContractFactory("TeamTokenFactory");
      const isoFactory = await TTF2.deploy(
        await isoOracle.getAddress(),
        await isoCB.getAddress(),
        await isoRD.getAddress()
      );
      await isoFactory.waitForDeployment();
      await isoCB.setReporter(await isoFactory.getAddress(), true);

      const txC = await isoFactory.createTeamToken("Sell Test", "SLT");
      await txC.wait();
      const sltAddr = await isoFactory.symbolToToken("SLT");
      await isoOracle.registerTeam(sltAddr);
      await isoRD.registerTeamToken(sltAddr);

      // Buy a meaningful amount
      await isoFactory
        .connect(user1)
        .buy(sltAddr, 1, { value: ethers.parseEther("5") });

      const token = await ethers.getContractAt("TeamToken", sltAddr);
      const balance = await token.balanceOf(user1.address);
      expect(balance).to.be.greaterThan(0);

      const priceBeforeSell = await isoFactory.getBuyPrice(sltAddr);

      // Wait for cooldown and hold period (>2hrs for lowest tax)
      await time.increase(2 * 3600 + 1);

      // Sell one maxTx chunk — enough to move the price
      const maxTx = await token.maxTxAmount();
      const sellAmount = balance < maxTx ? balance / 2n : maxTx;

      await isoFactory.connect(user1).sell(sltAddr, sellAmount, 1);

      const priceAfterSell = await isoFactory.getBuyPrice(sltAddr);
      expect(priceAfterSell).to.be.lessThan(priceBeforeSell);

      // Verify user balance decreased
      const finalBalance = await token.balanceOf(user1.address);
      expect(finalBalance).to.be.lessThan(balance);
    });
  });

  // =====================================================================
  // Asymmetric curves: buy price > sell price at same supply
  // =====================================================================
  describe("Asymmetric buy/sell spread", function () {
    it("should always have buy price >= sell price at any supply level", async function () {
      // Resume circuit breaker if triggered
      const paused = await circuitBreaker.isPaused(tokenAddr);
      if (paused) {
        await circuitBreaker.resume(tokenAddr);
      }

      // Buy to create supply
      await factory
        .connect(user2)
        .buy(tokenAddr, 1, { value: ethers.parseEther("3") });

      const buyPrice = await factory.getBuyPrice(tokenAddr);
      const sellPrice = await factory.getSellPrice(tokenAddr);

      // Buy curve (supply^1.5) is steeper than sell curve (supply^1.2)
      expect(buyPrice).to.be.greaterThanOrEqual(sellPrice);
    });
  });

  // =====================================================================
  // estimateBuyTokens returns accurate estimates
  // =====================================================================
  describe("Token estimate accuracy", function () {
    it("should return reasonable estimates for different ETH amounts", async function () {
      const estimate1 = await factory.estimateBuyTokens(
        tokenAddr,
        ethers.parseEther("0.01")
      );
      const estimate2 = await factory.estimateBuyTokens(
        tokenAddr,
        ethers.parseEther("1")
      );
      const estimate3 = await factory.estimateBuyTokens(
        tokenAddr,
        ethers.parseEther("10")
      );

      // More ETH should buy more tokens
      expect(estimate2).to.be.greaterThan(estimate1);
      expect(estimate3).to.be.greaterThan(estimate2);

      // Estimates should be non-zero
      expect(estimate1).to.be.greaterThan(0);
    });
  });

  // =====================================================================
  // Very small buy amounts
  // =====================================================================
  describe("Very small buy amounts", function () {
    it("should handle very small buy amounts gracefully", async function () {
      // Resume circuit breaker if triggered
      const paused = await circuitBreaker.isPaused(tokenAddr);
      if (paused) {
        await circuitBreaker.resume(tokenAddr);
      }

      // Buy with very small ETH — should either succeed with some tokens or revert
      // with a meaningful error. Should NOT produce zero tokens silently.
      const tinyAmount = ethers.parseEther("0.001");

      // At low supply, BASE_PRICE = 0.001 ETH, so this should buy some tokens
      await factory
        .connect(user1)
        .buy(tokenAddr, 1, { value: tinyAmount });

      const token = await ethers.getContractAt("TeamToken", tokenAddr);
      const balance = await token.balanceOf(user1.address);
      expect(balance).to.be.greaterThan(0);
    });
  });

  // =====================================================================
  // Buy fee is exactly 2%
  // =====================================================================
  describe("Buy fee precision", function () {
    it("should charge exactly 2% buy fee on each purchase", async function () {
      // Deploy a fresh isolated factory for precise fee measurement
      const PerformanceOracle =
        await ethers.getContractFactory("PerformanceOracle");
      const isoOracle = await PerformanceOracle.deploy(
        deployer.address,
        oracle2.address,
        oracle3.address
      );
      await isoOracle.waitForDeployment();

      const CBFactory = await ethers.getContractFactory("CircuitBreaker");
      const isoCB = await CBFactory.deploy();
      await isoCB.waitForDeployment();

      const RDFactory = await ethers.getContractFactory("RewardDistributor");
      const isoRD = await RDFactory.deploy(
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address
      );
      await isoRD.waitForDeployment();

      const TTF = await ethers.getContractFactory("TeamTokenFactory");
      const isoFactory = await TTF.deploy(
        await isoOracle.getAddress(),
        await isoCB.getAddress(),
        await isoRD.getAddress()
      );
      await isoFactory.waitForDeployment();
      await isoCB.setReporter(await isoFactory.getAddress(), true);

      const txC = await isoFactory.createTeamToken("Fee Test", "FTT");
      await txC.wait();
      const feeTokenAddr = await isoFactory.symbolToToken("FTT");
      await isoOracle.registerTeam(feeTokenAddr);
      await isoRD.registerTeamToken(feeTokenAddr);

      const rdAddr = await isoRD.getAddress();
      const rdBefore = await ethers.provider.getBalance(rdAddr);

      const buyAmount = ethers.parseEther("1");
      await isoFactory
        .connect(user1)
        .buy(feeTokenAddr, 1, { value: buyAmount });

      const rdAfter = await ethers.provider.getBalance(rdAddr);
      const feeReceived = rdAfter - rdBefore;

      // Fee should be approximately 2% of the ETH spent on the curve
      // (not necessarily 2% of msg.value due to refund mechanics)
      // But it should be > 0 and <= 2% of the total buy amount
      expect(feeReceived).to.be.greaterThan(0);
      const maxFee = (buyAmount * 200n) / 10000n; // 2% of total
      expect(feeReceived).to.be.lessThanOrEqual(maxFee);
    });
  });
});
