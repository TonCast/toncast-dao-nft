# TON NFT collection and items (on-chain metadata) with Tonkeeper links


## Structure

- nft/ — FunC contracts for collection and items, build script
- scripts/ — ton:// link generators (deploy and mint)
- bin/ — local func/fift/fiftlib (not committed)
- stdlib.fc — FunC standard library
- misc/forward-fee-calc.fc — helper utility

## NFT contracts

- `nft/nft-collection.fc` — collection; `get_nft_content` returns individual content as is (format is defined at mint time)
- `nft/nft-item.fc` — NFT item

On-chain metadata follows TEP‑64 ([0064-token-data-standard](https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md)).

## Build

Build NFT (uses local `bin/func`, `bin/fift`):
```bash
npm run build
```

### Local toolchain (func/fift) setup (bin/ is gitignored)

If you don't have `bin/` yet, download the local toolchain before building:

1) Create the folder and move into it
```bash
mkdir -p bin && cd bin
```

2) Download binaries (from official TON releases) and fiftlib
- Place `func` and `fift` binaries into `bin/`
- Download `fiftlib` (library) and unpack into `bin/fiftlib/`

3) Make binaries executable
```bash
chmod +x func fift
```

The script `nft/compile.sh` sets `PATH` and `FIFTPATH` to use `bin/func`, `bin/fift` and `bin/fiftlib` automatically.

## Tonkeeper links

- Deploy collection:
```bash
npm run link:nft:tonkeeper -- --amount=100000000
```

- Mint item:
```bash
npm run link:nft:mint:tonkeeper -- --collection=<address> --index=<n> --owner=<address> --amount=100000000 --staked=1000
```

- Change collection owner:
```bash
npm run link:nft:owner:tonkeeper -- --collection=<address> --newOwner=<address> --amount=50000000
```

Scripts print only `ton://` deeplinks (`init=` for deploy, `bin=` for mint body).

## Upstream reference

This repository is derived from the original token contracts and examples in the TON ecosystem. Historical reference (upstream inspiration):

- https://github.com/ton-blockchain/token-contract
