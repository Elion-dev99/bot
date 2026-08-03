/**
 * コマンドを抽出・解析する
 * 例:
 *   つむぎ 入金 太郎 1000
 *   れんた 総額
 *   登録 花子 3000
 */

const COMMAND_RE = /[（(]\s*([^）)]+?)\s*[）)]/g;

export const ACTIONS = new Set([
  "ヘルプ",
  "help",
  "Help",
  "総額",
  "未集金",
  "一覧",
  "履歴",
  "取消",
  "リセット",
  "リセット確認",
  "入金",
  "出金",
  "登録",
  "目標",
  "削除",
  "入力者",
  "札",
  "突合",
  "まとめ",
  "期間",
  "リマインド",
]);

const SINGLE_COMMAND_RE =
  /^(ヘルプ|help|総額|未集金|一覧|履歴|取消|リセット|リセット確認|入力者|突合|まとめ|リマインド)$/i;
const ARGS_COMMAND_RE =
  /^(入金|出金|登録|目標|削除|入力者|札|期間|リマインド)(\s+|\+).+/i;
// 入力者つき
const COLLECTOR_COMMAND_RE =
  /^(\S+)(\s+|\+)(入金|出金|総額|一覧|履歴|取消|札|突合|まとめ)((\s+|\+).+)?$/i;

export function isCommandLine(line) {
  const bare = String(line).trim();
  if (!bare) return false;
  return (
    SINGLE_COMMAND_RE.test(bare) ||
    ARGS_COMMAND_RE.test(bare) ||
    COLLECTOR_COMMAND_RE.test(bare)
  );
}

export function extractCommands(content) {
  const results = [];
  let match;
  while ((match = COMMAND_RE.exec(content)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

/** 改行区切りのコマンドを抽出（有効な行だけ拾う） */
export function extractBareCommands(content) {
  const lines = String(content)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];
  return lines.filter(isCommandLine);
}

export function parseCommand(raw) {
  const parts = String(raw)
    .trim()
    .split(/[+\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  // 先頭がコマンド → 入力者なし
  if (ACTIONS.has(parts[0]) || ACTIONS.has(parts[0].toLowerCase())) {
    return {
      collector: null,
      action: parts[0],
      args: parts.slice(1),
      raw,
    };
  }

  // 2語目がコマンド → 先頭が入力者
  if (
    parts.length >= 2 &&
    (ACTIONS.has(parts[1]) || ACTIONS.has(parts[1].toLowerCase()))
  ) {
    return {
      collector: parts[0],
      action: parts[1],
      args: parts.slice(2),
      raw,
    };
  }

  return {
    collector: null,
    action: parts[0],
    args: parts.slice(1),
    raw,
  };
}

export function parseAmount(value) {
  if (value == null) return null;
  const normalized = String(value)
    .replace(/[,，]/g, "")
    .replace(/円/g, "")
    .trim();
  if (!/^\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}
