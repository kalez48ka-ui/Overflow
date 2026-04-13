// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CircuitBreaker
 * @notice Price protection mechanism that pauses trading when rapid price drops are detected.
 * @dev Monitors token prices per 5-minute window. Authorized reporters (the factory / keeper)
 *      push price snapshots; the contract evaluates whether circuit breaker thresholds are met.
 *
 *      Thresholds:
 *        - >15% drop in 5 min  -> 3-minute pause
 *        - >25% drop in 15 min -> 10-minute pause
 */
contract CircuitBreaker is Ownable {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    uint256 public constant WINDOW_SHORT = 5 minutes;
    uint256 public constant WINDOW_LONG = 15 minutes;
    uint256 public constant PAUSE_SHORT = 3 minutes;
    uint256 public constant PAUSE_LONG = 10 minutes;
    uint256 public constant DROP_THRESHOLD_SHORT = 1500; // 15% in basis points
    uint256 public constant DROP_THRESHOLD_LONG = 2500;  // 25% in basis points
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_SNAPSHOTS = 60; // circular buffer size

    // -----------------------------------------------------------------------
    // Structs
    // -----------------------------------------------------------------------
    struct PriceSnapshot {
        uint256 price;
        uint256 timestamp;
    }

    struct PauseState {
        bool paused;
        uint256 pauseUntil;
        uint256 pauseReason; // 1 = short window, 2 = long window
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    mapping(address => PriceSnapshot[MAX_SNAPSHOTS]) public priceHistory;
    mapping(address => uint256) public snapshotIndex;       // next write index (circular)
    mapping(address => uint256) public snapshotCount;       // total snapshots written
    mapping(address => PauseState) public pauseStates;
    mapping(address => bool) public isReporter;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    event PriceRecorded(address indexed token, uint256 price, uint256 timestamp);
    event TradingPaused(address indexed token, uint256 duration, uint256 dropBps, uint256 reason);
    event TradingResumed(address indexed token);
    event ReporterSet(address indexed reporter, bool status);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------
    error NotReporter();
    error StillPaused();
    error NotPaused();
    error ZeroPrice();

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------
    modifier onlyReporter() {
        if (!isReporter[msg.sender] && msg.sender != owner()) revert NotReporter();
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------
    constructor() Ownable(msg.sender) {
        isReporter[msg.sender] = true;
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------
    function setReporter(address reporter, bool status) external onlyOwner {
        require(reporter != address(0), "Zero address");
        isReporter[reporter] = status;
        emit ReporterSet(reporter, status);
    }

    // -----------------------------------------------------------------------
    // Core Functions
    // -----------------------------------------------------------------------
    /**
     * @notice Record a price snapshot and check circuit breaker thresholds.
     * @param tokenAddress The team token address.
     * @param currentPrice The current token price (in any consistent unit).
     */
    function recordPrice(address tokenAddress, uint256 currentPrice) external onlyReporter {
        if (currentPrice == 0) revert ZeroPrice();

        // Store snapshot in circular buffer
        uint256 idx = snapshotIndex[tokenAddress];
        priceHistory[tokenAddress][idx] = PriceSnapshot({
            price: currentPrice,
            timestamp: block.timestamp
        });
        snapshotIndex[tokenAddress] = (idx + 1) % MAX_SNAPSHOTS;
        if (snapshotCount[tokenAddress] < MAX_SNAPSHOTS) {
            snapshotCount[tokenAddress]++;
        }

        emit PriceRecorded(tokenAddress, currentPrice, block.timestamp);

        // Auto-check thresholds
        _checkThresholds(tokenAddress, currentPrice);
    }

    /**
     * @notice External check — can be called by anyone to trigger a pause evaluation
     *         based on already-recorded data.
     */
    function checkAndPause(address tokenAddress) external {
        uint256 count = snapshotCount[tokenAddress];
        if (count == 0) return;

        // Get latest price
        uint256 latestIdx = snapshotIndex[tokenAddress] == 0
            ? (count < MAX_SNAPSHOTS ? count - 1 : MAX_SNAPSHOTS - 1)
            : snapshotIndex[tokenAddress] - 1;

        uint256 latestPrice = priceHistory[tokenAddress][latestIdx].price;
        _checkThresholds(tokenAddress, latestPrice);
    }

    /**
     * @notice Owner / keeper can manually resume trading before the pause expires.
     */
    function resume(address tokenAddress) external onlyOwner {
        PauseState storage ps = pauseStates[tokenAddress];
        if (!ps.paused) revert NotPaused();
        // MEDIUM-05 fix: check if already expired before emitting
        bool wasActive = block.timestamp < ps.pauseUntil;
        ps.paused = false;
        ps.pauseUntil = 0;
        ps.pauseReason = 0;
        if (wasActive) {
            emit TradingResumed(tokenAddress);
        }
    }

    /**
     * @notice Returns whether a token is currently paused (view-safe).
     * @dev MEDIUM-05 fix: returns false when auto-expired even if ps.paused is stale.
     */
    function isPaused(address tokenAddress) external view returns (bool) {
        PauseState storage ps = pauseStates[tokenAddress];
        if (!ps.paused) return false;
        // Return false when pause has auto-expired
        return block.timestamp < ps.pauseUntil;
    }

    /**
     * @notice Clear stale pause state for a token whose pause has auto-expired.
     * @dev MEDIUM-05 fix: anyone can call this to reset the boolean so getPauseState
     *      and other reads return clean state. Also emits TradingResumed.
     */
    function clearExpiredPause(address tokenAddress) external {
        PauseState storage ps = pauseStates[tokenAddress];
        if (!ps.paused) revert NotPaused();
        if (block.timestamp < ps.pauseUntil) revert StillPaused();
        ps.paused = false;
        ps.pauseUntil = 0;
        ps.pauseReason = 0;
        emit TradingResumed(tokenAddress);
    }

    function getPauseState(address tokenAddress) external view returns (bool active, uint256 until, uint256 reason) {
        PauseState storage ps = pauseStates[tokenAddress];
        active = ps.paused && block.timestamp < ps.pauseUntil;
        until = ps.pauseUntil;
        reason = ps.pauseReason;
    }

    // -----------------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------------
    function _checkThresholds(address tokenAddress, uint256 currentPrice) internal {
        // Check 5-minute window (short)
        uint256 highPrice5 = _getHighestPriceInWindow(tokenAddress, WINDOW_SHORT);
        if (highPrice5 > 0 && currentPrice < highPrice5) {
            uint256 dropBps = ((highPrice5 - currentPrice) * BASIS_POINTS) / highPrice5;
            if (dropBps >= DROP_THRESHOLD_SHORT) {
                _triggerPause(tokenAddress, PAUSE_SHORT, dropBps, 1);
                return;
            }
        }

        // Check 15-minute window (long)
        uint256 highPrice15 = _getHighestPriceInWindow(tokenAddress, WINDOW_LONG);
        if (highPrice15 > 0 && currentPrice < highPrice15) {
            uint256 dropBps = ((highPrice15 - currentPrice) * BASIS_POINTS) / highPrice15;
            if (dropBps >= DROP_THRESHOLD_LONG) {
                _triggerPause(tokenAddress, PAUSE_LONG, dropBps, 2);
            }
        }
    }

    // INFO-01 fix: iterate backward from latest snapshot and break early when timestamps
    // fall outside the window, avoiding scanning all 60 slots every time.
    function _getHighestPriceInWindow(address tokenAddress, uint256 window) internal view returns (uint256 highest) {
        uint256 count = snapshotCount[tokenAddress];
        if (count == 0) return 0;

        uint256 cutoff = block.timestamp > window ? block.timestamp - window : 0;
        uint256 total = count < MAX_SNAPSHOTS ? count : MAX_SNAPSHOTS;
        uint256 idx = snapshotIndex[tokenAddress];

        for (uint256 i = 0; i < total; i++) {
            // Walk backward from the most recent snapshot
            uint256 pos = (idx + MAX_SNAPSHOTS - 1 - i) % MAX_SNAPSHOTS;
            PriceSnapshot storage snap = priceHistory[tokenAddress][pos];
            // Once we hit a timestamp older than the window, stop scanning
            if (snap.timestamp < cutoff) break;
            if (snap.price > highest) {
                highest = snap.price;
            }
        }
    }

    function _triggerPause(address tokenAddress, uint256 duration, uint256 dropBps, uint256 reason) internal {
        PauseState storage ps = pauseStates[tokenAddress];
        // Only extend pause, never shorten an active pause
        uint256 newUntil = block.timestamp + duration;
        // MEDIUM-05 fix: always set paused=true fresh; only skip if existing pause extends further
        if (ps.paused && block.timestamp < ps.pauseUntil && ps.pauseUntil > newUntil) return;

        ps.paused = true;
        ps.pauseUntil = newUntil;
        ps.pauseReason = reason;
        emit TradingPaused(tokenAddress, duration, dropBps, reason);
    }
}
