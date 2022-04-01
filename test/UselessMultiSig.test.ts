import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  TestReverter__factory,
  TestUselessNFT,
  UselessMultiSig,
  UselessMultiSig__factory,
  UselessNFT,
} from '../src/types';

describe('UselessMultiSig', () => {
  let uselessNFT: UselessNFT;
  let council: UselessMultiSig;
  let developer: SignerWithAddress;
  let artist: SignerWithAddress;
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
    [developer, artist, user1, user2, user3, user4, user5] = await ethers.getSigners();
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
    const UselessMultiSig = await ethers.getContractFactory('UselessMultiSig');
    council = (await UselessMultiSig.deploy(uselessNFT.address)) as UselessMultiSig;
    await uselessNFT.connect(developer).setCouncil(council.address);
  });

  describe('#fallback', () => {
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

  describe('#receive', () => {
    it('should receive ETH', async () => {
      const transaction = {
        from: user1.address,
        to: council.address,
        value: ethers.BigNumber.from('100000000000'),
      };
      const result = await user1.sendTransaction(transaction);
      expect(result).to.emit(council, 'ReceiveEther')
        .withArgs(transaction.from, transaction.value);
    });

    it('should fail for fallback', async () => {
      const transaction = {
        from: user1.address,
        to: council.address,
        data: '0x12341234',
      };
      await expect(user1.sendTransaction(transaction))
        .to
        .be
        .revertedWith('function selector was not recognized and there\'s no fallback function');
    });
  });

  describe('various transactions', () => {
    it('should work after council is set up', async () => {
      if (skipLong) {
        return;
      }

      expect(council.connect(developer).submitTransaction(1, user1.address, 0, []))
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

      const owners = await council.owners();
      expect(owners.length).to.eq(11);

      const platinumId = await uselessNFT.getPlatinumTokenId();
      const goldId = platinumId.add(997).mod(1000);

      expect(await uselessNFT.getTier(platinumId)).to.eq(0);
      expect(await uselessNFT.getTier(goldId)).to.eq(1);

      const platinumOwnerAddress = await uselessNFT.ownerOf(platinumId);
      const goldOwnerAddress = await uselessNFT.ownerOf(goldId);

      const platinumOwner = [user1, user2, user3, user4].find(user => {
        return user.address.toLowerCase() === platinumOwnerAddress.toLowerCase();
      });
      const goldOwner = [user1, user2, user3, user4].find(user => {
        return user.address.toLowerCase() === goldOwnerAddress.toLowerCase();
      });
      expect(!!platinumOwner).to.eq(true);
      expect(!!goldOwner).to.eq(true);

      const result1 = await council.connect(platinumOwner!).submitTransaction(
        platinumId,
        user5.address,
        0,
        [],
      );
      expect(result1).to.emit(council, 'Submission');
      expect(result1).to.emit(council, 'Confirmation');

      await expect(council.connect(platinumOwner!).submitTransaction(platinumId, ethers.constants.AddressZero, 0, []))
        .to.be.revertedWith('address is useless');

      await council.connect(platinumOwner!).submitTransaction(
        platinumId,
        council.address,
        0,
        UselessMultiSig__factory.createInterface().encodeFunctionData('changeRequirement', [7]),
      );

      // this one will fail
      await council.connect(platinumOwner!).submitTransaction(
        platinumId,
        council.address,
        0,
        UselessMultiSig__factory.createInterface().encodeFunctionData('changeRequirement', [0]),
      );

      // this one will fail without a message
      const TestReverter = await ethers.getContractFactory('TestReverter');
      const testReverter = await TestReverter.deploy();
      await council.connect(platinumOwner!).submitTransaction(
        platinumId,
        testReverter.address,
        0,
        TestReverter__factory.createInterface().encodeFunctionData('callAndRevert'),
      );

      await expect(council.connect(platinumOwner!).confirmTransaction(platinumId, '999'))
        .to.be.revertedWith('useless transaction does not exist');

      await expect(council.connect(platinumOwner!).confirmTransaction(goldId, '0'))
        .to.be.revertedWith('not a valid owner');

      await expect(council.connect(platinumOwner!).confirmTransaction(platinumId.add(1), '0'))
        .to.be.revertedWith('owner is not useless enough');

      for (let i = 0; i < 4; i++) {
        const currentGoldId = goldId.add((i + 1) * 1000).mod(maxSupply);
        const currentGoldOwner = await uselessNFT.ownerOf(currentGoldId);
        const currentGoldSigner = await ethers.provider.getSigner(currentGoldOwner);
        const result2 = await council.connect(currentGoldSigner).confirmTransaction(currentGoldId, 0);
        expect(result2).to.emit(council, 'Confirmation');

        await council.connect(currentGoldSigner).confirmTransaction(currentGoldId, 1);
        await council.connect(currentGoldSigner).confirmTransaction(currentGoldId, 2);
        await council.connect(currentGoldSigner).confirmTransaction(currentGoldId, 3);
      }

      await expect(council.connect(platinumOwner!).changeRequirement(0))
        .to.be.revertedWith('only this council can call');

      await expect(council.connect(platinumOwner!).revokeConfirmation(goldId, 0))
        .to.be.revertedWith('not a valid owner');

      await expect(council.connect(platinumOwner!).revokeConfirmation(platinumId.add(1), 0))
        .to.be.revertedWith('owner is not useless enough');

      expect(await council.getConfirmationCount(0)).to.eq(5);
      const confirmationsBefore = await council.getConfirmations(0);
      expect(confirmationsBefore.length).to.eq(5);
      expect(confirmationsBefore.findIndex((value) => value.eq(platinumId))).to.not.eq(-1);

      await expect(council.connect(platinumOwner!).confirmTransaction(platinumId, 0))
        .to.be.revertedWith('useless transaction is already confirmed');

      const result3 = await council.connect(platinumOwner!).revokeConfirmation(platinumId, 0);
      await expect(result3).to.emit(council, 'Revocation').withArgs(platinumId, 0);

      const confirmationsAfter = await council.getConfirmations(0);
      expect(confirmationsAfter.length).to.eq(4);
      expect(confirmationsBefore.findIndex((value) => value.eq(platinumId))).to.not.eq(-1);
      expect(await council.getConfirmationCount(0)).to.eq(4);

      let currentGoldId = goldId.add(5000).mod(maxSupply);
      let currentGoldOwner = await uselessNFT.ownerOf(currentGoldId);
      let currentGoldSigner = await ethers.provider.getSigner(currentGoldOwner);
      const result2_1 = await council.connect(currentGoldSigner).confirmTransaction(currentGoldId, 0);
      await await expect(result2_1).to.emit(council, 'Confirmation').withArgs(currentGoldId, 0);

      currentGoldId = goldId.add(6000).mod(maxSupply);
      currentGoldOwner = await uselessNFT.ownerOf(currentGoldId);
      currentGoldSigner = await ethers.provider.getSigner(currentGoldOwner);
      const result2_2 = await council.connect(currentGoldSigner).confirmTransaction(currentGoldId, 0);
      await expect(result2_2).to.emit(council, 'Confirmation').withArgs(currentGoldId, 0);
      await expect(result2_2).to.emit(council, 'Execution').withArgs(0);

      const result4 = await council.connect(currentGoldSigner!).confirmTransaction(currentGoldId, 1);
      await expect(result4).to.emit(council, 'Confirmation').withArgs(currentGoldId, 1);
      await expect(result4).to.emit(council, 'Execution').withArgs(1);

      await expect(council.connect(currentGoldSigner!).revokeConfirmation(currentGoldId, 1))
        .to.be.revertedWith('useless transaction is already executed');

      {
        const otherGoldId = goldId.add(9000).mod(maxSupply);
        const otherGoldSigner = await ethers.provider.getSigner(await uselessNFT.ownerOf(otherGoldId));
        await expect(council.connect(otherGoldSigner!).executeTransaction(otherGoldId, 1))
          .to.be.revertedWith('useless transaction is not confirmed by this NFT');
      }

      expect(await council.getTransactionCount(false, false)).to.eq(0);
      expect(await council.getTransactionCount(false, true)).to.eq(2);
      expect(await council.getTransactionCount(true, true)).to.eq(4);

      await council.connect(currentGoldSigner!).confirmTransaction(currentGoldId, 2);
      await council.connect(currentGoldSigner!).confirmTransaction(currentGoldId, 3);

      // we need 7 signers now, not 6
      currentGoldId = currentGoldId.add(1000).mod(maxSupply);
      currentGoldSigner = await ethers.provider.getSigner(await uselessNFT.ownerOf(currentGoldId));
      const result6 = await council.connect(currentGoldSigner).confirmTransaction(currentGoldId, 2);
      await expect(result6).to.emit(council, 'Confirmation').withArgs(currentGoldId, 2)
      await expect(result6).to.emit(council, 'ExecutionFailure')
        .withArgs(
          2,
          `UselessMultiSig: revert at <${council.address.toLowerCase()}> with reason: requirements are useless`,
        );

      // we need 7 signers now, not 6
      currentGoldId = currentGoldId.add(1000).mod(maxSupply);
      currentGoldSigner = await ethers.provider.getSigner(await uselessNFT.ownerOf(currentGoldId));
      const result7 = await council.connect(currentGoldSigner).confirmTransaction(currentGoldId, 3);
      await expect(result7).to.emit(council, 'Confirmation').withArgs(currentGoldId, 3)
      await expect(result7).to.emit(council, 'ExecutionFailure')
        .withArgs(3, `UselessMultiSig: revert at <${testReverter.address.toLowerCase()}>`);

      // technically, transactions that fail to execute have their execution status set back to `false`
      expect(await council.getTransactionCount(false, false)).to.eq(0);
      expect(await council.getTransactionCount(false, true)).to.eq(2);
      expect(await council.getTransactionCount(true, true)).to.eq(4);

      expect((await council.getTransactionIds(0, 4, true, true)).map(id => id.toString())).to.eql(['0', '1', '2', '3']);
      expect((await council.getTransactionIds(0, 4, false, true)).map(id => id.toString()))
        .to
        .eql(['0', '1', '0', '0']);
      expect((await council.getTransactionIds(0, 4, true, false)).map(id => id.toString()))
        .to
        .eql(['2', '3', '0', '0']);
    });
  });
});
