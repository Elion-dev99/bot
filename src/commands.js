import {
  loadChannel,
  saveChannel,
  getOrCreateMember,
  addHistory,
} from "./store.js";
import { parseAmount } from "./parser.js";
import { yen, memberStatusLine, historyLine } from "./format.js";

const HELP_TEXT = `📋 **集金Bot コマンド一覧**

**基本**
\`入金+名前+金額\` … 入金を記録
\`出金+名前+金額\` … 出金・減額を記録
\`総額\` … 集金済みの合計を表示
\`未集金\` … 未集金の人と金額・未入金総額を表示

**名簿**
\`登録+名前+目標金額\` … 人を登録・目標金額つき
\`登録+名前\` … デフォルト目標で登録
\`目標+金額\` … 新規登録時のデフォルト目標を設定
\`目標+名前+金額\` … 個人の目標金額を変更
\`/一覧\` \`/総額\` \`/未集金\` \`/入金\` \`/削除\` … Discordの / メニュー（Railway推奨）
\`削除+入力者+削除対象の名前+理由\` … テキストでも削除可
\`一覧\` … 全員の入金状況

**その他**
\`履歴\` … 直近の取引履歴
\`取消\` … 直前の入金/出金を取り消す
\`リセット確認\` … このチャンネルの集金データを全消去
\`ヘルプ\` … このヘルプを表示

例: \`ヘルプ\` / \`総額\` / \`入金+太郎+1000\` / Discordの \`/削除\`
※ データはチャンネルごとに独立して保存されます。`;

function memberNames(state) {
  return Object.keys(state.members).sort((a, b) => a.localeCompare(b, "ja"));
}

function totalCollected(state) {
  return memberNames(state).reduce(
    (sum, name) => sum + (state.members[name].paid || 0),
    0
  );
}

function unpaidList(state) {
  const rows = [];
  let unpaidTotal = 0;
  for (const name of memberNames(state)) {
    const m = state.members[name];
    const unpaid = Math.max(0, (m.target || 0) - (m.paid || 0));
    if (unpaid > 0) {
      rows.push({ name, unpaid, target: m.target || 0, paid: m.paid || 0 });
      unpaidTotal += unpaid;
    }
  }
  return { rows, unpaidTotal };
}

function requireNameAmount(args) {
  if (args.length < 2) {
    return { error: "形式: `入金+名前+金額` / `出金+名前+金額`" };
  }
  const name = args[0];
  const amount = parseAmount(args[1]);
  if (amount == null) {
    return { error: `金額が不正です: \`${args[1]}\`` };
  }
  if (amount === 0) {
    return { error: "金額は1円以上にしてください。" };
  }
  return { name, amount };
}

export function handleCommand(channelId, { action, args }) {
  const state = loadChannel(channelId);
  // 全角・表記ゆれを吸収
  const normalizedAction = String(action)
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
    .trim();

  switch (normalizedAction) {
    case "ヘルプ":
    case "help":
    case "Help":
      return HELP_TEXT;

    case "入金": {
      const parsed = requireNameAmount(args);
      if (parsed.error) return parsed.error;
      const { name, amount } = parsed;
      const member = getOrCreateMember(state, name);
      member.paid = (member.paid || 0) + amount;
      addHistory(state, {
        type: "deposit",
        name,
        amount,
        balanceAfter: member.paid,
      });
      saveChannel(channelId, state);
      const unpaid = Math.max(0, (member.target || 0) - member.paid);
      const progress =
        member.target > 0
          ? `\n進捗: ${yen(member.paid)} / ${yen(member.target)} / 残り ${yen(unpaid)}`
          : `\n現在の入金額: ${yen(member.paid)}`;
      return `✅ **入金記録**\n${name} に ${yen(amount)} を加算しました。${progress}`;
    }

    case "出金": {
      const parsed = requireNameAmount(args);
      if (parsed.error) return parsed.error;
      const { name, amount } = parsed;
      if (!state.members[name]) {
        return `⚠️ \`${name}\` は名簿にいません。先に \`登録+${name}+目標金額\` するか、入金してください。`;
      }
      const member = state.members[name];
      if ((member.paid || 0) < amount) {
        return `⚠️ 出金できません。\`${name}\` の入金額は ${yen(member.paid || 0)} です。`;
      }
      member.paid -= amount;
      addHistory(state, {
        type: "withdraw",
        name,
        amount,
        balanceAfter: member.paid,
      });
      saveChannel(channelId, state);
      return `💸 **出金記録**\n${name} から ${yen(amount)} を減額しました。\n現在の入金額: ${yen(member.paid)}`;
    }

    case "総額": {
      const total = totalCollected(state);
      const names = memberNames(state);
      if (names.length === 0) {
        return "📭 まだ名簿がありません。`登録+名前+目標金額` で登録してください。";
      }
      const lines = names.map((name) => {
        const m = state.members[name];
        return `・${name}: ${yen(m.paid || 0)}`;
      });
      return `💰 **集金済み総額: ${yen(total)}**\n\n${lines.join("\n")}`;
    }

    case "未集金": {
      const names = memberNames(state);
      if (names.length === 0) {
        return "📭 まだ名簿がありません。`登録+名前+目標金額` で登録してください。";
      }
      const { rows, unpaidTotal } = unpaidList(state);
      if (rows.length === 0) {
        return `🎉 **未集金はありません！**\n全員の目標を達成しています。\n集金済み総額: ${yen(totalCollected(state))}`;
      }
      const lines = rows.map(
        (r) =>
          `・${r.name}: 未集金 ${yen(r.unpaid)} / 入金 ${yen(r.paid)} / 目標 ${yen(r.target)}`
      );
      return `📝 **未集金一覧**\n\n${lines.join("\n")}\n\n**未入金総額: ${yen(unpaidTotal)}**`;
    }

    case "登録": {
      if (args.length < 1) {
        return "形式: `登録+名前+目標金額` または `登録+名前`";
      }
      const name = args[0];
      let target = state.defaultTarget;
      if (args.length >= 2) {
        const parsed = parseAmount(args[1]);
        if (parsed == null) return `金額が不正です: \`${args[1]}\``;
        target = parsed;
      }
      if (state.members[name]) {
        state.members[name].target = target;
        addHistory(state, { type: "set_target", name, target });
        saveChannel(channelId, state);
        return `🔄 \`${name}\` は既に登録済みです。目標を ${yen(target)} に更新しました。\n現在の入金額: ${yen(state.members[name].paid || 0)}`;
      }
      state.members[name] = { target, paid: 0 };
      addHistory(state, { type: "register", name, target });
      saveChannel(channelId, state);
      return `👤 **登録完了**\n${name} を目標 ${yen(target)} で登録しました。`;
    }

    case "目標": {
      if (args.length === 1) {
        const amount = parseAmount(args[0]);
        if (amount == null) return `金額が不正です: \`${args[0]}\``;
        state.defaultTarget = amount;
        addHistory(state, { type: "set_target", target: amount });
        saveChannel(channelId, state);
        return `🎯 デフォルト目標を ${yen(amount)} に設定しました。\n以降の \`登録+名前\` に適用されます。`;
      }
      if (args.length >= 2) {
        const name = args[0];
        const amount = parseAmount(args[1]);
        if (amount == null) return `金額が不正です: \`${args[1]}\``;
        const member = getOrCreateMember(state, name);
        member.target = amount;
        addHistory(state, { type: "set_target", name, target: amount });
        saveChannel(channelId, state);
        return `🎯 \`${name}\` の目標を ${yen(amount)} に設定しました。\n入金 ${yen(member.paid || 0)} / 目標 ${yen(amount)}`;
      }
      return "形式: `目標+金額` または `目標+名前+金額`";
    }

    case "削除": {
      // /削除 入力者 削除対象 理由… または 削除+入力者+削除対象+理由…
      if (args.length < 3) {
        return "形式: `/削除 入力者 削除対象の名前 理由` または `削除+入力者+削除対象の名前+理由`";
      }
      const operator = args[0];
      const name = args[1];
      const reason = args.slice(2).join(" ").trim();
      if (!reason) {
        return "形式: `/削除 入力者 削除対象の名前 理由` または `削除+入力者+削除対象の名前+理由`";
      }
      if (!state.members[name]) {
        return `⚠️ \`${name}\` は名簿にいません。`;
      }
      const snapshot = state.members[name];
      delete state.members[name];
      addHistory(state, {
        type: "remove",
        name,
        operator,
        reason,
        paid: snapshot.paid,
        target: snapshot.target,
      });
      saveChannel(channelId, state);
      return `🗑️ **削除完了**\n\`${name}\` を名簿から削除しました。\n入力者: ${operator}\n理由: ${reason}`;
    }

    case "一覧": {
      const names = memberNames(state);
      if (names.length === 0) {
        return "📭 まだ名簿がありません。`登録+名前+目標金額` で登録してください。";
      }
      const { unpaidTotal } = unpaidList(state);
      const lines = names.map((name) =>
        memberStatusLine(name, state.members[name])
      );
      return `📊 **集金一覧** / デフォルト目標: ${yen(state.defaultTarget)}\n\n${lines.join("\n")}\n\n集金済み総額: ${yen(totalCollected(state))}\n未入金総額: ${yen(unpaidTotal)}`;
    }

    case "履歴": {
      const recent = state.history.slice(-15).reverse();
      if (recent.length === 0) {
        return "📜 履歴はまだありません。";
      }
      return `📜 **直近の履歴** / 新しい順\n\n${recent.map(historyLine).join("\n")}`;
    }

    case "取消": {
      const reversible = [...state.history]
        .reverse()
        .find((h) => h.type === "deposit" || h.type === "withdraw");
      if (!reversible) {
        return "⚠️ 取り消せる入金/出金がありません。";
      }
      const member = state.members[reversible.name];
      if (!member) {
        return `⚠️ \`${reversible.name}\` が名簿にいないため取消できません。`;
      }
      if (reversible.type === "deposit") {
        if ((member.paid || 0) < reversible.amount) {
          return "⚠️ 現在の残高が足りないため、この入金は取消できません。";
        }
        member.paid -= reversible.amount;
      } else {
        member.paid = (member.paid || 0) + reversible.amount;
      }
      // 履歴から該当エントリを除去
      const idx = state.history.lastIndexOf(reversible);
      if (idx >= 0) state.history.splice(idx, 1);
      addHistory(state, {
        type: "undo",
        undoneType: reversible.type,
        name: reversible.name,
        amount: reversible.amount,
      });
      saveChannel(channelId, state);
      return `↩️ **取消完了**\n${reversible.type === "deposit" ? "入金" : "出金"} ${reversible.name} ${yen(reversible.amount)} を取り消しました。\n現在の入金額: ${yen(member.paid)}`;
    }

    case "リセット確認": {
      const count = memberNames(state).length;
      state.members = {};
      state.defaultTarget = 0;
      addHistory(state, { type: "reset" });
      // リセット後は履歴もクリア
      state.history = [];
      saveChannel(channelId, state);
      return `🧹 このチャンネルの集金データをリセットしました。削除した名簿: ${count}人\n※ 取り消しはできません。`;
    }

    case "リセット":
      return "⚠️ 本当に消す場合は `リセット確認` と送信してください。このチャンネルの名簿・入金・履歴がすべて消えます。";

    default:
      return `❓ 不明なコマンド: \`${action}\`\n\`ヘルプ\` で使い方を確認できます。`;
  }
}
