const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("PredictionPool", function () {
  let deployer, treasury, keeper, user1, user2, user3, user4;
  let predictionPool;

  const MATCH_ID = 1001;
  const ENTRY_FEE = ethers.parseEther("0.1"); // 0.1 WIRE
  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;
  const TWO_DAYS = 172800;

  // 5 pre-match questions, each worth different points
  const PRE_MATCH_QUESTIONS = [
    { text: "Who will win the toss?", options: 2, points: 10, isLive: false },
    { text: "Will total score exceed 180?", options: 2, points: 15, isLive: false },
    { text: "Top scorer team?", options: 2, points: 20, isLive: false },
    { text: "Most wickets taken by?", options: 4, points: 25, isLive: false },
    { text: "Man of the match from which team?", options: 2, points: 30, isLive: false },
  ];

  async function deployFixture() {
    [deployer, treasury, keeper, user1, user2, user3, user4] = await ethers.getSigners();

    const PredictionPool = await ethers.getContractFactory("PredictionPool");
    predictionPool = await PredictionPool.deploy(treasury.address);
    await predictionPool.waitForDeployment();

    // Set keeper
    await predictionPool.setKeeper(keeper.address);

    return { predictionPool, deployer, treasury, keeper, user1, user2, user3, user4 };
  }

  async function createPoolWithQuestions(matchId, addLiveQ) {
    const deadline = (await time.latest()) + ONE_DAY;
    const liveDeadline = deadline + ONE_HOUR * 2; // live questions have later deadline

    await predictionPool.connect(keeper).createMatchPool(matchId, ENTRY_FEE, deadline);

    for (const q of PRE_MATCH_QUESTIONS) {
      await predictionPool.connect(keeper).addQuestion(
        matchId, q.text, q.options, q.points, q.isLive, deadline
      );
    }

    if (addLiveQ) {
      await predictionPool.connect(keeper).addQuestion(
        matchId,
        "Will next over be a maiden?",
        2,   // options
        20,  // points
        true, // isLive
        liveDeadline
      );
    }

    return { deadline, liveDeadline };
  }

  beforeEach(async function () {
    await deployFixture();
  });

  // =====================================================================
  // 1. Create pool + add 5 questions
  // =====================================================================
  it("1. should create pool and add 5 pre-match questions", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    const info = await predictionPool.getPoolInfo(MATCH_ID);
    expect(info.entryFee).to.equal(ENTRY_FEE);
    expect(info.questionCount).to.equal(5);
    expect(info.liveQuestionCount).to.equal(0);
    expect(info.settled).to.be.false;
    expect(info.cancelled).to.be.false;

    // Verify each question
    for (let i = 0; i < PRE_MATCH_QUESTIONS.length; i++) {
      const q = await predictionPool.getQuestion(MATCH_ID, i);
      expect(q.optionCount).to.equal(PRE_MATCH_QUESTIONS[i].options);
      expect(q.points).to.equal(PRE_MATCH_QUESTIONS[i].points);
      expect(q.isLive).to.be.false;
    }
  });

  // =====================================================================
  // 2. User enters with correct fee + answers
  // =====================================================================
  it("2. should allow user to enter with correct fee and answers", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    // Answers: option 1 for all 5 pre-match questions
    const answers = [1, 1, 1, 1, 1];
    await predictionPool.connect(user1).enterPrediction(MATCH_ID, answers, { value: ENTRY_FEE });

    const info = await predictionPool.getPoolInfo(MATCH_ID);
    expect(info.totalPool).to.equal(ENTRY_FEE);
    expect(info.participantCount).to.equal(1);

    const userScore = await predictionPool.getUserScore(MATCH_ID, user1.address);
    expect(userScore.entered).to.be.true;

    // Verify stored answers
    for (let i = 0; i < answers.length; i++) {
      const storedAnswer = await predictionPool.getUserAnswer(MATCH_ID, user1.address, i);
      expect(storedAnswer).to.equal(answers[i]);
    }
  });

  // =====================================================================
  // 3. Reject entry with wrong fee
  // =====================================================================
  it("3. should reject entry with wrong fee", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    const wrongFee = ethers.parseEther("0.05");
    await expect(
      predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: wrongFee })
    ).to.be.revertedWithCustomError(predictionPool, "WrongFee");

    // Also reject zero fee
    await expect(
      predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: 0 })
    ).to.be.revertedWithCustomError(predictionPool, "WrongFee");
  });

  // =====================================================================
  // 4. Reject entry after deadline
  // =====================================================================
  it("4. should reject entry after deadline", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    // Advance past deadline
    await time.increase(ONE_DAY + 1);

    await expect(
      predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE })
    ).to.be.revertedWithCustomError(predictionPool, "DeadlinePassed");
  });

  // =====================================================================
  // 5. Reject double entry
  // =====================================================================
  it("5. should reject double entry", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });

    await expect(
      predictionPool.connect(user1).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE })
    ).to.be.revertedWithCustomError(predictionPool, "AlreadyEntered");
  });

  // =====================================================================
  // 6. Add live question during match
  // =====================================================================
  it("6. should add live question during match", async function () {
    const { liveDeadline } = await createPoolWithQuestions(MATCH_ID, true);

    const info = await predictionPool.getPoolInfo(MATCH_ID);
    expect(info.questionCount).to.equal(6); // 5 pre-match + 1 live
    expect(info.liveQuestionCount).to.equal(1);

    const liveQ = await predictionPool.getQuestion(MATCH_ID, 5); // index 5
    expect(liveQ.isLive).to.be.true;
    expect(liveQ.optionCount).to.equal(2);
    expect(liveQ.points).to.equal(20);
  });

  // =====================================================================
  // 7. Submit live answer before deadline
  // =====================================================================
  it("7. should allow submitting live answer before deadline", async function () {
    await createPoolWithQuestions(MATCH_ID, true);

    // User enters with pre-match answers (5 questions)
    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });

    // Submit live answer for question index 5
    await predictionPool.connect(user1).submitLiveAnswer(MATCH_ID, 5, 2);

    const storedAnswer = await predictionPool.getUserAnswer(MATCH_ID, user1.address, 5);
    expect(storedAnswer).to.equal(2);
  });

  // =====================================================================
  // 8. Reject live answer after deadline
  // =====================================================================
  it("8. should reject live answer after question deadline", async function () {
    const { liveDeadline } = await createPoolWithQuestions(MATCH_ID, true);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });

    // Advance past live question deadline
    await time.increase(ONE_DAY + ONE_HOUR * 3);

    await expect(
      predictionPool.connect(user1).submitLiveAnswer(MATCH_ID, 5, 1)
    ).to.be.revertedWithCustomError(predictionPool, "QuestionDeadlinePassed");
  });

  // =====================================================================
  // 9. Settle match — verify scores calculated correctly
  // =====================================================================
  it("9. should settle match and calculate scores correctly", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    // User1: answers [1, 2, 1, 3, 2] — will get some right
    // User2: answers [2, 1, 2, 4, 1] — will get some right
    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 2, 1, 3, 2], { value: ENTRY_FEE });
    await predictionPool.connect(user2).enterPrediction(MATCH_ID, [2, 1, 2, 4, 1], { value: ENTRY_FEE });

    // Correct answers: [1, 2, 2, 3, 1]
    // User1 correct: Q0(10pts), Q1(15pts) = 25 points
    // User2 correct: Q2(20pts), Q3... no, Q3 correct=3 user2=4. Q4 correct=1 user2=1 = 20+30=50... wait
    // Let me recalculate:
    // User1: [1,2,1,3,2] vs correct [1,2,2,3,1] -> Q0 correct(10), Q1 correct(15), Q2 wrong, Q3 correct(25), Q4 wrong = 50
    // User2: [2,1,2,4,1] vs correct [1,2,2,3,1] -> Q0 wrong, Q1 wrong, Q2 correct(20), Q3 wrong, Q4 correct(30) = 50
    const correctAnswers = [1, 2, 2, 3, 1];
    await predictionPool.connect(keeper).settleMatch(MATCH_ID, correctAnswers);

    const u1 = await predictionPool.getUserScore(MATCH_ID, user1.address);
    const u2 = await predictionPool.getUserScore(MATCH_ID, user2.address);

    // User1: Q0(10) + Q1(15) + Q3(25) = 50
    expect(u1.totalScore).to.equal(50);
    // User2: Q2(20) + Q4(30) = 50
    expect(u2.totalScore).to.equal(50);

    const info = await predictionPool.getPoolInfo(MATCH_ID);
    expect(info.settled).to.be.true;
    expect(info.totalScoreSum).to.equal(100); // 50 + 50
  });

  // =====================================================================
  // 10. Verify payout math: platform=10%, safety floor equal, accuracy weighted
  // =====================================================================
  it("10. should split pool correctly: 10% platform, 30% safety floor, 60% accuracy", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    // 3 users enter -> total pool = 0.3 ETH
    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });
    await predictionPool.connect(user2).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });
    await predictionPool.connect(user3).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE });

    const treasuryBefore = await ethers.provider.getBalance(treasury.address);

    // Correct answers: all 1s
    // User1: all correct = 10+15+20+25+30 = 100 points
    // User2: all correct = 100 points
    // User3: all wrong = 0 points
    const correctAnswers = [1, 1, 1, 1, 1];
    await predictionPool.connect(keeper).settleMatch(MATCH_ID, correctAnswers);

    const treasuryAfter = await ethers.provider.getBalance(treasury.address);
    const treasuryReceived = treasuryAfter - treasuryBefore;

    const totalPool = ENTRY_FEE * 3n;
    const expectedPlatform = totalPool / 10n; // 10%
    expect(treasuryReceived).to.equal(expectedPlatform);

    const info = await predictionPool.getPoolInfo(MATCH_ID);
    expect(info.platformShare).to.equal(expectedPlatform);

    // Safety floor = 30% of 0.3 ETH = 0.09 ETH, split 3 ways = 0.03 ETH each
    const expectedSafetyFloor = (totalPool * 3000n) / 10000n;
    expect(info.safetyFloorPool).to.equal(expectedSafetyFloor);

    // Accuracy bonus = 60% of 0.3 ETH = 0.18 ETH
    const expectedAccuracy = totalPool - expectedPlatform - expectedSafetyFloor;
    expect(info.accuracyBonusPool).to.equal(expectedAccuracy);
  });

  // =====================================================================
  // 11. Top scorer gets most, worst scorer still gets safety floor (NOT zero)
  // =====================================================================
  it("11. should give top scorer most and worst scorer still gets safety floor (not zero)", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    // User1: will get all correct (100 pts)
    // User2: will get some correct (50 pts)
    // User3: will get none correct (0 pts)
    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });
    await predictionPool.connect(user2).enterPrediction(MATCH_ID, [1, 2, 1, 2, 1], { value: ENTRY_FEE });
    await predictionPool.connect(user3).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE });

    // Correct: [1, 1, 1, 1, 1]
    // User1: all correct = 100 pts
    // User2: Q0(10) + Q2(20) + Q4(30) = 60 pts
    // User3: 0 pts
    await predictionPool.connect(keeper).settleMatch(MATCH_ID, [1, 1, 1, 1, 1]);

    const u1 = await predictionPool.getUserScore(MATCH_ID, user1.address);
    const u2 = await predictionPool.getUserScore(MATCH_ID, user2.address);
    const u3 = await predictionPool.getUserScore(MATCH_ID, user3.address);

    expect(u1.totalScore).to.equal(100);
    expect(u2.totalScore).to.equal(60);
    expect(u3.totalScore).to.equal(0);

    // CRITICAL: user3 payout must be > 0 (safety floor)
    expect(u3.payout).to.be.greaterThan(0);

    // Top scorer gets most
    expect(u1.payout).to.be.greaterThan(u2.payout);
    expect(u2.payout).to.be.greaterThan(u3.payout);

    // Verify user3 gets exactly the safety floor share
    const totalPool = ENTRY_FEE * 3n;
    const safetyFloor = (totalPool * 3000n) / 10000n;
    const safetyPerUser = safetyFloor / 3n;
    expect(u3.payout).to.equal(safetyPerUser); // user3 gets only safety floor, no accuracy bonus
  });

  // =====================================================================
  // 12. Claim reward — verify WIRE transfer
  // =====================================================================
  it("12. should transfer correct WIRE amount on claim", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });
    await predictionPool.connect(user2).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE });

    await predictionPool.connect(keeper).settleMatch(MATCH_ID, [1, 1, 1, 1, 1]);

    const u1Score = await predictionPool.getUserScore(MATCH_ID, user1.address);
    const expectedPayout = u1Score.payout;
    expect(expectedPayout).to.be.greaterThan(0);

    const balanceBefore = await ethers.provider.getBalance(user1.address);
    const tx = await predictionPool.connect(user1).claimReward(MATCH_ID);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const balanceAfter = await ethers.provider.getBalance(user1.address);

    const received = balanceAfter - balanceBefore + gasUsed;
    expect(received).to.equal(expectedPayout);
  });

  // =====================================================================
  // 13. Reject double claim
  // =====================================================================
  it("13. should reject double claim", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });
    await predictionPool.connect(user2).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE });

    await predictionPool.connect(keeper).settleMatch(MATCH_ID, [1, 1, 1, 1, 1]);

    await predictionPool.connect(user1).claimReward(MATCH_ID);

    await expect(
      predictionPool.connect(user1).claimReward(MATCH_ID)
    ).to.be.revertedWithCustomError(predictionPool, "AlreadyClaimed");
  });

  // =====================================================================
  // 14. Reject claim before settlement
  // =====================================================================
  it("14. should reject claim before settlement", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });

    await expect(
      predictionPool.connect(user1).claimReward(MATCH_ID)
    ).to.be.revertedWithCustomError(predictionPool, "PoolNotSettled");
  });

  // =====================================================================
  // 15. Cancel pool — verify full refunds
  // =====================================================================
  it("15. should cancel pool and refund all participants", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });
    await predictionPool.connect(user2).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE });

    const u1Before = await ethers.provider.getBalance(user1.address);
    const u2Before = await ethers.provider.getBalance(user2.address);

    await predictionPool.connect(keeper).cancelPool(MATCH_ID);

    const u1After = await ethers.provider.getBalance(user1.address);
    const u2After = await ethers.provider.getBalance(user2.address);

    // Both users should receive their entry fee back
    expect(u1After - u1Before).to.equal(ENTRY_FEE);
    expect(u2After - u2Before).to.equal(ENTRY_FEE);

    const info = await predictionPool.getPoolInfo(MATCH_ID);
    expect(info.cancelled).to.be.true;
  });

  // =====================================================================
  // 16. Edge case: all users score 0 — accuracy pool splits equally
  // =====================================================================
  it("16. should split accuracy pool equally when all users score 0", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    // All users answer 2 for everything
    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE });
    await predictionPool.connect(user2).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE });
    await predictionPool.connect(user3).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE });

    // Correct answers: all 1s — everyone scores 0
    await predictionPool.connect(keeper).settleMatch(MATCH_ID, [1, 1, 1, 1, 1]);

    const u1 = await predictionPool.getUserScore(MATCH_ID, user1.address);
    const u2 = await predictionPool.getUserScore(MATCH_ID, user2.address);
    const u3 = await predictionPool.getUserScore(MATCH_ID, user3.address);

    expect(u1.totalScore).to.equal(0);
    expect(u2.totalScore).to.equal(0);
    expect(u3.totalScore).to.equal(0);

    const info = await predictionPool.getPoolInfo(MATCH_ID);
    expect(info.totalScoreSum).to.equal(0);

    // All payouts should be equal: (safety floor + accuracy bonus) / 3
    // = (30% + 60%) / 3 = 90% / 3 = 30% of total pool each
    expect(u1.payout).to.equal(u2.payout);
    expect(u2.payout).to.equal(u3.payout);
    expect(u1.payout).to.be.greaterThan(0);

    const totalPool = ENTRY_FEE * 3n;
    const expectedPerUser = (totalPool * 9n) / 30n; // 90%/3 = 30% each
    // Allow for integer division rounding
    const diff = u1.payout > expectedPerUser
      ? u1.payout - expectedPerUser
      : expectedPerUser - u1.payout;
    expect(diff).to.be.lessThanOrEqual(2); // at most 2 wei rounding
  });

  // =====================================================================
  // 17. Edge case: single participant — gets 90% back
  // =====================================================================
  it("17. should give single participant 90% back (10% to platform)", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });

    await predictionPool.connect(keeper).settleMatch(MATCH_ID, [1, 1, 1, 1, 1]);

    const u1 = await predictionPool.getUserScore(MATCH_ID, user1.address);

    // Single participant gets safety floor + all accuracy bonus = 90%
    const expectedPayout = (ENTRY_FEE * 9000n) / 10000n; // 90%
    expect(u1.payout).to.equal(expectedPayout);
  });

  // =====================================================================
  // 18. Reject entry with wrong answer count
  // =====================================================================
  it("18. should reject entry with wrong number of answers", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    // Too few answers
    await expect(
      predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1], { value: ENTRY_FEE })
    ).to.be.revertedWithCustomError(predictionPool, "InvalidAnswerCount");

    // Too many answers
    await expect(
      predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1, 1, 1], { value: ENTRY_FEE })
    ).to.be.revertedWithCustomError(predictionPool, "InvalidAnswerCount");
  });

  // =====================================================================
  // 19. Reject invalid answer option (0 or > optionCount)
  // =====================================================================
  it("19. should reject invalid answer option values", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    // Answer 0 is invalid (1-based)
    await expect(
      predictionPool.connect(user1).enterPrediction(MATCH_ID, [0, 1, 1, 1, 1], { value: ENTRY_FEE })
    ).to.be.revertedWithCustomError(predictionPool, "InvalidAnswer");

    // Answer 3 is invalid for a 2-option question (Q0 has 2 options)
    await expect(
      predictionPool.connect(user1).enterPrediction(MATCH_ID, [3, 1, 1, 1, 1], { value: ENTRY_FEE })
    ).to.be.revertedWithCustomError(predictionPool, "InvalidAnswer");
  });

  // =====================================================================
  // 20. Non-keeper cannot create pool or settle
  // =====================================================================
  it("20. should reject non-keeper from creating pool or settling", async function () {
    await expect(
      predictionPool.connect(user1).createMatchPool(999, ENTRY_FEE, (await time.latest()) + ONE_DAY)
    ).to.be.revertedWithCustomError(predictionPool, "NotKeeper");

    await createPoolWithQuestions(MATCH_ID, false);

    await expect(
      predictionPool.connect(user1).settleMatch(MATCH_ID, [1, 1, 1, 1, 1])
    ).to.be.revertedWithCustomError(predictionPool, "NotKeeper");
  });

  // =====================================================================
  // 21. Claim window expires after 48 hours
  // =====================================================================
  it("21. should reject claim after 48-hour window", async function () {
    await createPoolWithQuestions(MATCH_ID, false);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });
    await predictionPool.connect(user2).enterPrediction(MATCH_ID, [2, 2, 2, 2, 2], { value: ENTRY_FEE });

    await predictionPool.connect(keeper).settleMatch(MATCH_ID, [1, 1, 1, 1, 1]);

    // Advance past claim window
    await time.increase(TWO_DAYS + 1);

    await expect(
      predictionPool.connect(user1).claimReward(MATCH_ID)
    ).to.be.revertedWithCustomError(predictionPool, "ClaimWindowExpired");
  });

  // =====================================================================
  // 22. Live question: reject duplicate answer submission
  // =====================================================================
  it("22. should reject duplicate live answer submission", async function () {
    await createPoolWithQuestions(MATCH_ID, true);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });

    await predictionPool.connect(user1).submitLiveAnswer(MATCH_ID, 5, 1);

    await expect(
      predictionPool.connect(user1).submitLiveAnswer(MATCH_ID, 5, 2)
    ).to.be.revertedWithCustomError(predictionPool, "QuestionAlreadyAnswered");
  });

  // =====================================================================
  // 23. Live answer for non-live question should fail
  // =====================================================================
  it("23. should reject live answer for non-live question", async function () {
    await createPoolWithQuestions(MATCH_ID, true);

    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });

    // Question index 0 is pre-match, not live
    await expect(
      predictionPool.connect(user1).submitLiveAnswer(MATCH_ID, 0, 1)
    ).to.be.revertedWithCustomError(predictionPool, "QuestionNotLive");
  });

  // =====================================================================
  // 24. Settled pool with live questions — scores include live answers
  // =====================================================================
  it("24. should include live question answers in score calculation", async function () {
    await createPoolWithQuestions(MATCH_ID, true);

    // User1 enters and answers live question correctly
    await predictionPool.connect(user1).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });
    await predictionPool.connect(user1).submitLiveAnswer(MATCH_ID, 5, 2);

    // User2 enters but does NOT answer live question
    await predictionPool.connect(user2).enterPrediction(MATCH_ID, [1, 1, 1, 1, 1], { value: ENTRY_FEE });

    // Correct answers: all 1s for pre-match, 2 for live
    // Both get all pre-match correct (100 pts), but user1 also gets live correct (20 pts)
    await predictionPool.connect(keeper).settleMatch(MATCH_ID, [1, 1, 1, 1, 1, 2]);

    const u1 = await predictionPool.getUserScore(MATCH_ID, user1.address);
    const u2 = await predictionPool.getUserScore(MATCH_ID, user2.address);

    expect(u1.totalScore).to.equal(120); // 100 + 20 (live)
    expect(u2.totalScore).to.equal(100); // pre-match only
    expect(u1.payout).to.be.greaterThan(u2.payout);
  });
});
