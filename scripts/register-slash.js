/**
 * スラッシュコマンドを Discord に登録する
 * 使い方: DISCORD_TOKEN=... DISCORD_CLIENT_ID=... npm run register-slash
 * 任意: GUILD_ID=... で特定ギルドのみ即時登録
 */
import "dotenv/config";
import { REST, Routes } from "discord.js";
import { buildSlashCommands } from "../src/slash.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error("DISCORD_TOKEN と DISCORD_CLIENT_ID が必要です。");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);
const body = buildSlashCommands();

const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

const result = await rest.put(route, { body });
console.log(
  `登録完了: ${Array.isArray(result) ? result.length : 0}件`,
  guildId ? `(guild ${guildId})` : "(global)"
);
