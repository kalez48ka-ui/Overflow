const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Reentrancy Protection", function () {
  let deployer, oracle2, oracle3, user1, user2, treasury, keeper;
  let oracle, circuitBreaker, rewardDistributor, factory;
  let attacker;
  let teamTokenAddr;

  before(async function () {
    [deployer, oracle2, oracle3, user1, user2, treasury, keeper] =
      await ethers.getSigners();

    // --- Deploy the full stack for TeamTokenFactory reentrancy tests ---
    const PerformanceOracle =
      await ethers.getContractFactory("PerformanceOracle");
    oracle = await PerformanceOracle.deploy(
      deployer.address,
      oracle2.address,
      oracle3.address
    );
    await oracle.waitForDeployment();

    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    circuitBreaker = await CircuitBreaker.deploy();
    await circuitBreaker.waitForDeployment();

    const UpsetVault = await ethers.getContractFactory("UpsetVault");
    const upsetVault = await UpsetVault.deploy(await oracle.getAddress());
    await upsetVault.waitForDeployment();

    const RewardDistributor =
      await ethers.getContractFactory("RewardDistributor");
    rewardDistributor = await RewardDistributor.deploy(
      deployer.address,
      await upsetVault.getAddress(),
      deployer.address,
      deployer.address
    );
    await rewardDistributor.waitForDeployment();

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
    const tx = await factory.createTeamToken("Test Warriors", "TSW");
    await tx.wait();
    teamTokenAddr = await factory.symbolToToken("TSW");
    await oracle.registerTeam(teamTokenAddr);
    await rewardDistributor.registerTeamToken(teamTokenAddr);

    // Deploy the attacker contract
    const ReentrancyAttacker = await ethers.getContractFactory(
      "ReentrancyAttacker"
    );
    attacker = await ReentrancyAttacker.deploy();
    await attacker.waitForDeployment();

    // Exempt attacker from token transfer restrictions so buy/sell can work
    await factory.setTokenExempt(
      teamTokenAddr,
      await attacker.getAddress(),
      true
    );
  });

  // =====================================================================
  // TeamTokenFactory.buy() reentrancy
  // =====================================================================
  describe("TeamTokenFactory.buy()", function () {
    it("should block reentrancy on buy()", async function () {
      const factoryAddr = await factory.getAddress();
      const buyCalldata = factory.interface.encodeFunctionData("buy", [
        teamTokenAddr,
        1, // minTokensOut > 0 required
      ]);

      // The attacker sends ETH and calls buy(). When it receives the refund
      // via receive(), it tries to re-enter buy(). The nonReentrant guard
      // should cause the re-entrant call to revert, which means the attacker's
      // receive() silently fails (success = false). The initial buy still succeeds.
      await expect(
        attacker.attack(factoryAddr, buyCalldata, {
          value: ethers.parseEther("1"),
        })
      ).to.not.be.reverted;

      // The re-entrant call should NOT have succeeded
      const succeeded = await attacker.attackSucceeded();
      expect(succeeded).to.equal(false);
    });
  });

  // =====================================================================
  // TeamTokenFactory.sell() reentrancy
  // =====================================================================
  describe("TeamTokenFactory.sell()", function () {
    it("should block reentrancy on sell()", async function () {
      const factoryAddr = await factory.getAddress();
      const attackerAddr = await attacker.getAddress();

      // First, attacker needs tokens. Buy via proxy call (no reentrancy attempt).
      const buyCalldata = factory.interface.encodeFunctionData("buy", [
        teamTokenAddr,
        1,
      ]);
      await attacker.proxyCall(factoryAddr, buyCalldata, {
        value: ethers.parseEther("2"),
      });

      // Get attacker's token balance
      const token = await ethers.getContractAt("TeamToken", teamTokenAddr);
      const balance = await token.balanceOf(attackerAddr);
      expect(balance).to.be.greaterThan(0);

      // Approve factory to burn tokens
      const approveCalldata = token.interface.encodeFunctionData("approve", [
        factoryAddr,
        balance,
      ]);
      await attacker.proxyCall(teamTokenAddr, approveCalldata);

      // Wait for cooldown
      await time.increase(61);

      // Sell a small amount (within maxTx limits)
      const maxTx = await token.maxTxAmount();
      const sellAmount = balance < maxTx ? balance / 10n : maxTx / 2n;

      const sellCalldata = factory.interface.encodeFunctionData("sell", [
        teamTokenAddr,
        sellAmount,
        1, // minProceeds > 0 required
      ]);

      // Attack: the receive() in attacker will try to re-enter sell()
      // The initial sell should succeed but the re-entrant call should fail
      await expect(attacker.attack(factoryAddr, sellCalldata)).to.not.be
        .reverted;

      const succeeded = await attacker.attackSucceeded();
      expect(succeeded).to.equal(false);
    });
  });

  // =====================================================================
  // RewardDistributor.claimRewards() reentrancy
  // =====================================================================
  describe("RewardDistributor.claimRewards()", function () {
    it("should block reentrancy on claimRewards()", async function () {
      // Deploy a fresh isolated stack for this test to avoid state pollution
      const PerformanceOracle2 =
        await ethers.getContractFactory("PerformanceOracle");
      const isoOracle = await PerformanceOracle2.deploy(
        deployer.address,
        oracle2.address,
        oracle3.address
      );
      await isoOracle.waitForDeployment();

      const CircuitBreaker2 =
        await ethers.getContractFactory("CircuitBreaker");
      const isoCB = await CircuitBreaker2.deploy();
      await isoCB.waitForDeployment();

      const UpsetVault2 = await ethers.getContractFactory("UpsetVault");
      const isoUV = await UpsetVault2.deploy(await isoOracle.getAddress());
      await isoUV.waitForDeployment();

      const RewardDistributor2 =
        await ethers.getContractFactory("RewardDistributor");
      const isoRD = await RewardDistributor2.deploy(
        deployer.address,
        await isoUV.getAddress(),
        deployer.address,
        deployer.address
      );
      await isoRD.waitForDeployment();

      const TeamTokenFactory2 =
        await ethers.getContractFactory("TeamTokenFactory");
      const isoFactory = await TeamTokenFactory2.deploy(
        await isoOracle.getAddress(),
        await isoCB.getAddress(),
        await isoRD.getAddress()
      );
      await isoFactory.waitForDeployment();
      await isoCB.setReporter(await isoFactory.getAddress(), true);

      // Create 8 team tokens
      const symbols = ["R1A", "R1B", "R1C", "R1D", "R1E", "R1F", "R1G", "R1H"];
      const tokenAddrs = [];
      for (const sym of symbols) {
        const txC = await isoFactory.createTeamToken(`Team ${sym}`, sym);
        await txC.wait();
        const addr = await isoFactory.symbolToToken(sym);
        await isoOracle.registerTeam(addr);
        await isoRD.registerTeamToken(addr);
        tokenAddrs.push(addr);
      }

      const targetToken = tokenAddrs[0]; // R1A
      const attackerAddr = await attacker.getAddress();

      // Exempt attacker from transfer restrictions
      await isoFactory.setTokenExempt(targetToken, attackerAddr, true);

      // Deploy a fresh attacker for clean state
      const ReentrancyAttacker2 =
        await ethers.getContractFactory("ReentrancyAttacker");
      const freshAttacker = await ReentrancyAttacker2.deploy();
      await freshAttacker.waitForDeployment();
      const freshAttackerAddr = await freshAttacker.getAddress();

      // Exempt fresh attacker from transfer restrictions
      await isoFactory.setTokenExempt(targetToken, freshAttackerAddr, true);

      // Buy tokens for the fresh attacker via proxy call
      const buyCalldata = isoFactory.interface.encodeFunctionData("buy", [
        targetToken,
        1,
      ]);
      await freshAttacker.proxyCall(await isoFactory.getAddress(), buyCalldata, {
        value: ethers.parseEther("1"),
      });

      // Verify attacker has tokens
      const token = await ethers.getContractAt("TeamToken", targetToken);
      const attackerBalance = await token.balanceOf(freshAttackerAddr);
      expect(attackerBalance).to.be.greaterThan(0);

      // Fund and distribute rewards
      const rdAddr = await isoRD.getAddress();
      await deployer.sendTransaction({
        to: rdAddr,
        value: ethers.parseEther("10"),
      });
      await isoRD.distributeFees();

      // Distribute match rewards (attacker bought before snapshot)
      await isoRD.distributeMatchRewards(tokenAddrs);

      const claimCalldata = isoRD.interface.encodeFunctionData(
        "claimRewards",
        [0, targetToken]
      );

      // Attack: re-enter claimRewards from receive()
      await expect(
        freshAttacker.attack(rdAddr, claimCalldata)
      ).to.not.be.reverted;

      const succeeded = await freshAttacker.attackSucceeded();
      expect(succeeded).to.equal(false);
    });
  });

  // =====================================================================
  // UpsetVault.claimUpsetReward() reentrancy
  // =====================================================================
  describe("UpsetVault.claimUpsetReward()", function () {
    it("should block reentrancy on claimUpsetReward()", async function () {
      // Deploy a fresh isolated UpsetVault for this test
      const UpsetVault = await ethers.getContractFactory("UpsetVault");
      const isolatedVault = await UpsetVault.deploy(await oracle.getAddress());
      await isolatedVault.waitForDeployment();

      const vaultAddr = await isolatedVault.getAddress();
      const attackerAddr = await attacker.getAddress();

      // Fund the vault
      await deployer.sendTransaction({
        to: vaultAddr,
        value: ethers.parseEther("10"),
      });

      // Attacker needs winner team tokens. We need two teams with different scores.
      // teamTokenAddr is at default 50. Create another with updated score.
      // Actually, we already have multiple tokens. Let's update oracle scores
      // so we get an upset score > 3.

      // Create two fresh tokens for this test
      const TeamToken = await ethers.getContractFactory("TeamToken");
      const winnerToken = await TeamToken.deploy(
        "Underdog Team",
        "UDT",
        deployer.address,
        deployer.address,
        ethers.parseEther("1000000")
      );
      await winnerToken.waitForDeployment();
      const winnerAddr = await winnerToken.getAddress();

      const loserToken = await TeamToken.deploy(
        "Favourite Team",
        "FVT",
        deployer.address,
        deployer.address,
        ethers.parseEther("1000000")
      );
      await loserToken.waitForDeployment();
      const loserAddr = await loserToken.getAddress();

      // Register both in oracle
      await oracle.registerTeam(winnerAddr);
      await oracle.registerTeam(loserAddr);

      // Update scores: make loser very strong (low tax) and winner weak (high tax)
      // First oracle submits
      await oracle
        .connect(deployer)
        .updateMatchResult(loserAddr, 95, 90, 90, 95);
      await time.increase(31);
      await oracle
        .connect(oracle2)
        .updateMatchResult(loserAddr, 95, 90, 90, 95);
      // loser composite = (95*40 + 90*20 + 90*20 + 95*20) / 100 = (3800+1800+1800+1900)/100 = 93
      // loser tax = 200 (best)

      // winner stays at 50 -> tax = 1500

      // Mint winner tokens to attacker
      await winnerToken.mint(attackerAddr, ethers.parseEther("100"));
      await winnerToken.setExempt(attackerAddr, true);

      // Trigger upset: winner (high tax) beats loser (low tax) -> upset
      await isolatedVault.triggerUpset(winnerAddr, loserAddr);

      // Now attacker should be able to claim
      const claimCalldata = isolatedVault.interface.encodeFunctionData(
        "claimUpsetReward",
        [0]
      );

      // Attack: re-enter claimUpsetReward from receive()
      await expect(attacker.attack(vaultAddr, claimCalldata)).to.not.be
        .reverted;

      const succeeded = await attacker.attackSucceeded();
      expect(succeeded).to.equal(false);
    });
  });

  // =====================================================================
  // FanWars.claimBoost() reentrancy
  // =====================================================================
  describe("FanWars.claimBoost()", function () {
    it("should block reentrancy on claimBoost()", async function () {
      const FanWars = await ethers.getContractFactory("FanWars");
      const fanWars = await FanWars.deploy();
      await fanWars.waitForDeployment();
      const fanWarsAddr = await fanWars.getAddress();
      const attackerAddr = await attacker.getAddress();

      await fanWars.setKeeper(keeper.address, true);

      // Deploy two tokens
      const TeamToken = await ethers.getContractFactory("TeamToken");
      const homeToken = await TeamToken.deploy(
        "Home Reentrancy",
        "HRE",
        deployer.address,
        deployer.address,
        ethers.parseEther("1000000")
      );
      await homeToken.waitForDeployment();
      const homeAddr = await homeToken.getAddress();

      const awayToken = await TeamToken.deploy(
        "Away Reentrancy",
        "ARE",
        deployer.address,
        deployer.address,
        ethers.parseEther("1000000")
      );
      await awayToken.waitForDeployment();
      const awayAddr = await awayToken.getAddress();

      // Exempt attacker and fanWars from token restrictions
      await homeToken.setExempt(attackerAddr, true);
      await homeToken.setExempt(fanWarsAddr, true);
      await awayToken.setExempt(attackerAddr, true);
      await awayToken.setExempt(fanWarsAddr, true);

      // Mint tokens to attacker
      await homeToken.mint(attackerAddr, ethers.parseEther("200"));
      // Mint away tokens to user1 for the other side
      await awayToken.setExempt(user1.address, true);
      await awayToken.mint(user1.address, ethers.parseEther("200"));

      // Fund boost pool
      await fanWars.fundBoostPool({ value: ethers.parseEther("10") });

      // Create match war
      const matchId = 99001;
      const deadline = (await time.latest()) + 3600;
      await fanWars
        .connect(keeper)
        .createMatchWar(matchId, homeAddr, awayAddr, deadline);

      // Attacker locks home tokens via proxy call
      const approveCalldata = homeToken.interface.encodeFunctionData(
        "approve",
        [fanWarsAddr, ethers.parseEther("200")]
      );
      await attacker.proxyCall(homeAddr, approveCalldata);

      const lockCalldata = fanWars.interface.encodeFunctionData("lockTokens", [
        matchId,
        homeAddr,
        ethers.parseEther("200"),
      ]);
      await attacker.proxyCall(fanWarsAddr, lockCalldata);

      // user1 locks away tokens
      await awayToken
        .connect(user1)
        .approve(fanWarsAddr, ethers.parseEther("200"));
      await fanWars
        .connect(user1)
        .lockTokens(matchId, awayAddr, ethers.parseEther("200"));

      // Settle match: home wins
      await fanWars.connect(keeper).settleMatch(matchId, homeAddr, 1);

      // Attack: claimBoost sends ETH, attacker tries to re-enter
      const claimCalldata = fanWars.interface.encodeFunctionData("claimBoost", [
        matchId,
      ]);

      await expect(attacker.attack(fanWarsAddr, claimCalldata)).to.not.be
        .reverted;

      const succeeded = await attacker.attackSucceeded();
      expect(succeeded).to.equal(false);
    });
  });

  // =====================================================================
  // PredictionPool.claimReward() reentrancy
  // =====================================================================
  describe("PredictionPool.claimReward()", function () {
    it("should block reentrancy on claimReward()", async function () {
      const PredictionPool =
        await ethers.getContractFactory("PredictionPool");
      const predPool = await PredictionPool.deploy(treasury.address);
      await predPool.waitForDeployment();
      const poolAddr = await predPool.getAddress();
      const attackerAddr = await attacker.getAddress();

      await predPool.setKeeper(keeper.address);

      const matchId = 88001;
      const entryFee = ethers.parseEther("0.1");
      const deadline = (await time.latest()) + 86400;

      await predPool
        .connect(keeper)
        .createMatchPool(matchId, entryFee, deadline);

      // Add a simple question
      await predPool
        .connect(keeper)
        .addQuestion(matchId, "Who wins?", 2, 10, false, deadline);

      // Attacker enters via proxy call
      const enterCalldata = predPool.interface.encodeFunctionData(
        "enterPrediction",
        [matchId, [1]]
      );
      await attacker.proxyCall(poolAddr, enterCalldata, { value: entryFee });

      // user1 also enters so there is meaningful pool
      await predPool
        .connect(user1)
        .enterPrediction(matchId, [2], { value: entryFee });

      // Settle match
      await predPool.connect(keeper).settleMatch(matchId, [1]);

      // Attack: claimReward sends ETH to attacker, which tries to re-enter
      const claimCalldata = predPool.interface.encodeFunctionData(
        "claimReward",
        [matchId]
      );

      await expect(attacker.attack(poolAddr, claimCalldata)).to.not.be
        .reverted;

      const succeeded = await attacker.attackSucceeded();
      expect(succeeded).to.equal(false);
    });
  });
});
