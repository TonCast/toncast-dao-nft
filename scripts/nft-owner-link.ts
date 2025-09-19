// Generates Tonkeeper deeplink to change NFT collection owner
// Usage: npm run link:nft:owner:tonkeeper -- --collection=<addr> --newOwner=<addr> --amount=50000000

import { Address, beginCell, toNano } from '@ton/core';

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parseArgs(argv: string[]): {
  collection?: string;
  newOwner?: string;
  amount?: string; // nanotons
} {
  const args: Record<string, string> = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return {
    collection: args.collection,
    newOwner: args.newOwner,
    amount: args.amount,
  };
}

function buildChangeOwnerBody(newOwner: Address) {
  return beginCell()
    .storeUint(3, 32) // op = 3 (change owner)
    .storeUint(0, 64) // query_id
    .storeAddress(newOwner)
    .endCell();
}

async function main() {
  try {
    const opts = parseArgs(process.argv);
    if (!opts.collection) throw new Error('Missing --collection');
    if (!opts.newOwner) throw new Error('Missing --newOwner');

    const collection = Address.parse(opts.collection);
    const newOwner = Address.parse(opts.newOwner);
    const body = buildChangeOwnerBody(newOwner);
    const bodyB64 = toBase64Url(body.toBoc());

    const amount = opts.amount ? opts.amount : toNano('0.05').toString();
    const to = collection.toString({ bounceable: false });
    const deeplink = `ton://transfer/${to}?amount=${amount}&bin=${bodyB64}`;

    console.log('Collection:', to);
    console.log('New owner:', newOwner.toString({ bounceable: false }));
    console.log('Deeplink:', deeplink);
    process.exit(0);
  } catch (err: any) {
    console.error('Failed to generate owner change link:', err?.message ?? err);
    process.exit(1);
  }
}

main();


