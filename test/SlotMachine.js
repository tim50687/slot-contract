const { expect } = require("chai");

describe("SlotMachine", function () {
  let slotMachine;
  let owner;
  let player1;
  let player2;
  const ONE_GWEI = 1_000_000_000;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const SlotMachine = await ethers.getContractFactory("SlotMachine");
    slotMachine = await SlotMachine.deploy();
  });

  it("Should set the correct owner", async function () {
    expect(await slotMachine.owner()).to.equal(owner.address);
  });

  it("Should allow deposit and update totalPool and playerBalance", async function () {
    const depositAmount = ONE_GWEI;

    // Before deposit
    expect(await slotMachine.getTotalPool()).to.equal(0);
    expect(await slotMachine.playerBalances(player1.address)).to.equal(0);

    // Deposit
    await expect(slotMachine.connect(player1).deposit({ value: depositAmount }))
      .to.emit(slotMachine, "Deposit")
      .withArgs(player1.address, depositAmount);

    // After deposit
    expect(await slotMachine.getTotalPool()).to.equal(depositAmount);
    expect(await slotMachine.playerBalances(player1.address)).to.equal(
      depositAmount
    );
    expect(await slotMachine.getPlayerBalance(player1.address)).to.equal(
      depositAmount
    );
  });

  it("Should allow withdrawals and update totalPool and playerBalance", async function () {
    const depositAmount = 2 * ONE_GWEI;
    const withdrawAmount = ONE_GWEI;

    // Deposit
    await slotMachine.connect(player1).deposit({ value: depositAmount });

    // Withdraw
    await expect(slotMachine.connect(player1).withdraw(withdrawAmount))
      .to.emit(slotMachine, "Withdraw")
      .withArgs(player1.address, withdrawAmount);

    // Check pool and player balance after withdrawal
    expect(await slotMachine.getTotalPool()).to.equal(
      depositAmount - withdrawAmount
    );
    expect(await slotMachine.playerBalances(player1.address)).to.equal(
      depositAmount - withdrawAmount
    );
  });

  it("Should not allow withdrawals exceeding player balance", async function () {
    const depositAmount = ONE_GWEI;
    const withdrawAmount = 2 * ONE_GWEI;

    await slotMachine.connect(player1).deposit({ value: depositAmount });

    await expect(
      slotMachine.connect(player1).withdraw(withdrawAmount)
    ).to.be.revertedWith("Insufficient fund");
  });

  it("Should not allow withdrawals exceeding totalPool", async function () {
    const depositAmount = ONE_GWEI;

    // Player1 deposits
    await slotMachine.connect(player1).deposit({ value: depositAmount });

    // Owner updates player2's balance (simulating wins) to more than totalPool
    await expect(
      slotMachine
        .connect(owner)
        .updatePlayerBalance(player2.address, depositAmount * 2)
    ).to.be.revertedWith("New balance exceeds pool");
  });

  it("Should allow owner to update player balance", async function () {
    const depositAmount = ONE_GWEI;
    const newBalance = ONE_GWEI / 2; // Half the deposited amount

    // Player deposits
    await slotMachine.connect(player1).deposit({ value: depositAmount });

    // Owner updates balance (simulating a loss)
    await expect(
      slotMachine
        .connect(owner)
        .updatePlayerBalance(player1.address, newBalance)
    )
      .to.emit(slotMachine, "UpdateBalance")
      .withArgs(player1.address, newBalance);

    // Check new balance
    expect(await slotMachine.playerBalances(player1.address)).to.equal(
      newBalance
    );
  });

  it("Should not allow non-owner to update player balance", async function () {
    await slotMachine.connect(player1).deposit({ value: ONE_GWEI });

    await expect(
      slotMachine
        .connect(player1)
        .updatePlayerBalance(player1.address, ONE_GWEI * 2)
    ).to.be.revertedWith("Only owner can update balances");
  });

  it("Should track transaction counter correctly", async function () {
    // Initial counter should be 0
    const initialCounter = await slotMachine.getTransactionCounter();
    expect(initialCounter).to.equal(0);

    // Deposit from player1 should increase counter to 1
    await slotMachine.connect(player1).deposit({ value: ONE_GWEI });
    expect(await slotMachine.getTransactionCounter()).to.equal(1);

    // Deposit from player2 should increase counter to 2
    await slotMachine.connect(player2).deposit({ value: ONE_GWEI });
    expect(await slotMachine.getTransactionCounter()).to.equal(2);

    // Withdraw from player1 should decrease counter to 1
    await slotMachine.connect(player1).withdraw(ONE_GWEI);
    expect(await slotMachine.getTransactionCounter()).to.equal(1);

    // Withdraw from player2 should decrease counter to 0
    await slotMachine.connect(player2).withdraw(ONE_GWEI);
    expect(await slotMachine.getTransactionCounter()).to.equal(0);
  });

  describe("Owner withdrawal", function () {
    it("Should allow owner to withdraw when counter is 0", async function () {
      // Player deposits
      await slotMachine.connect(player1).deposit({ value: 2 * ONE_GWEI });

      // Player withdraws full amount
      await slotMachine.connect(player1).withdraw(2 * ONE_GWEI);

      // Another player deposits and doesn't withdraw
      await slotMachine.connect(player2).deposit({ value: ONE_GWEI });

      // Owner updates player2 balance to 0 (simulating a loss)
      await slotMachine.connect(owner).updatePlayerBalance(player2.address, 0);

      // Player2 withdraws 0 to decrease counter
      await slotMachine.connect(player2).withdraw(0);

      // Counter should be 0
      expect(await slotMachine.getTransactionCounter()).to.equal(0);

      // Prepare to check owner balance change
      const initialOwnerBalance = await ethers.provider.getBalance(
        owner.address
      );

      // Owner withdraws
      const tx = await slotMachine.connect(owner).ownerWithdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      // Check pool is empty
      expect(await slotMachine.getTotalPool()).to.equal(0);

      // Owner should have received the pool funds (minus gas costs)
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      expect(finalOwnerBalance).to.equal(
        initialOwnerBalance + BigInt(ONE_GWEI) - gasUsed
      );
    });

    it("Should not allow owner to withdraw when counter is not 0", async function () {
      // Player deposits
      await slotMachine.connect(player1).deposit({ value: ONE_GWEI });

      // Counter should be 1
      expect(await slotMachine.getTransactionCounter()).to.equal(1);

      // Owner withdrawal should fail
      await expect(
        slotMachine.connect(owner).ownerWithdraw()
      ).to.be.revertedWith(
        "Cannot withdraw money until all transactions are settled"
      );
    });

    it("Should not allow non-owner to withdraw", async function () {
      // Player deposits and withdraws to get counter to 0
      await slotMachine.connect(player1).deposit({ value: ONE_GWEI });
      await slotMachine.connect(player1).withdraw(ONE_GWEI);

      // Counter should be 0
      expect(await slotMachine.getTransactionCounter()).to.equal(0);

      // Player attempts to call owner withdraw
      await expect(
        slotMachine.connect(player1).ownerWithdraw()
      ).to.be.revertedWith("Only owner can withdraw fund");
    });

    it("Should not allow owner to withdraw when pool is empty", async function () {
      // Counter starts at 0, pool is empty
      expect(await slotMachine.getTotalPool()).to.equal(0);

      // Owner withdrawal should fail due to empty pool
      await expect(
        slotMachine.connect(owner).ownerWithdraw()
      ).to.be.revertedWith("No money to withdraw");
    });
  });
});
