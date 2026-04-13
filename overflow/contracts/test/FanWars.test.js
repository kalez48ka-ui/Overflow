const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("FanWars", function () {
  let deployer, keeper, user1, user2, user3;
  let fanWars;
  let homeToken, awayToken;

  const MATCH_ID = 1001;
  const LOCK_AMOUNT = ethers.parseEther("100");
  const BOOST_FUND = ethers.parseEther("10");

  before(async function () {
    [deployer, keeper, user1, user2, user3] = await ethers.getSigners();

    // Deploy FanWars
    const FanWars = await ethers.getContractFactory("FanWars");
    fanWars = await FanWars.deploy();
    await fanWars.waitForDeployment();

    // Set keeper
    await fanWars.setKeeper(keeper.address, true);

    // Deploy two mock ERC-20 tokens to simulate team tokens.
    // We use the TeamToken contract but bypass the factory by making deployer the factory.
    // Actually, TeamToken requires factory as minter. Let's deploy a simple ERC-20 for testing.
    // We need tokens where users can approve and transfer freely.
    // TeamToken has transfer restrictions (tax, cooldown). For FanWars tests,
    // we need tokens that can be transferred cleanly. However, TeamToken exempts
    // certain addresses. Let's use TeamToken and set FanWars as exempt.

    // Deploy a PerformanceOracle (needed by nothing here, but TeamToken needs a factory)
    // Actually, TeamToken just needs a factory address for minting. Let's use deployer as factory.
    const TeamToken = await ethers.getContractFactory("TeamToken");

    homeToken = await TeamToken.deploy(
      "Home Warriors",
      "HMW",
      deployer.address,        // factory = deployer (so deployer can mint)
      deployer.address,        // taxRecipient
      ethers.parseEther("1000000")
    );
    await homeToken.waitForDeployment();

    awayToken = await TeamToken.deploy(
      "Away Strikers",
      "AWS",
      deployer.address,        // factory = deployer
      deployer.address,        // taxRecipient
      ethers.parseEther("1000000")
    );
    await awayToken.waitForDeployment();

    // Set FanWars contract as exempt from transfer tax/cooldown on both tokens
    const fanWarsAddr = await fanWars.getAddress();
    await homeToken.setExempt(fanWarsAddr, true);
    await awayToken.setExempt(fanWarsAddr, true);

    // Also exempt users for cleaner test flows (no cooldown/tax interference)
    await homeToken.setExempt(user1.address, true);
    await homeToken.setExempt(user2.address, true);
    await homeToken.setExempt(user3.address, true);
    await awayToken.setExempt(user1.address, true);
    await awayToken.setExempt(user2.address, true);
    await awayToken.setExempt(user3.address, true);

    // Mint tokens to users
    await homeToken.mint(user1.address, ethers.parseEther("500"));
    await homeToken.mint(user2.address, ethers.parseEther("500"));
    await awayToken.mint(user2.address, ethers.parseEther("500"));
    await awayToken.mint(user3.address, ethers.parseEther("500"));

    // Fund the boost pool
    await fanWars.fundBoostPool({ value: BOOST_FUND });
  });

  // =====================================================================
  // Match War Creation
  // =====================================================================
  describe("Match War Creation", function () {
    it("should create a match war", async function () {
      const deadline = (await time.latest()) + 3600; // 1 hour from now
      await fanWars.connect(keeper).createMatchWar(
        MATCH_ID,
        await homeToken.getAddress(),
        await awayToken.getAddress(),
        deadline
      );

      const status = await fanWars.getMatchWarStatus(MATCH_ID);
      expect(status.homeTeamToken).to.equal(await homeToken.getAddress());
      expect(status.awayTeamToken).to.equal(await awayToken.getAddress());
      expect(status.settled).to.equal(false);
      expect(status.cancelled).to.equal(false);
    });

    it("should not allow duplicate match war creation", async function () {
      const deadline = (await time.latest()) + 3600;
      await expect(
        fanWars.connect(keeper).createMatchWar(
          MATCH_ID,
          await homeToken.getAddress(),
          await awayToken.getAddress(),
          deadline
        )
      ).to.be.revertedWithCustomError(fanWars, "WarAlreadyExists");
    });

    it("should not allow non-keeper to create match war", async function () {
      const deadline = (await time.latest()) + 3600;
      await expect(
        fanWars.connect(user1).createMatchWar(
          9999,
          await homeToken.getAddress(),
          await awayToken.getAddress(),
          deadline
        )
      ).to.be.revertedWithCustomError(fanWars, "NotKeeper");
    });
  });

  // =====================================================================
  // Token Locking
  // =====================================================================
  describe("Token Locking", function () {
    it("should lock tokens for home team", async function () {
      const homeAddr = await homeToken.getAddress();
      const fanWarsAddr = await fanWars.getAddress();

      // Approve FanWars
      await homeToken.connect(user1).approve(fanWarsAddr, LOCK_AMOUNT);

      // Lock tokens
      await expect(
        fanWars.connect(user1).lockTokens(MATCH_ID, homeAddr, LOCK_AMOUNT)
      )
        .to.emit(fanWars, "TokensLocked")
        .withArgs(MATCH_ID, user1.address, homeAddr, LOCK_AMOUNT);

      // Verify lock
      const lock = await fanWars.getUserLock(MATCH_ID, user1.address);
      expect(lock.teamToken).to.equal(homeAddr);
      expect(lock.amount).to.equal(LOCK_AMOUNT);
      expect(lock.claimed).to.equal(false);

      // Verify war totals
      const status = await fanWars.getMatchWarStatus(MATCH_ID);
      expect(status.totalHomeLocked).to.equal(LOCK_AMOUNT);
    });

    it("should lock tokens for away team", async function () {
      const awayAddr = await awayToken.getAddress();
      const fanWarsAddr = await fanWars.getAddress();

      await awayToken.connect(user3).approve(fanWarsAddr, LOCK_AMOUNT);

      await expect(
        fanWars.connect(user3).lockTokens(MATCH_ID, awayAddr, LOCK_AMOUNT)
      )
        .to.emit(fanWars, "TokensLocked")
        .withArgs(MATCH_ID, user3.address, awayAddr, LOCK_AMOUNT);

      const status = await fanWars.getMatchWarStatus(MATCH_ID);
      expect(status.totalAwayLocked).to.equal(LOCK_AMOUNT);
    });

    it("should not allow locking after deadline", async function () {
      // Create a new match war with a short deadline
      const matchId2 = 2001;
      const deadline = (await time.latest()) + 60; // 60 seconds
      await fanWars.connect(keeper).createMatchWar(
        matchId2,
        await homeToken.getAddress(),
        await awayToken.getAddress(),
        deadline
      );

      // Time travel past deadline
      await time.increase(61);

      const homeAddr = await homeToken.getAddress();
      const fanWarsAddr = await fanWars.getAddress();
      await homeToken.connect(user2).approve(fanWarsAddr, LOCK_AMOUNT);

      await expect(
        fanWars.connect(user2).lockTokens(matchId2, homeAddr, LOCK_AMOUNT)
      ).to.be.revertedWithCustomError(fanWars, "LockDeadlinePassed");
    });

    it("should not allow locking both sides (double lock)", async function () {
      // user1 already locked home tokens on MATCH_ID
      const awayAddr = await awayToken.getAddress();
      const fanWarsAddr = await fanWars.getAddress();

      // Give user1 some away tokens
      await awayToken.mint(user1.address, ethers.parseEther("100"));
      await awayToken.connect(user1).approve(fanWarsAddr, LOCK_AMOUNT);

      await expect(
        fanWars.connect(user1).lockTokens(MATCH_ID, awayAddr, LOCK_AMOUNT)
      ).to.be.revertedWithCustomError(fanWars, "AlreadyLocked");
    });

    it("should not allow locking 0 amount", async function () {
      // Create a fresh match for this test
      const matchId3 = 3001;
      const deadline = (await time.latest()) + 3600;
      await fanWars.connect(keeper).createMatchWar(
        matchId3,
        await homeToken.getAddress(),
        await awayToken.getAddress(),
        deadline
      );

      await expect(
        fanWars.connect(user2).lockTokens(matchId3, await homeToken.getAddress(), 0)
      ).to.be.revertedWithCustomError(fanWars, "ZeroAmount");
    });
  });

  // =====================================================================
  // Match Settlement
  // =====================================================================
  describe("Match Settlement", function () {
    // We will create and test multiple matches for different margin types

    it("should settle match with NORMAL margin (60/30/10)", async function () {
      // MATCH_ID already has user1 locked home (100 tokens) and user3 locked away (100 tokens)
      const homeAddr = await homeToken.getAddress();

      await fanWars.connect(keeper).settleMatch(MATCH_ID, homeAddr, 1); // NORMAL margin

      const status = await fanWars.getMatchWarStatus(MATCH_ID);
      expect(status.settled).to.equal(true);
      expect(status.winnerToken).to.equal(homeAddr);
      expect(status.marginType).to.equal(1);

      // boostPool for this match should be the full 10 ETH
      expect(status.boostPool).to.equal(BOOST_FUND);

      // Winner (home) gets 60% of 10 ETH = 6 ETH
      // Loser (away) gets 30% of 10 ETH = 3 ETH
      // Rollover 10% = 1 ETH stays in pool
      const homeBoost = status.totalHomeLocked > 0n ? ethers.parseEther("6") : 0n;
      // homeBoostAmount is the winner share since home won
      // Verify from the war data via getMatchWarStatus (doesn't return boost amounts directly)
      // Let's check via estimated values from getUserLock after claim
    });

    it("should settle match with CLOSE margin (55/35/10)", async function () {
      const matchId = 4001;
      const deadline = (await time.latest()) + 3600;
      const homeAddr = await homeToken.getAddress();
      const awayAddr = await awayToken.getAddress();
      const fanWarsAddr = await fanWars.getAddress();

      await fanWars.connect(keeper).createMatchWar(matchId, homeAddr, awayAddr, deadline);

      // Fund more boost
      await fanWars.fundBoostPool({ value: ethers.parseEther("20") });

      // user2 locks home, user3 locks away
      await homeToken.connect(user2).approve(fanWarsAddr, LOCK_AMOUNT);
      await fanWars.connect(user2).lockTokens(matchId, homeAddr, LOCK_AMOUNT);

      // user3 already used their lock on MATCH_ID, so mint more away tokens to user2
      // Actually user3's away tokens were locked in MATCH_ID. Let's use a different user.
      // Mint fresh away tokens to user1 for this match
      await awayToken.mint(user1.address, ethers.parseEther("100"));
      await awayToken.connect(user1).approve(fanWarsAddr, LOCK_AMOUNT);
      await fanWars.connect(user1).lockTokens(matchId, awayAddr, LOCK_AMOUNT);

      const poolBefore = await fanWars.boostPoolBalance();

      // Settle with CLOSE margin, away team wins
      await fanWars.connect(keeper).settleMatch(matchId, awayAddr, 0);

      const status = await fanWars.getMatchWarStatus(matchId);
      expect(status.settled).to.equal(true);
      expect(status.marginType).to.equal(0);

      // Pool should have 10% rollover remaining
      const poolAfter = await fanWars.boostPoolBalance();
      const used = poolBefore;
      const expectedRollover = (used * 1000n) / 10000n; // 10%
      expect(poolAfter).to.equal(expectedRollover);
    });

    it("should settle match with DOMINANT margin (65/25/10)", async function () {
      const matchId = 5001;
      const deadline = (await time.latest()) + 3600;
      const homeAddr = await homeToken.getAddress();
      const awayAddr = await awayToken.getAddress();
      const fanWarsAddr = await fanWars.getAddress();

      // Fund boost pool
      await fanWars.fundBoostPool({ value: ethers.parseEther("10") });

      await fanWars.connect(keeper).createMatchWar(matchId, homeAddr, awayAddr, deadline);

      // Mint fresh tokens
      await homeToken.mint(user1.address, ethers.parseEther("200"));
      await awayToken.mint(user2.address, ethers.parseEther("200"));

      await homeToken.connect(user1).approve(fanWarsAddr, ethers.parseEther("200"));
      await fanWars.connect(user1).lockTokens(matchId, homeAddr, ethers.parseEther("200"));

      await awayToken.connect(user2).approve(fanWarsAddr, ethers.parseEther("200"));
      await fanWars.connect(user2).lockTokens(matchId, awayAddr, ethers.parseEther("200"));

      const poolBefore = await fanWars.boostPoolBalance();

      // Settle DOMINANT, home wins
      await fanWars.connect(keeper).settleMatch(matchId, homeAddr, 2);

      const status = await fanWars.getMatchWarStatus(matchId);
      expect(status.settled).to.equal(true);
      expect(status.marginType).to.equal(2);

      // Rollover = 10% of poolBefore
      const poolAfter = await fanWars.boostPoolBalance();
      const expectedRollover = (poolBefore * 1000n) / 10000n;
      expect(poolAfter).to.equal(expectedRollover);
    });
  });

  // =====================================================================
  // Claiming
  // =====================================================================
  describe("Boost Claiming", function () {
    it("should return tokens + boost on claim", async function () {
      // Claim from MATCH_ID (settled with NORMAL margin, home won)
      // user1 locked 100 home tokens (winner side)
      const homeAddr = await homeToken.getAddress();
      const fanWarsAddr = await fanWars.getAddress();

      const tokensBefore = await homeToken.balanceOf(user1.address);
      const ethBefore = await ethers.provider.getBalance(user1.address);

      const tx = await fanWars.connect(user1).claimBoost(MATCH_ID);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const tokensAfter = await homeToken.balanceOf(user1.address);
      const ethAfter = await ethers.provider.getBalance(user1.address);

      // Tokens should be returned (100 tokens)
      expect(tokensAfter - tokensBefore).to.equal(LOCK_AMOUNT);

      // ETH boost should be received (minus gas)
      // Winner gets 60% of 10 ETH = 6 ETH (user1 is only home locker)
      const ethGain = ethAfter - ethBefore + gasUsed;
      expect(ethGain).to.equal(ethers.parseEther("6"));

      // Verify lock is marked claimed
      const lock = await fanWars.getUserLock(MATCH_ID, user1.address);
      expect(lock.claimed).to.equal(true);
      expect(lock.boostReward).to.equal(ethers.parseEther("6"));
    });

    it("should not allow double claiming", async function () {
      await expect(
        fanWars.connect(user1).claimBoost(MATCH_ID)
      ).to.be.revertedWithCustomError(fanWars, "AlreadyClaimed");
    });

    it("should not allow claiming before settlement", async function () {
      // Create a new unsettled match
      const matchId = 6001;
      const deadline = (await time.latest()) + 3600;
      await fanWars.connect(keeper).createMatchWar(
        matchId,
        await homeToken.getAddress(),
        await awayToken.getAddress(),
        deadline
      );

      // Lock tokens
      const fanWarsAddr = await fanWars.getAddress();
      await homeToken.mint(user1.address, ethers.parseEther("50"));
      await homeToken.connect(user1).approve(fanWarsAddr, ethers.parseEther("50"));
      await fanWars.connect(user1).lockTokens(matchId, await homeToken.getAddress(), ethers.parseEther("50"));

      await expect(
        fanWars.connect(user1).claimBoost(matchId)
      ).to.be.revertedWithCustomError(fanWars, "WarNotSettled");
    });
  });

  // =====================================================================
  // Cancellation
  // =====================================================================
  describe("Match Cancellation", function () {
    it("should cancel match and allow token unlock", async function () {
      const matchId = 7001;
      const deadline = (await time.latest()) + 3600;
      const homeAddr = await homeToken.getAddress();
      const awayAddr = await awayToken.getAddress();
      const fanWarsAddr = await fanWars.getAddress();

      await fanWars.connect(keeper).createMatchWar(matchId, homeAddr, awayAddr, deadline);

      // Lock tokens
      await homeToken.mint(user1.address, ethers.parseEther("75"));
      await homeToken.connect(user1).approve(fanWarsAddr, ethers.parseEther("75"));
      await fanWars.connect(user1).lockTokens(matchId, homeAddr, ethers.parseEther("75"));

      const balBefore = await homeToken.balanceOf(user1.address);

      // Cancel
      await fanWars.connect(keeper).cancelMatch(matchId);

      const status = await fanWars.getMatchWarStatus(matchId);
      expect(status.cancelled).to.equal(true);

      // Unlock
      await fanWars.connect(user1).unlockTokens(matchId);

      const balAfter = await homeToken.balanceOf(user1.address);
      expect(balAfter - balBefore).to.equal(ethers.parseEther("75"));
    });

    it("should not allow unlock if match is not cancelled", async function () {
      // MATCH_ID is settled, not cancelled
      await expect(
        fanWars.connect(user3).unlockTokens(MATCH_ID)
      ).to.be.revertedWithCustomError(fanWars, "WarNotCancelled");
    });
  });

  // =====================================================================
  // Boost Pool Funding
  // =====================================================================
  describe("Boost Pool Funding", function () {
    it("should fund boost pool from external source", async function () {
      const poolBefore = await fanWars.boostPoolBalance();

      await expect(
        fanWars.fundBoostPool({ value: ethers.parseEther("5") })
      )
        .to.emit(fanWars, "BoostPoolFunded")
        .withArgs(ethers.parseEther("5"), poolBefore + ethers.parseEther("5"));

      const poolAfter = await fanWars.boostPoolBalance();
      expect(poolAfter).to.equal(poolBefore + ethers.parseEther("5"));
    });

    it("should reject zero funding", async function () {
      await expect(
        fanWars.fundBoostPool({ value: 0 })
      ).to.be.revertedWithCustomError(fanWars, "ZeroAmount");
    });

    it("should accept ETH via receive fallback", async function () {
      const poolBefore = await fanWars.boostPoolBalance();
      const fanWarsAddr = await fanWars.getAddress();

      await deployer.sendTransaction({ to: fanWarsAddr, value: ethers.parseEther("2") });

      const poolAfter = await fanWars.boostPoolBalance();
      expect(poolAfter).to.equal(poolBefore + ethers.parseEther("2"));
    });
  });

  // =====================================================================
  // Claim Window Expiry
  // =====================================================================
  describe("24-Hour Claim Window", function () {
    it("should reject claims after 24-hour window", async function () {
      // user3 locked away tokens on MATCH_ID and hasn't claimed yet
      // MATCH_ID is settled. Let's time travel 25 hours.
      await time.increase(25 * 60 * 60); // 25 hours

      await expect(
        fanWars.connect(user3).claimBoost(MATCH_ID)
      ).to.be.revertedWithCustomError(fanWars, "ClaimWindowExpired");
    });
  });

  // =====================================================================
  // View Functions
  // =====================================================================
  describe("View Functions", function () {
    it("should return match war status correctly", async function () {
      const status = await fanWars.getMatchWarStatus(MATCH_ID);
      expect(status.homeTeamToken).to.equal(await homeToken.getAddress());
      expect(status.awayTeamToken).to.equal(await awayToken.getAddress());
      expect(status.settled).to.equal(true);
    });

    it("should return user lock info correctly", async function () {
      const lock = await fanWars.getUserLock(MATCH_ID, user1.address);
      expect(lock.teamToken).to.equal(await homeToken.getAddress());
      expect(lock.amount).to.equal(LOCK_AMOUNT);
      expect(lock.claimed).to.equal(true);
    });

    it("should return estimated boost for unsettled match", async function () {
      // Create a match with locks and check estimated boost
      const matchId = 8001;
      const deadline = (await time.latest()) + 3600;
      const homeAddr = await homeToken.getAddress();
      const awayAddr = await awayToken.getAddress();
      const fanWarsAddr = await fanWars.getAddress();

      await fanWars.connect(keeper).createMatchWar(matchId, homeAddr, awayAddr, deadline);

      await homeToken.mint(user1.address, ethers.parseEther("100"));
      await homeToken.connect(user1).approve(fanWarsAddr, ethers.parseEther("100"));
      await fanWars.connect(user1).lockTokens(matchId, homeAddr, ethers.parseEther("100"));

      await awayToken.mint(user2.address, ethers.parseEther("100"));
      await awayToken.connect(user2).approve(fanWarsAddr, ethers.parseEther("100"));
      await fanWars.connect(user2).lockTokens(matchId, awayAddr, ethers.parseEther("100"));

      // Estimate: if home wins with NORMAL margin
      const estimated = await fanWars.getEstimatedBoost(
        matchId, user1.address, homeAddr, 1
      );
      // user1 is on winning side, so gets 60% of the full boost pool
      expect(estimated).to.be.greaterThan(0);
    });
  });
});
