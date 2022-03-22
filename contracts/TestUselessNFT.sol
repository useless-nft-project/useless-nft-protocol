// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.12;

import "./UselessNFT.sol";


contract TestUselessNFT is UselessNFT {

    constructor(
        string memory _baseURI,
        address _ogDeveloper,
        address _ogArtist,
        uint256 _maxSupply,
        uint256 _uriOverridesPricePerDay,
        uint256 _mintPrice,
        address _lintToken
    )
    public
    UselessNFT(
        _baseURI,
        _ogDeveloper,
        _ogArtist,
        _maxSupply,
        _uriOverridesPricePerDay,
        _mintPrice,
        address(0),
        _lintToken,
        bytes32(0)
    ) {
    }

    function setRandomNumber() public returns (bytes32 requestId) {
        return _callRequestRandomness();
    }

    function setArtist(address _artist) public {
        ogArtist = _artist;
    }

    function _callRequestRandomness() internal override virtual returns (bytes32 requestId) {
        requestId = keccak256(abi.encodePacked(block.number, block.timestamp));
        fulfillRandomness(requestId, uint(requestId));
    }
}
