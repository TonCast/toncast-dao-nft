// Generates Tonkeeper deeplink for minting NFT
// Usage: npm run link:nft:mint [-- --collection=<address> --index=0 --owner=<address> --amount=100000000 --staked=1000]

import { getTonkeeperMintDeeplink } from "./nft-mint.deploy";

function parseArgs(argv: string[]): {
  collection?: string;
  index?: number;
  owner?: string;
  amount?: string; // in nanotons
  staked?: number;
} {
  const args: { [k: string]: string } = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  const res: {
    collection?: string;
    index?: number;
    owner?: string;
    amount?: string; // in nanotons
    staked?: number;
  } = {};
  if (args.collection) res.collection = args.collection;
  if (args.index !== undefined) res.index = parseInt(args.index);
  if (args.owner) res.owner = args.owner;
  if (args.amount) res.amount = args.amount; // in nanotons
  if (args.staked !== undefined) res.staked = parseInt(args.staked);
  return res;
}

async function main() {
  try {
    const opts = parseArgs(process.argv);
    const deeplink = getTonkeeperMintDeeplink({
      collectionAddress: opts.collection,
      itemIndex: opts.index,
      itemOwner: opts.owner,
      amountNano: opts.amount,
      stakedAmount: opts.staked,
    });

    console.log("Collection:", opts.collection ?? "UQA_B407fiLIlE5VYZCaI2rki0in6kLyjdhhwitvZNfpe-pd");
    console.log("Deeplink:", deeplink);
    process.exit(0);
  } catch (err: any) {
    console.error("Failed to generate Tonkeeper mint link:", err?.message ?? err);
    process.exit(1);
  }
}

main();
