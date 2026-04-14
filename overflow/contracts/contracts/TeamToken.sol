// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TeamToken
 * @notice ERC-20 token for a PSL team with anti-flip protections and progressive sell tax.
 * @dev
 *   - maxTxAmount = 1% of total supply per transaction
 *   - 60-second cooldown between sells per wallet
 *   - Progressive sell tax based on hold duration: <5min=12%, <30min=8%, <2hrs=5%, >2hrs=base oracle rate
 *   - All transfers are treated as sells (to prevent tax avoidance via wallet-to-wallet transfers)
 *   - Floor price mechanism via treasury-backed minimum price
 *
 * The factory is the only entity allowed to mint / burn. Tax collection and enforcement
 * happen inside the overridden `_update` hook (OZ v5 pattern).
 */
contract TeamToken is ERC20, Ownable {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    uint256 public constant MAX_TX_BPS = 100; // 1% of total supply
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant COOLDOWN_PERIOD = 60; // seconds between sells

    // Progressive sell-tax tiers (basis points)
    uint256 public constant TAX_TIER_1 = 1200; // <5 min  → 12%
    uint256 public constant TAX_TIER_2 = 800;  // <30 min → 8%
    uint256 public constant TAX_TIER_3 = 500;  // <2 hrs  → 5%
    // >2 hrs → base rate from oracle (dynamic)

    uint256 public constant TIER_1_DURATION = 5 minutes;
    uint256 public constant TIER_2_DURATION = 30 minutes;
    uint256 public constant TIER_3_DURATION = 2 hours;

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    address public factory;          // TeamTokenFactory — only minter/burner
    address public taxRecipient;     // RewardDistributor
    uint256 public floorPrice;       // treasury-backed minimum price (wei per token)
    uint256 public baseSellTaxBps;   // fallback base sell tax (set by factory from oracle)
    uint256 public maxSupply;        // maximum mintable supply

    mapping(address => uint256) public lastBuyTimestamp;  // per-wallet buy time
    mapping(address => uint256) public lastSellTimestamp; // per-wallet cooldown tracker

    // Addresses exempt from checks when sending (skip tax, cooldown, max-tx)
    mapping(address => bool) public isExemptFrom;
    // Addresses exempt from tax when receiving (skip tax only, still enforce cooldown + max-tx on sender)
    mapping(address => bool) public isExemptTo;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    event TokenBought(address indexed buyer, uint256 amount, uint256 cost);
    event TokenSold(address indexed seller, uint256 amount, uint256 proceeds);
    event TaxApplied(address indexed from, uint256 taxAmount, uint256 taxBps);
    event FloorPriceUpdated(uint256 oldFloor, uint256 newFloor);
    event BaseSellTaxUpdated(uint256 oldTax, uint256 newTax);
    event TaxRecipientUpdated(address oldRecipient, address newRecipient);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------
    error OnlyFactory();
    error ExceedsMaxTx();
    error SellCooldownActive();
    error BelowFloorPrice();
    error ExceedsMaxSupply();
    error TaxExceedsMaximum();

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------
    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------
    constructor(
        string memory _name,
        string memory _symbol,
        address _factory,
        address _taxRecipient,
        uint256 _maxSupply
    ) ERC20(_name, _symbol) Ownable(_factory) {
        factory = _factory;
        taxRecipient = _taxRecipient;
        maxSupply = _maxSupply;
        baseSellTaxBps = 500; // default 5%
        isExemptFrom[_factory] = true;
        isExemptTo[_factory] = true;
        isExemptFrom[_taxRecipient] = true;
        isExemptTo[_taxRecipient] = true;
    }

    // -----------------------------------------------------------------------
    // Factory-only Functions
    // -----------------------------------------------------------------------
    function mint(address to, uint256 amount) external onlyFactory {
        if (totalSupply() + amount > maxSupply) revert ExceedsMaxSupply();
        lastBuyTimestamp[to] = block.timestamp;
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyFactory {
        _burn(from, amount);
    }

    function setBaseSellTax(uint256 newTaxBps) external onlyFactory {
        // H-2 fix: enforce upper bound on sell tax
        if (newTaxBps > 1500) revert TaxExceedsMaximum();
        uint256 old = baseSellTaxBps;
        baseSellTaxBps = newTaxBps;
        emit BaseSellTaxUpdated(old, newTaxBps);
    }

    function setFloorPrice(uint256 newFloor) external onlyFactory {
        uint256 old = floorPrice;
        floorPrice = newFloor;
        emit FloorPriceUpdated(old, newFloor);
    }

    function setTaxRecipient(address newRecipient) external onlyFactory {
        address old = taxRecipient;
        taxRecipient = newRecipient;
        isExemptFrom[newRecipient] = true;
        isExemptTo[newRecipient] = true;
        emit TaxRecipientUpdated(old, newRecipient);
    }

    function setExemptFrom(address account, bool exempt) external onlyFactory {
        isExemptFrom[account] = exempt;
    }

    function setExemptTo(address account, bool exempt) external onlyFactory {
        isExemptTo[account] = exempt;
    }

    /// @notice Convenience setter: set both from and to exemption at once
    function setExempt(address account, bool exempt) external onlyFactory {
        isExemptFrom[account] = exempt;
        isExemptTo[account] = exempt;
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------
    /**
     * @notice Calculate progressive sell tax for a wallet based on hold duration.
     */
    function getSellTaxBps(address seller) public view returns (uint256) {
        uint256 buyTime = lastBuyTimestamp[seller];
        if (buyTime == 0) return baseSellTaxBps;

        uint256 holdDuration = block.timestamp - buyTime;

        if (holdDuration < TIER_1_DURATION) return TAX_TIER_1;
        if (holdDuration < TIER_2_DURATION) return TAX_TIER_2;
        if (holdDuration < TIER_3_DURATION) return TAX_TIER_3;
        return baseSellTaxBps;
    }

    function maxTxAmount() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return type(uint256).max;
        return (supply * MAX_TX_BPS) / BASIS_POINTS;
    }

    // -----------------------------------------------------------------------
    // ERC-20 Transfer Override
    // -----------------------------------------------------------------------
    /**
     * @dev Override `_update` (OZ v5) to enforce:
     *      1. Max tx amount (1% of supply)
     *      2. 60s sell cooldown
     *      3. Progressive sell tax on all non-mint/burn transfers
     *
     *      All transfers (including wallet-to-wallet) are treated as sells
     *      to prevent tax avoidance.
     */
    function _update(address from, address to, uint256 amount) internal override {
        // Mint & burn bypass all checks
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        // Exempt sender: skip ALL checks (tax, cooldown, max-tx).
        // Protocol contracts (factory, rewardDistributor) need to send freely.
        if (isExemptFrom[from]) {
            super._update(from, to, amount);
            // Update buy timestamp for receiver even on exempt-from transfers
            lastBuyTimestamp[to] = block.timestamp;
            return;
        }

        // --- Max tx check (always enforced on non-exempt senders) ---
        if (amount > maxTxAmount()) revert ExceedsMaxTx();

        // --- Cooldown check (always enforced on non-exempt senders) ---
        if (block.timestamp < lastSellTimestamp[from] + COOLDOWN_PERIOD) {
            revert SellCooldownActive();
        }
        lastSellTimestamp[from] = block.timestamp;

        // Exempt receiver: skip tax only. Cooldown and max-tx already enforced above.
        if (isExemptTo[to]) {
            super._update(from, to, amount);
            return;
        }

        // --- Progressive sell tax ---
        uint256 taxBps = getSellTaxBps(from);
        uint256 taxAmount = (amount * taxBps) / BASIS_POINTS;
        uint256 afterTax = amount - taxAmount;

        if (taxAmount > 0 && taxRecipient != address(0)) {
            super._update(from, taxRecipient, taxAmount);
            emit TaxApplied(from, taxAmount, taxBps);
        }

        super._update(from, to, afterTax);

        // Update buy timestamp for the receiver (they now hold tokens from this time)
        lastBuyTimestamp[to] = block.timestamp;
    }
}
