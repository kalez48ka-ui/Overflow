// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FanWars
 * @notice Match-based fan engagement system for the Overflow PSL platform.
 * @dev
 *   Fans lock their team tokens before a match starts. After settlement,
 *   a Boost Pool (funded from platform fees) distributes rewards to BOTH
 *   sides proportionally. Winners receive a larger share, losers receive
 *   a smaller share, but NOBODY loses their staked tokens.
 *
 *   Boost distribution by margin type:
 *     CLOSE (0):    Winner 55%, Loser 35%, Rollover 10%
 *     NORMAL (1):   Winner 60%, Loser 30%, Rollover 10%
 *     DOMINANT (2): Winner 65%, Loser 25%, Rollover 10%
 *
 *   10% rollover stays in the boost pool for future matches.
 *
 *   Users have a 24-hour window to claim their locked tokens + boost reward
 *   after settlement.
 */
contract FanWars is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant CLAIM_WINDOW = 24 hours;
    uint256 public constant ROLLOVER_BPS = 1000; // 10% always rolls over
    uint256 public constant EMERGENCY_WINDOW = 7 days; // time after lockDeadline before emergency unlock

    // -----------------------------------------------------------------------
    // Structs
    // -----------------------------------------------------------------------
    struct MatchWar {
        address homeTeamToken;
        address awayTeamToken;
        uint256 totalHomeLocked;
        uint256 totalAwayLocked;
        uint256 boostPool;
        bool settled;
        bool cancelled;
        address winnerToken;
        uint8 marginType;       // 0=CLOSE, 1=NORMAL, 2=DOMINANT
        uint256 homeBoostAmount;
        uint256 awayBoostAmount;
        uint256 lockDeadline;
        uint256 settledAt;
    }

    struct UserLock {
        address teamToken;
        uint256 amount;
        uint256 boostReward;
        bool claimed;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    mapping(uint256 => MatchWar) public matchWars;
    mapping(uint256 => mapping(address => UserLock)) public userLocks;
    uint256 public boostPoolBalance;
    uint256 public totalLockedAllWars;

    mapping(address => bool) public isKeeper;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    event TokensLocked(uint256 indexed matchId, address indexed user, address teamToken, uint256 amount);
    event MatchSettled(uint256 indexed matchId, address winnerToken, uint256 totalBoostDistributed);
    event BoostClaimed(uint256 indexed matchId, address indexed user, uint256 boostAmount, uint256 tokensReturned);
    event BoostPoolFunded(uint256 amount, uint256 newTotal);
    event MatchCancelled(uint256 indexed matchId);
    event MatchWarCreated(uint256 indexed matchId, address homeToken, address awayToken, uint256 lockDeadline);
    event KeeperSet(address indexed keeper, bool status);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------
    error NotKeeper();
    error WarAlreadyExists();
    error WarDoesNotExist();
    error WarAlreadySettled();
    error WarNotSettled();
    error WarNotCancelled();
    error InvalidTeamToken();
    error LockDeadlinePassed();
    error ZeroAmount();
    error AlreadyLocked();
    error NoLockFound();
    error AlreadyClaimed();
    error ClaimWindowExpired();
    error InvalidMarginType();
    error InvalidWinnerToken();
    error InsufficientBoostPool();
    error TransferFailed();
    error WarStillActive();
    error EmergencyWindowNotReached();

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------
    modifier onlyKeeper() {
        if (!isKeeper[msg.sender] && msg.sender != owner()) revert NotKeeper();
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------
    constructor() Ownable(msg.sender) {
        isKeeper[msg.sender] = true;
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------
    function setKeeper(address keeper, bool status) external onlyOwner {
        require(keeper != address(0), "Zero address");
        isKeeper[keeper] = status;
        emit KeeperSet(keeper, status);
    }

    // -----------------------------------------------------------------------
    // Core: Create Match War
    // -----------------------------------------------------------------------
    /**
     * @notice Create a new match war for fan token locking.
     * @param matchId Unique identifier for the match (from CricAPI or backend).
     * @param homeToken Address of the home team's ERC-20 token.
     * @param awayToken Address of the away team's ERC-20 token.
     * @param lockDeadline Timestamp after which no more locks are accepted (match start).
     */
    function createMatchWar(
        uint256 matchId,
        address homeToken,
        address awayToken,
        uint256 lockDeadline
    ) external onlyKeeper {
        if (matchWars[matchId].homeTeamToken != address(0)) revert WarAlreadyExists();
        if (homeToken == address(0) || awayToken == address(0)) revert InvalidTeamToken();
        if (homeToken == awayToken) revert InvalidTeamToken();

        MatchWar storage war = matchWars[matchId];
        war.homeTeamToken = homeToken;
        war.awayTeamToken = awayToken;
        war.lockDeadline = lockDeadline;

        emit MatchWarCreated(matchId, homeToken, awayToken, lockDeadline);
    }

    // -----------------------------------------------------------------------
    // Core: Lock Tokens
    // -----------------------------------------------------------------------
    /**
     * @notice Lock team tokens for a match war. User must approve this contract first.
     * @param matchId The match war to participate in.
     * @param teamToken The team token address to lock (must be home or away).
     * @param amount Number of tokens to lock (in wei).
     */
    function lockTokens(
        uint256 matchId,
        address teamToken,
        uint256 amount
    ) external nonReentrant {
        MatchWar storage war = matchWars[matchId];
        if (war.homeTeamToken == address(0)) revert WarDoesNotExist();
        if (war.settled) revert WarAlreadySettled();
        if (war.cancelled) revert WarAlreadySettled();
        if (block.timestamp >= war.lockDeadline) revert LockDeadlinePassed();
        if (amount == 0) revert ZeroAmount();
        if (teamToken != war.homeTeamToken && teamToken != war.awayTeamToken) revert InvalidTeamToken();

        UserLock storage lock = userLocks[matchId][msg.sender];
        if (lock.amount > 0) revert AlreadyLocked();

        // H1 fix: balance-before/after pattern to handle transfer-tax tokens correctly
        uint256 balBefore = IERC20(teamToken).balanceOf(address(this));
        IERC20(teamToken).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(teamToken).balanceOf(address(this)) - balBefore;

        // Record the lock with the actual received amount, not the pre-tax amount
        lock.teamToken = teamToken;
        lock.amount = received;

        // Update war totals
        if (teamToken == war.homeTeamToken) {
            war.totalHomeLocked += received;
        } else {
            war.totalAwayLocked += received;
        }
        totalLockedAllWars += received;

        emit TokensLocked(matchId, msg.sender, teamToken, received);
    }

    // -----------------------------------------------------------------------
    // Core: Unlock Tokens (cancellation only)
    // -----------------------------------------------------------------------
    /**
     * @notice Unlock tokens if the match war was cancelled. Returns locked tokens to user.
     * @param matchId The cancelled match war.
     */
    function unlockTokens(uint256 matchId) external nonReentrant {
        MatchWar storage war = matchWars[matchId];
        if (!war.cancelled) revert WarNotCancelled();

        UserLock storage lock = userLocks[matchId][msg.sender];
        if (lock.amount == 0) revert NoLockFound();
        if (lock.claimed) revert AlreadyClaimed();

        lock.claimed = true;
        uint256 amount = lock.amount;

        IERC20(lock.teamToken).safeTransfer(msg.sender, amount);

        emit BoostClaimed(matchId, msg.sender, 0, amount);
    }

    // -----------------------------------------------------------------------
    // Core: Settle Match
    // -----------------------------------------------------------------------
    /**
     * @notice Settle a match war and calculate boost distribution.
     * @param matchId The match war to settle.
     * @param winnerToken Address of the winning team's token.
     * @param marginType 0=CLOSE, 1=NORMAL, 2=DOMINANT.
     */
    function settleMatch(
        uint256 matchId,
        address winnerToken,
        uint8 marginType
    ) external onlyKeeper {
        MatchWar storage war = matchWars[matchId];
        if (war.homeTeamToken == address(0)) revert WarDoesNotExist();
        if (war.settled) revert WarAlreadySettled();
        if (war.cancelled) revert WarAlreadySettled();
        if (winnerToken != war.homeTeamToken && winnerToken != war.awayTeamToken) revert InvalidWinnerToken();
        if (marginType > 2) revert InvalidMarginType();

        // Determine boost split based on margin type
        uint256 winnerBps;
        uint256 loserBps;
        if (marginType == 0) {
            // CLOSE: 55% winner, 35% loser, 10% rollover
            winnerBps = 5500;
            loserBps = 3500;
        } else if (marginType == 1) {
            // NORMAL: 60% winner, 30% loser, 10% rollover
            winnerBps = 6000;
            loserBps = 3000;
        } else {
            // DOMINANT: 65% winner, 25% loser, 10% rollover
            winnerBps = 6500;
            loserBps = 2500;
        }

        // Calculate boost amounts from the global pool proportional to this match's participation
        uint256 totalLocked = war.totalHomeLocked + war.totalAwayLocked;
        uint256 matchBoost;
        if (totalLocked > 0 && boostPoolBalance > 0 && totalLockedAllWars > 0) {
            matchBoost = (boostPoolBalance * totalLocked) / totalLockedAllWars;
        }

        if (matchBoost > boostPoolBalance) revert InsufficientBoostPool();

        // Decrement global locked tracker for this settled match
        totalLockedAllWars -= totalLocked;

        uint256 winnerShare = (matchBoost * winnerBps) / BASIS_POINTS;
        uint256 loserShare = (matchBoost * loserBps) / BASIS_POINTS;
        uint256 rollover = matchBoost - winnerShare - loserShare;

        // Determine which side is winner and which is loser
        bool homeWins = (winnerToken == war.homeTeamToken);
        war.homeBoostAmount = homeWins ? winnerShare : loserShare;
        war.awayBoostAmount = homeWins ? loserShare : winnerShare;

        // Update boost pool: deduct distributed, keep rollover
        boostPoolBalance = boostPoolBalance - matchBoost + rollover;

        war.winnerToken = winnerToken;
        war.marginType = marginType;
        war.boostPool = matchBoost;
        war.settled = true;
        war.settledAt = block.timestamp;

        uint256 totalDistributed = winnerShare + loserShare;
        emit MatchSettled(matchId, winnerToken, totalDistributed);
    }

    // -----------------------------------------------------------------------
    // Core: Claim Boost + Locked Tokens
    // -----------------------------------------------------------------------
    /**
     * @notice Claim locked tokens and boost reward after match settlement.
     * @param matchId The settled match war.
     */
    function claimBoost(uint256 matchId) external nonReentrant {
        MatchWar storage war = matchWars[matchId];
        if (!war.settled) revert WarNotSettled();
        if (block.timestamp > war.settledAt + CLAIM_WINDOW) revert ClaimWindowExpired();

        UserLock storage lock = userLocks[matchId][msg.sender];
        if (lock.amount == 0) revert NoLockFound();
        if (lock.claimed) revert AlreadyClaimed();

        lock.claimed = true;

        // Calculate user's share of boost for their side
        uint256 userBoost = 0;
        if (lock.teamToken == war.homeTeamToken && war.totalHomeLocked > 0) {
            userBoost = (war.homeBoostAmount * lock.amount) / war.totalHomeLocked;
        } else if (lock.teamToken == war.awayTeamToken && war.totalAwayLocked > 0) {
            userBoost = (war.awayBoostAmount * lock.amount) / war.totalAwayLocked;
        }

        lock.boostReward = userBoost;

        // Return locked tokens
        IERC20(lock.teamToken).safeTransfer(msg.sender, lock.amount);

        // Send ETH boost reward
        if (userBoost > 0) {
            (bool success,) = msg.sender.call{value: userBoost}("");
            if (!success) revert TransferFailed();
        }

        emit BoostClaimed(matchId, msg.sender, userBoost, lock.amount);
    }

    // -----------------------------------------------------------------------
    // Core: Fund Boost Pool
    // -----------------------------------------------------------------------
    /**
     * @notice Fund the boost pool with ETH. Called by RewardDistributor or directly.
     */
    function fundBoostPool() external payable {
        if (msg.value == 0) revert ZeroAmount();
        boostPoolBalance += msg.value;
        emit BoostPoolFunded(msg.value, boostPoolBalance);
    }

    // -----------------------------------------------------------------------
    // Core: Cancel Match
    // -----------------------------------------------------------------------
    /**
     * @notice Cancel a match war. Allows all participants to unlock their tokens.
     * @param matchId The match war to cancel.
     */
    function cancelMatch(uint256 matchId) external onlyKeeper {
        MatchWar storage war = matchWars[matchId];
        if (war.homeTeamToken == address(0)) revert WarDoesNotExist();
        if (war.settled) revert WarAlreadySettled();
        if (war.cancelled) revert WarAlreadySettled();

        uint256 totalLocked = war.totalHomeLocked + war.totalAwayLocked;
        if (totalLocked <= totalLockedAllWars) {
            totalLockedAllWars -= totalLocked;
        } else {
            totalLockedAllWars = 0;
        }

        war.cancelled = true;
        emit MatchCancelled(matchId);
    }

    // -----------------------------------------------------------------------
    // Emergency: Recover stuck tokens if settle is never called
    // -----------------------------------------------------------------------
    /**
     * @notice Emergency unlock for users when a match war is neither settled nor
     *         cancelled after EMERGENCY_WINDOW past the lock deadline. Prevents
     *         tokens from being permanently stuck if the keeper never settles.
     * @param matchId The match war to emergency-unlock from.
     */
    function emergencyUnlock(uint256 matchId) external nonReentrant {
        MatchWar storage war = matchWars[matchId];
        if (war.homeTeamToken == address(0)) revert WarDoesNotExist();
        if (war.settled || war.cancelled) revert WarAlreadySettled();
        if (block.timestamp < war.lockDeadline + EMERGENCY_WINDOW) revert EmergencyWindowNotReached();

        UserLock storage lock = userLocks[matchId][msg.sender];
        if (lock.amount == 0) revert NoLockFound();
        if (lock.claimed) revert AlreadyClaimed();

        lock.claimed = true;
        uint256 amount = lock.amount;

        // Decrement war-level and global locked totals
        if (lock.teamToken == war.homeTeamToken) {
            war.totalHomeLocked -= amount;
        } else {
            war.totalAwayLocked -= amount;
        }
        if (amount <= totalLockedAllWars) {
            totalLockedAllWars -= amount;
        } else {
            totalLockedAllWars = 0;
        }

        IERC20(lock.teamToken).safeTransfer(msg.sender, amount);
        emit BoostClaimed(matchId, msg.sender, 0, amount);
    }

    /**
     * @notice Admin emergency cancellation to allow all users to withdraw.
     *         Only callable EMERGENCY_WINDOW after lock deadline if war was never settled.
     * @param matchId The match war to force-cancel.
     */
    function emergencyCancel(uint256 matchId) external onlyOwner {
        MatchWar storage war = matchWars[matchId];
        if (war.homeTeamToken == address(0)) revert WarDoesNotExist();
        if (war.settled || war.cancelled) revert WarAlreadySettled();
        if (block.timestamp < war.lockDeadline + EMERGENCY_WINDOW) revert EmergencyWindowNotReached();

        war.cancelled = true;
        emit MatchCancelled(matchId);
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------
    /**
     * @notice Get the status of a match war.
     */
    function getMatchWarStatus(uint256 matchId) external view returns (
        address homeTeamToken,
        address awayTeamToken,
        uint256 totalHomeLocked,
        uint256 totalAwayLocked,
        uint256 boostPool,
        bool settled,
        bool cancelled,
        address winnerToken,
        uint8 marginType,
        uint256 lockDeadline
    ) {
        MatchWar storage war = matchWars[matchId];
        return (
            war.homeTeamToken,
            war.awayTeamToken,
            war.totalHomeLocked,
            war.totalAwayLocked,
            war.boostPool,
            war.settled,
            war.cancelled,
            war.winnerToken,
            war.marginType,
            war.lockDeadline
        );
    }

    /**
     * @notice Get a user's lock info for a match war.
     */
    function getUserLock(uint256 matchId, address user) external view returns (
        address teamToken,
        uint256 amount,
        uint256 boostReward,
        bool claimed
    ) {
        UserLock storage lock = userLocks[matchId][user];
        return (lock.teamToken, lock.amount, lock.boostReward, lock.claimed);
    }

    /**
     * @notice Estimate the boost reward for a user if the match were settled now.
     * @param matchId The match war.
     * @param user The user's address.
     * @param winnerToken Hypothetical winner token address.
     * @param marginType Hypothetical margin type (0/1/2).
     */
    function getEstimatedBoost(
        uint256 matchId,
        address user,
        address winnerToken,
        uint8 marginType
    ) external view returns (uint256) {
        MatchWar storage war = matchWars[matchId];
        UserLock storage lock = userLocks[matchId][user];
        if (lock.amount == 0) return 0;
        if (winnerToken != war.homeTeamToken && winnerToken != war.awayTeamToken) return 0;
        if (marginType > 2) return 0;

        uint256 winnerBps;
        uint256 loserBps;
        if (marginType == 0) {
            winnerBps = 5500;
            loserBps = 3500;
        } else if (marginType == 1) {
            winnerBps = 6000;
            loserBps = 3000;
        } else {
            winnerBps = 6500;
            loserBps = 2500;
        }

        uint256 totalLocked = war.totalHomeLocked + war.totalAwayLocked;
        uint256 matchBoost = (totalLockedAllWars > 0 && totalLocked > 0)
            ? (boostPoolBalance * totalLocked) / totalLockedAllWars
            : boostPoolBalance;
        bool homeWins = (winnerToken == war.homeTeamToken);
        uint256 homeBoost = homeWins ? (matchBoost * winnerBps) / BASIS_POINTS : (matchBoost * loserBps) / BASIS_POINTS;
        uint256 awayBoost = homeWins ? (matchBoost * loserBps) / BASIS_POINTS : (matchBoost * winnerBps) / BASIS_POINTS;

        if (lock.teamToken == war.homeTeamToken && war.totalHomeLocked > 0) {
            return (homeBoost * lock.amount) / war.totalHomeLocked;
        } else if (lock.teamToken == war.awayTeamToken && war.totalAwayLocked > 0) {
            return (awayBoost * lock.amount) / war.totalAwayLocked;
        }
        return 0;
    }

    // Allow contract to receive ETH directly (fallback for boost pool funding)
    receive() external payable {
        boostPoolBalance += msg.value;
        emit BoostPoolFunded(msg.value, boostPoolBalance);
    }
}
