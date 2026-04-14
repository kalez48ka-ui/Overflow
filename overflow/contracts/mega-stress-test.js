const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const envContent = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
const PRIVATE_KEY = envContent.match(/DEPLOYER_PRIVATE_KEY=(\S+)/)[1];

const RPC = "https://evm.wirefluid.com";
const provider = new ethers.JsonRpcProvider(RPC, { chainId: 92533, name: "wirefluid" });
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const FACTORY = "0x7FB2270dC9aBBaEfE37e12fdC177Af543646b3e6";
const ORACLE = "0xDd3b0e06374ac97EB8043aEB78946DAEe5E165cF";
const REWARDS = "0x0A1B77B0240AD4456d7B1D9525390D7dE5A88B68";
const VAULT = "0xFec31718e8EC8f731Fc23D704E393F448D252DaE";
const BREAKER = "0xF74D8f4159326E0aB055b07E470FAe843300a016";
const FANWARS = "0xC634E9Ec20d9A43D4b546d10216982FE780CbF80";

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
const SYMS = Object.keys(TOKENS);

function loadABI(n) {
  return require(path.join(__dirname, `artifacts/contracts/${n}.sol/${n}.json`)).abi;
}

const allTx = [];
let pass = 0, fail = 0, ops = 0;

function log(sec, act, ok, hash, det) {
  ops++;
  ok ? pass++ : fail++;
  allTx.push({ n: ops, sec, act, status: ok ? "PASS" : "FAIL", hash, det, ts: new Date().toISOString() });
  if (ops % 100 === 0) console.log(`  [${ops} ops] ${pass}P/${fail}F`);
}

async function send(sec, label, contract, method, args, opts = {}) {
  try {
    const tx = await contract[method](...args, { gasLimit: 1_000_000, ...opts });
    const r = await tx.wait();
    log(sec, label, true, r.hash, `gas:${r.gasUsed}`);
    return r;
  } catch (e) {
    log(sec, label, false, null, e.message?.slice(0, 100));
    return null;
  }
}

async function read(sec, label, promise) {
  try {
    const r = await promise;
    log(sec, label, true, null, `${r}`);
    return r;
  } catch (e) {
    log(sec, label, false, null, e.message?.slice(0, 100));
    return null;
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OVERFLOW MEGA STRESS TEST — 1000+ Transactions             ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const startBal = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Starting WIRE: ${ethers.formatEther(startBal)}\n`);

  const factory = new ethers.Contract(FACTORY, loadABI("TeamTokenFactory"), wallet);
  const oracle = new ethers.Contract(ORACLE, loadABI("PerformanceOracle"), wallet);
  const breaker = new ethers.Contract(BREAKER, loadABI("CircuitBreaker"), wallet);
  const rewards = new ethers.Contract(REWARDS, loadABI("RewardDistributor"), wallet);
  const vaultC = new ethers.Contract(VAULT, loadABI("UpsetVault"), wallet);
  const fanWars = new ethers.Contract(FANWARS, loadABI("FanWars"), wallet);
  const tc = {};
  for (const [s, a] of Object.entries(TOKENS)) tc[s] = new ethers.Contract(a, loadABI("TeamToken"), wallet);

  // ═══ S1: FULL STATE READ (~73 reads) ═══
  console.log("═══ S1: FULL STATE READ ═══");
  await read("S1", "Factory.owner", factory.owner());
  await read("S1", "Factory.count", factory.getTeamTokenCount());
  await read("S1", "Oracle.owner", oracle.owner());
  await read("S1", "Rewards.epoch", rewards.currentEpoch());
  await read("S1", "Rewards.pool", rewards.performanceRewardPool().then(v => ethers.formatEther(v)));
  await read("S1", "Vault.earmarked", vaultC.totalEarmarked().then(v => ethers.formatEther(v)));
  await read("S1", "Vault.bal", vaultC.getVaultBalance().then(v => ethers.formatEther(v)));
  await read("S1", "FanWars.boost", fanWars.boostPoolBalance().then(v => ethers.formatEther(v)));
  for (const s of SYMS) {
    await read("S1", `${s}.name`, tc[s].name());
    await read("S1", `${s}.symbol`, tc[s].symbol());
    await read("S1", `${s}.supply`, tc[s].totalSupply().then(v => ethers.formatEther(v)));
    await read("S1", `${s}.decimals`, tc[s].decimals());
    await read("S1", `${s}.price`, factory.getBuyPrice(TOKENS[s]).then(v => ethers.formatEther(v)));
    await read("S1", `${s}.bal`, tc[s].balanceOf(wallet.address).then(v => ethers.formatEther(v)));
    await read("S1", `${s}.score`, oracle.getPerformanceScore(TOKENS[s]));
    await read("S1", `${s}.paused`, breaker.isPaused(TOKENS[s]));
  }

  // ═══ S2: BUY ALL 8 x 10 ROUNDS = 80 buys ═══
  console.log("\n═══ S2: BUY ALL 8 TOKENS x 10 ROUNDS (80 tx) ═══");
  for (let r = 1; r <= 10; r++) {
    if (r % 5 === 0) console.log(`  Round ${r}/10`);
    for (const [s, a] of Object.entries(TOKENS)) {
      await send("S2", `R${r} Buy ${s}`, factory, "buy", [a, 0], { value: ethers.parseEther("0.003") });
    }
  }

  // ═══ S3: PRICE CHECK ═══
  console.log("\n═══ S3: VERIFY PRICES (8 reads) ═══");
  for (const [s, a] of Object.entries(TOKENS)) {
    await read("S3", `${s} price`, factory.getBuyPrice(a).then(v => ethers.formatEther(v)));
  }

  // ═══ S4: SELL HALF ALL (16 tx) ═══
  console.log("\n═══ S4: SELL HALF ALL TOKENS (16 tx) ═══");
  for (const [s, a] of Object.entries(TOKENS)) {
    const b = await tc[s].balanceOf(wallet.address);
    if (!b || b === 0n) continue;
    const half = b / 2n;
    await send("S4", `Approve ${s}`, tc[s], "approve", [FACTORY, half], { gasLimit: 100_000 });
    await send("S4", `Sell ${s}`, factory, "sell", [a, half, 0]);
  }

  // ═══ S5-S8: RAPID-FIRE 50 each on IU, LQ, MS, KK = 200 buys ═══
  const rapidTokens = ["IU", "LQ", "MS", "KK"];
  for (let idx = 0; idx < rapidTokens.length; idx++) {
    const s = rapidTokens[idx];
    const secNum = 5 + idx;
    console.log(`\n═══ S${secNum}: RAPID-FIRE 50 BUYS (${s}) ═══`);
    for (let i = 1; i <= 50; i++) {
      await send(`S${secNum}`, `${s} #${i}`, factory, "buy", [TOKENS[s], 0], { value: ethers.parseEther("0.001") });
    }
  }

  // ═══ S9: BUY-SELL CYCLES 15 rounds x 8 = 360 tx ═══
  console.log("\n═══ S9: BUY-SELL CYCLES 15 ROUNDS (360 tx) ═══");
  for (let r = 1; r <= 15; r++) {
    if (r % 5 === 0) console.log(`  Cycle ${r}/15`);
    for (const [s, a] of Object.entries(TOKENS)) {
      await send("S9", `C${r} Buy ${s}`, factory, "buy", [a, 0], { value: ethers.parseEther("0.001") });
    }
    for (const [s, a] of Object.entries(TOKENS)) {
      const b = await tc[s].balanceOf(wallet.address);
      if (!b || b === 0n) continue;
      const amt = b * 20n / 100n;
      if (amt === 0n) continue;
      await send("S9", `C${r} Appr ${s}`, tc[s], "approve", [FACTORY, amt], { gasLimit: 100_000 });
      await send("S9", `C${r} Sell ${s}`, factory, "sell", [a, amt, 0]);
    }
  }

  // ═══ S10: VARIABLE-SIZE BUYS 5 amounts x 8 = 40 ═══
  console.log("\n═══ S10: VARIABLE BUYS (40 tx) ═══");
  for (const amt of ["0.001", "0.002", "0.003", "0.005", "0.008"]) {
    for (const [s, a] of Object.entries(TOKENS)) {
      await send("S10", `Buy ${s} (${amt})`, factory, "buy", [a, 0], { value: ethers.parseEther(amt) });
    }
  }

  // ═══ S11: SELL ALL CLEANUP ═══
  console.log("\n═══ S11: SELL ALL (cleanup) ═══");
  for (const [s, a] of Object.entries(TOKENS)) {
    const b = await tc[s].balanceOf(wallet.address);
    if (!b || b === 0n) { log("S11", `${s} skip`, true, null, "0"); continue; }
    await send("S11", `Appr ${s}`, tc[s], "approve", [FACTORY, b], { gasLimit: 100_000 });
    await send("S11", `Sell ${s}`, factory, "sell", [a, b, 0]);
  }

  // ═══ S12: MASSIVE SPREE 20 rounds x 8 = 160 buys ═══
  console.log("\n═══ S12: MASSIVE SPREE 20 ROUNDS (160 tx) ═══");
  for (let r = 1; r <= 20; r++) {
    if (r % 10 === 0) console.log(`  Spree ${r}/20`);
    for (const [s, a] of Object.entries(TOKENS)) {
      await send("S12", `Sp${r} ${s}`, factory, "buy", [a, 0], { value: ethers.parseEther("0.001") });
    }
  }

  // ═══ S13: TRANSFER TESTS (8 tx) ═══
  console.log("\n═══ S13: TRANSFER TESTS (8 tx) ═══");
  for (const [s] of Object.entries(TOKENS)) {
    const b = await tc[s].balanceOf(wallet.address);
    if (!b || b === 0n) continue;
    const amt = b / 100n;
    if (amt === 0n) continue;
    await send("S13", `Xfer ${s}`, tc[s], "transfer", [wallet.address, amt], { gasLimit: 200_000 });
  }

  // ═══ S14: FINAL SELL ALL ═══
  console.log("\n═══ S14: FINAL SELL ALL ═══");
  for (const [s, a] of Object.entries(TOKENS)) {
    const b = await tc[s].balanceOf(wallet.address);
    if (!b || b === 0n) { log("S14", `${s} empty`, true, null, "skip"); continue; }
    await send("S14", `Appr ${s}`, tc[s], "approve", [FACTORY, b], { gasLimit: 100_000 });
    await send("S14", `Sell ${s}`, factory, "sell", [a, b, 0]);
  }

  // ═══ S15: FINAL STATE ═══
  console.log("\n═══ S15: FINAL STATE ═══");
  for (const [s, a] of Object.entries(TOKENS)) {
    const b = await tc[s].balanceOf(wallet.address);
    const sup = await tc[s].totalSupply();
    const p = await factory.getBuyPrice(a);
    log("S15", `${s}`, true, null, `bal=${ethers.formatEther(b)} sup=${ethers.formatEther(sup)} price=${ethers.formatEther(p)}`);
  }
  const fBal = await provider.getBalance(FACTORY);
  log("S15", "Factory WIRE", true, null, ethers.formatEther(fBal));
  for (const [s, a] of Object.entries(TOKENS)) {
    try {
      const r = await factory.tokenReserves(a);
      log("S15", `${s} reserves`, true, null, ethers.formatEther(r));
    } catch (e) { log("S15", `${s} reserves`, false, null, e.message?.slice(0, 80)); }
  }

  // ═══ SUMMARY ═══
  const endBal = await provider.getBalance(wallet.address);
  const spent = startBal - endBal;

  console.log("\n╔═══════════════════════════════════════════════════════════════╗");
  console.log(`║  RESULTS: ${pass} PASS / ${fail} FAIL / ${ops} TOTAL`);
  console.log(`║  WIRE spent: ${ethers.formatEther(spent)}`);
  console.log(`║  WIRE remaining: ${ethers.formatEther(endBal)}`);
  console.log(`║  On-chain txs: ${allTx.filter(t => t.hash).length}`);
  console.log("╚═══════════════════════════════════════════════════════════════╝");

  const report = {
    testName: "Mega Stress Test — 1000+ Transactions",
    timestamp: new Date().toISOString(),
    deployer: wallet.address,
    chain: "WireFluid Testnet (92533)",
    rpc: RPC,
    wireSpent: ethers.formatEther(spent),
    wireRemaining: ethers.formatEther(endBal),
    startBalance: ethers.formatEther(startBal),
    passCount: pass,
    failCount: fail,
    totalOps: ops,
    onChainTxCount: allTx.filter(t => t.hash).length,
    contracts: { FACTORY, ORACLE, REWARDS, VAULT, BREAKER, FANWARS },
    tokens: TOKENS,
    transactions: allTx,
  };

  fs.writeFileSync(path.join(__dirname, "mega-stress-results.json"), JSON.stringify(report, null, 2));
  console.log("\nSaved to mega-stress-results.json");
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
