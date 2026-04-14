// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TeamToken.sol";
import "./PerformanceOracle.sol";
import "./CircuitBreaker.sol";

/**
 * @title TeamTokenFactory
 * @notice Factory for creating PSL team ERC-20 tokens with an asymmetric bonding curve.
 * @dev
 *   Buy price:  price = BASE_PRICE + CURVE_COEFFICIENT * (supply ^ 1.5) / 1e18
 *   Sell price: price = BASE_PRICE + CURVE_COEFFICIENT * (supply ^ 1.2) / 1e18
 *
 *   The spread between buy and sell curves protects against quick flips.
 *
 *   Buy fee: flat 2%
 *   Sell fee: dynamic 2-15% from PerformanceOracle
 *
 *   Fixed-point math for fractional exponents uses iterative Newton's method approximations.
 */
contract TeamTokenFactory is Ownable, ReentrancyGuard {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    uint256 public constant BASE_PRICE = 0.001 ether;         // minimum price
    uint256 public constant CURVE_COEFFICIENT = 1e12;          // curve steepness
    uint256 public constant BUY_FEE_BPS = 200;                // 2% flat buy fee
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_SUPPLY = 1_000_000 ether;     // 1M tokens per team
    uint256 public constant PRECISION = 1e18;

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    PerformanceOracle public oracle;
    CircuitBreaker public circuitBreaker;
    address public rewardDistributor;

    address[] public teamTokens;
    mapping(address => bool) public isTeamToken;
    mapping(string => address) public symbolToToken;
    mapping(address => uint256) public tokenReserves;  // C-3 fix: actual ETH reserves per token

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    event TeamTokenCreated(address indexed token, string name, string symbol);
    event TokensPurchased(address indexed token, address indexed buyer, uint256 amount, uint256 cost, uint256 fee);
    event TokensSold(address indexed token, address indexed seller, uint256 amount, uint256 proceeds, uint256 fee);
    event OracleUpdated(address indexed newOracle);
    event CircuitBreakerUpdated(address indexed newCircuitBreaker);
    event RewardDistributorUpdated(address indexed newRewardDistributor);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------
    error TokenAlreadyExists();
    error InvalidToken();
    error InsufficientPayment();
    error InsufficientBalance();
    error TradingPaused();
    error ZeroAmount();
    error TransferFailed();
    error ExceedsMaxSupply();
    error InsufficientReserves();
    error SlippageExceeded();
    error MaxIterationsExceeded();

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------
    constructor(
        address _oracle,
        address _circuitBreaker,
        address _rewardDistributor
    ) Ownable(msg.sender) {
        require(_oracle != address(0), "Zero address");
        require(_circuitBreaker != address(0), "Zero address");
        require(_rewardDistributor != address(0), "Zero address");
        oracle = PerformanceOracle(_oracle);
        circuitBreaker = CircuitBreaker(_circuitBreaker);
        rewardDistributor = _rewardDistributor;
    }

    // -----------------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------------
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Zero address");
        oracle = PerformanceOracle(_oracle);
        emit OracleUpdated(_oracle);
    }

    function setCircuitBreaker(address _circuitBreaker) external onlyOwner {
        require(_circuitBreaker != address(0), "Zero address");
        circuitBreaker = CircuitBreaker(_circuitBreaker);
        emit CircuitBreakerUpdated(_circuitBreaker);
    }

    function setRewardDistributor(address _rewardDistributor) external onlyOwner {
        require(_rewardDistributor != address(0), "Zero address");
        rewardDistributor = _rewardDistributor;
        emit RewardDistributorUpdated(_rewardDistributor);
    }

    /**
     * @notice Set exemption on a team token (proxy through factory since tokens use onlyFactory).
     * @param tokenAddress The team token address.
     * @param account The account to exempt.
     * @param exempt Whether to exempt or un-exempt.
     */
    function setTokenExempt(address tokenAddress, address account, bool exempt) external onlyOwner {
        if (!isTeamToken[tokenAddress]) revert InvalidToken();
        TeamToken(tokenAddress).setExempt(account, exempt);
    }

    function setTokenExemptTo(address tokenAddress, address account, bool exempt) external onlyOwner {
        if (!isTeamToken[tokenAddress]) revert InvalidToken();
        TeamToken(tokenAddress).setExemptTo(account, exempt);
    }

    // -----------------------------------------------------------------------
    // Token Creation
    // -----------------------------------------------------------------------
    /**
     * @notice Create a new PSL team token.
     * @param name  Full team name (e.g., "Islamabad United").
     * @param symbol Token symbol (e.g., "ISU").
     */
    function createTeamToken(string calldata name, string calldata symbol) external onlyOwner returns (address) {
        if (symbolToToken[symbol] != address(0)) revert TokenAlreadyExists();

        TeamToken token = new TeamToken(
            name,
            symbol,
            address(this), // factory is the minter
            rewardDistributor,
            MAX_SUPPLY
        );

        address tokenAddr = address(token);
        teamTokens.push(tokenAddr);
        isTeamToken[tokenAddr] = true;
        symbolToToken[symbol] = tokenAddr;

        emit TeamTokenCreated(tokenAddr, name, symbol);
        return tokenAddr;
    }

    // -----------------------------------------------------------------------
    // Buy — Asymmetric Bonding Curve
    // -----------------------------------------------------------------------
    /**
     * @notice Buy team tokens by sending ETH. Price follows the buy bonding curve.
     * @param tokenAddress The team token to buy.
     * @param minTokensOut H-3 fix: minimum tokens expected (slippage protection). Pass 0 to skip.
     */
    function buy(address tokenAddress, uint256 minTokensOut) external payable nonReentrant {
        if (!isTeamToken[tokenAddress]) revert InvalidToken();
        if (msg.value == 0) revert InsufficientPayment();
        if (circuitBreaker.isPaused(tokenAddress)) revert TradingPaused();
        // H2 fix: reject zero slippage protection to prevent sandwich attacks
        require(minTokensOut > 0, "Set slippage protection");

        TeamToken token = TeamToken(tokenAddress);
        uint256 currentSupply = token.totalSupply();

        // Deduct buy fee
        uint256 fee = (msg.value * BUY_FEE_BPS) / BASIS_POINTS;
        uint256 netPayment = msg.value - fee;

        // Calculate how many tokens the user gets for netPayment
        (uint256 tokensOut, uint256 ethSpent) = _calculateBuyTokens(currentSupply, netPayment);
        if (tokensOut == 0) revert ZeroAmount();
        if (currentSupply + tokensOut > MAX_SUPPLY) revert ExceedsMaxSupply();

        // H-3 fix: slippage protection
        if (tokensOut < minTokensOut) revert SlippageExceeded();

        // Mint tokens to buyer
        token.mint(msg.sender, tokensOut);

        // C-3 fix: track actual ETH reserves (only the ETH actually spent on the curve)
        tokenReserves[tokenAddress] += ethSpent;

        // Refund unspent ETH to buyer (handles MAX_SUPPLY cap and MAX_ITERATIONS break)
        // Recalculate fee proportional to actual spend so user isn't overcharged
        uint256 actualFee = (ethSpent * BUY_FEE_BPS) / (BASIS_POINTS - BUY_FEE_BPS);
        uint256 refund = msg.value - ethSpent - actualFee;
        if (refund > 0) {
            (bool refundSuccess,) = msg.sender.call{value: refund}("");
            if (!refundSuccess) revert TransferFailed();
        }

        // Send fee to reward distributor (only the proportional fee)
        if (actualFee > 0 && rewardDistributor != address(0)) {
            (bool success,) = rewardDistributor.call{value: actualFee}("");
            if (!success) revert TransferFailed();
        }

        // Record price for circuit breaker
        uint256 newPrice = getBuyPrice(tokenAddress);
        circuitBreaker.recordPrice(tokenAddress, newPrice);

        // Update sell tax from oracle
        _updateSellTax(tokenAddress);

        emit TokensPurchased(tokenAddress, msg.sender, tokensOut, msg.value, fee);
    }

    // -----------------------------------------------------------------------
    // Sell — Asymmetric Bonding Curve
    // -----------------------------------------------------------------------
    /**
     * @notice Sell team tokens back to the curve for ETH. Price follows the sell bonding curve.
     * @param tokenAddress The team token to sell.
     * @param amount The number of tokens to sell (in wei).
     * @param minProceeds H-3 fix: minimum ETH proceeds expected (slippage protection). Pass 0 to skip.
     */
    function sell(address tokenAddress, uint256 amount, uint256 minProceeds) external nonReentrant {
        if (!isTeamToken[tokenAddress]) revert InvalidToken();
        if (amount == 0) revert ZeroAmount();
        if (circuitBreaker.isPaused(tokenAddress)) revert TradingPaused();
        // H2 fix: reject zero slippage protection to prevent sandwich attacks
        require(minProceeds > 0, "Set slippage protection");

        TeamToken token = TeamToken(tokenAddress);
        if (token.balanceOf(msg.sender) < amount) revert InsufficientBalance();

        uint256 currentSupply = token.totalSupply();

        // Calculate ETH out from sell curve
        uint256 grossProceeds = _calculateSellProceeds(currentSupply, amount);

        // Get dynamic sell fee from oracle
        uint256 sellFeeBps;
        try oracle.getSellTaxRate(tokenAddress) returns (uint256 taxRate) {
            sellFeeBps = taxRate;
        } catch {
            sellFeeBps = 500; // fallback 5%
        }

        uint256 fee = (grossProceeds * sellFeeBps) / BASIS_POINTS;
        uint256 netProceeds = grossProceeds - fee;

        // C-3 fix: cap proceeds to actual token reserves, revert if insufficient
        uint256 reserves = tokenReserves[tokenAddress];
        if (netProceeds + fee > reserves) revert InsufficientReserves();

        // H-3 fix: slippage protection
        if (netProceeds < minProceeds) revert SlippageExceeded();

        // C-3 fix: decrement tracked reserves
        tokenReserves[tokenAddress] -= (netProceeds + fee);

        // Burn tokens
        token.burn(msg.sender, amount);

        // Send fee to reward distributor
        if (fee > 0 && rewardDistributor != address(0)) {
            (bool sent,) = rewardDistributor.call{value: fee}("");
            if (!sent) revert TransferFailed();
        }

        // Send proceeds to seller
        if (netProceeds > 0) {
            (bool sent,) = msg.sender.call{value: netProceeds}("");
            if (!sent) revert TransferFailed();
        }

        // Record price for circuit breaker
        if (token.totalSupply() > 0) {
            uint256 newPrice = getSellPrice(tokenAddress);
            circuitBreaker.recordPrice(tokenAddress, newPrice);
        }

        emit TokensSold(tokenAddress, msg.sender, amount, netProceeds, fee);
    }

    // -----------------------------------------------------------------------
    // Price View Functions
    // -----------------------------------------------------------------------
    /**
     * @notice Get current buy price for one token at the current supply level.
     */
    function getBuyPrice(address tokenAddress) public view returns (uint256) {
        if (!isTeamToken[tokenAddress]) revert InvalidToken();
        uint256 supply = TeamToken(tokenAddress).totalSupply();
        return _buyPriceAtSupply(supply);
    }

    /**
     * @notice Get current sell price for one token at the current supply level.
     */
    function getSellPrice(address tokenAddress) public view returns (uint256) {
        if (!isTeamToken[tokenAddress]) revert InvalidToken();
        uint256 supply = TeamToken(tokenAddress).totalSupply();
        return _sellPriceAtSupply(supply);
    }

    /**
     * @notice Estimate how many tokens you get for a given ETH amount (before fee).
     */
    function estimateBuyTokens(address tokenAddress, uint256 ethAmount) external view returns (uint256) {
        if (!isTeamToken[tokenAddress]) revert InvalidToken();
        uint256 supply = TeamToken(tokenAddress).totalSupply();
        uint256 net = ethAmount - (ethAmount * BUY_FEE_BPS) / BASIS_POINTS;
        (uint256 tokens,) = _calculateBuyTokens(supply, net);
        return tokens;
    }

    /**
     * @notice Estimate ETH proceeds for selling a given token amount (before fee).
     */
    function estimateSellProceeds(address tokenAddress, uint256 tokenAmount) external view returns (uint256) {
        if (!isTeamToken[tokenAddress]) revert InvalidToken();
        uint256 supply = TeamToken(tokenAddress).totalSupply();
        return _calculateSellProceeds(supply, tokenAmount);
    }

    function getTeamTokenCount() external view returns (uint256) {
        return teamTokens.length;
    }

    function getTeamTokenAtIndex(uint256 index) external view returns (address) {
        return teamTokens[index];
    }

    // -----------------------------------------------------------------------
    // Fixed-Point Math Helpers
    // -----------------------------------------------------------------------
    /**
     * @dev Buy price at a given supply level.
     *      price = BASE_PRICE + CURVE_COEFFICIENT * supply^1.5 / 1e18
     */
    function _buyPriceAtSupply(uint256 supply) internal pure returns (uint256) {
        if (supply == 0) return BASE_PRICE;
        uint256 curveComponent = (CURVE_COEFFICIENT * _pow15(supply)) / PRECISION;
        return BASE_PRICE + curveComponent;
    }

    /**
     * @dev Sell price at a given supply level.
     *      price = BASE_PRICE + CURVE_COEFFICIENT * supply^1.2 / 1e18
     */
    function _sellPriceAtSupply(uint256 supply) internal pure returns (uint256) {
        if (supply == 0) return BASE_PRICE;
        uint256 curveComponent = (CURVE_COEFFICIENT * _pow12(supply)) / PRECISION;
        return BASE_PRICE + curveComponent;
    }

    /**
     * @dev Calculate how many tokens can be purchased for `ethAmount` at current supply.
     *      Uses numerical integration (trapezoidal approximation) over small steps.
     */
    /// @dev C-4 fix: maximum iterations to prevent unbounded gas consumption
    uint256 internal constant MAX_ITERATIONS = 10000;

    function _calculateBuyTokens(uint256 currentSupply, uint256 ethAmount) internal pure returns (uint256 totalTokens, uint256 ethSpent) {
        uint256 remaining = ethAmount;
        totalTokens = 0;
        ethSpent = 0;
        uint256 supply = currentSupply;
        uint256 iterations = 0;

        while (remaining > 0) {
            // C-4 fix: adaptive step size based on remaining ETH
            uint256 step;
            if (remaining > 10 ether) {
                step = 10e18;  // 10 tokens
            } else if (remaining > 1 ether) {
                step = 5e18;   // 5 tokens
            } else if (remaining > 0.1 ether) {
                step = 1e18;   // 1 token
            } else {
                step = 1e17;   // 0.1 token
            }

            uint256 price = _buyPriceAtSupply(supply);
            // Cost for one step of tokens
            uint256 stepCost = (price * step) / PRECISION;

            if (stepCost == 0) {
                // At very low supply, price is basically BASE_PRICE
                stepCost = (BASE_PRICE * step) / PRECISION;
                if (stepCost == 0) stepCost = 1;
            }

            if (remaining >= stepCost) {
                remaining -= stepCost;
                totalTokens += step;
                ethSpent += stepCost;
                supply += step;
            } else {
                // Partial step
                uint256 partialTokens = (remaining * step) / stepCost;
                totalTokens += partialTokens;
                ethSpent += remaining;
                remaining = 0;
            }

            // Safety: prevent infinite loop — cap at MAX_SUPPLY
            if (supply + step > MAX_SUPPLY) break;

            // C-4 fix: bound iterations
            iterations++;
            if (iterations >= MAX_ITERATIONS) break;
        }

        return (totalTokens, ethSpent);
    }

    /**
     * @dev Calculate ETH proceeds for selling `tokenAmount` at current supply.
     *      Uses numerical integration over the sell curve.
     */
    function _calculateSellProceeds(uint256 currentSupply, uint256 tokenAmount) internal pure returns (uint256) {
        if (tokenAmount > currentSupply) tokenAmount = currentSupply;

        uint256 remaining = tokenAmount;
        uint256 totalProceeds = 0;
        uint256 supply = currentSupply;
        uint256 iterations = 0;

        while (remaining > 0) {
            // Symmetric step sizing matching the buy-side logic
            uint256 step;
            if (remaining > 100e18) {
                step = 10e18;   // 10 tokens
            } else if (remaining > 10e18) {
                step = 5e18;    // 5 tokens
            } else if (remaining > 1e18) {
                step = 1e18;    // 1 token
            } else {
                step = 1e17;    // 0.1 token
            }

            uint256 currentStep = remaining >= step ? step : remaining;
            uint256 price = _sellPriceAtSupply(supply);
            uint256 proceeds = (price * currentStep) / PRECISION;
            totalProceeds += proceeds;
            supply -= currentStep;
            remaining -= currentStep;

            // Bound iterations to prevent unbounded gas consumption
            iterations++;
            if (iterations >= MAX_ITERATIONS) revert MaxIterationsExceeded();
        }

        return totalProceeds;
    }

    /**
     * @dev Compute x^1.5 = x * sqrt(x) in fixed-point (18 decimals).
     *      Result is in the same scale as x (i.e., if x is in wei, result is in wei).
     */
    function _pow15(uint256 x) internal pure returns (uint256) {
        // x^1.5 = x * x^0.5 = x * sqrt(x)
        uint256 sqrtX = _sqrt(x);
        // x is in 1e18 scale, sqrtX is in 1e9 scale (sqrt of 1e18 = 1e9)
        // We want result in 1e18 scale: x * sqrtX / 1e9
        return (x * sqrtX) / 1e9;
    }

    /**
     * @dev Compute x^1.2 in fixed-point.
     *      x^1.2 = x * x^0.2 = x * (x^(1/5))
     *      Fifth root approximation via Newton's method.
     */
    function _pow12(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        // x^1.2 = x * x^0.2
        uint256 fifthRoot = _fifthRoot(x);
        // x in 1e18 scale, fifthRoot is approximately in a different scale.
        // fifthRoot(1e18) ~ 1e18^(1/5) ~ 15848931924611  (approx 1.585e13)
        // We want x^1.2 in 1e18 scale = x * fifthRoot(x) / fifthRoot(1e18)
        uint256 scaleFactor = _fifthRoot(PRECISION); // fifthRoot(1e18)
        if (scaleFactor == 0) scaleFactor = 1;
        return (x * fifthRoot) / scaleFactor;
    }

    /**
     * @dev Integer square root (Babylonian / Newton's method).
     */
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    /**
     * @dev Fifth root via Newton's method: x^(1/5)
     *      Newton iteration: y_{n+1} = (4*y_n + x / y_n^4) / 5
     */
    function _fifthRoot(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        if (x == 1) return 1;

        // Initial guess using bit length
        uint256 y = x;
        // Rough initial estimate: start with x^(1/4) then refine
        uint256 guess = _sqrt(_sqrt(x));
        if (guess == 0) guess = 1;
        y = guess;

        // Newton iterations (5 iterations should converge for our range)
        for (uint256 i = 0; i < 10; i++) {
            // y^4
            uint256 y2 = y * y;
            uint256 y4 = y2 * y2;
            if (y4 == 0) break;
            uint256 yNew = (4 * y + x / y4) / 5;
            if (yNew >= y) break;
            y = yNew;
        }

        return y;
    }

    // -----------------------------------------------------------------------
    // Internal Helpers
    // -----------------------------------------------------------------------
    function _updateSellTax(address tokenAddress) internal {
        try oracle.getSellTaxRate(tokenAddress) returns (uint256 taxRate) {
            TeamToken(tokenAddress).setBaseSellTax(taxRate);
        } catch {
            // Oracle not available or team not registered; keep default
        }
    }

    /**
     * @notice Withdraw ETH that is not tracked in any token's reserves.
     * @dev Recovers ETH sent directly to the contract outside of buy().
     */
    function withdrawUntracked() external onlyOwner {
        uint256 tracked = 0;
        for (uint256 i = 0; i < teamTokens.length; i++) {
            tracked += tokenReserves[teamTokens[i]];
        }
        uint256 untracked = address(this).balance - tracked;
        require(untracked > 0, "No untracked ETH");
        (bool success,) = owner().call{value: untracked}("");
        if (!success) revert TransferFailed();
    }

    // Allow the contract to receive ETH (for liquidity backing)
    receive() external payable {}
}
