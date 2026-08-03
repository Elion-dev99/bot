import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} from "discord.js";
import { extractCommands, extractBareCommands, parseCommand } from "./parser.js";
import { handleCommand } from "./commands.js";

const token = process.env.DISCORD_TOKEN;
if (!token || token === "your_bot_token_here") {
  console.error(
    "DISCORD_TOKEN が未設定です。.env に Bot トークンを設定してください。"
  );
  process.exit(1);
}

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

client.once(Events.ClientReady, (c) => {
  console.log(`ログイン完了: ${c.user.tag}`);
  if (allowedChannels.length > 0) {
    console.log(`許可チャンネル: ${allowedChannels.join(", ")}`);
  } else {
    console.log("許可チャンネル制限なし（全テキストチャンネルで反応）");
  }
});

client.on(Events.Error, (err) => {
  console.error("Discord client error:", err);
});

client.on(Events.Warn, (info) => {
  console.warn("Discord client warn:", info);
});

client.on(Events.ShardDisconnect, (event) => {
  console.warn("Shard disconnect:", event);
});

client.on(Events.ShardReconnecting, () => {
  console.warn("Shard reconnecting...");
});

async function sendResponse(message, body) {
  const chunks = [];
  if (body.length <= 1900) {
    chunks.push(body);
  } else {
    let current = "";
    for (const part of body.split("\n")) {
      const next = current ? `${current}\n${part}` : part;
      if (next.length > 1900) {
        if (current) chunks.push(current);
        // 1行自体が長い場合は強制分割
        if (part.length > 1900) {
          for (let i = 0; i < part.length; i += 1900) {
            chunks.push(part.slice(i, i + 1900));
          }
          current = "";
        } else {
          current = part;
        }
      } else {
        current = next;
      }
    }
    if (current) chunks.push(current);
  }

  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i];
    if (i === 0) {
      await message.reply({ content, allowedMentions: { repliedUser: false } });
    } else {
      await message.channel.send({ content });
    }
  }
}

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (allowedChannels.length > 0 && !allowedChannels.includes(message.channelId)) {
      return;
    }

    console.log(
      `[msg] guild=${message.guildId} channel=${message.channelId} author=${message.author.tag} content=${JSON.stringify(message.content)}`
    );

    if (!message.content) {
      console.warn(
        "[warn] message.content が空です。Developer Portal で MESSAGE CONTENT INTENT を ON にしたあと Bot を再起動してください。"
      );
      return;
    }

    let rawCommands = extractCommands(message.content);
    if (rawCommands.length === 0) {
      rawCommands = extractBareCommands(message.content);
    }
    if (rawCommands.length === 0) return;

    console.log(`[cmd] ${rawCommands.length}件: ${rawCommands.join(" | ")}`);

    const replies = [];
    for (const raw of rawCommands) {
      const parsed = parseCommand(raw);
      if (!parsed) continue;
      const result = handleCommand(message.channelId, parsed);
      if (result) replies.push(result);
    }

    if (replies.length === 0) return;

    // 複数件は短く並べる（文字数制限対策）
    const body =
      replies.length === 1 ? replies[0] : replies.join("\n");

    await sendResponse(message, body);
    console.log(`[ok] replied ${replies.length} result(s), ${body.length} chars`);
  } catch (err) {
    console.error("メッセージ処理エラー:", err);
    try {
      await message.reply({
        content: "⚠️ 処理中にエラーが発生しました。しばらくしてから再度お試しください。",
        allowedMentions: { repliedUser: false },
      });
    } catch (replyErr) {
      console.error("エラー返信にも失敗:", replyErr);
    }
  }
});

client.login(token);
