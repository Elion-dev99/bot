#!/usr/bin/env node
/**
 * Bot 招待用 URL を表示する
 * 使い方: node scripts/invite-url.js
 * または: DISCORD_CLIENT_ID=... npm run invite
 */
import "dotenv/config";

const clientId = process.env.DISCORD_CLIENT_ID || process.argv[2];

if (!clientId) {
  console.error(
    "DISCORD_CLIENT_ID が未設定です。.env に書くか、引数で渡してください。"
  );
  process.exit(1);
}

// View Channels + Send Messages + Read Message History + Embed Links
const permissions = 1024 + 2048 + 65536 + 16384;
// bot + applications.commands（スラッシュコマンド /削除 用）
const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;

console.log("\nBot 招待リンク（サーバーに追加するときに開く）:\n");
console.log(url);
console.log("\n※ 既に招待済みの場合は、同じリンクで applications.commands 権限を追加し直してください。");
console.log("※ スラッシュコマンド登録: npm run register-commands\n");
