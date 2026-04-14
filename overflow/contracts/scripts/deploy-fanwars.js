require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Deploy FanWars
  console.log("\n--- Deploying FanWars ---");
  const FanWars = await hre.ethers.getContractFactory("FanWars");
  const fanWars = await FanWars.deploy();
  await fanWars.waitForDeployment();
  const fanWarsAddr = await fanWars.getAddress();
  console.log("FanWars deployed to:", fanWarsAddr);

  // Register team tokens as exempt (so locking doesn't trigger sell tax)
  const teamTokens = [
    { symbol: "IU", address: "0x1c8a5A026A4F5CBf7BC4fdE2898d78628A199f1e" },
    { symbol: "LQ", address: "0x66419e794d379E707bc83fd7214cc61F11568e4b" },
    { symbol: "MS", address: "0x9AF925e33F380eEC57111Da8ED13713afD0953D8" },
    { symbol: "KK", address: "0x6D36f154e3b3232a63A6aC1800f02bA233004490" },
    { symbol: "PZ", address: "0x5f9B45874872796c4b2c8C09ECa7883505CB36A8" },
    { symbol: "QG", address: "0xC9BC62531E5914ba2865FB4B5537B7f84AcE1713" },
    { symbol: "HK", address: "0x96fC2D2B5b6749cD67158215C3Ad05C81502386A" },
    { symbol: "RW", address: "0xC137B2221E8411F059a5f4E0158161402693757E" },
  ];

  console.log("\n--- Setting FanWars as exempt on team tokens ---");
  for (const token of teamTokens) {
    try {
      const teamToken = await hre.ethers.getContractAt("TeamToken", token.address);
      const tx = await teamToken.setExemptTo(fanWarsAddr, true);
      await tx.wait();
      console.log(`  ${token.symbol}: FanWars set as exemptTo`);
    } catch (err) {
      console.error(`  ${token.symbol}: ERROR - ${err.message?.slice(0, 100)}`);
    }
  }

  console.log("\n========================================");
  console.log("FanWars:", fanWarsAddr);
  console.log("Remaining balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));
  console.log("========================================\n");
}

main().catch(console.error);
