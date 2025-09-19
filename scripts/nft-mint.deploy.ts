import {
  Cell,
  beginCell,
  Address,
  toNano,
  Dictionary
} from "@ton/core";

import { createHash } from 'crypto';

// Mint params
const mintParams = {
  collectionAddress: "kQDj2G5LWf9mdG4jOKPB-Ihse9N6IQapSyUonvGPM6W5Q0SL", // New collection address
  itemIndex: 0, // First item for this collection
  itemOwner: Address.parse("0QCQMcvQkJaukQkocQUG2dnTAk-s2_WzAx8JOnxI7LKDKT_z"), // Default owner
  itemAmount: toNano(0.02),
  stakedAmount: 1000,
  daoAddress: Address.parse("EQCQMcvQkJaukQkocQUG2dnTAk-s2_WzAx8JOnxI7LKDKdm8"),
  // Item metadata that will be stored on-chain
  name: "TonCAST Stake NFT testnet",
  description: "Proof of stake in TonCAST DAO testnet",
  image: "https://test.toncast.me/images/nft-1/", // Will add item index to URL
};

// Helpers from jetton-minter.deploy.ts
const sha256 = (s: string) => createHash('sha256').update(s).digest();

const ONCHAIN_CONTENT_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;

// Simple text cell as in the article
function toTextCell(s: string): Cell {
  return beginCell()
    .storeUint(0, 8)
    .storeStringTail(s)
    .endCell();
}

// Build on-chain content TEP-64 (dict format) - as in the article
function buildTokenMetadataCell(data: { [s: string]: string | undefined }): Cell {
  const dict = Dictionary.empty<bigint, Cell>(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

  Object.entries(data).forEach(([k, v]: [string, string | undefined]) => {
    if (v === undefined || v === "") return;
    dict.set(BigInt('0x' + sha256(k).toString('hex')), toTextCell(v));
  });

  return beginCell()
    .storeUint(0, 8) // on-chain content prefix
    .storeDict(dict)
    .endCell();
}

// Build mint message
export function buildMintMessage(
  itemIndex: number,
  itemOwner: Address,
  itemAmount: bigint,
  individualContentWrapped: Cell
): Cell {
  return beginCell()
    .storeUint(1, 32) // op = 1 (deploy new nft)
    .storeUint(0, 64) // query_id
    .storeUint(itemIndex, 64)
    .storeCoins(itemAmount)
    .storeRef(individualContentWrapped)
    .endCell();
}

// Build Tonkeeper deeplink
function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function getTonkeeperMintDeeplink(options?: {
  collectionAddress?: string;
  itemIndex?: number;
  itemOwner?: string;
  amountNano?: bigint | string;
  stakedAmount?: number;
}): string {
  const collection = Address.parse(options?.collectionAddress ?? mintParams.collectionAddress);
  const itemIndex = options?.itemIndex ?? mintParams.itemIndex;
  const itemOwner = Address.parse(options?.itemOwner ?? mintParams.itemOwner.toString());
  const stakedAmount = options?.stakedAmount ?? mintParams.stakedAmount;
  
  const mintedAt = Math.floor(Date.now() / 1000);
  
  // Build on-chain metadata for item
  const individualContent = buildTokenMetadataCell({
    name: `${mintParams.name} #${itemIndex}`,
    description: `${stakedAmount}|${mintedAt}|${mintParams.daoAddress.toString()}`,
    // description: `${stakedAmount}|${mintedAt}|${mintParams.daoAddress.toString()}`,
    image: `${mintParams.image}${itemIndex}.png`,
    // attributes: JSON.stringify([
    //   { trait_type: "Staked Amount", value: String(stakedAmount) },
    //   { trait_type: "Minted At", display_type: "date", value: mintedAt },
    //   { trait_type: "DAO Address", value: mintParams.daoAddress.toString() }
    // ])
  });
  
  // Wrap owner + content for item init
  const individualContentWrapped = beginCell()
    .storeAddress(itemOwner)
    .storeRef(individualContent)
    .endCell();
  
  const body = buildMintMessage(
    itemIndex,
    itemOwner,
    mintParams.itemAmount,
    individualContentWrapped
  );
  
  const bodyBase64Url = toBase64Url(body.toBoc());
  const amount = options?.amountNano
    ? (typeof options.amountNano === 'string' ? options.amountNano : options.amountNano.toString())
    : toNano(0.05).toString();
  
  const addressFriendly = collection.toString({ bounceable: false });
  
  return `ton://transfer/${addressFriendly}?amount=${amount}&bin=${bodyBase64Url}`;
}

// HTTPS link removed per requirement: only ton:// deeplinks are used
