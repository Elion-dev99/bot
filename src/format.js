export function yen(amount) {
  return `${Number(amount).toLocaleString("ja-JP")}円`;
}

export function memberStatusLine(name, member) {
  const unpaid = Math.max(0, (member.target || 0) - (member.paid || 0));
  const status =
    unpaid === 0 && (member.target || 0) > 0
      ? "✅ 完了"
      : unpaid === 0 && (member.target || 0) === 0
        ? "— 目標未設定"
        : `⏳ 未集金 ${yen(unpaid)}`;
  return `・${name}: 入金 ${yen(member.paid || 0)} / 目標 ${yen(member.target || 0)} / ${status}`;
}

export function historyLine(entry) {
  const time = entry.at
    ? new Date(entry.at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
    : "";
  switch (entry.type) {
    case "deposit":
      return `・[${time}] 入金 ${entry.name} ${yen(entry.amount)}`;
    case "withdraw":
      return `・[${time}] 出金 ${entry.name} ${yen(entry.amount)}`;
    case "register":
      return `・[${time}] 登録 ${entry.name} 目標 ${yen(entry.target)}`;
    case "remove":
      return entry.operator || entry.reason
        ? `・[${time}] 削除 ${entry.name}（入力者: ${entry.operator ?? "—"} / 理由: ${entry.reason ?? "—"}）`
        : `・[${time}] 削除 ${entry.name}`;
    case "set_target":
      return `・[${time}] 目標変更 ${entry.name ?? "全体デフォルト"} ${yen(entry.target)}`;
    case "undo":
      return `・[${time}] 取消 ${entry.undoneType}`;
    case "reset":
      return `・[${time}] リセット`;
    default:
      return `・[${time}] ${entry.type}`;
  }
}
