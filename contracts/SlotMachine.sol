pragma solidity ^0.8.0;

contract SlotMachine {
    address public owner;
    mapping(address => uint256) public playerBalances;

    event Deposit(address player, uint256 amount);
    event Withdraw(address player, uint amount);

    constructor() {
        owner = msg.sender;
    }

    // Player can deposit funds into the contract
    function deposit() external payable {
        playerBalances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 _amount) external {
        require(playerBalances[msg.sender] >= _amount, "Insufficient balance");
        playerBalances[msg.sender] -= _amount;

        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "Withdrawal failed");
        emit Withdraw(msg.sender, _amount); 
    }

    function getBalance() external view returns (uint256){
        return playerBalances[msg.sender];
    }
}