import { SlashCommandBuilder } from "discord.js";
import { handleCommand } from "./commands.js";
import { loadChannel } from "./store.js";
function filterChoices(values, focused, limit = 25) {
  const q = String(focused || "").trim().toLowerCase();
  const sorted = [...values].sort((a, b) => a.localeCompare(b, "ja"));
  const filtered = q
    ? sorted.filter((v) => v.toLowerCase().includes(q) || v.includes(focused))
    : sorted;
  return filtered.slice(0, limit).map((v) => ({ name: v, value: v }));
}

export function buildSlashCommands() {
  return [
    new SlashCommandBuilder()
      .setName("nyukin")
      .setNameLocalizations({ ja: "入金" })
      .setDescription("入金を記録する")
      .addStringOption((o) =>
        o
          .setName("nyuryokusha")
          .setNameLocalizations({ ja: "入力者" })
          .setDescription("つむぎ / れんた など")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((o) =>
        o
          .setName("namae")
          .setNameLocalizations({ ja: "名前" })
          .setDescription("名簿の名前")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addIntegerOption((o) =>
        o
          .setName("kingaku")
          .setNameLocalizations({ ja: "金額" })
          .setDescription("入金金額（円）")
          .setRequired(true)
          .setMinValue(1)
      ),

    new SlashCommandBuilder()
      .setName("shukkin")
      .setNameLocalizations({ ja: "出金" })
      .setDescription("出金（減額）を記録する")
      .addStringOption((o) =>
        o
          .setName("nyuryokusha")
          .setNameLocalizations({ ja: "入力者" })
          .setDescription("つむぎ / れんた など")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((o) =>
        o
          .setName("namae")
          .setNameLocalizations({ ja: "名前" })
          .setDescription("名簿の名前")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addIntegerOption((o) =>
        o
          .setName("kingaku")
          .setNameLocalizations({ ja: "金額" })
          .setDescription("出金金額（円）")
          .setRequired(true)
          .setMinValue(1)
      ),

    new SlashCommandBuilder()
      .setName("toroku")
      .setNameLocalizations({ ja: "登録" })
      .setDescription("名簿に人を登録する")
      .addStringOption((o) =>
        o
          .setName("namae")
          .setNameLocalizations({ ja: "名前" })
          .setDescription("登録する名前")
          .setRequired(true)
      )
      .addIntegerOption((o) =>
        o
          .setName("mokuhyo")
          .setNameLocalizations({ ja: "目標金額" })
          .setDescription("目標金額（円）")
          .setRequired(false)
          .setMinValue(0)
      ),

    new SlashCommandBuilder()
      .setName("sogaku")
      .setNameLocalizations({ ja: "総額" })
      .setDescription("集金済み総額・金庫残高を表示")
      .addStringOption((o) =>
        o
          .setName("nyuryokusha")
          .setNameLocalizations({ ja: "入力者" })
          .setDescription("指定するとその金庫だけ")
          .setRequired(false)
          .setAutocomplete(true)
      ),

    new SlashCommandBuilder()
      .setName("mishukin")
      .setNameLocalizations({ ja: "未集金" })
      .setDescription("未集金の人と金額を表示"),

    new SlashCommandBuilder()
      .setName("ichiran")
      .setNameLocalizations({ ja: "一覧" })
      .setDescription("全員の入金状況を表示")
      .addStringOption((o) =>
        o
          .setName("nyuryokusha")
          .setNameLocalizations({ ja: "入力者" })
          .setDescription("指定するとその入力者の取扱だけ")
          .setRequired(false)
          .setAutocomplete(true)
      ),

    new SlashCommandBuilder()
      .setName("nyuryokusha")
      .setNameLocalizations({ ja: "入力者" })
      .setDescription("入力者の一覧、または追加")
      .addStringOption((o) =>
        o
          .setName("namae")
          .setNameLocalizations({ ja: "名前" })
          .setDescription("追加する入力者名（空なら一覧）")
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName("satsu")
      .setNameLocalizations({ ja: "札" })
      .setDescription("お札内訳を記録して金庫と突合")
      .addStringOption((o) =>
        o
          .setName("nyuryokusha")
          .setNameLocalizations({ ja: "入力者" })
          .setDescription("つむぎ / れんた など")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((o) =>
        o
          .setName("uchiwake")
          .setNameLocalizations({ ja: "内訳" })
          .setDescription("例: 万2 五千1 千10（空なら現在の内訳）")
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName("tsugo")
      .setNameLocalizations({ ja: "突合" })
      .setDescription("金庫残高とお札合計を突合")
      .addStringOption((o) =>
        o
          .setName("nyuryokusha")
          .setNameLocalizations({ ja: "入力者" })
          .setDescription("指定なしで全員")
          .setRequired(false)
          .setAutocomplete(true)
      ),

    new SlashCommandBuilder()
      .setName("matome")
      .setNameLocalizations({ ja: "まとめ" })
      .setDescription("お札まとめ案を出して実施を記録")
      .addStringOption((o) =>
        o
          .setName("nyuryokusha")
          .setNameLocalizations({ ja: "入力者" })
          .setDescription("つむぎ / れんた など")
          .setRequired(true)
          .setAutocomplete(true)
      ),

    new SlashCommandBuilder()
      .setName("rireki")
      .setNameLocalizations({ ja: "履歴" })
      .setDescription("直近の履歴を表示")
      .addStringOption((o) =>
        o
          .setName("nyuryokusha")
          .setNameLocalizations({ ja: "入力者" })
          .setDescription("指定するとその入力者だけ")
          .setRequired(false)
          .setAutocomplete(true)
      ),

    new SlashCommandBuilder()
      .setName("torikeshi")
      .setNameLocalizations({ ja: "取消" })
      .setDescription("直前の入金/出金を取り消す")
      .addStringOption((o) =>
        o
          .setName("nyuryokusha")
          .setNameLocalizations({ ja: "入力者" })
          .setDescription("指定するとその入力者の直前だけ")
          .setRequired(false)
          .setAutocomplete(true)
      ),

    new SlashCommandBuilder()
      .setName("help")
      .setNameLocalizations({ ja: "ヘルプ" })
      .setDescription("コマンド一覧を表示"),
  ].map((c) => c.toJSON());
}

function opt(interaction, name) {
  return interaction.options.get(name)?.value;
}

export function slashToCommand(interaction) {
  const name = interaction.commandName;
  const collector =
    opt(interaction, "nyuryokusha") != null
      ? String(opt(interaction, "nyuryokusha"))
      : null;

  switch (name) {
    case "nyukin":
      return {
        action: "入金",
        collector,
        args: [String(opt(interaction, "namae")), String(opt(interaction, "kingaku"))],
      };
    case "shukkin":
      return {
        action: "出金",
        collector,
        args: [String(opt(interaction, "namae")), String(opt(interaction, "kingaku"))],
      };
    case "toroku": {
      const mokuhyo = opt(interaction, "mokuhyo");
      const args = [String(opt(interaction, "namae"))];
      if (mokuhyo != null) args.push(String(mokuhyo));
      return { action: "登録", collector: null, args };
    }
    case "sogaku":
      return { action: "総額", collector, args: [] };
    case "mishukin":
      return { action: "未集金", collector: null, args: [] };
    case "ichiran":
      return { action: "一覧", collector, args: [] };
    case "nyuryokusha": {
      const n = opt(interaction, "namae");
      return {
        action: "入力者",
        collector: null,
        args: n != null && String(n).trim() ? [String(n).trim()] : [],
      };
    }
    case "satsu": {
      const uchiwake = opt(interaction, "uchiwake");
      const args =
        uchiwake != null && String(uchiwake).trim()
          ? String(uchiwake).trim().split(/\s+/)
          : [];
      return { action: "札", collector, args };
    }
    case "tsugo":
      return { action: "突合", collector, args: [] };
    case "matome":
      return { action: "まとめ", collector, args: [] };
    case "rireki":
      return { action: "履歴", collector, args: [] };
    case "torikeshi":
      return { action: "取消", collector, args: [] };
    case "help":
      return { action: "ヘルプ", collector: null, args: [] };
    default:
      return null;
  }
}

export async function handleAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  const state = loadChannel(interaction.channelId);
  const collectors = Object.keys(state.collectors || {});
  const members = Object.keys(state.members || {});

  if (focused.name === "nyuryokusha") {
    const choices = collectors.length
      ? collectors
      : ["つむぎ", "れんた"];
    await interaction.respond(filterChoices(choices, focused.value));
    return;
  }

  if (focused.name === "namae") {
    await interaction.respond(filterChoices(members, focused.value));
    return;
  }

  await interaction.respond([]);
}

export async function handleSlashCommand(interaction) {
  const parsed = slashToCommand(interaction);
  if (!parsed) {
    await interaction.reply({
      content: "❓ 未対応のコマンドです。",
      ephemeral: true,
    });
    return;
  }

  const result = handleCommand(interaction.channelId, parsed);
  const body = String(result || "完了");

  if (body.length <= 1900) {
    await interaction.reply({ content: body });
    return;
  }

  // 長文は分割
  await interaction.reply({ content: body.slice(0, 1900) });
  for (let i = 1900; i < body.length; i += 1900) {
    await interaction.followUp({ content: body.slice(i, i + 1900) });
  }
}

export async function registerSlashCommands(client) {
  const body = buildSlashCommands();
  // 参加ギルドに即時反映（グローバルより速い）
  for (const [, guild] of client.guilds.cache) {
    await guild.commands.set(body);
    console.log(`スラッシュコマンド登録: ${guild.name} (${body.length}件)`);
  }
}
