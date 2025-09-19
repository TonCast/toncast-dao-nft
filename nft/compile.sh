#!/usr/bin/env bash
set -euo pipefail

# Ensure we run from the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Use local toolchain from ../bin
export PATH="$SCRIPT_DIR/../bin:$PATH"
export FIFTPATH="$SCRIPT_DIR/../bin/fiftlib"

mkdir -p build
rm -f build/nft-item-code.fif
rm -f build/nft-collection-code.fif
rm -f build/nft-item-code.hex
rm -f build/nft-collection-code.hex

func -o build/nft-item-code.fif -SPA ../stdlib.fc params.fc op-codes.fc nft-item.fc
func -o build/nft-collection-code.fif -SPA ../stdlib.fc params.fc op-codes.fc nft-collection.fc

# Save to hex files
fift -s build/print-hex.fif > build/hex-output.txt
grep -A1 "nft-collection:" build/hex-output.txt | tail -1 | tr -d ' ' > build/nft-collection-code.hex
grep -A1 "nft:" build/hex-output.txt | tail -1 | tr -d ' ' > build/nft-item-code.hex
rm -f build/hex-output.txt
