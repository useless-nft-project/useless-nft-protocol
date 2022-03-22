import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-truffle5';

import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'solidity-coverage'

import 'hardhat-gas-reporter';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import { HardhatUserConfig } from 'hardhat/config';

require('dotenv').config();

chai.use(solidity);

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    mainnet: {
      url: process.env.MAINNET_URL,
    },
    rinkeby: {
      url: process.env.RINKEBY_URL,
    }
  },
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 2000000,
  },
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
  },
};

// noinspection JSUnusedGlobalSymbols
export default config;
