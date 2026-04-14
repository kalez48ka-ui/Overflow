/**
 * End-to-end test script for Overflow platform on WireFluid testnet.
 *
 * Tests the full buy/sell flow:
 *   1. Setup wallets
 *   2. Fund test wallet
 *   3. Check contract state (prices for all team tokens)
 *   4. Buy IU tokens
 *   5. Check portfolio state
 *   6. Sell half the tokens
 *   7. Verify final state
 *
 * Usage:
 *   npx hardhat run scripts/e2e-test.js --network wirefluid
 */

const { ethers } = require("hardhat");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FACTORY_ADDRESS = "0x7FB2270dC9aBBaEfE37e12fdC177Af543646b3e6";
const IU_TOKEN_ADDRESS = "0x1c8a5A026A4F5CBf7BC4fdE2898d78628A199f1e";

const FACTORY_ABI = [
  "function buy(address tokenAddress, uint256 minTokensOut) external payable",
  "function sell(address tokenAddress, uint256 amount, uint256 minProceeds) external",
  "function getBuyPrice(address tokenAddress) public view returns (uint256)",
  "function getSellPrice(address tokenAddress) public view returns (uint256)",
  "function estimateBuyTokens(address tokenAddress, uint256 ethAmount) external view returns (uint256)",
  "function getTeamTokenCount() external view returns (uint256)",
  "function getTeamTokenAtIndex(uint256 index) external view returns (address)",
  "function tokenReserves(address) public view returns (uint256)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// ANSI colour helpers
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function header(title) {
  const line = "=".repeat(60);
  console.log(`\n${CYAN}${line}${RESET}`);
  console.log(`${CYAN}  ${title}${RESET}`);
  console.log(`${CYAN}${line}${RESET}\n`);
}

function success(msg) {
  console.log(`  ${GREEN}[PASS]${RESET} ${msg}`);
}

function fail(msg) {
  console.log(`  ${RED}[FAIL]${RESET} ${msg}`);
}

function info(msg) {
  console.log(`  ${YELLOW}[INFO]${RESET} ${msg}`);
}

function fmt(wei) {
  return ethers.formatEther(wei);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const results = { passed: 0, failed: 0 };

  console.log(`\n${BOLD}${CYAN}  Overflow E2E Test  --  WireFluid Testnet (chain 92533)${RESET}\n`);

  // -----------------------------------------------------------------------
  // Step 1: Setup
  // -----------------------------------------------------------------------
  header("Step 1: Setup");

  let deployer, testWallet, factory;

  try {
    const signers = await ethers.getSigners();
    deployer = signers[0];

    testWallet = ethers.Wallet.createRandom().connect(ethers.provider);

    const deployerBalance = await ethers.provider.getBalance(deployer.address);

    info(`Deployer address : ${deployer.address}`);
    info(`Deployer balance : ${fmt(deployerBalance)} WIRE`);
    info(`Test wallet addr : ${testWallet.address}`);

    factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, deployer);

    success("Wallets initialised and factory contract connected");
    results.passed++;
  } catch (err) {
    fail(`Setup failed: ${err.message}`);
    results.failed++;
    printSummary(results);
    return;
  }

  // -----------------------------------------------------------------------
  // Step 2: Fund test wallet
  // -----------------------------------------------------------------------
  header("Step 2: Fund test wallet with 0.5 WIRE");

  try {
    const fundTx = await deployer.sendTransaction({
      to: testWallet.address,
      value: ethers.parseEther("0.5"),
    });
    const fundReceipt = await fundTx.wait();
    info(`Tx hash : ${fundTx.hash}`);
    info(`Gas used: ${fundReceipt.gasUsed.toString()}`);

    const testBalance = await ethers.provider.getBalance(testWallet.address);
    info(`Test wallet balance: ${fmt(testBalance)} WIRE`);

    if (testBalance >= ethers.parseEther("0.49")) {
      success("Test wallet funded successfully");
      results.passed++;
    } else {
      fail(`Unexpected balance: ${fmt(testBalance)}`);
      results.failed++;
    }
  } catch (err) {
    fail(`Funding failed: ${err.message}`);
    results.failed++;
  }

  // -----------------------------------------------------------------------
  // Step 3: Check contract state
  // -----------------------------------------------------------------------
  header("Step 3: Check contract state (team token prices)");

  try {
    const count = await factory.getTeamTokenCount();
    info(`Team token count: ${count.toString()}`);

    console.log("");
    console.log(
      `  ${BOLD}${"Symbol".padEnd(8)} ${"Buy Price (WIRE)".padEnd(22)} ${"Sell Price (WIRE)".padEnd(22)} Address${RESET}`
    );
    console.log(`  ${"─".repeat(80)}`);

    for (let i = 0; i < Number(count); i++) {
      const tokenAddr = await factory.getTeamTokenAtIndex(i);
      const token = new ethers.Contract(tokenAddr, ERC20_ABI, ethers.provider);
      const symbol = await token.symbol();
      const buyPrice = await factory.getBuyPrice(tokenAddr);
      const sellPrice = await factory.getSellPrice(tokenAddr);

      console.log(
        `  ${symbol.padEnd(8)} ${fmt(buyPrice).padEnd(22)} ${fmt(sellPrice).padEnd(22)} ${tokenAddr}`
      );
    }

    console.log("");
    success(`Listed ${count.toString()} team tokens`);
    results.passed++;
  } catch (err) {
    fail(`Contract state check failed: ${err.message}`);
    results.failed++;
  }

  // -----------------------------------------------------------------------
  // Step 4: Buy IU tokens
  // -----------------------------------------------------------------------
  header("Step 4: Buy IU tokens (0.1 WIRE)");

  let tokensReceived = 0n;

  try {
    const buyAmount = ethers.parseEther("0.1");

    // Estimate tokens
    const estimated = await factory.estimateBuyTokens(IU_TOKEN_ADDRESS, buyAmount);
    info(`Estimated tokens for 0.1 WIRE: ${fmt(estimated)} IU`);

    // Balance before
    const iuToken = new ethers.Contract(IU_TOKEN_ADDRESS, ERC20_ABI, ethers.provider);
    const balBefore = await iuToken.balanceOf(testWallet.address);

    // Execute buy from test wallet
    const factoryAsTest = factory.connect(testWallet);
    const buyTx = await factoryAsTest.buy(IU_TOKEN_ADDRESS, 0, { value: buyAmount });
    const buyReceipt = await buyTx.wait();

    // Balance after
    const balAfter = await iuToken.balanceOf(testWallet.address);
    tokensReceived = balAfter - balBefore;

    info(`Tx hash        : ${buyTx.hash}`);
    info(`Gas used       : ${buyReceipt.gasUsed.toString()}`);
    info(`Tokens received: ${fmt(tokensReceived)} IU`);

    if (tokensReceived > 0n) {
      success("Buy transaction succeeded");
      results.passed++;
    } else {
      fail("Buy returned zero tokens");
      results.failed++;
    }
  } catch (err) {
    fail(`Buy failed: ${err.message}`);
    results.failed++;
  }

  // -----------------------------------------------------------------------
  // Step 5: Check portfolio state
  // -----------------------------------------------------------------------
  header("Step 5: Portfolio state after purchase");

  try {
    const iuToken = new ethers.Contract(IU_TOKEN_ADDRESS, ERC20_ABI, ethers.provider);
    const iuBalance = await iuToken.balanceOf(testWallet.address);
    const sellPrice = await factory.getSellPrice(IU_TOKEN_ADDRESS);
    const buyPrice = await factory.getBuyPrice(IU_TOKEN_ADDRESS);

    // Approximate value at sell price (tokens * sellPrice / 1e18)
    const approxValue = (iuBalance * sellPrice) / ethers.parseEther("1");

    info(`IU balance      : ${fmt(iuBalance)} IU`);
    info(`Current buy price : ${fmt(buyPrice)} WIRE`);
    info(`Current sell price: ${fmt(sellPrice)} WIRE`);
    info(`Approx holdings value (at sell price): ${fmt(approxValue)} WIRE`);

    success("Portfolio state retrieved");
    results.passed++;
  } catch (err) {
    fail(`Portfolio check failed: ${err.message}`);
    results.failed++;
  }

  // -----------------------------------------------------------------------
  // Step 6: Sell half the IU tokens
  // -----------------------------------------------------------------------
  header("Step 6: Sell half of IU tokens");

  try {
    const iuToken = new ethers.Contract(IU_TOKEN_ADDRESS, ERC20_ABI, testWallet);
    const iuBalance = await iuToken.balanceOf(testWallet.address);
    const halfTokens = iuBalance / 2n;

    info(`Current IU balance: ${fmt(iuBalance)} IU`);
    info(`Selling           : ${fmt(halfTokens)} IU`);

    const wireBefore = await ethers.provider.getBalance(testWallet.address);

    // Approve factory to spend tokens (in case needed)
    const approveTx = await iuToken.approve(FACTORY_ADDRESS, halfTokens);
    await approveTx.wait();
    info("Approval tx confirmed");

    // Execute sell
    const factoryAsTest = factory.connect(testWallet);
    const sellTx = await factoryAsTest.sell(IU_TOKEN_ADDRESS, halfTokens, 0);
    const sellReceipt = await sellTx.wait();

    const wireAfter = await ethers.provider.getBalance(testWallet.address);
    const iuAfter = await iuToken.balanceOf(testWallet.address);

    // WIRE received = wireAfter - wireBefore + gasCost (gas was paid from WIRE)
    const gasCost = sellReceipt.gasUsed * sellReceipt.gasPrice;
    const wireReceived = wireAfter - wireBefore + gasCost;

    info(`Tx hash          : ${sellTx.hash}`);
    info(`Gas used         : ${sellReceipt.gasUsed.toString()}`);
    info(`WIRE received    : ${fmt(wireReceived)} WIRE`);
    info(`Remaining IU     : ${fmt(iuAfter)} IU`);

    if (wireReceived > 0n && iuAfter < iuBalance) {
      success("Sell transaction succeeded");
      results.passed++;
    } else {
      fail("Sell produced unexpected results");
      results.failed++;
    }
  } catch (err) {
    fail(`Sell failed: ${err.message}`);
    results.failed++;
  }

  // -----------------------------------------------------------------------
  // Step 7: Verify final state
  // -----------------------------------------------------------------------
  header("Step 7: Final state verification");

  try {
    const iuToken = new ethers.Contract(IU_TOKEN_ADDRESS, ERC20_ABI, ethers.provider);

    const testWireBalance = await ethers.provider.getBalance(testWallet.address);
    const testIuBalance = await iuToken.balanceOf(testWallet.address);
    const factoryReserves = await factory.tokenReserves(IU_TOKEN_ADDRESS);
    const factoryWireBalance = await ethers.provider.getBalance(FACTORY_ADDRESS);

    info(`Test wallet WIRE balance : ${fmt(testWireBalance)} WIRE`);
    info(`Test wallet IU balance   : ${fmt(testIuBalance)} IU`);
    info(`Factory IU reserves      : ${fmt(factoryReserves)}`);
    info(`Factory WIRE balance     : ${fmt(factoryWireBalance)} WIRE`);

    // Sanity checks
    let allGood = true;

    if (testWireBalance > 0n) {
      success("Test wallet has remaining WIRE");
    } else {
      fail("Test wallet has zero WIRE");
      allGood = false;
    }

    if (testIuBalance > 0n) {
      success("Test wallet holds IU tokens");
    } else {
      fail("Test wallet has zero IU tokens");
      allGood = false;
    }

    if (factoryWireBalance > 0n) {
      success("Factory holds WIRE reserves");
    } else {
      fail("Factory has zero WIRE reserves");
      allGood = false;
    }

    if (allGood) {
      results.passed++;
    } else {
      results.failed++;
    }
  } catch (err) {
    fail(`Final verification failed: ${err.message}`);
    results.failed++;
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  printSummary(results);
}

function printSummary(results) {
  header("Test Summary");

  const total = results.passed + results.failed;
  const colour = results.failed === 0 ? GREEN : RED;

  console.log(`  Total steps : ${total}`);
  console.log(`  ${GREEN}Passed${RESET}      : ${results.passed}`);
  console.log(`  ${RED}Failed${RESET}      : ${results.failed}`);
  console.log("");

  if (results.failed === 0) {
    console.log(`  ${colour}${BOLD}ALL CHECKS PASSED${RESET}\n`);
  } else {
    console.log(`  ${colour}${BOLD}SOME CHECKS FAILED${RESET}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n${RED}Unhandled error:${RESET}`, err);
    process.exit(1);
  });
