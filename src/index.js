import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
} from "discord.js";
import { extractCommands, parseCommand } from "./parser.js";
import { handleCommand } from "./commands.js";
import {
  buildSlashCommands,
  parseSlashInteraction,
} from "./slash-commands.js";
import { startHealthServer } from "./health.js";

const token = process.env.DISCORD_TOKEN?.trim();
if (!token || token === "your_bot_token_here") {
  console.error(
    "DISCORD_TOKEN が未設定です。Railway の Variables に DISCORD_TOKEN を設定してください。"
  );
  process.exit(1);
}

const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

console.log("[boot] NODE_ENV=", process.env.NODE_ENV || "development");
console.log("[boot] DISCORD_CLIENT_ID=", clientId ? "set" : "missing");
console.log("[boot] DISCORD_GUILD_ID=", guildId || "(global slash registration)");
console.log("[boot] PORT=", process.env.PORT || "(default 8080 for health)");

startHealthServer();

const allowedChannels = (process.env.ALLOWED_CHANNEL_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

async function registerSlashCommands() {
  if (!clientId) {
    console.warn(
      "[warn] DISCORD_CLIENT_ID が未設定のため、スラッシュコマンドを自動登録しません。`npm run register-commands` を実行してください。"
    );
    return;
  }
  const commands = buildSlashCommands();
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(
        `スラッシュコマンドをギルド ${guildId} に登録しました (${commands.length}件)`
      );
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log(
        `スラッシュコマンドをグローバル登録しました (${commands.length}件)。反映まで時間がかかることがあります。`
      );
    }
  } catch (err) {
    console.error("スラッシュコマンド登録エラー:", err);
  }
}

function isChannelAllowed(channelId) {
  return allowedChannels.length === 0 || allowedChannels.includes(channelId);
}

client.once(Events.ClientReady, async (c) => {
  try {
    console.log(`ログイン完了: ${c.user.tag}`);
    // Discord 上で常にオンライン表示にする
    c.user.setPresence({
      status: "online",
      activities: [{ name: "集金記録 /ヘルプ", type: 3 }],
    });
    if (allowedChannels.length > 0) {
      console.log(`許可チャンネル: ${allowedChannels.join(", ")}`);
    } else {
      console.log("許可チャンネル制限なし（全テキストチャンネルで反応）");
    }
    await registerSlashCommands();
  } catch (err) {
    console.error("[warn] 起動後処理エラー（Bot本体は稼働中）:", err);
  }
});

process.on("unhandledRejection", (err) => {
  console.error("[fatal] unhandledRejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException:", err);
});

client.on("error", (err) => console.error("[discord] error:", err));
client.on("warn", (msg) => console.warn("[discord] warn:", msg));
client.on(Events.ShardDisconnect, (event, id) => {
  console.warn(`[discord] shard ${id} disconnect code=${event?.code}`);
});
client.on(Events.ShardReconnecting, (id) => {
  console.log(`[discord] shard ${id} reconnecting...`);
});
client.on(Events.ShardResume, (id) => {
  console.log(`[discord] shard ${id} resumed`);
});

/**
 * Discord はインタラクション受信後 3 秒以内に ack が必要。
 * 遅延や一時的な負荷で「アプリケーションが応答しません」になるのを防ぐため、
 * 先に deferReply してから処理結果を editReply する。
 */
async function replyInteraction(interaction, content, { ephemeral = false } = {}) {
  const payload = {
    content,
    allowedMentions: { parse: [] },
    ...(ephemeral ? { ephemeral: true } : {}),
  };
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(
    `[slash] /${interaction.commandName} guild=${interaction.guildId} channel=${interaction.channelId} user=${interaction.user?.tag}`
  );

  try {
    if (!interaction.guild) {
      await interaction.reply({
        content: "⚠️ このコマンドはサーバー内でのみ使えます。",
        ephemeral: true,
      });
      return;
    }
    if (!isChannelAllowed(interaction.channelId)) {
      await interaction.reply({
        content: "⚠️ このチャンネルでは集金Botを使えません。",
        ephemeral: true,
      });
      return;
    }

    // 3秒タイムアウト回避: すぐに「Bot は考え中…」を返す
    await interaction.deferReply();

    const parsed = parseSlashInteraction(interaction);
    const result = handleCommand(interaction.channelId, parsed);
    const body = result || "⚠️ 処理結果がありません。";

    if (body.length <= 1900) {
      await replyInteraction(interaction, body);
    } else {
      await replyInteraction(interaction, body.slice(0, 1900));
      const rest = body.slice(1900);
      if (rest) {
        await interaction.followUp({
          content: rest.slice(0, 1900),
          allowedMentions: { parse: [] },
        });
      }
    }
  } catch (err) {
    console.error("インタラクション処理エラー:", err);
    const payload = {
      content:
        "⚠️ 処理中にエラーが発生しました。しばらくしてから再度お試しください。",
      ephemeral: true,
    };
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch {
      // ignore
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!isChannelAllowed(message.channelId)) {
      return;
    }

    console.log(
      `[msg] guild=${message.guildId} channel=${message.channelId} author=${message.author.tag} content=${JSON.stringify(message.content)}`
    );

    // Message Content Intent が効いていないと content が空になる
    if (!message.content) {
      console.warn(
        "[warn] message.content が空です。Developer Portal で MESSAGE CONTENT INTENT を ON にしたあと Bot を再起動してください。"
      );
      return;
    }

    let rawCommands = extractCommands(message.content);

    // 括弧なしでも主要コマンドを受け付ける（メッセージ全体がコマンドのとき）
    if (rawCommands.length === 0) {
      const bare = message.content.trim();
      if (
        /^(ヘルプ|help|総額|未集金|一覧|履歴|取消|リセット|リセット確認)$/i.test(bare) ||
        /^(入金|出金|登録|目標|削除)\+.+/.test(bare) ||
        /^\/削除(\s|$)/.test(bare)
      ) {
        rawCommands = [bare];
      }
    }

    if (rawCommands.length === 0) return;

    const replies = [];
    for (const raw of rawCommands) {
      const parsed = parseCommand(raw);
      if (!parsed) continue;
      const result = handleCommand(message.channelId, parsed);
      if (result) replies.push(result);
    }

    if (replies.length === 0) return;

    const body = replies.join("\n\n---\n\n");
    // Discord の文字数制限対策
    if (body.length <= 1900) {
      await message.reply({ content: body, allowedMentions: { repliedUser: false } });
    } else {
      const chunks = [];
      let current = "";
      for (const part of body.split("\n")) {
        if ((current + "\n" + part).length > 1900) {
          chunks.push(current);
          current = part;
        } else {
          current = current ? `${current}\n${part}` : part;
        }
      }
      if (current) chunks.push(current);
      for (const chunk of chunks) {
        await message.channel.send({ content: chunk });
      }
    }
  } catch (err) {
    console.error("メッセージ処理エラー:", err);
    try {
      await message.reply({
        content: "⚠️ 処理中にエラーが発生しました。しばらくしてから再度お試しください。",
        allowedMentions: { repliedUser: false },
      });
    } catch {
      // ignore
    }
  }
});

client.login(token).catch((err) => {
  console.error("[fatal] Discord ログイン失敗:", err.message);
  console.error(
    "DISCORD_TOKEN が無効か期限切れです。Developer Portal で Reset Token 後、Railway Variables を更新してください。"
  );
  process.exit(1);
});
