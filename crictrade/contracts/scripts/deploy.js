const { ethers } = require("hardhat");

async function main() {
  const [deployer, oracle2, oracle3] = await ethers.getSigners();

  console.log("Deploying CricTrade contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // -----------------------------------------------------------------------
  // 1. Deploy PerformanceOracle
  // -----------------------------------------------------------------------
  console.log("\n--- Deploying PerformanceOracle ---");
  const PerformanceOracle = await ethers.getContractFactory("PerformanceOracle");
  const oracle = await PerformanceOracle.deploy(
    deployer.address,
    oracle2 ? oracle2.address : deployer.address,
    oracle3 ? oracle3.address : deployer.address
  );
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("PerformanceOracle deployed to:", oracleAddr);

  // -----------------------------------------------------------------------
  // 2. Deploy CircuitBreaker
  // -----------------------------------------------------------------------
  console.log("\n--- Deploying CircuitBreaker ---");
  const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
  const circuitBreaker = await CircuitBreaker.deploy();
  await circuitBreaker.waitForDeployment();
  const cbAddr = await circuitBreaker.getAddress();
  console.log("CircuitBreaker deployed to:", cbAddr);

  // -----------------------------------------------------------------------
  // 3. Deploy placeholder addresses for RewardDistributor dependencies
  // -----------------------------------------------------------------------
  // In production these would be multisig wallets
  const treasury = deployer.address;
  const liquidityBacking = deployer.address;
  const devFund = deployer.address;

  // -----------------------------------------------------------------------
  // 4. Deploy UpsetVault (needs oracle)
  // -----------------------------------------------------------------------
  console.log("\n--- Deploying UpsetVault ---");
  const UpsetVault = await ethers.getContractFactory("UpsetVault");
  const upsetVault = await UpsetVault.deploy(oracleAddr);
  await upsetVault.waitForDeployment();
  const uvAddr = await upsetVault.getAddress();
  console.log("UpsetVault deployed to:", uvAddr);

  // -----------------------------------------------------------------------
  // 5. Deploy RewardDistributor
  // -----------------------------------------------------------------------
  console.log("\n--- Deploying RewardDistributor ---");
  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(
    treasury,
    uvAddr,
    liquidityBacking,
    devFund
  );
  await rewardDistributor.waitForDeployment();
  const rdAddr = await rewardDistributor.getAddress();
  console.log("RewardDistributor deployed to:", rdAddr);

  // -----------------------------------------------------------------------
  // 6. Deploy TeamTokenFactory
  // -----------------------------------------------------------------------
  console.log("\n--- Deploying TeamTokenFactory ---");
  const TeamTokenFactory = await ethers.getContractFactory("TeamTokenFactory");
  const factory = await TeamTokenFactory.deploy(oracleAddr, cbAddr, rdAddr);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("TeamTokenFactory deployed to:", factoryAddr);

  // -----------------------------------------------------------------------
  // 7. Configure: Set factory as circuit breaker reporter
  // -----------------------------------------------------------------------
  console.log("\n--- Configuring permissions ---");
  await circuitBreaker.setReporter(factoryAddr, true);
  console.log("Factory set as CircuitBreaker reporter");

  // -----------------------------------------------------------------------
  // 8. Create all 8 PSL team tokens
  // -----------------------------------------------------------------------
  console.log("\n--- Creating PSL team tokens ---");
  const teams = [
    { name: "Islamabad United", symbol: "ISU" },
    { name: "Lahore Qalandars", symbol: "LHQ" },
    { name: "Multan Sultans", symbol: "MLS" },
    { name: "Karachi Kings", symbol: "KRK" },
    { name: "Peshawar Zalmi", symbol: "PSZ" },
    { name: "Quetta Gladiators", symbol: "QTG" },
    { name: "Hyderabad Kingsmen", symbol: "HKM" },
    { name: "Rawalpindiz", symbol: "RWP" },
  ];

  const tokenAddresses = [];

  for (const team of teams) {
    const tx = await factory.createTeamToken(team.name, team.symbol);
    const receipt = await tx.wait();

    // Get token address from event
    const event = receipt.logs.find(
      (log) => {
        try {
          const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
          return parsed && parsed.name === "TeamTokenCreated";
        } catch {
          return false;
        }
      }
    );

    let tokenAddr;
    if (event) {
      const parsed = factory.interface.parseLog({ topics: event.topics, data: event.data });
      tokenAddr = parsed.args[0];
    } else {
      tokenAddr = await factory.symbolToToken(team.symbol);
    }

    tokenAddresses.push(tokenAddr);
    console.log(`  ${team.name} (${team.symbol}): ${tokenAddr}`);

    // Register in oracle
    await oracle.registerTeam(tokenAddr);
    console.log(`    -> Registered in PerformanceOracle`);

    // Register in reward distributor
    await rewardDistributor.registerTeamToken(tokenAddr);
    console.log(`    -> Registered in RewardDistributor`);
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log("\n========================================");
  console.log("  CricTrade Deployment Complete!");
  console.log("========================================");
  console.log("PerformanceOracle:", oracleAddr);
  console.log("CircuitBreaker:   ", cbAddr);
  console.log("UpsetVault:       ", uvAddr);
  console.log("RewardDistributor:", rdAddr);
  console.log("TeamTokenFactory: ", factoryAddr);
  console.log("\nTeam Tokens:");
  teams.forEach((team, i) => {
    console.log(`  ${team.symbol}: ${tokenAddresses[i]}`);
  });
  console.log("========================================\n");

  return {
    oracle: oracleAddr,
    circuitBreaker: cbAddr,
    upsetVault: uvAddr,
    rewardDistributor: rdAddr,
    factory: factoryAddr,
    tokens: tokenAddresses,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
