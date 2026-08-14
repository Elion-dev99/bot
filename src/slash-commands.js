import { SlashCommandBuilder } from "discord.js";

/**
 * Discord の / メニューに表示するスラッシュコマンド定義
 */
export function buildSlashCommands() {
  return [
    new SlashCommandBuilder()
      .setName("削除")
      .setDescription("名簿から登録済みの人を削除する")
      .addStringOption((option) =>
        option
          .setName("入力者")
          .setDescription("削除を入力した人の名前")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("削除対象の名前")
          .setDescription("名簿から削除する人の名前")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("理由")
          .setDescription("削除する理由")
          .setRequired(true)
      ),
  ].map((cmd) => cmd.toJSON());
}

/**
 * スラッシュコマンドの Interaction を { action, args } に変換する
 */
export function parseSlashInteraction(interaction) {
  const action = interaction.commandName;
  if (action === "削除") {
    const operator = interaction.options.getString("入力者", true);
    const name = interaction.options.getString("削除対象の名前", true);
    const reason = interaction.options.getString("理由", true);
    return { action: "削除", args: [operator, name, reason] };
  }
  return { action, args: [] };
}
