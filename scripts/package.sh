#!/usr/bin/env bash
# Package the built extension into a Chrome Web Store-ready zip.
# Usage: bash scripts/package.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -d dist ]; then
  echo "dist/ not found — run 'npm run build' first." >&2
  exit 1
fi

VERSION="$(node -p "require('./package.json').version")"
OUT="cors-enabler-v${VERSION}.zip"

rm -f "$OUT"
# Exclude source maps from the store package.
(cd dist && zip -r -X "../$OUT" . -x "*.map" >/dev/null)

echo "Created $OUT"
