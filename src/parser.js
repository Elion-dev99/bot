/**
 * コマンドを抽出・解析する
 * 例: 入金 太郎 1000 / (総額) / 登録 花子 3000
 * 改行で複数コマンドも可
 */

const COMMAND_RE = /[（(]\s*([^）)]+?)\s*[）)]/g;

const SINGLE_COMMAND_RE =
  /^(ヘルプ|help|総額|未集金|一覧|履歴|取消|リセット|リセット確認)$/i;
const ARGS_COMMAND_RE = /^(入金|出金|登録|目標|削除)(\s+|\+).+/;

export function isCommandLine(line) {
  const bare = String(line).trim();
  if (!bare) return false;
  return SINGLE_COMMAND_RE.test(bare) || ARGS_COMMAND_RE.test(bare);
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

  const commands = lines.filter(isCommandLine);
  // 1行だけのときは従来どおり。複数行なら有効行だけ処理
  if (lines.length === 1) return commands;
  return commands;
}

export function parseCommand(raw) {
  // 半角スペース区切りを主とし、旧形式の + も受け付ける
  const parts = String(raw)
    .trim()
    .split(/[+\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const action = parts[0];
  const args = parts.slice(1);

  return { action, args, raw };
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
