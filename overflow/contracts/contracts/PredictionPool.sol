// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PredictionPool
 * @notice Per-match prediction pool system for the Overflow PSL platform.
 * @dev
 *   Users pay a WIRE entry fee to answer cricket questions for a specific match.
 *   After the match, the keeper settles with correct answers and the pool is split:
 *
 *     10% -> Platform treasury
 *     40% -> Safety floor (equal split to ALL participants — nobody gets zero)
 *     50% -> Accuracy bonus (weighted by individual score / total scores)
 *
 *   If every participant scores 0, the accuracy bonus pool is also split equally.
 *   Claims expire after 48 hours; unclaimed funds go to treasury.
 *
 *   Questions can be pre-match (answered at entry) or live (answered during match).
 */
contract PredictionPool is Ownable, ReentrancyGuard {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    uint256 public constant PLATFORM_BPS = 1000;        // 10%
    uint256 public constant SAFETY_FLOOR_BPS = 3000;    // 30%
    uint256 public constant ACCURACY_BPS = 6000;        // 60%
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant CLAIM_WINDOW = 48 hours;
    uint256 public constant MAX_PARTICIPANTS = 200;

    // -----------------------------------------------------------------------
    // Structs
    // -----------------------------------------------------------------------
    struct MatchPool {
        uint256 entryFee;
        uint256 totalPool;
        uint256 participantCount;
        uint256 questionCount;
        uint256 liveQuestionCount;
        bool settled;
        bool cancelled;
        uint256 platformShare;
        uint256 safetyFloorPool;
        uint256 accuracyBonusPool;
        uint256 totalScoreSum;
        uint256 deadline;
        uint256 settledAt;
        uint256 claimDeadline;
    }

    struct Question {
        string questionText;
        uint8 optionCount;
        uint8 correctOption;
        uint16 points;
        uint256 deadline;
        bool isLive;
        bool resolved;
    }

    struct UserPrediction {
        bool entered;
        uint256 totalScore;
        uint256 payout;
        bool claimed;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    mapping(uint256 => MatchPool) public matchPools;
    mapping(uint256 => Question[]) internal _questions;
    mapping(uint256 => mapping(address => UserPrediction)) public predictions;
    mapping(uint256 => mapping(address => mapping(uint256 => uint8))) internal _answers;
    mapping(uint256 => address[]) internal _participants;
    mapping(uint256 => uint256) public poolUnclaimedBalance; // M1: track claimable balance per pool

    address public treasury;
    address public keeper;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    event PoolCreated(uint256 indexed matchId, uint256 entryFee, uint256 deadline);
    event QuestionAdded(uint256 indexed matchId, uint256 questionIndex, bool isLive);
    event PredictionSubmitted(uint256 indexed matchId, address indexed user);
    event LiveAnswerSubmitted(uint256 indexed matchId, address indexed user, uint256 questionIndex);
    event MatchSettled(uint256 indexed matchId, uint256 totalPool, uint256 participantCount);
    event RewardClaimed(uint256 indexed matchId, address indexed user, uint256 amount);
    event PoolCancelled(uint256 indexed matchId, uint256 refundPerUser);
    event RefundClaimed(uint256 indexed matchId, address indexed user, uint256 amount);
    event ExpiredRewardsReleased(uint256 indexed matchId, uint256 amount);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------
    error NotKeeper();
    error PoolAlreadyExists();
    error PoolDoesNotExist();
    error PoolAlreadySettled();
    error PoolNotSettled();
    error PoolCancelledError();
    error PoolNotCancelled();
    error InvalidEntryFee();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error AlreadyEntered();
    error NotEntered();
    error AlreadyClaimed();
    error ClaimWindowExpired();
    error WrongFee();
    error InvalidOptionCount();
    error InvalidAnswerCount();
    error InvalidAnswer();
    error QuestionNotLive();
    error QuestionDeadlinePassed();
    error QuestionAlreadyAnswered();
    error InvalidCorrectAnswers();
    error TransferFailed();
    error ZeroAddress();
    error NoParticipants();
    error NoRefundAvailable();
    error AlreadyRefunded();
    error PoolFull();
    error ClaimWindowStillActive();
    error AlreadyReleased();

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------
    modifier onlyKeeper() {
        if (msg.sender != keeper && msg.sender != owner()) revert NotKeeper();
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------
    constructor(address _treasury) Ownable(msg.sender) {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        keeper = msg.sender;
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------
    function setKeeper(address _keeper) external onlyOwner {
        if (_keeper == address(0)) revert ZeroAddress();
        keeper = _keeper;
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    // -----------------------------------------------------------------------
    // Core: Create Match Pool
    // -----------------------------------------------------------------------
    /**
     * @notice Create a new prediction pool for a match.
     * @param matchId Unique match identifier (from CricAPI or backend).
     * @param entryFee WIRE entry fee in wei.
     * @param deadline Timestamp after which no new entries are accepted.
     */
    function createMatchPool(
        uint256 matchId,
        uint256 entryFee,
        uint256 deadline
    ) external onlyKeeper {
        if (matchPools[matchId].entryFee != 0) revert PoolAlreadyExists();
        if (entryFee == 0) revert InvalidEntryFee();

        MatchPool storage pool = matchPools[matchId];
        pool.entryFee = entryFee;
        pool.deadline = deadline;

        emit PoolCreated(matchId, entryFee, deadline);
    }

    // -----------------------------------------------------------------------
    // Core: Add Question
    // -----------------------------------------------------------------------
    /**
     * @notice Add a question to a match pool.
     * @param matchId The match pool.
     * @param questionText The question text.
     * @param optionCount Number of answer options (2-10).
     * @param points Points awarded for a correct answer.
     * @param isLive Whether this is a live question (answered during match).
     * @param questionDeadline Deadline for answering this question (relevant for live questions).
     */
    function addQuestion(
        uint256 matchId,
        string calldata questionText,
        uint8 optionCount,
        uint16 points,
        bool isLive,
        uint256 questionDeadline
    ) external onlyKeeper {
        MatchPool storage pool = matchPools[matchId];
        if (pool.entryFee == 0) revert PoolDoesNotExist();
        if (pool.settled) revert PoolAlreadySettled();
        if (pool.cancelled) revert PoolCancelledError();
        if (optionCount < 2) revert InvalidOptionCount();

        Question memory q;
        q.questionText = questionText;
        q.optionCount = optionCount;
        q.points = points;
        q.isLive = isLive;
        q.deadline = questionDeadline;

        _questions[matchId].push(q);

        uint256 questionIndex = _questions[matchId].length - 1;
        pool.questionCount++;
        if (isLive) {
            pool.liveQuestionCount++;
        }

        emit QuestionAdded(matchId, questionIndex, isLive);
    }

    // -----------------------------------------------------------------------
    // Core: Enter Prediction (pre-match questions)
    // -----------------------------------------------------------------------
    /**
     * @notice Enter a match prediction pool by paying the entry fee and submitting
     *         answers for all pre-match (non-live) questions.
     * @param matchId The match pool.
     * @param answers Array of answers for pre-match questions only, in order.
     */
    function enterPrediction(
        uint256 matchId,
        uint8[] calldata answers
    ) external payable nonReentrant {
        MatchPool storage pool = matchPools[matchId];
        if (pool.entryFee == 0) revert PoolDoesNotExist();
        if (pool.settled) revert PoolAlreadySettled();
        if (pool.cancelled) revert PoolCancelledError();
        if (block.timestamp >= pool.deadline) revert DeadlinePassed();
        if (msg.value != pool.entryFee) revert WrongFee();

        // C2 fix: bound participants to prevent unbounded gas in settleMatch
        if (_participants[matchId].length >= MAX_PARTICIPANTS) revert PoolFull();

        UserPrediction storage pred = predictions[matchId][msg.sender];
        if (pred.entered) revert AlreadyEntered();

        // Count pre-match questions
        uint256 preMatchCount = pool.questionCount - pool.liveQuestionCount;
        if (answers.length != preMatchCount) revert InvalidAnswerCount();

        // Validate and store answers for pre-match questions
        uint256 answerIdx = 0;
        Question[] storage qs = _questions[matchId];
        for (uint256 i = 0; i < qs.length; i++) {
            if (!qs[i].isLive) {
                if (answers[answerIdx] == 0 || answers[answerIdx] > qs[i].optionCount) {
                    revert InvalidAnswer();
                }
                _answers[matchId][msg.sender][i] = answers[answerIdx];
                answerIdx++;
            }
        }

        pred.entered = true;
        pool.totalPool += msg.value;
        pool.participantCount++;
        _participants[matchId].push(msg.sender);

        emit PredictionSubmitted(matchId, msg.sender);
    }

    // -----------------------------------------------------------------------
    // Core: Submit Live Answer
    // -----------------------------------------------------------------------
    /**
     * @notice Submit an answer for a live question during the match. No extra fee.
     * @param matchId The match pool.
     * @param questionIndex Index of the live question.
     * @param answer The chosen option (1-based).
     */
    function submitLiveAnswer(
        uint256 matchId,
        uint256 questionIndex,
        uint8 answer
    ) external {
        MatchPool storage pool = matchPools[matchId];
        if (pool.entryFee == 0) revert PoolDoesNotExist();
        if (pool.settled) revert PoolAlreadySettled();
        if (pool.cancelled) revert PoolCancelledError();

        UserPrediction storage pred = predictions[matchId][msg.sender];
        if (!pred.entered) revert NotEntered();

        Question[] storage qs = _questions[matchId];
        require(questionIndex < qs.length, "Invalid question index");

        Question storage q = qs[questionIndex];
        if (!q.isLive) revert QuestionNotLive();
        if (block.timestamp >= q.deadline) revert QuestionDeadlinePassed();
        if (answer == 0 || answer > q.optionCount) revert InvalidAnswer();
        if (_answers[matchId][msg.sender][questionIndex] != 0) revert QuestionAlreadyAnswered();

        _answers[matchId][msg.sender][questionIndex] = answer;

        emit LiveAnswerSubmitted(matchId, msg.sender, questionIndex);
    }

    // -----------------------------------------------------------------------
    // Core: Settle Match
    // -----------------------------------------------------------------------
    /**
     * @notice Settle a match pool with the correct answers. Calculates scores,
     *         splits the pool, and sets payouts.
     * @param matchId The match pool.
     * @param correctAnswers Array of correct options for ALL questions, in order.
     */
    function settleMatch(
        uint256 matchId,
        uint8[] calldata correctAnswers
    ) external onlyKeeper nonReentrant {
        MatchPool storage pool = matchPools[matchId];
        if (pool.entryFee == 0) revert PoolDoesNotExist();
        if (pool.settled) revert PoolAlreadySettled();
        if (pool.cancelled) revert PoolCancelledError();
        if (pool.participantCount == 0) revert NoParticipants();
        if (correctAnswers.length != pool.questionCount) revert InvalidCorrectAnswers();

        Question[] storage qs = _questions[matchId];

        // Store correct answers and mark questions resolved
        for (uint256 i = 0; i < qs.length; i++) {
            qs[i].correctOption = correctAnswers[i];
            qs[i].resolved = true;
        }

        // Calculate scores for every participant
        uint256 totalScoreSum = 0;
        address[] storage parts = _participants[matchId];

        for (uint256 p = 0; p < parts.length; p++) {
            uint256 score = 0;
            for (uint256 q = 0; q < qs.length; q++) {
                uint8 userAnswer = _answers[matchId][parts[p]][q];
                if (userAnswer == correctAnswers[q]) {
                    score += qs[q].points;
                }
            }
            predictions[matchId][parts[p]].totalScore = score;
            totalScoreSum += score;
        }

        pool.totalScoreSum = totalScoreSum;

        // Split the pool
        uint256 totalPool = pool.totalPool;
        uint256 platformShare = (totalPool * PLATFORM_BPS) / BASIS_POINTS;
        uint256 safetyFloorPool = (totalPool * SAFETY_FLOOR_BPS) / BASIS_POINTS;
        uint256 accuracyBonusPool = totalPool - platformShare - safetyFloorPool;

        pool.platformShare = platformShare;
        pool.safetyFloorPool = safetyFloorPool;
        pool.accuracyBonusPool = accuracyBonusPool;

        // Calculate individual payouts
        uint256 safetyPerUser = safetyFloorPool / pool.participantCount;

        for (uint256 p = 0; p < parts.length; p++) {
            uint256 userScore = predictions[matchId][parts[p]].totalScore;
            uint256 accuracyShare;

            if (totalScoreSum == 0) {
                // Edge case: everyone scored 0 — accuracy pool splits equally too
                accuracyShare = accuracyBonusPool / pool.participantCount;
            } else {
                accuracyShare = (accuracyBonusPool * userScore) / totalScoreSum;
            }

            predictions[matchId][parts[p]].payout = safetyPerUser + accuracyShare;
        }

        // Send platform share to treasury
        pool.settled = true;
        pool.settledAt = block.timestamp;
        pool.claimDeadline = block.timestamp + CLAIM_WINDOW;

        // M1: track claimable balance for this pool (everything minus platform share)
        poolUnclaimedBalance[matchId] = totalPool - platformShare;

        (bool success,) = treasury.call{value: platformShare}("");
        if (!success) revert TransferFailed();

        emit MatchSettled(matchId, totalPool, pool.participantCount);
    }

    // -----------------------------------------------------------------------
    // Core: Cancel Pool
    // -----------------------------------------------------------------------
    /**
     * @notice Cancel a match pool. All participants receive a full refund.
     * @param matchId The match pool to cancel.
     */
    function cancelPool(uint256 matchId) external onlyKeeper nonReentrant {
        MatchPool storage pool = matchPools[matchId];
        if (pool.entryFee == 0) revert PoolDoesNotExist();
        if (pool.settled) revert PoolAlreadySettled();
        if (pool.cancelled) revert PoolCancelledError();

        pool.cancelled = true;

        // C1 fix: pull-based refund — no push loop, users call claimRefund()
        emit PoolCancelled(matchId, pool.entryFee);
    }

    // -----------------------------------------------------------------------
    // Core: Claim Refund (pull-based, for cancelled pools)
    // -----------------------------------------------------------------------
    /**
     * @notice Claim a refund after a pool has been cancelled. Each user withdraws
     *         their own entry fee to prevent a single reverting receive() from
     *         blocking all refunds.
     * @param matchId The cancelled match pool.
     */
    function claimRefund(uint256 matchId) external nonReentrant {
        MatchPool storage pool = matchPools[matchId];
        if (!pool.cancelled) revert PoolNotCancelled();

        UserPrediction storage pred = predictions[matchId][msg.sender];
        if (!pred.entered) revert NotEntered();
        if (pred.claimed) revert AlreadyRefunded();

        pred.claimed = true;
        uint256 refundAmount = pool.entryFee;

        (bool success,) = msg.sender.call{value: refundAmount}("");
        if (!success) revert TransferFailed();

        emit RefundClaimed(matchId, msg.sender, refundAmount);
    }

    // -----------------------------------------------------------------------
    // Core: Claim Reward
    // -----------------------------------------------------------------------
    /**
     * @notice Claim calculated payout after match settlement.
     * @param matchId The settled match pool.
     */
    function claimReward(uint256 matchId) external nonReentrant {
        MatchPool storage pool = matchPools[matchId];
        if (!pool.settled) revert PoolNotSettled();
        if (block.timestamp > pool.claimDeadline) revert ClaimWindowExpired();

        UserPrediction storage pred = predictions[matchId][msg.sender];
        if (!pred.entered) revert NotEntered();
        if (pred.claimed) revert AlreadyClaimed();

        pred.claimed = true;
        uint256 payout = pred.payout;

        if (payout > 0) {
            // M1: decrement per-pool unclaimed balance
            poolUnclaimedBalance[matchId] -= payout;

            (bool success,) = msg.sender.call{value: payout}("");
            if (!success) revert TransferFailed();
        }

        emit RewardClaimed(matchId, msg.sender, payout);
    }

    // -----------------------------------------------------------------------
    // Core: Release Expired Rewards
    // -----------------------------------------------------------------------
    /**
     * @notice Sweep unclaimed rewards from a settled pool after the claim window
     *         has expired. Sends the remaining balance to the treasury.
     * @param matchId The settled match pool whose claim window has passed.
     */
    function releaseExpiredRewards(uint256 matchId) external onlyKeeper nonReentrant {
        MatchPool storage pool = matchPools[matchId];
        if (!pool.settled) revert PoolNotSettled();
        if (block.timestamp <= pool.claimDeadline) revert ClaimWindowStillActive();

        uint256 unclaimed = poolUnclaimedBalance[matchId];
        if (unclaimed == 0) revert AlreadyReleased();

        poolUnclaimedBalance[matchId] = 0;

        (bool success,) = treasury.call{value: unclaimed}("");
        if (!success) revert TransferFailed();

        emit ExpiredRewardsReleased(matchId, unclaimed);
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------
    /**
     * @notice Get full pool info for a match.
     */
    function getPoolInfo(uint256 matchId) external view returns (
        uint256 entryFee,
        uint256 totalPool,
        uint256 participantCount,
        uint256 questionCount,
        uint256 liveQuestionCount,
        bool settled,
        bool cancelled,
        uint256 platformShare,
        uint256 safetyFloorPool,
        uint256 accuracyBonusPool,
        uint256 totalScoreSum,
        uint256 deadline,
        uint256 settledAt,
        uint256 claimDeadline
    ) {
        MatchPool storage pool = matchPools[matchId];
        return (
            pool.entryFee,
            pool.totalPool,
            pool.participantCount,
            pool.questionCount,
            pool.liveQuestionCount,
            pool.settled,
            pool.cancelled,
            pool.platformShare,
            pool.safetyFloorPool,
            pool.accuracyBonusPool,
            pool.totalScoreSum,
            pool.deadline,
            pool.settledAt,
            pool.claimDeadline
        );
    }

    /**
     * @notice Get a specific question for a match.
     */
    function getQuestion(uint256 matchId, uint256 index) external view returns (
        string memory questionText,
        uint8 optionCount,
        uint8 correctOption,
        uint16 points,
        uint256 deadline,
        bool isLive,
        bool resolved
    ) {
        Question storage q = _questions[matchId][index];
        return (
            q.questionText,
            q.optionCount,
            q.correctOption,
            q.points,
            q.deadline,
            q.isLive,
            q.resolved
        );
    }

    /**
     * @notice Get a user's score and payout for a match.
     */
    function getUserScore(uint256 matchId, address user) external view returns (
        uint256 totalScore,
        uint256 payout,
        bool claimed,
        bool entered
    ) {
        UserPrediction storage pred = predictions[matchId][user];
        return (pred.totalScore, pred.payout, pred.claimed, pred.entered);
    }

    /**
     * @notice Estimate payout for a hypothetical score, given the current pool state.
     * @dev Only useful before settlement to see potential payouts.
     */
    function getEstimatedPayout(
        uint256 matchId,
        uint256 hypotheticalScore
    ) external view returns (uint256) {
        MatchPool storage pool = matchPools[matchId];
        if (pool.participantCount == 0) return 0;

        uint256 totalPool = pool.totalPool;
        uint256 safetyFloorPool = (totalPool * SAFETY_FLOOR_BPS) / BASIS_POINTS;
        uint256 platformShare = (totalPool * PLATFORM_BPS) / BASIS_POINTS;
        uint256 accuracyBonusPool = totalPool - platformShare - safetyFloorPool;

        uint256 safetyPerUser = safetyFloorPool / pool.participantCount;

        // If settled, use actual totalScoreSum; otherwise assume this score is the only one
        uint256 scoreSum = pool.settled ? pool.totalScoreSum : hypotheticalScore;
        uint256 accuracyShare;

        if (scoreSum == 0) {
            accuracyShare = accuracyBonusPool / pool.participantCount;
        } else {
            accuracyShare = (accuracyBonusPool * hypotheticalScore) / scoreSum;
        }

        return safetyPerUser + accuracyShare;
    }

    /**
     * @notice Get a user's answer for a specific question.
     */
    function getUserAnswer(
        uint256 matchId,
        address user,
        uint256 questionIndex
    ) external view returns (uint8) {
        return _answers[matchId][user][questionIndex];
    }

    /**
     * @notice Get the total number of questions for a match.
     */
    function getQuestionCount(uint256 matchId) external view returns (uint256) {
        return _questions[matchId].length;
    }

    // Allow contract to receive ETH (for any direct funding)
    receive() external payable {}
}
