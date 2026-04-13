// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TeamToken.sol";

/**
 * @title RewardDistributor
 * @notice Collects all CricTrade trading fees and distributes them across platform pools.
 * @dev
 *   Fee split:
 *     30% -> Platform treasury
 *     25% -> Performance Reward Pool
 *     15% -> Upset Vault
 *     20% -> Liquidity backing
 *     10% -> Development fund
 *
 *   After each match, the Performance Reward Pool is distributed to token holders by ranking:
 *     1st: 30%, 2nd: 22%, 3rd: 17%, 4th: 11%, 5th: 8%, 6th: 5%, 7th: 4%, 8th: 3%
 *
 *   24-hour claim window per match (anti flash-loan).
 */
contract RewardDistributor is Ownable, ReentrancyGuard {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    uint256 public constant BASIS_POINTS = 10000;

    // Fee split percentages (basis points)
    uint256 public constant TREASURY_SHARE = 3000;     // 30%
    uint256 public constant REWARD_POOL_SHARE = 2500;  // 25%
    uint256 public constant UPSET_VAULT_SHARE = 1500;  // 15%
    uint256 public constant LIQUIDITY_SHARE = 2000;    // 20%
    uint256 public constant DEV_FUND_SHARE = 1000;     // 10%

    uint256 public constant CLAIM_WINDOW = 24 hours;
    uint256 public constant MAX_TEAMS = 8;

    // Ranking-based reward shares (basis points) — index 0 = 1st place
    uint256[8] public RANKING_SHARES = [3000, 2200, 1700, 1100, 800, 500, 400, 300];

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    address public treasury;
    address public upsetVault;
    address public liquidityBacking;
    address public devFund;

    uint256 public performanceRewardPool;
    uint256 public totalFeesCollected;

    // Match reward epochs
    uint256 public currentEpoch;

    struct MatchRewardEpoch {
        uint256 totalRewardPool;         // ETH amount for this epoch
        uint256 distributionTimestamp;   // when distribution was triggered
        bool distributed;
        address[8] rankedTeams;          // teams sorted by ranking (0=1st)
        mapping(address => uint256) teamRewardShare; // team -> ETH share
        mapping(address => mapping(address => bool)) claimed; // team -> user -> claimed
        mapping(address => uint256) teamTotalSupplySnapshot; // snapshot at distribution time
        uint256 snapshotTimestamp;       // C-1 fix: timestamp when snapshot was taken
    }

    mapping(uint256 => MatchRewardEpoch) internal epochs;

    // Registered team tokens
    address[] public teamTokens;
    mapping(address => bool) public isTeamToken;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    event FeesReceived(uint256 amount);
    event FeesDistributed(
        uint256 treasuryAmount,
        uint256 rewardPoolAmount,
        uint256 upsetVaultAmount,
        uint256 liquidityAmount,
        uint256 devFundAmount
    );
    event MatchRewardsDistributed(uint256 indexed epoch, uint256 totalPool);
    event RewardClaimed(uint256 indexed epoch, address indexed user, address indexed team, uint256 amount);
    event TeamTokenRegistered(address indexed token);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------
    error InvalidTeam();
    error AlreadyClaimed();
    error ClaimWindowExpired();
    error EpochNotDistributed();
    error NoRewardsAvailable();
    error InvalidRanking();
    error TransferFailed();
    error TokensBoughtAfterSnapshot();

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------
    constructor(
        address _treasury,
        address _upsetVault,
        address _liquidityBacking,
        address _devFund
    ) Ownable(msg.sender) {
        treasury = _treasury;
        upsetVault = _upsetVault;
        liquidityBacking = _liquidityBacking;
        devFund = _devFund;
    }

    // -----------------------------------------------------------------------
    // Receive fees
    // -----------------------------------------------------------------------
    receive() external payable {
        totalFeesCollected += msg.value;
        emit FeesReceived(msg.value);
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------
    function registerTeamToken(address token) external onlyOwner {
        if (isTeamToken[token]) revert InvalidTeam();
        teamTokens.push(token);
        isTeamToken[token] = true;
        emit TeamTokenRegistered(token);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setUpsetVault(address _upsetVault) external onlyOwner {
        upsetVault = _upsetVault;
    }

    function setLiquidityBacking(address _liquidityBacking) external onlyOwner {
        liquidityBacking = _liquidityBacking;
    }

    function setDevFund(address _devFund) external onlyOwner {
        devFund = _devFund;
    }

    // -----------------------------------------------------------------------
    // Core: Fee Distribution
    // -----------------------------------------------------------------------
    /**
     * @notice Split accumulated ETH balance across the five pools.
     */
    function distributeFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        // Keep performanceRewardPool balance in contract
        uint256 distributable = balance > performanceRewardPool
            ? balance - performanceRewardPool
            : 0;
        if (distributable == 0) return;

        uint256 treasuryAmt = (distributable * TREASURY_SHARE) / BASIS_POINTS;
        uint256 rewardPoolAmt = (distributable * REWARD_POOL_SHARE) / BASIS_POINTS;
        uint256 upsetVaultAmt = (distributable * UPSET_VAULT_SHARE) / BASIS_POINTS;
        uint256 liquidityAmt = (distributable * LIQUIDITY_SHARE) / BASIS_POINTS;
        uint256 devFundAmt = distributable - treasuryAmt - rewardPoolAmt - upsetVaultAmt - liquidityAmt;

        performanceRewardPool += rewardPoolAmt;

        _safeTransfer(treasury, treasuryAmt);
        _safeTransfer(upsetVault, upsetVaultAmt);
        _safeTransfer(liquidityBacking, liquidityAmt);
        _safeTransfer(devFund, devFundAmt);

        emit FeesDistributed(treasuryAmt, rewardPoolAmt, upsetVaultAmt, liquidityAmt, devFundAmt);
    }

    // -----------------------------------------------------------------------
    // Core: Match Reward Distribution
    // -----------------------------------------------------------------------
    /**
     * @notice Called after each match to allocate the performance reward pool
     *         to token holders based on team ranking.
     * @param rankedTeams Array of 6 team token addresses sorted by ranking (index 0 = 1st place).
     */
    function distributeMatchRewards(address[8] calldata rankedTeams) external onlyOwner nonReentrant {
        // Validate all teams are registered
        for (uint256 i = 0; i < 8; i++) {
            if (!isTeamToken[rankedTeams[i]]) revert InvalidTeam();
            // Check for duplicates
            for (uint256 j = i + 1; j < 6; j++) {
                if (rankedTeams[i] == rankedTeams[j]) revert InvalidRanking();
            }
        }

        uint256 pool = performanceRewardPool;
        if (pool == 0) revert NoRewardsAvailable();

        performanceRewardPool = 0;
        uint256 epoch = currentEpoch++;

        MatchRewardEpoch storage e = epochs[epoch];
        e.totalRewardPool = pool;
        e.distributionTimestamp = block.timestamp;
        e.snapshotTimestamp = block.timestamp;
        e.distributed = true;
        e.rankedTeams = rankedTeams;

        for (uint256 i = 0; i < 8; i++) {
            address team = rankedTeams[i];
            uint256 share = (pool * RANKING_SHARES[i]) / BASIS_POINTS;
            e.teamRewardShare[team] = share;
            e.teamTotalSupplySnapshot[team] = TeamToken(team).totalSupply();
        }

        emit MatchRewardsDistributed(epoch, pool);
    }

    // -----------------------------------------------------------------------
    // Core: Claim Rewards
    // -----------------------------------------------------------------------
    /**
     * @notice Claim rewards for a specific match epoch and team.
     * @param epoch The match reward epoch.
     * @param teamAddress The team token address the user holds.
     */
    function claimRewards(uint256 epoch, address teamAddress) external nonReentrant {
        MatchRewardEpoch storage e = epochs[epoch];
        if (!e.distributed) revert EpochNotDistributed();
        if (block.timestamp > e.distributionTimestamp + CLAIM_WINDOW) revert ClaimWindowExpired();
        if (e.claimed[teamAddress][msg.sender]) revert AlreadyClaimed();
        if (!isTeamToken[teamAddress]) revert InvalidTeam();

        // C-1 fix: reject users who bought tokens after the snapshot
        TeamToken teamToken = TeamToken(teamAddress);
        uint256 userLastBuy = teamToken.lastBuyTimestamp(msg.sender);
        if (userLastBuy >= e.snapshotTimestamp) revert TokensBoughtAfterSnapshot();

        uint256 userBalance = teamToken.balanceOf(msg.sender);
        uint256 totalSupply = e.teamTotalSupplySnapshot[teamAddress];
        if (userBalance == 0 || totalSupply == 0) revert NoRewardsAvailable();

        uint256 teamShare = e.teamRewardShare[teamAddress];
        uint256 userReward = (teamShare * userBalance) / totalSupply;
        if (userReward == 0) revert NoRewardsAvailable();

        e.claimed[teamAddress][msg.sender] = true;
        _safeTransfer(msg.sender, userReward);

        emit RewardClaimed(epoch, msg.sender, teamAddress, userReward);
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------
    function getClaimableRewards(address user, address teamAddress, uint256 epoch) external view returns (uint256) {
        MatchRewardEpoch storage e = epochs[epoch];
        if (!e.distributed) return 0;
        if (block.timestamp > e.distributionTimestamp + CLAIM_WINDOW) return 0;
        if (e.claimed[teamAddress][user]) return 0;

        // C-1 fix: users who bought after snapshot get nothing
        TeamToken teamToken = TeamToken(teamAddress);
        uint256 userLastBuy = teamToken.lastBuyTimestamp(user);
        if (userLastBuy >= e.snapshotTimestamp) return 0;

        uint256 userBalance = teamToken.balanceOf(user);
        uint256 totalSupply = e.teamTotalSupplySnapshot[teamAddress];
        if (userBalance == 0 || totalSupply == 0) return 0;

        uint256 teamShare = e.teamRewardShare[teamAddress];
        return (teamShare * userBalance) / totalSupply;
    }

    function getEpochInfo(uint256 epoch) external view returns (
        uint256 totalPool,
        uint256 distributionTime,
        bool distributed,
        address[8] memory rankedTeams
    ) {
        MatchRewardEpoch storage e = epochs[epoch];
        totalPool = e.totalRewardPool;
        distributionTime = e.distributionTimestamp;
        distributed = e.distributed;
        rankedTeams = e.rankedTeams;
    }

    function getTeamRewardShare(uint256 epoch, address team) external view returns (uint256) {
        return epochs[epoch].teamRewardShare[team];
    }

    // -----------------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------------
    function _safeTransfer(address to, uint256 amount) internal {
        if (amount == 0 || to == address(0)) return;
        (bool success,) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
