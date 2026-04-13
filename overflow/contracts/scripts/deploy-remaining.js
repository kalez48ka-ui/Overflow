require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  const factoryAddr = "0x1e4d8f427d7f564A9f7F13A52632D179B02eEAF4";
  const oracleAddr = "0xb594EB4656B18b1aD32eEF55291ae7a67CB710E5";
  const rewardsAddr = "0x595Bfd3Dfc1A7b2703CFF9E566473d670Efcaf0F";

  const factory = await hre.ethers.getContractAt("TeamTokenFactory", factoryAddr);
  const oracle = await hre.ethers.getContractAt("PerformanceOracle", oracleAddr);
  const rewards = await hre.ethers.getContractAt("RewardDistributor", rewardsAddr);

  const remainingTeams = [
    { name: "Peshawar Zalmi", symbol: "PZL" },
    { name: "Quetta Gladiators", symbol: "QTG" },
    { name: "Hyderabad Kingsmen", symbol: "HYK" },
    { name: "Rawalpindiz", symbol: "RWP" },
  ];

  for (const team of remainingTeams) {
    try {
      console.log(`\nCreating ${team.name} (${team.symbol})...`);
      
      const tx1 = await factory.createTeamToken(team.name, team.symbol);
      const receipt = await tx1.wait();
      
      // Get token address from event
      const event = receipt.logs.find(log => {
        try { return factory.interface.parseLog(log)?.name === "TeamTokenCreated"; } catch { return false; }
      });
      const tokenAddr = event ? factory.interface.parseLog(event).args.tokenAddress : null;
      
      if (!tokenAddr) {
        // Fallback: get from contract
        const count = await factory.getTeamTokenCount();
        const addr = await factory.getTeamTokenAtIndex(count - 1n);
        console.log(`  ${team.name}: ${addr}`);
        
        const tx2 = await oracle.registerTeam(addr);
        await tx2.wait();
        console.log("    -> Registered in Oracle");
        
        const tx3 = await rewards.registerTeamToken(addr);
        await tx3.wait();
        console.log("    -> Registered in Rewards");
      } else {
        console.log(`  ${team.name}: ${tokenAddr}`);
        
        const tx2 = await oracle.registerTeam(tokenAddr);
        await tx2.wait();
        console.log("    -> Registered in Oracle");
        
        const tx3 = await rewards.registerTeamToken(tokenAddr);
        await tx3.wait();
        console.log("    -> Registered in Rewards");
      }
    } catch (err) {
      console.error(`  ERROR creating ${team.name}:`, err.message?.slice(0, 200));
    }
  }

  console.log("\nRemaining balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));
  console.log("Done!");
}

main().catch(console.error);
