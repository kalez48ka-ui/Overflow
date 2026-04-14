// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PerformanceOracle
 * @notice Match data oracle for PSL team performance scoring and dynamic sell tax calculation.
 * @dev Requires 2-of-3 oracle confirmations before performance updates are finalized.
 *      Performance score = Points table position (40%) + NRR (20%) + Last 3 match form (20%) + Player availability (20%).
 *      Sell tax is linearly interpolated: best team = 2%, worst team = 15%.
 */
contract PerformanceOracle is Ownable {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    uint256 public constant MAX_TEAMS = 8;
    uint256 public constant MIN_SELL_TAX = 200;   // 2%  (basis points)
    uint256 public constant MAX_SELL_TAX = 1500;  // 15% (basis points)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant REQUIRED_CONFIRMATIONS = 2;
    uint256 public constant MAX_ORACLES = 3;
    uint256 public constant MIN_CONFIRM_DELAY = 30 seconds;  // MEDIUM-03 fix: anti-front-running delay

    // -----------------------------------------------------------------------
    // Structs
    // -----------------------------------------------------------------------
    struct TeamPerformance {
        uint256 pointsTableScore;   // 0-100, weight 40%
        uint256 nrrScore;           // 0-100, weight 20%
        uint256 formScore;          // 0-100, weight 20% (last 3 matches)
        uint256 availabilityScore;  // 0-100, weight 20%
        uint256 compositeScore;     // weighted composite 0-100
        uint256 lastUpdated;
    }

    struct PendingUpdate {
        uint256 pointsTableScore;
        uint256 nrrScore;
        uint256 formScore;
        uint256 availabilityScore;
        uint256 confirmations;
        uint256 createdAt;
        uint256 proposedAt;       // MEDIUM-03 fix: timestamp of initial proposal
        bool executed;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    mapping(address => TeamPerformance) public teamPerformance;
    address[] public registeredTeams;
    mapping(address => bool) public isRegisteredTeam;

    address[3] public oracles;
    mapping(address => bool) public isOracle;

    // pendingUpdates[teamAddress][updateNonce]
    mapping(address => uint256) public updateNonce;
    mapping(address => mapping(uint256 => PendingUpdate)) public pendingUpdates;
    // tracks which oracle confirmed: [team][nonce][oracle] => bool
    mapping(address => mapping(uint256 => mapping(address => bool))) public oracleConfirmed;

    // Oracle replacement timelock
    struct PendingOracleChange {
        address newOracle;
        uint256 effectiveAt;
    }
    mapping(uint256 => PendingOracleChange) public pendingOracleChanges;
    uint256 public constant ORACLE_CHANGE_DELAY = 24 hours;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    event OracleChangeProposed(uint256 indexed index, address indexed newOracle, uint256 effectiveAt);
    event OracleChanged(uint256 indexed index, address indexed newOracle);
    event OracleSet(uint256 indexed index, address indexed oracle);
    event TeamRegistered(address indexed teamToken);
    event UpdateProposed(address indexed teamToken, uint256 indexed nonce, address indexed oracle);
    event UpdateConfirmed(address indexed teamToken, uint256 indexed nonce, address indexed oracle);
    event PerformanceUpdated(address indexed teamToken, uint256 compositeScore);
    event SellTaxUpdated(address indexed teamToken, uint256 taxRate);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------
    error NotOracle();
    error TeamAlreadyRegistered();
    error TeamNotRegistered();
    error TooManyTeams();
    error InvalidScore();
    error AlreadyConfirmed();
    error UpdateAlreadyExecuted();
    error UpdateExpired();
    error InvalidOracleIndex();
    error ScoreMismatch();
    error ConfirmTooSoon();
    error OracleChangeNotPending();
    error TimelockNotExpired();

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------
    modifier onlyOracle() {
        if (!isOracle[msg.sender]) revert NotOracle();
        _;
    }

    modifier onlyRegisteredTeam(address team) {
        if (!isRegisteredTeam[team]) revert TeamNotRegistered();
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------
    constructor(address _oracle1, address _oracle2, address _oracle3) Ownable(msg.sender) {
        require(_oracle1 != address(0), "Zero address");
        require(_oracle2 != address(0), "Zero address");
        require(_oracle3 != address(0), "Zero address");
        oracles[0] = _oracle1;
        oracles[1] = _oracle2;
        oracles[2] = _oracle3;
        isOracle[_oracle1] = true;
        isOracle[_oracle2] = true;
        isOracle[_oracle3] = true;
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------
    /**
     * @notice Propose replacing an oracle. Subject to 24-hour timelock to prevent
     *         owner from instantly replacing all 3 oracles and bypassing 2-of-3 multisig.
     */
    function proposeOracleChange(uint256 index, address newOracle) external onlyOwner {
        if (index >= MAX_ORACLES) revert InvalidOracleIndex();
        require(newOracle != address(0), "Zero address");
        uint256 effectiveAt = block.timestamp + ORACLE_CHANGE_DELAY;
        pendingOracleChanges[index] = PendingOracleChange(newOracle, effectiveAt);
        emit OracleChangeProposed(index, newOracle, effectiveAt);
    }

    /**
     * @notice Execute a pending oracle replacement after the timelock has expired.
     */
    function executeOracleChange(uint256 index) external onlyOwner {
        if (index >= MAX_ORACLES) revert InvalidOracleIndex();
        PendingOracleChange storage pending = pendingOracleChanges[index];
        if (pending.effectiveAt == 0) revert OracleChangeNotPending();
        if (block.timestamp < pending.effectiveAt) revert TimelockNotExpired();

        address oldOracle = oracles[index];
        address newOracle = pending.newOracle;

        isOracle[oldOracle] = false;
        oracles[index] = newOracle;
        isOracle[newOracle] = true;

        delete pendingOracleChanges[index];

        emit OracleChanged(index, newOracle);
    }

    function registerTeam(address teamToken) external onlyOwner {
        if (isRegisteredTeam[teamToken]) revert TeamAlreadyRegistered();
        if (registeredTeams.length >= MAX_TEAMS) revert TooManyTeams();
        registeredTeams.push(teamToken);
        isRegisteredTeam[teamToken] = true;
        // Initialize with default mid-range score
        teamPerformance[teamToken] = TeamPerformance({
            pointsTableScore: 50,
            nrrScore: 50,
            formScore: 50,
            availabilityScore: 50,
            compositeScore: 50,
            lastUpdated: block.timestamp
        });
        emit TeamRegistered(teamToken);
    }

    // -----------------------------------------------------------------------
    // Oracle Functions — Multi-source verification
    // -----------------------------------------------------------------------
    /**
     * @notice Propose or confirm a performance update. First oracle to submit creates the
     *         pending update; subsequent oracles confirm. At 2 confirmations the update executes.
     */
    function updateMatchResult(
        address teamToken,
        uint256 pointsTableScore,
        uint256 nrrScore,
        uint256 formScore,
        uint256 availabilityScore
    ) external onlyOracle onlyRegisteredTeam(teamToken) {
        if (
            pointsTableScore > 100 || nrrScore > 100 ||
            formScore > 100 || availabilityScore > 100
        ) revert InvalidScore();

        uint256 nonce = updateNonce[teamToken];
        PendingUpdate storage pending = pendingUpdates[teamToken][nonce];

        // M-5 fix: if the pending update has expired, clear stale state and advance nonce
        // so a new proposal can be created without deadlock from stale oracleConfirmed entries
        if (pending.createdAt != 0 && !pending.executed && block.timestamp > pending.createdAt + 1 hours) {
            // Clear stale oracle confirmations for the expired nonce
            for (uint256 i = 0; i < MAX_ORACLES; i++) {
                delete oracleConfirmed[teamToken][nonce][oracles[i]];
            }
            // Advance nonce past the expired update
            nonce = nonce + 1;
            updateNonce[teamToken] = nonce;
            pending = pendingUpdates[teamToken][nonce];
        }

        if (pending.createdAt == 0) {
            // First oracle — create pending update
            pending.pointsTableScore = pointsTableScore;
            pending.nrrScore = nrrScore;
            pending.formScore = formScore;
            pending.availabilityScore = availabilityScore;
            pending.confirmations = 1;
            pending.createdAt = block.timestamp;
            pending.proposedAt = block.timestamp;  // MEDIUM-03 fix: record proposal time
            oracleConfirmed[teamToken][nonce][msg.sender] = true;
            emit UpdateProposed(teamToken, nonce, msg.sender);
        } else {
            // Subsequent oracle — confirm
            if (pending.executed) revert UpdateAlreadyExecuted();
            if (block.timestamp > pending.createdAt + 1 hours) revert UpdateExpired();
            if (oracleConfirmed[teamToken][nonce][msg.sender]) revert AlreadyConfirmed();
            // MEDIUM-03 fix: enforce minimum delay between proposal and confirmation
            if (block.timestamp < pending.proposedAt + MIN_CONFIRM_DELAY) revert ConfirmTooSoon();

            // H-1 fix: require confirming oracle to submit matching scores
            if (
                pending.pointsTableScore != pointsTableScore ||
                pending.nrrScore != nrrScore ||
                pending.formScore != formScore ||
                pending.availabilityScore != availabilityScore
            ) revert ScoreMismatch();

            oracleConfirmed[teamToken][nonce][msg.sender] = true;
            pending.confirmations += 1;
            emit UpdateConfirmed(teamToken, nonce, msg.sender);
        }

        // Execute when threshold met
        if (pending.confirmations >= REQUIRED_CONFIRMATIONS && !pending.executed) {
            pending.executed = true;
            _applyUpdate(teamToken, pending);
            updateNonce[teamToken] = nonce + 1;
        }
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------
    /**
     * @notice Returns the dynamic sell tax rate for a team in basis points.
     *         Best performing team = 200 bp (2%), worst = 1500 bp (15%).
     */
    function getSellTaxRate(address teamToken) external view onlyRegisteredTeam(teamToken) returns (uint256) {
        return _calculateSellTax(teamToken);
    }

    function getPerformanceScore(address teamToken) external view onlyRegisteredTeam(teamToken) returns (uint256) {
        return teamPerformance[teamToken].compositeScore;
    }

    /**
     * @notice Returns all registered teams sorted by composite score descending (rank 0 = best).
     */
    function getTeamRanking() external view returns (address[] memory ranked) {
        uint256 len = registeredTeams.length;
        ranked = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            ranked[i] = registeredTeams[i];
        }
        // Simple insertion sort (max 6 elements)
        for (uint256 i = 1; i < len; i++) {
            address key = ranked[i];
            uint256 keyScore = teamPerformance[key].compositeScore;
            int256 j = int256(i) - 1;
            while (j >= 0 && teamPerformance[ranked[uint256(j)]].compositeScore < keyScore) {
                ranked[uint256(j + 1)] = ranked[uint256(j)];
                j--;
            }
            ranked[uint256(j + 1)] = key;
        }
    }

    function getTeamCount() external view returns (uint256) {
        return registeredTeams.length;
    }

    function getTeamAtIndex(uint256 index) external view returns (address) {
        return registeredTeams[index];
    }

    // -----------------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------------
    function _applyUpdate(address teamToken, PendingUpdate storage pending) internal {
        uint256 composite = (pending.pointsTableScore * 40 +
            pending.nrrScore * 20 +
            pending.formScore * 20 +
            pending.availabilityScore * 20) / 100;

        teamPerformance[teamToken] = TeamPerformance({
            pointsTableScore: pending.pointsTableScore,
            nrrScore: pending.nrrScore,
            formScore: pending.formScore,
            availabilityScore: pending.availabilityScore,
            compositeScore: composite,
            lastUpdated: block.timestamp
        });

        emit PerformanceUpdated(teamToken, composite);
        emit SellTaxUpdated(teamToken, _calculateSellTax(teamToken));
    }

    function _calculateSellTax(address teamToken) internal view returns (uint256) {
        uint256 len = registeredTeams.length;
        if (len <= 1) return MIN_SELL_TAX;

        uint256 targetScore = teamPerformance[teamToken].compositeScore;

        // Find min and max scores
        uint256 minScore = type(uint256).max;
        uint256 maxScore = 0;
        for (uint256 i = 0; i < len; i++) {
            uint256 s = teamPerformance[registeredTeams[i]].compositeScore;
            if (s < minScore) minScore = s;
            if (s > maxScore) maxScore = s;
        }

        if (maxScore == minScore) return (MIN_SELL_TAX + MAX_SELL_TAX) / 2;

        // Linear interpolation: best score → MIN_SELL_TAX, worst score → MAX_SELL_TAX
        // tax = MAX_SELL_TAX - (targetScore - minScore) * (MAX_SELL_TAX - MIN_SELL_TAX) / (maxScore - minScore)
        uint256 range = MAX_SELL_TAX - MIN_SELL_TAX;
        uint256 tax = MAX_SELL_TAX - ((targetScore - minScore) * range / (maxScore - minScore));
        return tax;
    }
}
