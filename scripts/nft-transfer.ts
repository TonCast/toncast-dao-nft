import { Address, beginCell, toNano } from '@ton/core';

// Build transfer body for NFT item contract
function buildNftTransferBody(args: {
  queryId: bigint;
  newOwner: Address | null;
  responseDestination?: Address | null;
  forwardAmount: bigint;
  forwardPayload?: Buffer | null;
}) {
  const body = beginCell()
    .storeUint(0x5fcc3d14, 32) // op::transfer
    .storeUint(args.queryId, 64)
    .storeAddress(args.newOwner)
    .storeAddress(args.responseDestination ?? null)
    .storeUint(0, 1) // custom_payload flag = 0 (null)
    .storeCoins(args.forwardAmount);

  if (args.forwardPayload && args.forwardPayload.length > 0) {
    body.storeBuffer(args.forwardPayload);
  } else if (args.forwardAmount > 0n) {
    // Ensure at least 1 bit remains after forward_amount as required by our NFT
    body.storeUint(0, 1);
  }

  return body.endCell();
}

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parseArgs(argv: string[]): {
  nft?: string;
  newOwner?: string;
  response?: string;
  amount?: string; // nanotons for message value
  fwd?: string; // nanotons to forward to new owner
  q?: string; // query id as decimal string
  payload?: string; // hex string without 0x
} {
  const args: Record<string, string> = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return {
    nft: args.nft,
    newOwner: args.newOwner,
    response: args.response,
    amount: args.amount,
    fwd: args.fwd,
    q: args.q,
    payload: args.payload,
  };
}

async function main() {
  try {
    const opts = parseArgs(process.argv);
    if (!opts.nft) throw new Error('Missing --nft');
    // newOwner can be 'none' to encode addr_none

    const nft = Address.parse(opts.nft);
    const newOwner = opts.newOwner && opts.newOwner !== 'none' ? Address.parse(opts.newOwner) : null;
    const response = opts.response ? Address.parse(opts.response) : null;

    const messageValue = opts.amount ? BigInt(opts.amount) : toNano('0.05');
    const forwardAmount = opts.fwd ? BigInt(opts.fwd) : toNano('0.03');
    const queryId = opts.q ? BigInt(opts.q) : BigInt(0);
    const forwardPayload = opts.payload ? Buffer.from(opts.payload, 'hex') : null;

    const body = buildNftTransferBody({
      queryId,
      newOwner,
      responseDestination: response,
      forwardAmount,
      forwardPayload,
    });

    const bodyB64 = toBase64Url(body.toBoc());
    const to = nft.toString({ bounceable: false });
    const deeplink = `ton://transfer/${to}?amount=${messageValue.toString()}&bin=${bodyB64}`;

    console.log('NFT:', to);
    console.log('New owner:', newOwner ? newOwner.toString({ bounceable: false }) : 'none');
    console.log('Response destination:', response ? response.toString({ bounceable: false }) : 'none');
    console.log('Message value (nanoTON):', messageValue.toString());
    console.log('Forward amount (nanoTON):', forwardAmount.toString());
    console.log('Query ID:', queryId.toString());
    console.log('Deeplink:', deeplink);
    process.exit(0);
  } catch (err: any) {
    console.error('Failed to build NFT transfer deeplink:', err?.message ?? err);
    process.exit(1);
  }
}

main();


