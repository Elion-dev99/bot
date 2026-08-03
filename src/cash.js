/** 日本円の金種とお札まとめヘルパー */

export const DENOMS = [
  { key: "10000", value: 10000, label: "1万円札", aliases: ["万", "１万", "1万", "10000", "万円"] },
  { key: "5000", value: 5000, label: "5千円札", aliases: ["五千", "５千", "5千", "5000"] },
  { key: "1000", value: 1000, label: "1千円札", aliases: ["千", "１千", "1千", "1000"] },
  { key: "500", value: 500, label: "500円", aliases: ["五百", "500"] },
  { key: "100", value: 100, label: "100円", aliases: ["百", "100"] },
  { key: "50", value: 50, label: "50円", aliases: ["50"] },
  { key: "10", value: 10, label: "10円", aliases: ["10"] },
  { key: "5", value: 5, label: "5円", aliases: ["5"] },
  { key: "1", value: 1, label: "1円", aliases: ["1"] },
];

const ALIAS_MAP = new Map();
for (const d of DENOMS) {
  for (const a of d.aliases) ALIAS_MAP.set(a, d);
}

export function emptyBills() {
  const bills = {};
  for (const d of DENOMS) bills[d.key] = 0;
  return bills;
}

export function sumBills(bills) {
  let total = 0;
  for (const d of DENOMS) {
    total += (Number(bills?.[d.key]) || 0) * d.value;
  }
  return total;
}

export function formatBills(bills) {
  const lines = [];
  for (const d of DENOMS) {
    const count = Number(bills?.[d.key]) || 0;
    if (count > 0) {
      lines.push(`・${d.label} × ${count} = ${(count * d.value).toLocaleString("ja-JP")}円`);
    }
  }
  return lines.length ? lines.join("\n") : "・内訳なし";
}

/**
 * トークン例: 万2 / 五千:3 / 1000x5 / 千10
 */
export function parseBillTokens(tokens) {
  const bills = emptyBills();
  if (!tokens.length) {
    return { error: "形式: `つむぎ 札 万2 五千1 千10`" };
  }

  for (const token of tokens) {
    let matched = false;

    // 万2 / 五千3 / 千10
    let m = token.match(/^(.+?)[:x×*](\d+)$/i) || token.match(/^([^\d]+)(\d+)$/);
    if (m) {
      const denom = ALIAS_MAP.get(m[1]);
      const count = Number(m[2]);
      if (denom && Number.isFinite(count) && count >= 0) {
        bills[denom.key] = count;
        matched = true;
      }
    }

    // 10000:2
    if (!matched) {
      m = token.match(/^(\d+)[:x×*](\d+)$/i);
      if (m) {
        const denom = ALIAS_MAP.get(m[1]);
        const count = Number(m[2]);
        if (denom && Number.isFinite(count) && count >= 0) {
          bills[denom.key] = count;
          matched = true;
        }
      }
    }

    if (!matched) {
      return { error: `金種が読めません: \`${token}\`\n例: \`万2 五千1 千10\`` };
    }
  }

  return { bills, total: sumBills(bills) };
}

/** お札まとめ提案（帯でまとめる目安） */
export function bundlingAdvice(bills) {
  const tips = [];
  const sen = Number(bills?.["1000"]) || 0;
  const go = Number(bills?.["5000"]) || 0;
  const man = Number(bills?.["10000"]) || 0;

  if (sen >= 25) {
    const bundles = Math.floor(sen / 25);
    tips.push(`千円札 ${sen}枚 → 25枚帯 × ${bundles}（余り ${sen % 25}枚）`);
  } else if (sen >= 10) {
    tips.push(`千円札 ${sen}枚 → 10枚ずつ仮まとめ可（余り ${sen % 10}枚）`);
  }

  if (go >= 20) {
    tips.push(`五千札 ${go}枚 → 20枚帯 × ${Math.floor(go / 20)}（余り ${go % 20}枚）`);
  } else if (go >= 10) {
    tips.push(`五千札 ${go}枚 → 10枚ずつ仮まとめ可`);
  }

  if (man >= 10) {
    tips.push(`万円札 ${man}枚 → 10枚帯 × ${Math.floor(man / 10)}（余り ${man % 10}枚）`);
  }

  // 両替提案
  if (sen >= 5) {
    tips.push(`千円札5枚 → 五千札1枚に両替候補`);
  }
  if (go >= 2) {
    tips.push(`五千札2枚 → 万円札1枚に両替候補`);
  }

  if (!tips.length) {
    tips.push("まとめる量の目安にはまだ達していません（千円25枚・五千20枚・万10枚が帯の目安）");
  }
  return tips;
}

export function reconcile(vaultBalance, billTotal) {
  const diff = billTotal - vaultBalance;
  if (diff === 0) {
    return { ok: true, diff: 0, message: "✅ 一致しています" };
  }
  if (diff > 0) {
    return {
      ok: false,
      diff,
      message: `⚠️ 実在現金が ${diff.toLocaleString("ja-JP")}円 多いです`,
    };
  }
  return {
    ok: false,
    diff,
    message: `⚠️ 実在現金が ${Math.abs(diff).toLocaleString("ja-JP")}円 少ないです`,
  };
}
