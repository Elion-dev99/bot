#!/usr/bin/env node
/**
 * 名簿バックアップを data/ に復元する（Railway 再デプロイ後など）
 *
 * 使い方:
 *   node scripts/restore-roster.js
 *   node scripts/restore-roster.js 1533753991085821965
 */
import fs from "node:fs";
import path from "node:path";

const channelId = process.argv[2] || "1533753991085821965";
const dataDir = path.resolve(process.env.DATA_DIR || "data");
const backup = path.resolve("scripts/backups", `${channelId}.json`);
const dest = path.join(dataDir, `${channelId}.json`);

if (!fs.existsSync(backup)) {
  console.error(`バックアップが見つかりません: ${backup}`);
  process.exit(1);
}

fs.mkdirSync(dataDir, { recursive: true });

if (fs.existsSync(dest)) {
  const existing = JSON.parse(fs.readFileSync(dest, "utf8"));
  const count = Object.keys(existing.members || {}).length;
  if (count > 0) {
    console.error(
      `既に名簿があります（${count}人）。上書きする場合は先に ${dest} を削除してください。`
    );
    process.exit(1);
  }
}

fs.copyFileSync(backup, dest);
const restored = JSON.parse(fs.readFileSync(dest, "utf8"));
console.log(
  `復元完了: ${dest}（${Object.keys(restored.members || {}).length}人）`
);
