import { run } from 'hardhat';

async function main() {
  await run('verify:verify', {
    address: '0x1Bce0af67D5723E469beE26323897D2f12A3Eb78',
    constructorArguments: [
      'https://gateway.pinata.cloud/ipfs/',
      '0x1849E9695681EdC8B37e9EF2f642228D67884Bd9',
      '0x343cF422c8a618442C3C91472a81fBAd4dD7A3c7',
      '10000',
      '100000000000000000',
      '56900000000000000',
      '0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B',
      '0x01BE23585060835E02B77ef475b0Cc51aA1e0709',
      '0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311',
    ],
    contract: 'contracts/UselessNFT.sol:UselessNFT',
  });
  await run('verify:verify', {
    address: '0xB77D2befbB8AFe3F9ef5d9eA94187FCc478a7cc3',
    constructorArguments: [
      '0x1Bce0af67D5723E469beE26323897D2f12A3Eb78',
    ],
    contract: 'contracts/UselessMultiSig.sol:UselessMultiSig',
  });
  await run('verify:verify', {
    address: '0xcA7Fe13B4507735DD6C28c14d2496138736dBD02',
    constructorArguments: [
      '0x1Bce0af67D5723E469beE26323897D2f12A3Eb78',
      '0xc778417E063141139Fce010982780140Aa0cD5Ab',
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
