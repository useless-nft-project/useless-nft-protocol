import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers, network } from 'hardhat';
import { TestUselessNFT, UselessNFT, WETH } from '../src/types';

describe('UselessNFT', () => {
  let uselessNFT: UselessNFT;
  let weth: WETH;
  let developer: SignerWithAddress;
  let artist: SignerWithAddress;
  let council: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  const baseURI = 'ipfs://base_uri/';
  const maxSupply = ethers.BigNumber.from(10000);
  const skipLong = false;
  const taxPricePerDay = ethers.BigNumber.from('10000000000000000');
  const mintPrice = ethers.BigNumber.from('100000000000');

  beforeEach(async () => {
    [developer, artist, council, user1, user2, user3, user4] = await ethers.getSigners();
    const WETH = await ethers.getContractFactory('WETH');
    weth = await WETH.deploy() as WETH;
    const UselessNFT = await ethers.getContractFactory('TestUselessNFT');
    uselessNFT = await UselessNFT.deploy(
      baseURI,
      developer.address,
      artist.address,
      maxSupply,
      taxPricePerDay,
      mintPrice,
      weth.address,
    ) as any;
    await uselessNFT.connect(developer).setCouncil(council.address);
    await expect(uselessNFT.connect(developer).setCouncil(council.address))
      .to.be.revertedWith('council already set');
  });

  describe('deployment', async () => {
    it('should work', async () => {
      expect(await uselessNFT.baseURI()).to.eq(baseURI);
      expect(await uselessNFT.ogDeveloper()).to.eq(developer.address);
      expect(await uselessNFT.ogArtist()).to.eq(artist.address);
      expect(await uselessNFT.maxSupply()).to.be.eq(maxSupply);
      expect(await uselessNFT.uriOverridesPricePerDay()).to.be.eq(taxPricePerDay);
      expect(await uselessNFT.mintPrice()).to.eq(mintPrice);
      expect(await uselessNFT.council()).to.eq(council.address);
      expect(await uselessNFT.isSaleOpen()).to.eq(true);
      expect(await uselessNFT.totalSupply()).to.be.eq(0);
    });

    it('should fail for bad parameters', async () => {
      const UselessNFT = await ethers.getContractFactory('TestUselessNFT');
      await expect(
        UselessNFT.deploy(
          baseURI,
          developer.address,
          artist.address,
          maxSupply.add(1),
          taxPricePerDay,
          mintPrice,
          weth.address,
        ),
      ).to.be.revertedWith('How many useless NFTs do you need?');

      await expect(
        UselessNFT.deploy(
          baseURI,
          developer.address,
          artist.address,
          maxSupply,
          0,
          mintPrice,
          weth.address,
        ),
      ).to.be.revertedWith('I know these NFTs are useless, but come on, have some respect!');

      await expect(
        UselessNFT.deploy(
          baseURI,
          developer.address,
          artist.address,
          maxSupply,
          taxPricePerDay,
          0,
          weth.address,
        ),
      ).to.be.revertedWith('Wow, I guess you wanted to make them worthless AND useless');
    });
  });

  describe('fallback', async () => {
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

      const transaction2 = {
        from: user1.address,
        to: uselessNFT.address,
        value: ethers.BigNumber.from('100000000000'),
      };
      await expect(user1.sendTransaction(transaction2))
        .to
        .be
        .revertedWith('Do not blindly send ETH to this contract. We told you it\'s not audited!');
    });
  });

  describe('setURIOverridesPricePerDay', async () => {
    it('should work when called by council', async () => {
      const newPricePerDay = ethers.constants.One.mul(ethers.constants.WeiPerEther);
      const result = uselessNFT.connect(council).setURIOverridesPricePerDay(newPricePerDay);
      expect(result).to.emit(uselessNFT, 'URIOverridesRatePerDayChanged')
        .withArgs(newPricePerDay);
      expect(await uselessNFT.uriOverridesPricePerDay()).to.eq(newPricePerDay);
    });
    it('should not work when not called by council', async () => {
      const newPricePerDay = ethers.constants.One.mul(ethers.constants.WeiPerEther);
      await expect(uselessNFT.connect(user1).setURIOverridesPricePerDay(newPricePerDay))
        .to.be.revertedWith('Only the council of elders can set the tax rate');
    });
  });

  describe('sale', async () => {
    it('should not work when sending invalid mint price', async () => {
      const quantity = 1;
      await expect(uselessNFT.connect(user1).mint(quantity, { value: mintPrice.mul(quantity).add('1') }))
        .to.be.revertedWith('invalid ETH amount sent');
    });
    it('should not work when sending quantity of 0', async () => {
      const quantity = 0;
      await expect(uselessNFT.connect(user1).mint(quantity, { value: mintPrice.mul(quantity) }))
        .to.be.revertedWith('quantity must be > 0 and <= 5');
    });
    it('should not work when sending quantity of > 5', async () => {
      const quantity = 6;
      await expect(uselessNFT.connect(user1).mint(quantity, { value: mintPrice.mul(quantity) }))
        .to.be.revertedWith('quantity must be > 0 and <= 5');
    });
    it('should not work when sale quantity goes over the maxSupply', async () => {
      const overrideMaxSupply = 2;
      const UselessNFT = await ethers.getContractFactory('TestUselessNFT');
      let uselessNFT = await UselessNFT.deploy(
        baseURI,
        developer.address,
        artist.address,
        overrideMaxSupply,
        taxPricePerDay,
        mintPrice,
        ethers.constants.AddressZero,
      ) as any;

      const quantity = overrideMaxSupply + 1;
      await expect(uselessNFT.connect(user1).mint(quantity, { value: mintPrice.mul(quantity) }))
        .to.be.revertedWith('Can only mint up to the totalSupply amount');
    });
    it('should work for simple sale', async () => {
      expect(await uselessNFT.getTier(123)).to.eq(5);

      const quantity = 1;
      const mint1 = await uselessNFT.connect(user1).mint(quantity, { value: mintPrice.mul(quantity) });
      expect(mint1).to.emit(uselessNFT, 'Transfer')
        .withArgs(ethers.constants.AddressZero, user1.address, 0);
      const mint2 = await uselessNFT.connect(user1).mint(quantity, { value: mintPrice.mul(quantity) });
      expect(mint2).to.emit(uselessNFT, 'Transfer')
        .withArgs(ethers.constants.AddressZero, user1.address, 1);
      const mint3 = await uselessNFT.connect(user2).mint(quantity, { value: mintPrice.mul(quantity) });
      expect(mint3).to.emit(uselessNFT, 'Transfer')
        .withArgs(ethers.constants.AddressZero, user2.address, 2);

      expect(await uselessNFT.totalSupply()).to.eq(3);
      expect(await uselessNFT.balanceOf(user1.address)).to.eq(2);
      expect(await uselessNFT.tokenOfOwnerByIndex(user1.address, 0)).to.eq(0);
      expect(await uselessNFT.tokenOfOwnerByIndex(user1.address, 1)).to.eq(1);
      expect(await uselessNFT.ownerOf(0)).to.eq(user1.address);
      expect(await uselessNFT.ownerOf(1)).to.eq(user1.address);
      expect(await uselessNFT.balanceOf(user2.address)).to.eq(1);
      expect(await uselessNFT.tokenOfOwnerByIndex(user2.address, 0)).to.eq(2);
      expect(await uselessNFT.ownerOf(2)).to.eq(user2.address);

      expect(await ethers.provider.getBalance(uselessNFT.address)).to.eq(mintPrice.mul(3));

      const developerOldBalance = await ethers.provider.getBalance(developer.address);
      const artistOldBalance = await ethers.provider.getBalance(artist.address);

      // anyone can call withdraw
      const withdraw1 = await uselessNFT.connect(user1).withdrawETH();
      expect(withdraw1).to.emit(uselessNFT, 'Withdrawal')
        .withArgs(developer.address, mintPrice.mul(3).div(2));
      expect(withdraw1).to.emit(uselessNFT, 'Withdrawal')
        .withArgs(artist.address, mintPrice.mul(3).div(2));

      expect(await uselessNFT.getTier(321)).to.eq(5);

      expect(await ethers.provider.getBalance(developer.address))
        .to
        .eq(developerOldBalance.add(mintPrice.mul(3).div(2)));
      expect(await ethers.provider.getBalance(artist.address)).to.eq(artistOldBalance.add(mintPrice.mul(3).div(2)));
    });

    it('rarity should work', async () => {
      await ((uselessNFT as any) as TestUselessNFT).setRandomNumber();
      const randomNumber = await uselessNFT.randomNumber();
      const result = randomNumber.mod(maxSupply);
      const platinumId = await uselessNFT.getPlatinumTokenId();
      expect(result.eq(0) ? '0' : maxSupply.sub(result)).to.eq(platinumId);

      let platinumCount = 0;
      let goldCount = 0;
      let silverCount = 0;
      let bronzeCount = 0;
      let plebCount = 0;
      const promises = Array(10000).fill(0).map((unused, i) => {
        return uselessNFT.getTier(i).then(rarity => {
          if (rarity === 0) {
            platinumCount += 1;
          } else if (rarity === 1) {
            goldCount += 1;
          } else if (rarity === 2) {
            silverCount += 1;
          } else if (rarity === 3) {
            bronzeCount += 1;
          } else if (rarity === 4) {
            plebCount += 1;
          }
        });
      });
      await Promise.all(promises)

      expect(platinumCount).to.eq(1);
      expect(goldCount).to.eq(10);
      expect(silverCount).to.eq(100);
      expect(bronzeCount).to.eq(1000);
      expect(plebCount).to.eq(8889);
    });

    it('should work for full sale', async () => {
      if (skipLong) {
        return
      }

      await expect(uselessNFT.requestRandomNumber()).to.be.revertedWith('Sale must be over');
      await expect(uselessNFT.overridePeasantURI(0, 4, '')).to.be.revertedWith('Reveal has not occurred yet');
      await expect(uselessNFT.revertPeasantURI(0, 4)).to.be.revertedWith('Reveal has not occurred yet');

      await weth.connect(user1).deposit({ value: 100 });
      await weth.connect(user1).transfer(uselessNFT.address, 100);
      await uselessNFT.connect(developer).rescueTokens([weth.address]);
      expect(await weth.balanceOf(developer.address)).to.eq(100);
      expect(await uselessNFT.owner()).to.eq(developer.address);

      expect(await uselessNFT.uriOverrides(0)).to.eq('');
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

      expect(await uselessNFT.isSaleOpen()).to.eq(false);
      expect(await uselessNFT.owner()).to.eq(developer.address);
      expect(await uselessNFT.totalSupply()).to.eq(maxSupply);
      expect(await uselessNFT.balanceOf(user1.address)).to.eq(2250);
      expect(await uselessNFT.balanceOf(user2.address)).to.eq(2495);
      expect(await uselessNFT.balanceOf(user3.address)).to.eq(2505);
      expect(await uselessNFT.balanceOf(user4.address)).to.eq(2750);
      expect(await ethers.provider.getBalance(uselessNFT.address)).to.eq(mintPrice.mul(maxSupply));

      const TestReverter = await ethers.getContractFactory('TestReverter');
      const reverter = await TestReverter.deploy();
      await ((uselessNFT as any) as TestUselessNFT).setArtist(reverter.address);
      expect(await uselessNFT.ogArtist()).to.eq(reverter.address);
      await expect(uselessNFT.connect(user1).withdrawETH()).to.be.revertedWith('_withdraw failed');

      await ((uselessNFT as any) as TestUselessNFT).setArtist(artist.address);
      expect(await uselessNFT.ogArtist()).to.eq(artist.address);

      const balanceBefore1 = await ethers.provider.getBalance(developer.address);
      const balanceBefore2 = await ethers.provider.getBalance(artist.address);
      await uselessNFT.connect(user1).withdrawETH();
      const totalETH = mintPrice.mul(maxSupply);
      expect(await ethers.provider.getBalance(developer.address)).to.eq(balanceBefore1.add(totalETH.div(2)));
      expect(await ethers.provider.getBalance(artist.address)).to.eq(balanceBefore2.add(totalETH.div(2)));

      await expect(uselessNFT.connect(user1).mint(1, { value: mintPrice }))
        .to.be.revertedWith('The sale is over. Wait, the sale is over!? Wow, this really happened?');

      await expect(await uselessNFT.connect(developer).setBaseURI(baseURI))
        .to.emit(uselessNFT, 'BaseURIChanged').withArgs(baseURI);

      expect(await uselessNFT.randomNumber()).to.eq(0);
      expect((await uselessNFT.getCouncilIds()).length).to.eq(0);
      expect(await uselessNFT.getPlatinumTokenId()).to.eq(ethers.constants.MaxUint256);
      expect(await uselessNFT.tokenURI(132)).to.eq(`${baseURI}132_x.json`);

      await expect(uselessNFT.requestRandomNumber()).to.be.revertedWith('Not enough LINK - fill contract first');

      const feeAmount = ethers.BigNumber.from('2000000000000000000');
      await weth.connect(developer).deposit({ value: feeAmount });
      await weth.connect(developer).transfer(uselessNFT.address, feeAmount);

      await uselessNFT.requestRandomNumber();
      expect(await uselessNFT.randomNumber()).to.not.eq(0);
      expect(await uselessNFT.owner()).to.not.eq(developer.address);

      const platinumId = await uselessNFT.getPlatinumTokenId();
      expect(platinumId).to.not.eq(ethers.constants.MaxUint256);

      const platinumOwner = await uselessNFT.ownerOf(platinumId);
      const platinumOwnerSigner = await ethers.getSigner(platinumOwner);
      expect(await uselessNFT.tokenURI(platinumId)).to.eq(`${baseURI}${platinumId}_0.json`);
      await uselessNFT.connect(platinumOwnerSigner).setBaseURI(baseURI.toUpperCase());
      expect(await uselessNFT.tokenURI(platinumId)).to.eq(`${baseURI.toUpperCase()}${platinumId}_0.json`);
      await uselessNFT.connect(platinumOwnerSigner).setBaseURI(baseURI);
      expect(await uselessNFT.owner()).to.eq(platinumOwner);

      const goldId = platinumId.add(997).mod(1000);
      expect(await uselessNFT.tokenURI(goldId)).to. eq(`${baseURI}${goldId}_1.json`);

      const silverId = platinumId.add(94).mod(100);
      expect(await uselessNFT.tokenURI(silverId)).to.eq(`${baseURI}${silverId}_2.json`);

      const bronzeId = platinumId.add(1).mod(10);
      expect(await uselessNFT.tokenURI(bronzeId)).to.eq(`${baseURI}${bronzeId}_3.json`);

      // subtracting 1 is the same as adding `maxSupply - 1`
      const plebId = platinumId.add(2).mod(maxSupply);
      expect(await uselessNFT.tokenURI(plebId)).to.eq(`${baseURI}${plebId}_4.json`);

      const randomTier = await uselessNFT.getTier(132);
      expect(await uselessNFT.tokenURI(132)).to.eq(`${baseURI}132_${randomTier}.json`);

      const councilIds = await uselessNFT.getCouncilIds();
      expect(councilIds.length).to.eq(11);
      expect(councilIds[0]).to.eq(platinumId);
      for (let i = 1; i < councilIds.length; i++) {
        const goldTier = 1;
        expect(await uselessNFT.getTier(councilIds[i])).to.eq(goldTier);
      }

      const allUsers = [user1, user2, user3, user4];
      const nonPlatinumOwner = allUsers.find(user => user.address.toLowerCase() !== platinumOwner.toLowerCase());
      await expect(uselessNFT.connect(nonPlatinumOwner!).overridePeasantURI(platinumId, 4, 'hello'))
        .to.be.revertedWith('You are not the owner of this useless NFT');

      await expect(uselessNFT.connect(platinumOwnerSigner).overridePeasantURI(platinumId, 4, ''))
        .to.be.revertedWith('invalid new URI');

      await tryOverrideWithExpectedFailure(plebId, [4, 3, 2, 1, 0]);
      await tryOverrideWithExpectedFailure(bronzeId, [3, 2, 1, 0]);
      await tryOverrideWithExpectedFailure(silverId, [2, 1, 0]);
      await tryOverrideWithExpectedFailure(goldId, [1, 0]);
      await tryOverrideWithExpectedFailure(platinumId, [0]);

      await tryOverrideWithExpectedSuccess(bronzeId, [4]);
      await tryOverrideWithExpectedSuccess(silverId, [4, 3]);
      await tryOverrideWithExpectedSuccess(goldId, [4, 3, 2]);
      await tryOverrideWithExpectedSuccess(platinumId, [4, 3, 2, 1]);

      const platinumBalanceBeforeTax = await ethers.provider.getBalance(platinumOwner);
      const councilBalanceBeforeTax = await ethers.provider.getBalance(council.address);
      await tryOverrideWithExpectedSuccess(platinumId, [4], taxPricePerDay.mul(3).div(2));
      const councilBalanceAfterTax = await ethers.provider.getBalance(council.address);
      const platinumBalanceAfterTax = await ethers.provider.getBalance(platinumOwner);
      // user got the rebate
      expect(platinumBalanceAfterTax.sub(platinumBalanceBeforeTax).lt(taxPricePerDay.mul(3).div(2))).to.eq(true);
      expect(councilBalanceAfterTax.sub(councilBalanceBeforeTax)).to.eq(taxPricePerDay);

      expect(await uselessNFT.isURILocked(4)).to.eq(true);
      await expect(uselessNFT.connect(platinumOwnerSigner).overridePeasantURI(platinumId, 4, 'hello'))
        .to
        .be
        .revertedWith('URI for this tier is still locked');
      await expect(uselessNFT.connect(platinumOwnerSigner).revertPeasantURI(platinumId, 4))
        .to
        .be
        .revertedWith('URI for this tier is still locked');

      await advanceTime(86401);
      expect(await uselessNFT.isURILocked(4)).to.eq(false);
      const tokenId_tier4 = await tierToTokenId(4);
      // The token URI is still set even though it's no longer locked.
      // Another user can change it now or revert it back to its default value
      expect(await uselessNFT.tokenURI(tokenId_tier4)).to.eq(`https://h-${platinumId}-4-w.com/${tokenId_tier4}_4.json`);

      await weth.connect(user1).deposit({ value: 200 });
      await weth.connect(user1).transfer(uselessNFT.address, 200);
      await uselessNFT.connect(user2).rescueTokens([weth.address]); // anyone can call the function
      expect(await weth.balanceOf(council.address)).to.eq(feeAmount.add(200));
    });

    const tryOverrideWithExpectedFailure = async (tokenId: BigNumber, tiers: number[]) => {
      const signer = await ethers.getSigner(await uselessNFT.ownerOf(tokenId));
      const newURI = `https://helloworld_${tokenId}.com/`;
      await Promise.all(tiers.map(async tier => {
        await expect(uselessNFT.connect(signer).overridePeasantURI(tokenId, tier, newURI))
          .to.be.revertedWith('You must be higher up the pyramid to override this tier');
        await expect(uselessNFT.connect(signer).revertPeasantURI(tokenId, tier))
          .to.be.revertedWith('You must be higher up the pyramid to override this tier');
      }));
    };

    const tryOverrideWithExpectedSuccess = async (
      tokenId: BigNumber,
      tiers: number[],
      taxToPay: BigNumber = ethers.BigNumber.from('0'),
    ) => {
      const signer = await ethers.getSigner(await uselessNFT.ownerOf(tokenId));
      for (let tier of tiers) {
        const newURI = `https://h-${tokenId}-${tier}-w.com/`;
        const result = await uselessNFT.connect(signer)
          .overridePeasantURI(tokenId, tier, newURI, { value: taxToPay });
        const daysToAdd = taxToPay.div(taxPricePerDay).mul(86400);
        const blockTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
        expect(result).to.emit(uselessNFT, 'URIOverride').withArgs(tier, daysToAdd.add(blockTimestamp), newURI);

        expect(await uselessNFT.uriOverrides(tier)).to.eq(newURI);
        expect(await uselessNFT.uriOverridesLockedUntil(tier)).to.eq(daysToAdd.add(blockTimestamp));
        expect(await uselessNFT.isURILocked(tier)).to.eq(true);
        const tokenIdToCheck = await tierToTokenId(tier);
        expect(await uselessNFT.tokenURI(tokenIdToCheck)).to.eq(`${newURI}${tokenIdToCheck.toString()}_${tier}.json`);

        if (taxToPay.eq('0')) {
          await advanceTime(5); // increase time by 5 seconds beyond
          const latestTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
          expect(latestTimestamp - blockTimestamp).to.gte(5);
          expect(latestTimestamp - blockTimestamp).to.lte(6);
          expect(await uselessNFT.isURILocked(tier)).to.eq(false);
          expect(await uselessNFT.connect(signer).revertPeasantURI(tokenId, tier))
            .to.emit(uselessNFT, 'URIRevert').withArgs(tier);
          expect(await uselessNFT.uriOverrides(tier)).to.eq('');
          expect(await uselessNFT.tokenURI(tokenIdToCheck))
            .to
            .eq(`${baseURI}${tokenIdToCheck.toString()}_${tier}.json`);
        }
      }
    };

    const tierToTokenId = async (tier: number) => {
      const platinumId = await uselessNFT.getPlatinumTokenId();
      if (tier === 0) {
        return platinumId;
      } else if (tier === 1) {
        return platinumId.add(997).mod(1000);
      } else if (tier === 2) {
        return platinumId.add(94).mod(100);
      } else if (tier === 3) {
        return platinumId.add(1).mod(10);
      } else if (tier === 4) {
        return platinumId.add(2).mod(maxSupply);
      } else {
        return Promise.reject(new Error('Invalid tier, found ' + tier));
      }
    };

    const advanceTime = async (seconds: number) => {
      await network.provider.send('evm_increaseTime', [seconds]);
      await network.provider.send('evm_mine', []);
    };
  });
});
