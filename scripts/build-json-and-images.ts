import { existsSync, mkdirSync, promises as fsPromises } from 'fs'

const { writeFile } = fsPromises
require('dotenv').config();

export enum Tier {
  Platinum = 'Platinum',
  Gold = 'Gold',
  Silver = 'Silver',
  Bronze = 'Bronze',
  Pleb = 'Pleb',
  Unknown = 'Not Revealed Yet',
}

const allTiers = [Tier.Platinum, Tier.Gold, Tier.Silver, Tier.Bronze, Tier.Pleb, Tier.Unknown];


function createJsonContentForTier(id: number, tier: number, imageIpfsFolder: string): string {
  const tierAsString = allTiers[tier] === Tier.Unknown ? 'x' : tier.toString();
  const fileExtension = allTiers[tier] === Tier.Unknown ? 'gif' : 'png';
  return JSON.stringify({
    name: `Useless NFT #${id}`,
    description: `Useless NFT #${id}`,
    image: `ipfs://${imageIpfsFolder}/image-tier-${tierAsString}.${fileExtension}`,
    attributes: [
      {
        trait_type: 'Tier',
        value: allTiers[tier],
      },
    ],
  });
}

async function main() {
  if (!existsSync('./scripts/build')) {
    mkdirSync('./scripts/build');
  }
  if (!existsSync('./scripts/build/json')) {
    mkdirSync('./scripts/build/json');
  }
  if (!existsSync('./scripts/build/images')) {
    mkdirSync('./scripts/build/images');
  }

  const maxSupply = 10000
  const imageIpfsFolder = process.env.IMAGE_IPFS_FOLDER
  if (!imageIpfsFolder) {
    return Promise.reject(new Error('Invalid IMAGE_IPFS_FOLDER, found ' + imageIpfsFolder));
  }

  for (let i = 0; i < maxSupply; i++) {
    await Promise.all([
      writeFile(`./scripts/build/json/${i}_0.json`, createJsonContentForTier(i, 0, imageIpfsFolder)),
      writeFile(`./scripts/build/json/${i}_1.json`, createJsonContentForTier(i, 1, imageIpfsFolder)),
      writeFile(`./scripts/build/json/${i}_2.json`, createJsonContentForTier(i, 2, imageIpfsFolder)),
      writeFile(`./scripts/build/json/${i}_3.json`, createJsonContentForTier(i, 3, imageIpfsFolder)),
      writeFile(`./scripts/build/json/${i}_4.json`, createJsonContentForTier(i, 4, imageIpfsFolder)),
      writeFile(`./scripts/build/json/${i}_x.json`, createJsonContentForTier(i, 5, imageIpfsFolder)),
    ]);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Caught error ', error)
    process.exit(-1)
  });
