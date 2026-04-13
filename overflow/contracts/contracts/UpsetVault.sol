// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TeamToken.sol";
import "./PerformanceOracle.sol";

/**
 * @title UpsetVault
 * @notice Accumulates 15% of all platform fees and releases funds when upsets occur.
 * @dev
 *   Upset Score = winner's sell tax - loser's sell tax  (in basis points, divided by 100 for 0-13 scale)
 *
 *   Upset tiers:
 *     Normal    (0-3):  1x multiplier,  0% vault release
 *     Big Upset (4-6):  3x multiplier, 15% vault release
 *     Huge Upset(7-9):  5x multiplier, 30% vault release
 *     GIANT KILLER(10-13): 10x multiplier, 60% vault release
 *
 *   Released funds are distributed proportionally to winning team token holders.
 */
contract UpsetVault is Ownable, ReentrancyGuard {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant CLAIM_WINDOW = 48 hours;

    // -----------------------------------------------------------------------
    // Enums
    // -----------------------------------------------------------------------
    enum UpsetTier { NORMAL, BIG_UPSET, HUGE_UPSET, GIANT_KILLER }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    PerformanceOracle public oracle;

    uint256 public totalDeposited;
    uint256 public totalReleased;
    uint256 public totalEarmarked;  // C-2 fix: track funds reserved for pending claims

    uint256 public currentUpsetEpoch;

    struct UpsetEvent {
        address winnerTeam;
        address loserTeam;
        uint256 upsetScore;
        UpsetTier tier;
        uint256 multiplier;
        uint256 releasedAmount;
        uint256 timestamp;
        uint256 winnerSupplySnapshot;
        uint256 snapshotTimestamp;       // C-1 fix: timestamp when snapshot was taken
        uint256 claimedAmount;           // HIGH-02 fix: track total claimed from this epoch
        bool earmarksReleased;           // HIGH-02 fix: whether expired earmarks were reclaimed
        mapping(address => bool) claimed;
    }

    mapping(uint256 => UpsetEvent) internal upsetEvents;

    // Authorized addresses that can trigger upsets (owner or designated oracle/keeper)
    mapping(address => bool) public isKeeper;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    event FundsDeposited(uint256 amount);
    event UpsetTriggered(
        uint256 indexed epoch,
        address indexed winner,
        address indexed loser,
        uint256 upsetScore,
        UpsetTier tier,
        uint256 releasedAmount
    );
    event UpsetRewardClaimed(uint256 indexed epoch, address indexed user, uint256 amount);
    event KeeperSet(address indexed keeper, bool status);
    event EarmarksReleased(uint256 indexed epoch, uint256 unclaimedAmount);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------
    error NotKeeper();
    error SameTeam();
    error AlreadyClaimed();
    error ClaimWindowExpired();
    error NoReward();
    error TransferFailed();
    error InvalidEpoch();
    error TokensBoughtAfterSnapshot();

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
    constructor(address _oracle) Ownable(msg.sender) {
        require(_oracle != address(0), "Zero address");
        oracle = PerformanceOracle(_oracle);
        isKeeper[msg.sender] = true;
    }

    // -----------------------------------------------------------------------
    // Receive funds
    // -----------------------------------------------------------------------
    receive() external payable {
        totalDeposited += msg.value;
        emit FundsDeposited(msg.value);
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------
    function setKeeper(address keeper, bool status) external onlyOwner {
        require(keeper != address(0), "Zero address");
        isKeeper[keeper] = status;
        emit KeeperSet(keeper, status);
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Zero address");
        oracle = PerformanceOracle(_oracle);
    }

    // -----------------------------------------------------------------------
    // Core: Trigger Upset
    // -----------------------------------------------------------------------
    /**
     * @notice Called when a lower-ranked team beats a higher-ranked team.
     * @param winnerTeam Address of the winning team token (the underdog).
     * @param loserTeam Address of the losing team token (the favourite).
     */
    function triggerUpset(address winnerTeam, address loserTeam) external onlyKeeper nonReentrant {
        if (winnerTeam == loserTeam) revert SameTeam();

        uint256 score = getUpsetScore(winnerTeam, loserTeam);
        (UpsetTier tier, uint256 multiplier, uint256 releasePct) = _getTierInfo(score);

        // C-2 fix: use available (unearmarked) balance instead of full balance
        uint256 releaseAmount = 0;
        if (releasePct > 0) {
            releaseAmount = (getAvailableBalance() * releasePct) / BASIS_POINTS;
        }

        uint256 epoch = currentUpsetEpoch++;
        UpsetEvent storage evt = upsetEvents[epoch];
        evt.winnerTeam = winnerTeam;
        evt.loserTeam = loserTeam;
        evt.upsetScore = score;
        evt.tier = tier;
        evt.multiplier = multiplier;
        evt.releasedAmount = releaseAmount;
        evt.timestamp = block.timestamp;
        evt.snapshotTimestamp = block.timestamp;
        evt.winnerSupplySnapshot = TeamToken(winnerTeam).totalSupply();

        if (releaseAmount > 0) {
            totalReleased += releaseAmount;
            totalEarmarked += releaseAmount;  // C-2 fix: earmark funds
        }

        emit UpsetTriggered(epoch, winnerTeam, loserTeam, score, tier, releaseAmount);
    }

    /**
     * @notice Claim upset reward for a specific epoch.
     */
    function claimUpsetReward(uint256 epoch) external nonReentrant {
        if (epoch >= currentUpsetEpoch) revert InvalidEpoch();
        UpsetEvent storage evt = upsetEvents[epoch];
        if (block.timestamp > evt.timestamp + CLAIM_WINDOW) revert ClaimWindowExpired();
        if (evt.claimed[msg.sender]) revert AlreadyClaimed();
        if (evt.releasedAmount == 0) revert NoReward();

        // C-1 fix: reject users who bought tokens after the snapshot
        TeamToken winnerToken = TeamToken(evt.winnerTeam);
        uint256 userLastBuy = winnerToken.lastBuyTimestamp(msg.sender);
        if (userLastBuy >= evt.snapshotTimestamp) revert TokensBoughtAfterSnapshot();

        uint256 userBalance = winnerToken.balanceOf(msg.sender);
        if (userBalance == 0 || evt.winnerSupplySnapshot == 0) revert NoReward();

        uint256 reward = (evt.releasedAmount * userBalance) / evt.winnerSupplySnapshot;
        if (reward == 0) revert NoReward();

        evt.claimed[msg.sender] = true;
        evt.claimedAmount += reward;   // HIGH-02 fix: track per-epoch claimed total
        totalEarmarked -= reward;  // C-2 fix: release earmarked funds on claim
        (bool success,) = msg.sender.call{value: reward}("");
        if (!success) revert TransferFailed();

        emit UpsetRewardClaimed(epoch, msg.sender, reward);
    }

    // -----------------------------------------------------------------------
    // HIGH-02 fix: Release expired earmarks so unclaimed rewards do not stay locked forever
    // -----------------------------------------------------------------------
    /**
     * @notice Reclaim earmarked funds for an epoch whose claim window has expired.
     *         Unclaimed rewards become available for future upset releases.
     */
    function releaseExpiredEarmarks(uint256 epoch) external onlyKeeper {
        UpsetEvent storage evt = upsetEvents[epoch];
        require(evt.timestamp > 0, "No event");
        require(block.timestamp > evt.timestamp + CLAIM_WINDOW, "Window still open");
        require(!evt.earmarksReleased, "Already released");

        uint256 unclaimedAmount = evt.releasedAmount - evt.claimedAmount;
        totalEarmarked -= unclaimedAmount;
        evt.earmarksReleased = true;

        emit EarmarksReleased(epoch, unclaimedAmount);
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------
    function getVaultBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Returns the vault balance available for new upset releases (excludes earmarked funds).
    function getAvailableBalance() public view returns (uint256) {
        uint256 balance = address(this).balance;
        return balance > totalEarmarked ? balance - totalEarmarked : 0;
    }

    /**
     * @notice Calculate upset score based on the difference in sell tax rates.
     *         Higher sell tax = worse performing team.
     *         Upset score = winner_tax - loser_tax (converted to 0-13 scale).
     *         If winner has lower tax (favourite won), returns 0.
     */
    function getUpsetScore(address winnerTeam, address loserTeam) public view returns (uint256) {
        uint256 winnerTax = oracle.getSellTaxRate(winnerTeam); // higher tax = worse team
        uint256 loserTax = oracle.getSellTaxRate(loserTeam);

        // Upset = underdog (high tax) beats favourite (low tax)
        if (winnerTax <= loserTax) return 0;

        // Tax range is 200-1500 bp, so max diff is 1300 bp.
        // Scale to 0-13: divide by 100.
        uint256 diff = winnerTax - loserTax;
        uint256 score = diff / 100;
        if (score > 13) score = 13;
        return score;
    }

    function getUpsetEventInfo(uint256 epoch) external view returns (
        address winnerTeam,
        address loserTeam,
        uint256 upsetScore,
        UpsetTier tier,
        uint256 multiplier,
        uint256 releasedAmount,
        uint256 timestamp
    ) {
        if (epoch >= currentUpsetEpoch) revert InvalidEpoch();
        UpsetEvent storage evt = upsetEvents[epoch];
        winnerTeam = evt.winnerTeam;
        loserTeam = evt.loserTeam;
        upsetScore = evt.upsetScore;
        tier = evt.tier;
        multiplier = evt.multiplier;
        releasedAmount = evt.releasedAmount;
        timestamp = evt.timestamp;
    }

    function getClaimableUpsetReward(uint256 epoch, address user) external view returns (uint256) {
        if (epoch >= currentUpsetEpoch) return 0;
        UpsetEvent storage evt = upsetEvents[epoch];
        if (block.timestamp > evt.timestamp + CLAIM_WINDOW) return 0;
        if (evt.claimed[user]) return 0;
        if (evt.releasedAmount == 0) return 0;

        // C-1 fix: users who bought after snapshot get nothing
        TeamToken winnerToken = TeamToken(evt.winnerTeam);
        uint256 userLastBuy = winnerToken.lastBuyTimestamp(user);
        if (userLastBuy >= evt.snapshotTimestamp) return 0;

        uint256 userBalance = winnerToken.balanceOf(user);
        if (userBalance == 0 || evt.winnerSupplySnapshot == 0) return 0;
        return (evt.releasedAmount * userBalance) / evt.winnerSupplySnapshot;
    }

    // -----------------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------------
    function _getTierInfo(uint256 score) internal pure returns (UpsetTier tier, uint256 multiplier, uint256 releasePct) {
        if (score <= 3) {
            return (UpsetTier.NORMAL, 1, 0);
        } else if (score <= 6) {
            return (UpsetTier.BIG_UPSET, 3, 1500); // 15%
        } else if (score <= 9) {
            return (UpsetTier.HUGE_UPSET, 5, 3000); // 30%
        } else {
            return (UpsetTier.GIANT_KILLER, 10, 6000); // 60%
        }
    }
}
