/**
 * コマンドを抽出・解析する
 * 例: 入金 太郎 1000 / (総額) / 登録 花子 3000
 */

const COMMAND_RE = /[（(]\s*([^）)]+?)\s*[）)]/g;

export function extractCommands(content) {
  const results = [];
  let match;
  while ((match = COMMAND_RE.exec(content)) !== null) {
    results.push(match[1].trim());
  }
  return results;
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
