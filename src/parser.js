/**
 * 括弧で囲まれたコマンドを抽出・解析する
 * 例: (入金+太郎+1000) / （総額） / (登録 + 花子 + 3000)
 * スラッシュ空間区切りも可: /削除 入力者 対象 理由
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

/**
 * `/削除 入力者 対象 理由` のようなスラッシュ＋スペース区切りを判定する
 */
export function isSlashSpaceCommand(raw) {
  const trimmed = String(raw || "").trim();
  return /^\/[^\s+]/.test(trimmed) && !trimmed.includes("+");
}

export function parseCommand(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;

  // /削除 入力者 削除対象 理由 … スペース区切り（理由は残り全部）
  if (isSlashSpaceCommand(trimmed)) {
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const action = tokens[0].replace(/^\//, "");
    if (!action) return null;
    return { action, args: tokens.slice(1), raw: trimmed };
  }

  const parts = trimmed
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const action = parts[0].replace(/^\//, "");
  const args = parts.slice(1);

  return { action, args, raw: trimmed };
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
