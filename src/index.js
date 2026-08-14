import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} from "discord.js";
import { extractCommands, parseCommand } from "./parser.js";
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

client.login(token);
