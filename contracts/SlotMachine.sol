//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

contract SlotMachine {
    address public owner;
    mapping(address => uint256) public playerBalances;
    uint256 totalPool;
    uint256 transactionCounter;

    event Deposit(address indexed player, uint256 amount);
    event Withdraw(address indexed player, uint amount);
    event UpdateBalance(address indexed player, uint newBalance);

    constructor() {
        owner = msg.sender;
        totalPool = 0;
        transactionCounter = 0;
    }

    // Player can deposit funds into the contract
    function deposit() external payable {
        totalPool += msg.value;
        transactionCounter += 1;
        playerBalances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 _amount) external {
        require(playerBalances[msg.sender] >= _amount, "Insufficient fund");
        require(totalPool >= _amount, "Insufficient funds in pool");
        playerBalances[msg.sender] -= _amount;
        totalPool -= _amount;
        transactionCounter -= 1;

        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "Withdrawal failed");
        emit Withdraw(msg.sender, _amount); 
    }

    // Update player balance after a spin (only callable by owner or authorized backend)
    function updatePlayerBalance(address player, uint256 newBalance) external {
        require(msg.sender == owner, "Only owner can update balances");
        require(newBalance <= totalPool, "New balance exceeds pool");
        
        playerBalances[player] = newBalance;
        emit UpdateBalance(player, newBalance);
    }
    
    // Get player's balance
    function getPlayerBalance(address player) external view returns (uint256) {
        return playerBalances[player];
    }

    function getTransactionCounter() external view returns (uint256) {
        return transactionCounter;
    }

    function getTotalPool() external view returns (uint256) {
        return totalPool;
    }

    function ownerWithdraw() external {
        require(msg.sender == owner, "Only owner can withdraw fund");
        require(transactionCounter == 0, "Cannot withdraw money until all transactions are settled");
        require(totalPool > 0, "No money to withdraw");
        
        uint256 amountToWithdraw = totalPool;
        totalPool = 0;
        (bool success, ) = payable(msg.sender).call{value: amountToWithdraw}("");
        require(success, "Withdrawal failed");
        emit Withdraw(msg.sender, amountToWithdraw); 
    }
}