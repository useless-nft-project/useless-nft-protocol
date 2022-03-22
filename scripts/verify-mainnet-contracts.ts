import { run } from 'hardhat';

async function main() {
  const uselessNFTAddress = '0x1Bce0af67D5723E469beE26323897D2f12A3Eb78';
  await run('verify:verify', {
    address: uselessNFTAddress,
    constructorArguments: [
      'https://gateway.pinata.cloud/ipfs/',
      '0x1849E9695681EdC8B37e9EF2f642228D67884Bd9',
      '0x343cF422c8a618442C3C91472a81fBAd4dD7A3c7',
      '10000',
      '100000000000000000',
      '56900000000000000',
      '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952',
      '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445',
    ],
    contract: 'contracts/UselessNFT.sol:UselessNFT',
  });
  await run('verify:verify', {
    address: '0xB77D2befbB8AFe3F9ef5d9eA94187FCc478a7cc3',
    constructorArguments: [
      uselessNFTAddress,
    ],
    contract: 'contracts/UselessMultiSig.sol:UselessMultiSig',
  });
  await run('verify:verify', {
    address: '0xcA7Fe13B4507735DD6C28c14d2496138736dBD02',
    constructorArguments: [
      uselessNFTAddress,
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    ],
    contract: 'contracts/UselessRoyaltyReceiver.sol:UselessRoyaltyReceiver',
  });
}

main().then(() => {
  console.log('Successfully verified contracts');
  process.exit(0);
}).catch(error => {
  console.error('error', error);
  process.exit(-1);
})
