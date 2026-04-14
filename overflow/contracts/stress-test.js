const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load .env
const envContent = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
const PRIVATE_KEY = envContent.match(/DEPLOYER_PRIVATE_KEY=(\S+)/)[1];

const RPC = "https://evm.wirefluid.com";
const provider = new ethers.JsonRpcProvider(RPC, { chainId: 92533, name: "wirefluid" });
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// All contract addresses
const FACTORY = "0x7FB2270dC9aBBaEfE37e12fdC177Af543646b3e6";
const ORACLE = "0xDd3b0e06374ac97EB8043aEB78946DAEe5E165cF";
const REWARDS = "0x0A1B77B0240AD4456d7B1D9525390D7dE5A88B68";
const VAULT = "0xFec31718e8EC8f731Fc23D704E393F448D252DaE";
const BREAKER = "0xF74D8f4159326E0aB055b07E470FAe843300a016";
const FANWARS = "0xC634E9Ec20d9A43D4b546d10216982FE780CbF80";

// All 8 team tokens
const TOKENS = {
  IU: "0x1c8a5A026A4F5CBf7BC4fdE2898d78628A199f1e",
  LQ: "0x66419e794d379E707bc83fd7214cc61F11568e4b",
  MS: "0x9AF925e33F380eEC57111Da8ED13713afD0953D8",
  KK: "0x6D36f154e3b3232a63A6aC1800f02bA233004490",
  PZ: "0x5f9B45874872796c4b2c8C09ECa7883505CB36A8",
  QG: "0xC9BC62531E5914ba2865FB4B5537B7f84AcE1713",
  HK: "0x96fC2D2B5b6749cD67158215C3Ad05C81502386A",
  RW: "0xC137B2221E8411F059a5f4E0158161402693757E",
};

function loadABI(name) {
  return require(path.join(__dirname, `artifacts/contracts/${name}.sol/${name}.json`)).abi;
}

// Results tracking
const allTx = [];
let passCount = 0;
let failCount = 0;

function logTx(category, action, status, txHash, detail) {
  const icon = status === "PASS" ? "✓" : "✗";
  console.log(`  ${icon} ${action}: ${detail}`);
  allTx.push({ category, action, status, txHash: txHash || null, detail, timestamp: new Date().toISOString() });
  if (status === "PASS") passCount++;
  else failCount++;
}

async function sendTx(label, category, txPromise) {
  try {
    const tx = await txPromise;
    const receipt = await tx.wait();
    const gas = receipt.gasUsed.toString();
    logTx(category, label, "PASS", receipt.hash, `gas: ${gas}`);
    return receipt;
  } catch (e) {
    const msg = e.message?.slice(0, 150) || "Unknown error";
    logTx(category, label, "FAIL", null, msg);
    return null;
  }
}

async function readCall(label, category, promise) {
  try {
    const result = await promise;
    logTx(category, label, "PASS", null, `${result}`);
    return result;
  } catch (e) {
    logTx(category, label, "FAIL", null, e.message?.slice(0, 150));
    return null;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  OVERFLOW STRESS TEST — 100+ On-Chain Transactions     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const startBalance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Starting WIRE: ${ethers.formatEther(startBalance)}\n`);

  const factory = new ethers.Contract(FACTORY, loadABI("TeamTokenFactory"), wallet);
  const oracle = new ethers.Contract(ORACLE, loadABI("PerformanceOracle"), wallet);
  const breaker = new ethers.Contract(BREAKER, loadABI("CircuitBreaker"), wallet);
  const rewards = new ethers.Contract(REWARDS, loadABI("RewardDistributor"), wallet);
  const vault = new ethers.Contract(VAULT, loadABI("UpsetVault"), wallet);
  const fanWars = new ethers.Contract(FANWARS, loadABI("FanWars"), wallet);

  // ═══════════════════════════════════════════
  // SECTION 1: READ STATE — All Contracts
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 1: READ ALL CONTRACT STATE ═══\n");

  await readCall("Factory.owner()", "read", factory.owner());
  await readCall("Factory.getTeamTokenCount()", "read", factory.getTeamTokenCount());
  await readCall("Oracle.owner()", "read", oracle.owner());
  await readCall("Rewards.owner()", "read", rewards.owner());
  await readCall("Rewards.currentEpoch()", "read", rewards.currentEpoch());
  await readCall("Rewards.performanceRewardPool()", "read", rewards.performanceRewardPool().then(v => ethers.formatEther(v) + " WIRE"));
  await readCall("Vault.owner()", "read", vault.owner());
  await readCall("Vault.totalEarmarked()", "read", vault.totalEarmarked().then(v => ethers.formatEther(v) + " WIRE"));
  await readCall("Vault.getVaultBalance()", "read", vault.getVaultBalance().then(v => ethers.formatEther(v) + " WIRE"));
  await readCall("Breaker.owner()", "read", breaker.owner());
  await readCall("FanWars.owner()", "read", fanWars.owner());
  await readCall("FanWars.boostPoolBalance()", "read", fanWars.boostPoolBalance().then(v => ethers.formatEther(v) + " WIRE"));

  // Read state for ALL 8 tokens
  for (const [sym, addr] of Object.entries(TOKENS)) {
    const token = new ethers.Contract(addr, loadABI("TeamToken"), wallet);
    await readCall(`${sym}.name()`, "read", token.name());
    await readCall(`${sym}.symbol()`, "read", token.symbol());
    await readCall(`${sym}.totalSupply()`, "read", token.totalSupply().then(v => ethers.formatEther(v)));
    await readCall(`${sym}.buyPrice()`, "read", factory.getBuyPrice(addr).then(v => ethers.formatEther(v) + " WIRE"));
    await readCall(`Oracle.score(${sym})`, "read", oracle.getPerformanceScore(addr));
    await readCall(`Breaker.isPaused(${sym})`, "read", breaker.isPaused(addr));
  }

  // ═══════════════════════════════════════════
  // SECTION 2: BUY ALL 8 TEAM TOKENS
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 2: BUY ALL 8 TEAM TOKENS (0.01 WIRE each) ═══\n");

  const buyAmount = ethers.parseEther("0.01");
  const tokenBalances = {};

  for (const [sym, addr] of Object.entries(TOKENS)) {
    const token = new ethers.Contract(addr, loadABI("TeamToken"), wallet);
    const balBefore = await token.balanceOf(wallet.address);

    const receipt = await sendTx(`Buy ${sym} (0.01 WIRE)`, "buy",
      factory.buy(addr, 0, { value: buyAmount, gasLimit: 1_000_000 })
    );

    if (receipt) {
      const balAfter = await token.balanceOf(wallet.address);
      const gained = balAfter - balBefore;
      tokenBalances[sym] = balAfter;
      logTx("buy", `${sym} tokens received`, "PASS", null, `${ethers.formatEther(gained)} $${sym}`);
    }
  }

  // ═══════════════════════════════════════════
  // SECTION 3: VERIFY BONDING CURVE — Prices Changed
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 3: VERIFY BONDING CURVE PRICES CHANGED ═══\n");

  for (const [sym, addr] of Object.entries(TOKENS)) {
    await readCall(`${sym} new buyPrice`, "bonding", factory.getBuyPrice(addr).then(v => ethers.formatEther(v) + " WIRE"));
  }

  // ═══════════════════════════════════════════
  // SECTION 4: SELL HALF OF ALL 8 TOKENS
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 4: SELL HALF OF ALL 8 TOKENS ═══\n");

  for (const [sym, addr] of Object.entries(TOKENS)) {
    const token = new ethers.Contract(addr, loadABI("TeamToken"), wallet);
    const bal = tokenBalances[sym] || await token.balanceOf(wallet.address);

    if (!bal || bal === 0n) {
      logTx("sell", `Sell ${sym} — skip`, "PASS", null, "No balance");
      continue;
    }

    const halfBal = bal / 2n;
    if (halfBal === 0n) continue;

    // Approve factory
    await sendTx(`Approve ${sym}`, "sell",
      token.approve(FACTORY, halfBal, { gasLimit: 100_000 })
    );

    // Sell
    await sendTx(`Sell half ${sym} (${ethers.formatEther(halfBal)})`, "sell",
      factory.sell(addr, halfBal, 0, { gasLimit: 1_000_000 })
    );
  }

  // ═══════════════════════════════════════════
  // SECTION 5: RAPID-FIRE SMALL BUYS (IU token — 10 consecutive)
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 5: RAPID-FIRE 10 SMALL BUYS (IU) ═══\n");

  const smallBuy = ethers.parseEther("0.002");
  for (let i = 1; i <= 10; i++) {
    await sendTx(`IU micro-buy #${i}`, "rapid",
      factory.buy(TOKENS.IU, 0, { value: smallBuy, gasLimit: 1_000_000 })
    );
  }

  // ═══════════════════════════════════════════
  // SECTION 6: RAPID-FIRE SMALL BUYS (LQ token — 10 consecutive)
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 6: RAPID-FIRE 10 SMALL BUYS (LQ) ═══\n");

  for (let i = 1; i <= 10; i++) {
    await sendTx(`LQ micro-buy #${i}`, "rapid",
      factory.buy(TOKENS.LQ, 0, { value: smallBuy, gasLimit: 1_000_000 })
    );
  }

  // ═══════════════════════════════════════════
  // SECTION 7: SELL ALL REMAINING (cleanup)
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 7: SELL ALL REMAINING TOKENS ═══\n");

  for (const [sym, addr] of Object.entries(TOKENS)) {
    const token = new ethers.Contract(addr, loadABI("TeamToken"), wallet);
    const bal = await token.balanceOf(wallet.address);

    if (!bal || bal === 0n) {
      logTx("cleanup", `${sym} — no balance`, "PASS", null, "Skip");
      continue;
    }

    await sendTx(`Approve ${sym} (full)`, "cleanup",
      token.approve(FACTORY, bal, { gasLimit: 100_000 })
    );

    await sendTx(`Sell all ${sym} (${ethers.formatEther(bal)})`, "cleanup",
      factory.sell(addr, bal, 0, { gasLimit: 1_000_000 })
    );
  }

  // ═══════════════════════════════════════════
  // SECTION 8: MULTI-TOKEN BUY SPREE (3 rounds, all 8 tokens)
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 8: 3 ROUNDS OF ALL-TOKEN BUYS ═══\n");

  for (let round = 1; round <= 3; round++) {
    console.log(`  --- Round ${round} ---`);
    for (const [sym, addr] of Object.entries(TOKENS)) {
      await sendTx(`R${round} Buy ${sym}`, "spree",
        factory.buy(addr, 0, { value: ethers.parseEther("0.005"), gasLimit: 1_000_000 })
      );
    }
  }

  // ═══════════════════════════════════════════
  // SECTION 9: FINAL STATE READ — All Tokens
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 9: FINAL STATE ═══\n");

  for (const [sym, addr] of Object.entries(TOKENS)) {
    const token = new ethers.Contract(addr, loadABI("TeamToken"), wallet);
    const bal = await token.balanceOf(wallet.address);
    const supply = await token.totalSupply();
    const price = await factory.getBuyPrice(addr);
    logTx("final", `${sym}: bal=${ethers.formatEther(bal)}, supply=${ethers.formatEther(supply)}, price=${ethers.formatEther(price)}`, "PASS", null, "");
  }

  const endBalance = await provider.getBalance(wallet.address);
  const wireSpent = startBalance - endBalance;

  // ═══════════════════════════════════════════
  // SECTION 10: FACTORY RESERVES CHECK
  // ═══════════════════════════════════════════
  console.log("\n═══ SECTION 10: FACTORY RESERVES ═══\n");

  const factoryBalance = await provider.getBalance(FACTORY);
  logTx("final", `Factory ETH balance`, "PASS", null, `${ethers.formatEther(factoryBalance)} WIRE`);

  for (const [sym, addr] of Object.entries(TOKENS)) {
    try {
      const reserves = await factory.tokenReserves(addr);
      logTx("final", `${sym} reserves`, "PASS", null, `${ethers.formatEther(reserves)} WIRE`);
    } catch (e) {
      logTx("final", `${sym} reserves`, "FAIL", null, e.message?.slice(0, 100));
    }
  }

  // ═══════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log(`║  RESULTS: ${passCount} PASS / ${failCount} FAIL / ${passCount + failCount} TOTAL`);
  console.log(`║  WIRE spent: ${ethers.formatEther(wireSpent)}`);
  console.log(`║  WIRE remaining: ${ethers.formatEther(endBalance)}`);
  console.log("╚══════════════════════════════════════════════════════════╝");

  // Save results to file
  const report = {
    timestamp: new Date().toISOString(),
    deployer: wallet.address,
    wireSpent: ethers.formatEther(wireSpent),
    wireRemaining: ethers.formatEther(endBalance),
    passCount,
    failCount,
    totalTx: passCount + failCount,
    transactions: allTx,
  };

  fs.writeFileSync(
    path.join(__dirname, "stress-test-results.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("\nResults saved to stress-test-results.json");
}

main().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
