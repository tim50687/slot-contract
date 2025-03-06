async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);
  console.log(
    `wallet balance ${await ethers.provider.getBalance(deployer.address)}`
  );
  const SlotMachine = await ethers.getContractFactory("SlotMachine");
  const slotMachine = await SlotMachine.deploy();
  await slotMachine.waitForDeployment();
  console.log("SlotMachine deployed to:", slotMachine.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
