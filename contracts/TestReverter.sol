// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.12;


contract TestReverter {

    receive() external payable {
        revert("CANNOT RECEIVE");
    }

    fallback() external payable {
        revert("CANNOT FALLBACK");
    }

    function callAndRevert() external pure {
        revert();
    }
}
