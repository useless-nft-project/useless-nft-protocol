// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IWETH.sol";


contract WETH is IWETH, ERC20 {

    constructor() public ERC20("Wrapped Ether", "WETH") {}

    receive() external payable {
        depositTo(msg.sender);
    }

    function deposit() external payable override {
        depositTo(msg.sender);
    }

    function withdraw(uint256 amount) external override {
        withdrawTo(msg.sender, amount);
    }

    function depositTo(address account) public payable {
        _mint(account, msg.value);
    }

    function withdrawTo(address account, uint256 amount) public {
        _burn(msg.sender, amount);
        (bool success,) = account.call{value : amount}("");
        require(success, "FAIL_TRANSFER");
    }
}
