#!/usr/bin/env bash
# bot-hosting.net にアップロードする ZIP を作る
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-/tmp/collection-discord-bot-bot-hosting.zip}"
rm -f "$OUT"

zip -r "$OUT" \
  package.json \
  package-lock.json \
  README.md \
  .env.example \
  src \
  scripts \
  -x "scripts/start-bot.sh" \
  -x "**/.DS_Store"

echo "Created: $OUT"
unzip -l "$OUT" | head -40
