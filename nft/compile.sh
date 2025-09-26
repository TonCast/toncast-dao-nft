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
rm -f build/nft-item-code.b64
rm -f build/nft-collection-code.b64

func -o build/nft-item-code.fif -SPA ../stdlib.fc params.fc op-codes.fc nft-item.fc
func -o build/nft-collection-code.fif -SPA ../stdlib.fc params.fc op-codes.fc nft-collection.fc

# Save to hex files
fift -s build/print-hex.fif > build/hex-output.txt
grep -A1 "nft-collection:" build/hex-output.txt | tail -1 | tr -d ' ' > build/nft-collection-code.hex
grep -A1 "nft:" build/hex-output.txt | tail -1 | tr -d ' ' > build/nft-item-code.hex
rm -f build/hex-output.txt

# Also export base64 BOCs for convenience
if command -v xxd >/dev/null 2>&1; then
  cat build/nft-collection-code.hex | xxd -r -p | base64 > build/nft-collection-code.b64
  cat build/nft-item-code.hex | xxd -r -p | base64 > build/nft-item-code.b64
else
  # Fallback using Python if xxd is not available
  python3 - <<'PY'
import base64, binascii
from pathlib import Path
col_hex = Path('build/nft-collection-code.hex').read_text().strip()
itm_hex = Path('build/nft-item-code.hex').read_text().strip()
Path('build/nft-collection-code.b64').write_text(base64.b64encode(binascii.unhexlify(col_hex)).decode())
Path('build/nft-item-code.b64').write_text(base64.b64encode(binascii.unhexlify(itm_hex)).decode())
PY
fi

echo "[build] nft-collection base64:" >&2
cat build/nft-collection-code.b64
echo "" 
echo "[build] nft-item base64:" >&2
cat build/nft-item-code.b64
echo ""
