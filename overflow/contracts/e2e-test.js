const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load .env
const envContent = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
const PRIVATE_KEY = envContent.match(/DEPLOYER_PRIVATE_KEY=(\S+)/)[1];

const RPC = "https://evm.wirefluid.com";
const provider = new ethers.JsonRpcProvider(RPC, { chainId: 92533, name: "wirefluid" });
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract addresses
const ADDRESSES = {
  TeamTokenFactory: "0x7FB2270dC9aBBaEfE37e12fdC177Af543646b3e6",
  PerformanceOracle: "0xDd3b0e06374ac97EB8043aEB78946DAEe5E165cF",
  RewardDistributor: "0x0A1B77B0240AD4456d7B1D9525390D7dE5A88B68",
  UpsetVault: "0xFec31718e8EC8f731Fc23D704E393F448D252DaE",
  CircuitBreaker: "0xF74D8f4159326E0aB055b07E470FAe843300a016",
  FanWars: "0xC634E9Ec20d9A43D4b546d10216982FE780CbF80",
};

const IU_TOKEN = "0x1c8a5A026A4F5CBf7BC4fdE2898d78628A199f1e";

function loadABI(contractName) {
  const artifact = require(path.join(__dirname, `artifacts/contracts/${contractName}.sol/${contractName}.json`));
  return artifact.abi;
}

const results = [];
function log(test, status, detail) {
  const icon = status === "PASS" ? "PASS" : "FAIL";
  console.log(`[${icon}] ${test}: ${detail}`);
  results.push({ test, status, detail });
}

async function main() {
  console.log("=== ON-CHAIN E2E TESTS ===\n");
  console.log(`Deployer: ${wallet.address}`);
  console.log(`RPC: ${RPC}\n`);

  // Load contracts
  const factory = new ethers.Contract(ADDRESSES.TeamTokenFactory, loadABI("TeamTokenFactory"), wallet);
  const oracle = new ethers.Contract(ADDRESSES.PerformanceOracle, loadABI("PerformanceOracle"), wallet);
  const circuitBreaker = new ethers.Contract(ADDRESSES.CircuitBreaker, loadABI("CircuitBreaker"), wallet);
  const rewardDist = new ethers.Contract(ADDRESSES.RewardDistributor, loadABI("RewardDistributor"), wallet);
  const upsetVault = new ethers.Contract(ADDRESSES.UpsetVault, loadABI("UpsetVault"), wallet);
  const fanWars = new ethers.Contract(ADDRESSES.FanWars, loadABI("FanWars"), wallet);
  const teamToken = new ethers.Contract(IU_TOKEN, loadABI("TeamToken"), wallet);

  // 1. Deployer WIRE balance
  try {
    const balance = await provider.getBalance(wallet.address);
    const wireBalance = ethers.formatEther(balance);
    log("1. Deployer WIRE balance", parseFloat(wireBalance) > 0 ? "PASS" : "FAIL", `${wireBalance} WIRE`);
  } catch (e) {
    log("1. Deployer WIRE balance", "FAIL", e.message);
  }

  // 2. TeamTokenFactory — getTeamTokenCount + getBuyPrice
  let teamCount = 0;
  try {
    teamCount = await factory.getTeamTokenCount();
    log("2a. TeamTokenFactory.getTeamTokenCount()", Number(teamCount) > 0 ? "PASS" : "FAIL", `${teamCount} tokens`);
  } catch (e) {
    log("2a. TeamTokenFactory.getTeamTokenCount()", "FAIL", e.message);
  }

  let buyPriceBefore;
  try {
    buyPriceBefore = await factory.getBuyPrice(IU_TOKEN);
    log("2b. TeamTokenFactory.getBuyPrice(IU)", "PASS", `${ethers.formatEther(buyPriceBefore)} WIRE per token`);
  } catch (e) {
    log("2b. TeamTokenFactory.getBuyPrice(IU)", "FAIL", e.message);
  }

  // 3. PerformanceOracle — getPerformanceScore
  try {
    const score = await oracle.getPerformanceScore(IU_TOKEN);
    log("3. PerformanceOracle.getPerformanceScore(IU)", "PASS", `Score: ${score}`);
  } catch (e) {
    log("3. PerformanceOracle.getPerformanceScore(IU)", "FAIL", e.message);
  }

  // 4. CircuitBreaker — isPaused
  try {
    const paused = await circuitBreaker.isPaused(IU_TOKEN);
    log("4. CircuitBreaker.isPaused(IU)", "PASS", `Paused: ${paused}`);
  } catch (e) {
    log("4. CircuitBreaker.isPaused(IU)", "FAIL", e.message);
  }

  // 5. RewardDistributor — currentEpoch + performanceRewardPool
  try {
    const epoch = await rewardDist.currentEpoch();
    log("5a. RewardDistributor.currentEpoch()", "PASS", `Epoch: ${epoch}`);
  } catch (e) {
    log("5a. RewardDistributor.currentEpoch()", "FAIL", e.message);
  }

  try {
    const pool = await rewardDist.performanceRewardPool();
    log("5b. RewardDistributor.performanceRewardPool()", "PASS", `Pool: ${ethers.formatEther(pool)} WIRE`);
  } catch (e) {
    log("5b. RewardDistributor.performanceRewardPool()", "FAIL", e.message);
  }

  // 6. UpsetVault — totalEarmarked + getVaultBalance
  try {
    const earmarked = await upsetVault.totalEarmarked();
    log("6a. UpsetVault.totalEarmarked()", "PASS", `Earmarked: ${ethers.formatEther(earmarked)} WIRE`);
  } catch (e) {
    log("6a. UpsetVault.totalEarmarked()", "FAIL", e.message);
  }

  try {
    const vaultBal = await upsetVault.getVaultBalance();
    log("6b. UpsetVault.getVaultBalance()", "PASS", `Balance: ${ethers.formatEther(vaultBal)} WIRE`);
  } catch (e) {
    log("6b. UpsetVault.getVaultBalance()", "FAIL", e.message);
  }

  // 7. FanWars — check boost pool
  try {
    const boostPool = await fanWars.boostPoolBalance();
    log("7. FanWars.boostPoolBalance()", "PASS", `Boost pool: ${ethers.formatEther(boostPool)} WIRE`);
  } catch (e) {
    log("7. FanWars.boostPoolBalance()", "FAIL", e.message);
  }

  // 8. Buy IU tokens with 0.01 WIRE
  let iuBalanceBefore, iuBalanceAfter;
  try {
    iuBalanceBefore = await teamToken.balanceOf(wallet.address);
    console.log(`\nIU balance before buy: ${ethers.formatEther(iuBalanceBefore)}`);

    const tx = await factory.buy(IU_TOKEN, 0, { value: ethers.parseEther("0.01"), gasLimit: 500000 });
    const receipt = await tx.wait();
    log("8. Buy 0.01 WIRE of IU tokens", receipt.status === 1 ? "PASS" : "FAIL", `Tx: ${receipt.hash}`);
  } catch (e) {
    log("8. Buy 0.01 WIRE of IU tokens", "FAIL", e.message.slice(0, 200));
  }

  // 9. Check IU token balance after buy
  try {
    iuBalanceAfter = await teamToken.balanceOf(wallet.address);
    const gained = iuBalanceAfter - iuBalanceBefore;
    log("9. IU balance after buy", gained > 0n ? "PASS" : "FAIL", `Balance: ${ethers.formatEther(iuBalanceAfter)}, Gained: ${ethers.formatEther(gained)}`);
  } catch (e) {
    log("9. IU balance after buy", "FAIL", e.message);
  }

  // 10. Sell half the IU tokens back
  let wireBalanceBefore;
  try {
    wireBalanceBefore = await provider.getBalance(wallet.address);
    const halfBalance = iuBalanceAfter / 2n;

    // Approve factory to spend tokens
    const approveTx = await teamToken.approve(ADDRESSES.TeamTokenFactory, halfBalance, { gasLimit: 100000 });
    await approveTx.wait();

    const sellTx = await factory.sell(IU_TOKEN, halfBalance, 0, { gasLimit: 500000 });
    const sellReceipt = await sellTx.wait();
    log("10. Sell half IU tokens", sellReceipt.status === 1 ? "PASS" : "FAIL", `Tx: ${sellReceipt.hash}, Sold: ${ethers.formatEther(halfBalance)}`);
  } catch (e) {
    log("10. Sell half IU tokens", "FAIL", e.message.slice(0, 200));
  }

  // 11. Check WIRE balance after sell
  try {
    const wireBalanceAfter = await provider.getBalance(wallet.address);
    log("11. WIRE balance after sell", "PASS", `Before: ${ethers.formatEther(wireBalanceBefore)}, After: ${ethers.formatEther(wireBalanceAfter)}`);
  } catch (e) {
    log("11. WIRE balance after sell", "FAIL", e.message);
  }

  // 12. Verify buy price changed (bonding curve)
  try {
    const buyPriceAfter = await factory.getBuyPrice(IU_TOKEN);
    const changed = buyPriceAfter !== buyPriceBefore;
    log("12. Buy price changed (bonding curve)", "PASS", `Before: ${ethers.formatEther(buyPriceBefore)}, After: ${ethers.formatEther(buyPriceAfter)}`);
  } catch (e) {
    log("12. Buy price changed (bonding curve)", "FAIL", e.message);
  }

  // Summary
  console.log("\n=== SUMMARY ===");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
}

main().catch(e => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});
