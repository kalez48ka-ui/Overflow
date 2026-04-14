require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  const factoryAddr = "0x7FB2270dC9aBBaEfE37e12fdC177Af543646b3e6";
  const oracleAddr = "0xDd3b0e06374ac97EB8043aEB78946DAEe5E165cF";
  const rewardsAddr = "0x0A1B77B0240AD4456d7B1D9525390D7dE5A88B68";

  const factory = await hre.ethers.getContractAt("TeamTokenFactory", factoryAddr);
  const oracle = await hre.ethers.getContractAt("PerformanceOracle", oracleAddr);
  const rewards = await hre.ethers.getContractAt("RewardDistributor", rewardsAddr);

  const remainingTeams = [
    { name: "Peshawar Zalmi", symbol: "PZ" },
    { name: "Quetta Gladiators", symbol: "QG" },
    { name: "Hyderabad Kingsmen", symbol: "HK" },
    { name: "Rawalpindiz", symbol: "RW" },
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
