const { expect } = require("chai");

describe("SlotMachine", function () {
  let slotMachine;
  let owner;
  let player;
  const ONE_GWEI = 1_000_000_000;
  beforeEach(async function () {
    [owner, player] = await ethers.getSigners();

    const SlotMachine = await ethers.getContractFactory("SlotMachine");
    slotMachine = await SlotMachine.deploy();
  });

  it("Should allow deposit", async function () {
    const depositAmount = ONE_GWEI;
    await expect(slotMachine.connect(player).deposit({ value: depositAmount }))
      .to.emit(slotMachine, "Deposit")
      .withArgs(player.address, depositAmount);
  });

  it("Should allow withdrawals", async function () {
    const depositAmount = 2 * ONE_GWEI;
    const withdrawAmount = ONE_GWEI;

    await slotMachine.connect(player).deposit({ value: depositAmount });

    await expect(slotMachine.connect(player).withdraw(withdrawAmount))
      .to.emit(slotMachine, "Withdraw")
      .withArgs(player.address, withdrawAmount);

    expect(await slotMachine.playerBalances(player.address)).to.equal(
      depositAmount - withdrawAmount
    );
  });

  it("Should not allow withdrawals", async function () {
    const depositAmount = ONE_GWEI;
    const withdrawAmount = 2 * ONE_GWEI;

    await slotMachine.connect(player).deposit({ value: depositAmount });

    await expect(
      slotMachine.connect(player).withdraw(withdrawAmount)
    ).to.be.revertedWith("Insufficient balance");
  });
});
