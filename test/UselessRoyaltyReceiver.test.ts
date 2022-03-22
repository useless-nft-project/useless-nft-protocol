import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { TestUselessNFT, UselessNFT, UselessRoyaltyReceiver, WETH } from '../src/types';

describe('UselessRoyaltyReceiver', () => {
  let uselessNFT: UselessNFT;
  let weth: WETH;
  let uselessRoyaltyReceiver: UselessRoyaltyReceiver;
  let developer: SignerWithAddress;
  let artist: SignerWithAddress;
  let council: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let user5: SignerWithAddress;
  const baseURI = 'ipfs://base_uri/';
  const maxSupply = 10000;
  const skipLong = false;
  const taxPricePerDay = ethers.BigNumber.from('10000000000000000');
  const mintPrice = ethers.BigNumber.from('100000000000');

  beforeEach(async () => {
    [developer, artist, council, user1, user2, user3, user4, user5] = await ethers.getSigners();
    const UselessNFT = await ethers.getContractFactory('TestUselessNFT');
    uselessNFT = await UselessNFT.deploy(
      baseURI,
      developer.address,
      artist.address,
      maxSupply,
      taxPricePerDay,
      mintPrice,
      ethers.constants.AddressZero,
    ) as any;
    const WETH = await ethers.getContractFactory('WETH');
    weth = await WETH.deploy() as WETH;
    const UselessRoyaltyReceiver = await ethers.getContractFactory('UselessRoyaltyReceiver');
    uselessRoyaltyReceiver = (await UselessRoyaltyReceiver.deploy(
      uselessNFT.address,
      weth.address,
    )) as UselessRoyaltyReceiver;
    await uselessNFT.connect(developer).setCouncil(council.address);
  });

  describe('#fallback', async () => {
    it('should fail', async () => {
      const transaction1 = {
        from: user1.address,
        to: uselessNFT.address,
        data: '0x12341234',
      };
      await expect(user1.sendTransaction(transaction1))
        .to
        .be
        .revertedWith('function selector was not recognized and there\'s no fallback function');
    });
  });

  describe('#receive', async () => {
    it('should receive ETH', async () => {
      const transaction = {
        from: user1.address,
        to: uselessRoyaltyReceiver.address,
        value: ethers.BigNumber.from('100000000000'),
      };
      await user1.sendTransaction(transaction);
      expect(await ethers.provider.getBalance(uselessRoyaltyReceiver.address)).to.eq(transaction.value);
    });
  });

  describe('#withdrawETH/#withdrawToken', async () => {
    it('should work after council is set up', async () => {
      if (skipLong) {
        return;
      }

      await expect(uselessRoyaltyReceiver.connect(developer).setPlatinumRoyaltyShareNumerator(5001))
        .to.be.revertedWith('sale is not over yet');

      const amount1 = ethers.BigNumber.from('250000000000000000');
      const amount2 = ethers.BigNumber.from('750000000000000000');
      await weth.connect(artist).deposit({ value: amount1 });
      await weth.connect(artist).transfer(uselessRoyaltyReceiver.address, amount1);
      await artist.sendTransaction({ to: uselessRoyaltyReceiver.address, value: amount2 });

      await expect(uselessRoyaltyReceiver.connect(developer).withdrawETH())
        .to.be.revertedWith('council is not set up yet');
      await expect(uselessRoyaltyReceiver.connect(developer).withdrawToken(weth.address))
        .to.be.revertedWith('council is not set up yet');

      const quantity = 5;
      const user1Results = Array.from(Array(2250 / quantity).keys()).map(() => {
        return uselessNFT.connect(user1).mint(quantity, { value: mintPrice.mul(quantity) });
      });
      const user2Results = Array.from(Array(2495 / quantity).keys()).map(() => {
        return uselessNFT.connect(user2).mint(quantity, { value: mintPrice.mul(quantity) });
      });
      const user3Results = Array.from(Array(2505 / quantity).keys()).map(() => {
        return uselessNFT.connect(user3).mint(quantity, { value: mintPrice.mul(quantity) });
      });
      const user4Results = Array.from(Array(2750 / quantity).keys()).map(() => {
        return uselessNFT.connect(user4).mint(quantity, { value: mintPrice.mul(quantity) });
      });

      await Promise.all(user1Results);
      await Promise.all(user2Results);
      await Promise.all(user3Results);
      await Promise.all(user4Results);
      await ((uselessNFT as any) as TestUselessNFT).setRandomNumber();

      expect(await uselessNFT.isSaleOpen()).to.eq(false);
      expect(await uselessNFT.randomNumber()).to.not.eq(0);

      const platinumId = await uselessNFT.getPlatinumTokenId();
      const platinumOwner = await uselessNFT.ownerOf(platinumId);

      await expect(uselessRoyaltyReceiver.connect(artist).setPlatinumRoyaltyShareNumerator(6000))
        .to.be.revertedWith('invalid sender');

      const royalty = 1000;
      const platinumSigner = await ethers.getSigner(platinumOwner);

      await expect(uselessRoyaltyReceiver.connect(platinumSigner).setPlatinumRoyaltyShareNumerator(5001))
        .to.be.revertedWith('invalid platinum royalty share numerator');

      const result = await uselessRoyaltyReceiver.connect(platinumSigner).setPlatinumRoyaltyShareNumerator(royalty);
      expect(result).to.emit(uselessRoyaltyReceiver, 'PlatinumRoyaltyShareNumeratorSet').withArgs(royalty);
      expect(await uselessRoyaltyReceiver.platinumRoyaltyShareNumerator()).to.eq(royalty);

      // should be able to call multiple times without side effects
      await uselessRoyaltyReceiver.connect(artist).withdrawToken(weth.address);
      await uselessRoyaltyReceiver.connect(artist).withdrawToken(weth.address);
      expect(await weth.balanceOf(platinumOwner)).to.eq(amount1.mul(1).div(10));
      expect(await weth.balanceOf(council.address)).to.eq(amount1.mul(9).div(10));

      // should be able to call multiple times without side effects
      await uselessRoyaltyReceiver.connect(artist).withdrawETH();
      await uselessRoyaltyReceiver.connect(artist).withdrawETH();
      expect(await weth.balanceOf(platinumOwner)).to.eq(amount2.add(amount1).mul(1).div(10));
      expect(await weth.balanceOf(council.address)).to.eq(amount2.add(amount1).mul(9).div(10));
    });
  });
});
