// Generates Tonkeeper deeplink for deploying NFT Collection
// Usage: npm run link:nft:tonkeeper [-- --comment="Your comment" --bounceable=false --amount=500000000]

import { getNewCollectionAddress, getTonkeeperDeeplink } from "./nft-collection.deploy";

function parseArgs(argv: string[]): { comment?: string; bounceable?: boolean; amount?: string } {
  const args: { [k: string]: string } = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  const res: { comment?: string; bounceable?: boolean; amount?: string } = {};
  if (args.comment) res.comment = args.comment;
  if (args.bounceable !== undefined) res.bounceable = args.bounceable === "true";
  if (args.amount) res.amount = args.amount; // in nanotons, string
  return res;
}

async function main() {
  try {
    const opts = parseArgs(process.argv);
    const address = getNewCollectionAddress();
    const deeplink = getTonkeeperDeeplink({ comment: opts.comment ?? "Deploy NFT collection", bounceable: opts.bounceable, amountNano: opts.amount });

    console.log("Address:", address.toString({ bounceable: opts.bounceable ?? false }));
    console.log("Deeplink:", deeplink);
    process.exit(0);
  } catch (err: any) {
    console.error("Failed to generate Tonkeeper link:", err?.message ?? err);
    process.exit(1);
  }
}

main();
