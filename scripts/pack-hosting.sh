#!/usr/bin/env bash
# Discloud / Quaxly 等にアップロードする ZIP を作る（node_modules なし）
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-/tmp/collection-discord-bot-hosting.zip}"
rm -f "$OUT"

zip -r "$OUT" \
  package.json \
  package-lock.json \
  README.md \
  .env.example \
  discloud.config \
  index.js \
  src \
  scripts \
  -x "**/.DS_Store"

echo "Created: $OUT"
unzip -l "$OUT" | head -40
