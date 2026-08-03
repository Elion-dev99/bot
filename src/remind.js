import {
  listChannelIds,
  loadChannel,
  saveChannel,
  ensureCollector,
} from "./store.js";
import { sumBills, reconcile, emptyBills } from "./cash.js";
import { yen } from "./format.js";

function jstNowParts() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    dayOfWeek: weekdayMap[parts.weekday] ?? 0,
  };
}

function daysLeft(period, today) {
  if (!period?.end) return null;
  const end = new Date(`${period.end}T23:59:59+09:00`);
  const now = new Date(`${today}T12:00:00+09:00`);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export function buildReminderMessage(state) {
  const collectors = Object.keys(state.collectors || {});
  const lines = [
    "🔔 **定期チェックの時間です**",
    `集金期間: ${state.period ? `${state.period.start} 〜 ${state.period.end}` : "未設定"}`,
  ];
  const left = daysLeft(state.period, jstNowParts().date);
  if (left != null) {
    lines.push(left >= 0 ? `残りおよそ ${left} 日` : `期間終了から ${Math.abs(left)} 日経過`);
  }
  lines.push("");
  lines.push("やること:");
  lines.push("1. お札を数える → `つむぎ 札 万2 五千1 千10`");
  lines.push("2. 金庫と合うか確認 → `突合`");
  lines.push("3. お札をまとめる → `つむぎ まとめ`");
  lines.push("");

  if (collectors.length) {
    lines.push("**いまの金庫**");
    for (const name of collectors) {
      const c = ensureCollector(state, name);
      const billTotal = sumBills(c.bills || emptyBills());
      const r = reconcile(c.balance || 0, billTotal);
      lines.push(
        `・${name}: 金庫 ${yen(c.balance || 0)} / 札 ${yen(billTotal)} / ${r.ok ? "一致" : "差分あり"}`
      );
    }
  }
  return lines.join("\n");
}

/**
 * リマインドが必要なチャンネルを返す
 * @returns {{ channelId: string, content: string }[]}
 */
export function collectDueReminders() {
  const now = jstNowParts();
  const due = [];
  for (const channelId of listChannelIds()) {
    const state = loadChannel(channelId);
    const r = state.remind;
    if (!r?.enabled) continue;
    if (r.dayOfWeek !== now.dayOfWeek) continue;
    if (r.hourJst !== now.hour) continue;
    if (r.lastSentDate === now.date) continue;
    const targetChannel = r.channelId || channelId;
    const content = buildReminderMessage(state);
    r.lastSentDate = now.date;
    saveChannel(channelId, state);
    due.push({ channelId: targetChannel, content });
  }
  return due;
}
