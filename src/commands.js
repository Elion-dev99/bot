import {
  loadChannel,
  saveChannel,
  getOrCreateMember,
  ensureCollector,
  syncMemberPaid,
  addHistory,
} from "./store.js";
import { parseAmount } from "./parser.js";
import { yen, memberStatusLine, historyLine } from "./format.js";
import {
  parseBillTokens,
  formatBills,
  sumBills,
  bundlingAdvice,
  reconcile,
  emptyBills,
} from "./cash.js";

const HELP_TEXT = `📋 **集金Bot コマンド一覧**
半角スペース区切り。入金/出金は **入力者** を先頭につけます。

**入力者・金庫**
\`入力者 つむぎ\` … 入力者を追加
\`つむぎ 総額\` / \`総額\` … 金庫・全体の合計

**入金/出金**
\`つむぎ 入金 名前 金額\`
\`れんた 出金 名前 金額\`

**お札チェック（定期）**
\`つむぎ 札 万2 五千1 千10\` … 実在お札を記録して金庫と突合
\`つむぎ 突合\` … 前回の札内訳と金庫残高を再確認
\`つむぎ まとめ\` … お札まとめ案 + 実施記録
\`突合\` … 全員の金庫を一括チェック

**期間・リマインド**
\`期間 2026-08-03 2026-10-03\` … 集金期間
\`リマインド 日 20\` … 毎週その曜・時に突合リマインド
\`リマインド オフ\`

**名簿**
\`登録 名前 目標金額\` / \`未集金\` / \`一覧\`

**その他**
\`履歴\` / \`取消\` / \`ヘルプ\`

札の書き方例: \`万2\` \`五千3\` \`千10\` \`10000:2\``;

function memberNames(state) {
  return Object.keys(state.members).sort((a, b) => a.localeCompare(b, "ja"));
}

function collectorNames(state) {
  return Object.keys(state.collectors || {}).sort((a, b) =>
    a.localeCompare(b, "ja")
  );
}

function totalCollected(state) {
  return memberNames(state).reduce(
    (sum, name) => sum + (state.members[name].paid || 0),
    0
  );
}

function collectorBalance(state, collector) {
  return state.collectors?.[collector]?.balance || 0;
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
    return { error: "形式: `入力者 入金 名前 金額`" };
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

function requireCollector(collector) {
  if (!collector) {
    return "⚠️ 入力者をつけてください。例: `つむぎ 入金 太郎 1000`";
  }
  return null;
}

function formatPeriod(period) {
  if (!period?.start || !period?.end) return "未設定";
  return `${period.start} 〜 ${period.end}`;
}

function buildReconcileReport(state, collector) {
  const c = ensureCollector(state, collector);
  const vault = c.balance || 0;
  const billTotal = sumBills(c.bills || emptyBills());
  const result = reconcile(vault, billTotal);
  const counted = c.lastCountAt
    ? new Date(c.lastCountAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
    : "未実施";
  const bundled = c.lastBundleAt
    ? new Date(c.lastBundleAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
    : "未実施";
  return [
    `🔍 **[${collector}] 突合**`,
    `金庫残高: ${yen(vault)}`,
    `お札合計: ${yen(billTotal)}`,
    result.message,
    ``,
    `**お札内訳**`,
    formatBills(c.bills),
    ``,
    `最終実査: ${counted}`,
    `最終まとめ: ${bundled}`,
  ].join("\n");
}

export function handleCommand(channelId, { action, args, collector = null }) {
  const state = loadChannel(channelId);
  if (!state.collectors) state.collectors = {};

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

    case "入力者": {
      if (args.length === 0) {
        const names = collectorNames(state);
        if (names.length === 0) {
          return "📭 入力者がいません。`入力者 つむぎ` のように追加してください。";
        }
        const lines = names.map(
          (n) => `・${n} 金庫: ${yen(collectorBalance(state, n))}`
        );
        return `👥 **入力者一覧**\n${lines.join("\n")}\n\n全体合計: ${yen(totalCollected(state))}`;
      }
      const name = args[0];
      ensureCollector(state, name);
      saveChannel(channelId, state);
      return `👤 入力者 \`${name}\` を登録しました。\n例: \`${name} 入金 太郎 1000\``;
    }

    case "入金": {
      const missing = requireCollector(collector);
      if (missing) return missing;
      const parsed = requireNameAmount(args);
      if (parsed.error) return parsed.error;
      const { name, amount } = parsed;

      ensureCollector(state, collector);
      const member = getOrCreateMember(state, name);
      member.byCollector[collector] =
        (member.byCollector[collector] || 0) + amount;
      syncMemberPaid(member);
      state.collectors[collector].balance =
        (state.collectors[collector].balance || 0) + amount;

      addHistory(state, {
        type: "deposit",
        collector,
        name,
        amount,
        balanceAfter: member.paid,
        vaultAfter: state.collectors[collector].balance,
      });
      saveChannel(channelId, state);

      const unpaid = Math.max(0, (member.target || 0) - member.paid);
      const progress =
        member.target > 0
          ? ` / 計${yen(member.paid)}・目標${yen(member.target)}・残${yen(unpaid)}`
          : ` / 計 ${yen(member.paid)}`;
      return `✅ [${collector}] 入金 ${name} ${yen(amount)}${progress}\n金庫 ${yen(state.collectors[collector].balance)}`;
    }

    case "出金": {
      const missing = requireCollector(collector);
      if (missing) return missing;
      const parsed = requireNameAmount(args);
      if (parsed.error) return parsed.error;
      const { name, amount } = parsed;

      if (!state.members[name]) {
        return `⚠️ \`${name}\` は名簿にいません。先に \`登録 ${name} 目標金額\` してください。`;
      }
      ensureCollector(state, collector);
      const member = getOrCreateMember(state, name);
      const fromCollector = member.byCollector[collector] || 0;
      if (fromCollector < amount) {
        return `⚠️ 出金できません。[${collector}] 経由の ${name} 入金額は ${yen(fromCollector)} です。`;
      }
      if ((state.collectors[collector].balance || 0) < amount) {
        return `⚠️ 金庫残高不足。[${collector}] 金庫は ${yen(state.collectors[collector].balance || 0)} です。`;
      }

      member.byCollector[collector] = fromCollector - amount;
      syncMemberPaid(member);
      state.collectors[collector].balance -= amount;

      addHistory(state, {
        type: "withdraw",
        collector,
        name,
        amount,
        balanceAfter: member.paid,
        vaultAfter: state.collectors[collector].balance,
      });
      saveChannel(channelId, state);
      return `💸 [${collector}] 出金 ${name} ${yen(amount)} / 計 ${yen(member.paid)}\n金庫 ${yen(state.collectors[collector].balance)}`;
    }

    case "総額": {
      const names = memberNames(state);
      const collectors = collectorNames(state);

      if (collector) {
        ensureCollector(state, collector);
        const vault = collectorBalance(state, collector);
        const lines = names
          .map((name) => {
            const paid = state.members[name].byCollector?.[collector] || 0;
            return paid > 0 ? `・${name}: ${yen(paid)}` : null;
          })
          .filter(Boolean);
        return `💰 **[${collector}] 金庫: ${yen(vault)}**\n${lines.length ? lines.join("\n") : "・まだ入金なし"}`;
      }

      if (names.length === 0 && collectors.length === 0) {
        return "📭 まだデータがありません。`入力者 つむぎ` と `登録 名前 目標金額` から始めてください。";
      }
      const vaultLines = collectors.map(
        (n) => `・${n} 金庫: ${yen(collectorBalance(state, n))}`
      );
      const memberLines = names.map(
        (name) => `・${name}: ${yen(state.members[name].paid || 0)}`
      );
      return `💰 **集金済み総額: ${yen(totalCollected(state))}**\n\n**金庫別**\n${vaultLines.length ? vaultLines.join("\n") : "・なし"}\n\n**メンバー別**\n${memberLines.length ? memberLines.join("\n") : "・なし"}`;
    }

    case "未集金": {
      const names = memberNames(state);
      if (names.length === 0) {
        return "📭 まだ名簿がありません。`登録 名前 目標金額` で登録してください。";
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
        return "形式: `登録 名前 目標金額` または `登録 名前`";
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
        return `🔄 更新 ${name} 目標 ${yen(target)} / 入金 ${yen(state.members[name].paid || 0)}`;
      }
      state.members[name] = { target, paid: 0, byCollector: {} };
      addHistory(state, { type: "register", name, target });
      saveChannel(channelId, state);
      return `✅ 登録 ${name} 目標 ${yen(target)}`;
    }

    case "目標": {
      if (args.length === 1) {
        const amount = parseAmount(args[0]);
        if (amount == null) return `金額が不正です: \`${args[0]}\``;
        state.defaultTarget = amount;
        addHistory(state, { type: "set_target", target: amount });
        saveChannel(channelId, state);
        return `🎯 デフォルト目標を ${yen(amount)} に設定しました。\n以降の \`登録 名前\` に適用されます。`;
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
      return "形式: `目標 金額` または `目標 名前 金額`";
    }

    case "削除": {
      if (args.length < 1) return "形式: `削除 名前`";
      const name = args[0];
      if (!state.members[name]) {
        return `⚠️ \`${name}\` は名簿にいません。`;
      }
      const snapshot = state.members[name];
      delete state.members[name];
      addHistory(state, {
        type: "remove",
        name,
        paid: snapshot.paid,
        target: snapshot.target,
      });
      saveChannel(channelId, state);
      return `🗑️ \`${name}\` を名簿から削除しました。`;
    }

    case "一覧": {
      const names = memberNames(state);
      if (names.length === 0) {
        return "📭 まだ名簿がありません。`登録 名前 目標金額` で登録してください。";
      }

      if (collector) {
        const lines = names
          .map((name) => {
            const m = state.members[name];
            const paid = m.byCollector?.[collector] || 0;
            if (paid <= 0) return null;
            return `・${name}: ${yen(paid)}`;
          })
          .filter(Boolean);
        return `📊 **[${collector}] 取扱一覧** / 金庫 ${yen(collectorBalance(state, collector))}\n\n${lines.length ? lines.join("\n") : "・まだ入金なし"}`;
      }

      const { unpaidTotal } = unpaidList(state);
      const vaultLines = collectorNames(state).map(
        (n) => `・${n} 金庫: ${yen(collectorBalance(state, n))}`
      );
      const lines = names.map((name) =>
        memberStatusLine(name, state.members[name])
      );
      return `📊 **集金一覧** / デフォルト目標: ${yen(state.defaultTarget)}\n\n**金庫**\n${vaultLines.length ? vaultLines.join("\n") : "・なし"}\n\n${lines.join("\n")}\n\n集金済み総額: ${yen(totalCollected(state))}\n未入金総額: ${yen(unpaidTotal)}`;
    }

    case "履歴": {
      let recent = state.history.slice().reverse();
      if (collector) {
        recent = recent.filter((h) => h.collector === collector);
      }
      recent = recent.slice(0, 15);
      if (recent.length === 0) {
        return collector
          ? `📜 [${collector}] の履歴はまだありません。`
          : "📜 履歴はまだありません。";
      }
      const title = collector
        ? `📜 **[${collector}] 履歴**`
        : "📜 **直近の履歴**";
      return `${title} / 新しい順\n\n${recent.map(historyLine).join("\n")}`;
    }

    case "取消": {
      const reversible = [...state.history]
        .reverse()
        .find((h) => {
          if (h.type !== "deposit" && h.type !== "withdraw") return false;
          if (collector && h.collector !== collector) return false;
          return true;
        });
      if (!reversible) {
        return collector
          ? `⚠️ [${collector}] で取り消せる入金/出金がありません。`
          : "⚠️ 取り消せる入金/出金がありません。";
      }
      const member = state.members[reversible.name];
      if (!member) {
        return `⚠️ \`${reversible.name}\` が名簿にいないため取消できません。`;
      }
      const col = reversible.collector;
      if (col) {
        ensureCollector(state, col);
        if (!member.byCollector) member.byCollector = {};
        if (reversible.type === "deposit") {
          if ((member.byCollector[col] || 0) < reversible.amount) {
            return "⚠️ 現在の残高が足りないため、この入金は取消できません。";
          }
          member.byCollector[col] -= reversible.amount;
          state.collectors[col].balance =
            (state.collectors[col].balance || 0) - reversible.amount;
        } else {
          member.byCollector[col] =
            (member.byCollector[col] || 0) + reversible.amount;
          state.collectors[col].balance =
            (state.collectors[col].balance || 0) + reversible.amount;
        }
        syncMemberPaid(member);
      } else if (reversible.type === "deposit") {
        if ((member.paid || 0) < reversible.amount) {
          return "⚠️ 現在の残高が足りないため、この入金は取消できません。";
        }
        member.paid -= reversible.amount;
      } else {
        member.paid = (member.paid || 0) + reversible.amount;
      }

      const idx = state.history.lastIndexOf(reversible);
      if (idx >= 0) state.history.splice(idx, 1);
      addHistory(state, {
        type: "undo",
        undoneType: reversible.type,
        collector: col || null,
        name: reversible.name,
        amount: reversible.amount,
      });
      saveChannel(channelId, state);
      const tag = col ? `[${col}] ` : "";
      return `↩️ 取消 ${tag}${reversible.type === "deposit" ? "入金" : "出金"} ${reversible.name} ${yen(reversible.amount)} / 計 ${yen(member.paid)}`;
    }

    case "リセット確認": {
      const count = memberNames(state).length;
      state.members = {};
      state.collectors = {};
      state.defaultTarget = 0;
      state.history = [];
      state.period = null;
      state.remind = {
        enabled: false,
        dayOfWeek: 0,
        hourJst: 20,
        channelId: null,
        lastSentDate: null,
      };
      saveChannel(channelId, state);
      return `🧹 このチャンネルの集金データをリセットしました。削除した名簿: ${count}人\n※ 取り消しはできません。`;
    }

    case "リセット":
      return "⚠️ 本当に消す場合は `リセット確認` と送信してください。このチャンネルの名簿・入金・履歴がすべて消えます。";

    case "札": {
      const missing = requireCollector(collector);
      if (missing) return missing;
      if (args.length === 0) {
        const c = ensureCollector(state, collector);
        return [
          `🧾 **[${collector}] お札内訳**`,
          formatBills(c.bills),
          `お札合計: ${yen(sumBills(c.bills))}`,
          `金庫残高: ${yen(c.balance || 0)}`,
          reconcile(c.balance || 0, sumBills(c.bills)).message,
          ``,
          `更新するとき: \`${collector} 札 万2 五千1 千10\``,
        ].join("\n");
      }
      const parsed = parseBillTokens(args);
      if (parsed.error) return parsed.error;
      const c = ensureCollector(state, collector);
      c.bills = parsed.bills;
      c.lastCountAt = new Date().toISOString();
      addHistory(state, {
        type: "bill_count",
        collector,
        amount: parsed.total,
        bills: parsed.bills,
      });
      saveChannel(channelId, state);
      const result = reconcile(c.balance || 0, parsed.total);
      return [
        `🧾 **[${collector}] お札を記録しました**`,
        formatBills(parsed.bills),
        `お札合計: ${yen(parsed.total)}`,
        `金庫残高: ${yen(c.balance || 0)}`,
        result.message,
      ].join("\n");
    }

    case "突合": {
      if (collector) {
        ensureCollector(state, collector);
        return buildReconcileReport(state, collector);
      }
      const names = collectorNames(state);
      if (names.length === 0) {
        return "📭 入力者がいません。先に `入力者 つむぎ` してください。";
      }
      return names.map((n) => buildReconcileReport(state, n)).join("\n\n---\n\n");
    }

    case "まとめ": {
      const missing = requireCollector(collector);
      if (missing) return missing;
      const c = ensureCollector(state, collector);
      const tips = bundlingAdvice(c.bills || emptyBills());
      c.lastBundleAt = new Date().toISOString();
      addHistory(state, {
        type: "bundle",
        collector,
        amount: sumBills(c.bills),
      });
      saveChannel(channelId, state);
      return [
        `📦 **[${collector}] お札まとめ**`,
        formatBills(c.bills),
        `お札合計: ${yen(sumBills(c.bills))} / 金庫 ${yen(c.balance || 0)}`,
        reconcile(c.balance || 0, sumBills(c.bills)).message,
        ``,
        `**まとめ案**`,
        ...tips.map((t) => `・${t}`),
        ``,
        `まとめ実施を記録しました。`,
      ].join("\n");
    }

    case "期間": {
      if (args.length === 0) {
        return `📅 集金期間: ${formatPeriod(state.period)}`;
      }
      if (args.length < 2) {
        return "形式: `期間 2026-08-03 2026-10-03`";
      }
      const [start, end] = args;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        return "日付は `YYYY-MM-DD` 形式で指定してください。";
      }
      state.period = { start, end };
      addHistory(state, { type: "period", start, end });
      saveChannel(channelId, state);
      return `📅 集金期間を設定しました: ${start} 〜 ${end}`;
    }

    case "リマインド": {
      if (args.length === 0) {
        const r = state.remind || {};
        if (!r.enabled) return "🔔 リマインドはオフです。`リマインド 日 20` で毎週日曜20時などに設定できます。";
        const days = ["日", "月", "火", "水", "木", "金", "土"];
        return `🔔 リマインド: 毎週${days[r.dayOfWeek] ?? "?"}曜 ${r.hourJst}:00 JST\n集金期間: ${formatPeriod(state.period)}`;
      }
      if (args[0] === "オフ" || args[0] === "off") {
        state.remind = {
          ...(state.remind || {}),
          enabled: false,
          channelId: null,
        };
        saveChannel(channelId, state);
        return "🔔 リマインドをオフにしました。";
      }
      const dayMap = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
      const day = dayMap[args[0]];
      const hour = args[1] != null ? Number(args[1]) : 20;
      if (day == null || !Number.isFinite(hour) || hour < 0 || hour > 23) {
        return "形式: `リマインド 日 20`（曜と0-23時） / `リマインド オフ`";
      }
      state.remind = {
        enabled: true,
        dayOfWeek: day,
        hourJst: hour,
        channelId,
        lastSentDate: state.remind?.lastSentDate || null,
      };
      saveChannel(channelId, state);
      return `🔔 毎週${args[0]}曜 ${hour}:00 に突合・お札まとめリマインドを送ります。\nオフにするとき: \`リマインド オフ\``;
    }

    default:
      return `❓ 不明なコマンド: \`${action}\`\n\`ヘルプ\` で使い方を確認できます。`;
  }
}
