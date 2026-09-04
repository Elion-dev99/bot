#!/usr/bin/env node
/**
 * 起動時に名簿が空ならバックアップから自動復元する
 * （bot-hosting.net への初回移行向け）
 */
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CHANNEL = "1533753991085821965";

export function maybeRestoreRosterOnBoot() {
  if (process.env.SKIP_ROSTER_RESTORE === "1") return;

  const dataDir = path.resolve(process.env.DATA_DIR || "data");
  const channelId = process.env.RESTORE_CHANNEL_ID || DEFAULT_CHANNEL;
  const dest = path.join(dataDir, `${channelId}.json`);
  const backup = path.resolve("scripts/backups", `${channelId}.json`);

  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.warn("[restore] data dir 作成失敗:", err.message);
    return;
  }

  if (fs.existsSync(dest)) {
    try {
      const existing = JSON.parse(fs.readFileSync(dest, "utf8"));
      const count = Object.keys(existing.members || {}).length;
      if (count > 0) {
        console.log(`[restore] 既存名簿あり (${count}人) → スキップ`);
        return;
      }
    } catch {
      // corrupt → overwrite below
    }
  }

  if (!fs.existsSync(backup)) {
    console.log("[restore] バックアップなし → スキップ");
    return;
  }

  fs.copyFileSync(backup, dest);
  const restored = JSON.parse(fs.readFileSync(dest, "utf8"));
  console.log(
    `[restore] 名簿を復元しました: ${channelId}（${Object.keys(restored.members || {}).length}人）`
  );
}
