import { 
  Cell, 
  beginCell, 
  Address, 
  contractAddress, 
  toNano,
  Dictionary,
  Slice
} from '@ton/core';

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

// Collection params - Modify for your collection!
const collectionParams = {
  owner: Address.parse("0QC5aIl4jhHxR-xpt27LGmkkXSKqKrfPDrIFRVbw3pJp1ak1"), // Your address
  royaltyAddress: Address.parse("EQCQMcvQkJaukQkocQUG2dnTAk-s2_WzAx8JOnxI7LKDKdm8"), // same as owner
  royaltyFactor: 100, // 1%
  royaltyBase: 10000,
  // On-chain metadata fields (stored as on-chain dict per TEP-64)
  name: "TonCAST Stake NFTs OnChain v0.0.1",
  description: "Proof-of-stake NFTs for TonCAST DAO with simplified on-chain metadata",
  image: "https://test.toncast.me/images/nft-v2/collection.png",
  cover_image: "https://test.toncast.me/images/nft-v2/collection-cover.png",
  social_links: ["https://test.toncast.me/"],
};

// Get compiled codes
export function getNftCodes(): { collectionCode: Cell; itemCode: Cell } {
  // Compile if needed
  execSync('bash nft/compile.sh', { stdio: 'inherit' });
  
  // Read compiled hex codes from build output
  const collectionHex = readFileSync('nft/build/nft-collection-code.hex', 'utf8').trim();
  const itemHex = readFileSync('nft/build/nft-item-code.hex', 'utf8').trim();
  
  return {
    collectionCode: Cell.fromBoc(Buffer.from(collectionHex, 'hex'))[0],
    itemCode: Cell.fromBoc(Buffer.from(itemHex, 'hex'))[0],
  };
}

// snake helpers
function makeSnakeCell(data: Buffer): Cell {
  const chunks: Buffer[] = [];
  for (let i = 0; i < data.length; i += 127) chunks.push(data.slice(i, i + 127));
  if (chunks.length === 0) return beginCell().endCell();
  if (chunks.length === 1) return beginCell().storeBuffer(chunks[0]).endCell();
  let cur = beginCell();
  for (let i = chunks.length - 1; i >= 0; i--) {
    cur.storeBuffer(chunks[i]);
    if (i > 0) {
      const next = beginCell();
      next.storeRef(cur.endCell());
      cur = next;
    }
  }
  return cur.endCell();
}

// Simple text cell as in the article
function toTextCell(s: string): Cell {
  return beginCell()
    .storeUint(0, 8)
    .storeStringTail(s)
    .endCell();
}

// Build on-chain dict content (TEP-64) - following the article format
function buildOnChainDictContent(params: {
  name?: string;
  description?: string;
  image?: string;
  cover_image?: string;
  social_links?: string[];
}): Cell {
  const dict = Dictionary.empty<bigint, Cell>(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
  
  const put = (k: string, v?: string) => {
    if (!v) return;
    const key = BigInt('0x' + createHash('sha256').update(k).digest().toString('hex'));
    dict.set(key, toTextCell(v));
  };
  
  put('name', params.name);
  put('description', params.description);
  put('image', params.image);
  put('cover_image', params.cover_image);
  if (params.social_links && params.social_links.length > 0) {
    put('social_links', JSON.stringify(params.social_links));
  }
  
  return beginCell()
    .storeUint(0, 8) // on-chain tag
    .storeDict(dict)
    .endCell();
}

// royalty removed

// Build content container cell: [ref collection_content, ref common_content]
function buildContentContainer(collectionContent: Cell, commonContent: Cell): Cell {
  return beginCell().storeRef(collectionContent).storeRef(commonContent).endCell();
}

// Initialize collection data
export function initData() {
  const { collectionCode, itemCode } = getNftCodes();
  
  const collectionContent = buildOnChainDictContent({
    name: collectionParams.name,
    description: collectionParams.description,
    image: collectionParams.image,
    cover_image: collectionParams.cover_image,
    social_links: collectionParams.social_links,
  });
  // Common content not used — store empty cell to satisfy storage layout
  const commonContent = beginCell().endCell();
  const contentCell = buildContentContainer(collectionContent, commonContent);
  
  return beginCell()
    .storeAddress(collectionParams.owner)
    .storeUint(0, 64) // next_item_index
    .storeRef(contentCell)
    .storeRef(itemCode)
    .endCell();
}

// No init message needed for NFT collection
export function initMessage() {
  return null;
}

// Get new collection address
export function getNewCollectionAddress(): Address {
  const { collectionCode } = getNftCodes();
  const initialData = initData();
  
  return contractAddress(0, { code: collectionCode, data: initialData });
}

// Build Tonkeeper deeplink
function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function getTonkeeperDeeplink(options?: {
  amountNano?: bigint | string;
  comment?: string;
  bounceable?: boolean;
}): string {
  const { collectionCode } = getNftCodes();
  const initialData = initData();
  const bodyCell = initMessage();
  
  // Create StateInit
  const stateInit = beginCell()
    .storeUint(0, 2) // no split_depth, no special
    .storeUint(1, 1) // has code
    .storeRef(collectionCode)
    .storeUint(1, 1) // has data
    .storeRef(initialData)
    .storeUint(0, 1) // no libraries
    .endCell();
  const stateInitBase64Url = toBase64Url(stateInit.toBoc());
  
  const newAddress = contractAddress(0, { code: collectionCode, data: initialData });
  const addressFriendly = newAddress.toString({ urlSafe: true, bounceable: options?.bounceable ?? false });
  
  const amount = options?.amountNano
    ? (typeof options.amountNano === "string" ? options.amountNano : options.amountNano.toString())
    : toNano(0.1).toString();
  
  // Empty body for NFT collection deployment
  const emptyBody = beginCell().endCell();
  const bodyBase64Url = toBase64Url(emptyBody.toBoc());
  const binParam = `&bin=${bodyBase64Url}`;
  
  return `ton://transfer/${addressFriendly}?amount=${amount}&init=${stateInitBase64Url}${binParam}`;
}
