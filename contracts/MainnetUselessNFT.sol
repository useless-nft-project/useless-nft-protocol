// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.12;

import "./UselessNFT.sol";


contract MainnetUselessNFT is UselessNFT {

    constructor(
        string memory _baseURI,
        address _ogDeveloper,
        address _ogArtist
    )
    public
    UselessNFT(
        _baseURI,
        _ogDeveloper,
        _ogArtist,
        10_000,
        0.1 ether,
        0.0569 ether,
        0xf0d54349aDdcf704F77AE15b96510dEA15cb7952,
        0x514910771AF9Ca656af840dff83E8264EcF986CA,
        0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445
    ) {}
}
