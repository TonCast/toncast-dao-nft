// Basic sandbox tests for NFT collection contract
// Comments/logs must be in English

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, Contract, ContractProvider, Sender, contractAddress, toNano, Dictionary } from '@ton/core';
import { getNftCodes } from '../scripts/nft-collection.deploy';

class NftCollection implements Contract {
  readonly address: Address;
  readonly init?: { code: Cell; data: Cell };

  private constructor(address: Address, init?: { code: Cell; data: Cell }) {
    this.address = address;
    this.init = init;
  }

  static createForDeployWithOwner(owner: Address): NftCollection {
    const { collectionCode, itemCode } = getNftCodes();
    const content = beginCell()
      .storeRef(beginCell().endCell()) // collection_content (empty on-chain dict)
      .storeRef(beginCell().storeStringTail("").endCell()) // common_content (empty)
      .endCell();
    const data = beginCell()
      .storeAddress(owner)
      .storeUint(0, 64)
      .storeRef(content)
      .storeRef(itemCode)
      .endCell();
    const addr = contractAddress(0, { code: collectionCode, data });
    return new NftCollection(addr, { code: collectionCode, data });
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, { value, sendMode: 1 });
  }

  async get_collection_data(provider: ContractProvider): Promise<{ next: number; owner: Address; content: Cell }> {
    const res = await provider.get('get_collection_data', []);
    const next = Number(res.stack.readBigNumber());
    const content = res.stack.readCell();
    const owner = res.stack.readAddress();
    return { next, owner, content };
  }

  async get_nft_address_by_index(provider: ContractProvider, index: number): Promise<Address> {
    const res = await provider.get('get_nft_address_by_index', [{ type: 'int', value: BigInt(index) }]);
    return res.stack.readAddress();
  }
}

function toTextCell(s: string): Cell {
  return beginCell().storeUint(0, 8).storeStringTail(s).endCell();
}

function buildOnChainDict(data: Record<string, string>): Cell {
  const dict = Dictionary.empty<bigint, Cell>(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
  for (const [k, v] of Object.entries(data)) {
    const hash = BigInt('0x' + require('crypto').createHash('sha256').update(k).digest('hex'));
    dict.set(hash, toTextCell(v));
  }
  return beginCell().storeUint(0, 8).storeDict(dict).endCell();
}

function buildMintBody(index: number, owner: Address, forwardAmount: bigint): Cell {
  const individual = buildOnChainDict({ name: `Test #${index}` });
  const ownerAndContent = beginCell().storeAddress(owner).storeRef(individual).endCell();
  return beginCell()
    .storeUint(1, 32) // op
    .storeUint(0, 64) // query_id
    .storeUint(index, 64)
    .storeCoins(forwardAmount)
    .storeRef(ownerAndContent)
    .endCell();
}

describe('NftCollection sandbox', () => {
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let collection: SandboxContract<NftCollection>;

  beforeAll(async () => {
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');
    collection = blockchain.openContract(NftCollection.createForDeployWithOwner(deployer.address));
    await collection.sendDeploy(deployer.getSender(), toNano('0.1'));
  });

  it('get_collection_data returns initial state', async () => {
    const data = await (collection as any).get_collection_data();
    expect(data.next).toBe(0);
    expect(data.owner).toBeDefined();
  });

  it('mints item #0 and increases next_item_index', async () => {
    const body = buildMintBody(0, deployer.address, toNano('0.05'));
    await deployer.send({ to: collection.address, value: toNano('0.1'), body });

    const data = await (collection as any).get_collection_data();
    expect(data.next).toBe(1);

    const itemAddr = await (collection as any).get_nft_address_by_index(0);
    expect(itemAddr).toBeDefined();
  });
});


