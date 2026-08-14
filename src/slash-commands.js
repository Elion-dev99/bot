import { SlashCommandBuilder } from "discord.js";

/**
 * Discord の / メニューに表示するスラッシュコマンド定義
 * Railway 等では Message Content Intent なしでも / コマンドが使える
 */
export function buildSlashCommands() {
  return [
    new SlashCommandBuilder()
      .setName("一覧")
      .setDescription("全員の入金状況を表示"),
    new SlashCommandBuilder()
      .setName("総額")
      .setDescription("集金済みの合計を表示"),
    new SlashCommandBuilder()
      .setName("未集金")
      .setDescription("未集金の人と金額を表示"),
    new SlashCommandBuilder()
      .setName("履歴")
      .setDescription("直近の取引履歴を表示"),
    new SlashCommandBuilder()
      .setName("ヘルプ")
      .setDescription("コマンド一覧を表示"),
    new SlashCommandBuilder()
      .setName("入金")
      .setDescription("入金を記録する")
      .addStringOption((o) =>
        o.setName("名前").setDescription("入金した人").setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("金額").setDescription("金額（例: 3000）").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("出金")
      .setDescription("出金・減額を記録する")
      .addStringOption((o) =>
        o.setName("名前").setDescription("出金する人").setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("金額").setDescription("金額（例: 1000）").setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("登録")
      .setDescription("名簿に人を登録する")
      .addStringOption((o) =>
        o.setName("名前").setDescription("登録する人").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("目標金額")
          .setDescription("目標金額（省略時はデフォルト目標）")
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName("削除")
      .setDescription("名簿から登録済みの人を削除する")
      .addStringOption((o) =>
        o.setName("入力者").setDescription("削除を入力した人").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("削除対象の名前")
          .setDescription("削除する人の名前")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("理由").setDescription("削除理由").setRequired(true)
      ),
  ].map((cmd) => cmd.toJSON());
}

/**
 * スラッシュコマンドの Interaction を { action, args } に変換する
 */
export function parseSlashInteraction(interaction) {
  const action = interaction.commandName;
  const opts = interaction.options;

  switch (action) {
    case "削除":
      return {
        action: "削除",
        args: [
          opts.getString("入力者", true),
          opts.getString("削除対象の名前", true),
          opts.getString("理由", true),
        ],
      };
    case "入金":
      return {
        action: "入金",
        args: [opts.getString("名前", true), opts.getString("金額", true)],
      };
    case "出金":
      return {
        action: "出金",
        args: [opts.getString("名前", true), opts.getString("金額", true)],
      };
    case "登録": {
      const args = [opts.getString("名前", true)];
      const target = opts.getString("目標金額");
      if (target) args.push(target);
      return { action: "登録", args };
    }
    case "一覧":
    case "総額":
    case "未集金":
    case "履歴":
    case "ヘルプ":
      return { action, args: [] };
    default:
      return { action, args: [] };
  }
}
