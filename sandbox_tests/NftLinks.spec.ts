// Simple tests for Tonkeeper deeplink generators
// Comments/logs must be in English

import { getTonkeeperDeeplink, getNewCollectionAddress } from "../scripts/nft-collection.deploy";
import { getTonkeeperMintDeeplink } from "../scripts/nft-mint.deploy";

describe("NFT Tonkeeper links", () => {
  it("generates collection deploy deeplink with init", () => {
    const link = getTonkeeperDeeplink({ amountNano: "100000000", bounceable: false });
    expect(link.startsWith("ton://transfer/")).toBe(true);
    expect(link.includes("&init=")).toBe(true);
  });

  it("generates item mint deeplink with bin", () => {
    const collAddr = getNewCollectionAddress().toString({ urlSafe: true, bounceable: false });
    const link = getTonkeeperMintDeeplink({ collectionAddress: collAddr, itemIndex: 0, amountNano: "100000000" });
    expect(link.startsWith("ton://transfer/")).toBe(true);
    expect(link.includes("&bin=")).toBe(true);
  });
});


