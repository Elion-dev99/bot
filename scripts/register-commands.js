#!/usr/bin/env node
/**
 * Discord スラッシュコマンドを API に登録する
 *
 * 使い方:
 *   npm run register-commands
 *
 * 環境変数:
 *   DISCORD_TOKEN       … Bot トークン（必須）
 *   DISCORD_CLIENT_ID   … Application ID（必須）
 *   DISCORD_GUILD_ID    … 指定時はそのサーバーのみに即時登録（開発向け）
 *                         未指定時はグローバル登録（反映まで最大約1時間）
 */
import "dotenv/config";
import { REST, Routes } from "discord.js";
import { buildSlashCommands } from "../src/slash-commands.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || token === "your_bot_token_here") {
  console.error("DISCORD_TOKEN が未設定です。.env を確認してください。");
  process.exit(1);
}
if (!clientId) {
  console.error("DISCORD_CLIENT_ID が未設定です。.env を確認してください。");
  process.exit(1);
}

const commands = buildSlashCommands();
const rest = new REST({ version: "10" }).setToken(token);

try {
  let data;
  if (guildId) {
    console.log(
      `ギルド ${guildId} に ${commands.length} 件のスラッシュコマンドを登録します…`
    );
    data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
  } else {
    console.log(
      `グローバルに ${commands.length} 件のスラッシュコマンドを登録します…`
    );
    console.log("（反映まで最大約1時間かかることがあります）");
    data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
  }
  console.log(`登録完了: ${data.length} 件`);
  for (const cmd of data) {
    console.log(`  /${cmd.name}`);
  }
} catch (err) {
  console.error("スラッシュコマンドの登録に失敗しました:", err);
  process.exit(1);
}
