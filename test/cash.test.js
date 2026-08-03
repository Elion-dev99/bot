import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseBillTokens,
  sumBills,
  reconcile,
  bundlingAdvice,
} from "../src/cash.js";

describe("cash", () => {
  it("お札トークンを合計する", () => {
    const parsed = parseBillTokens(["万2", "五千1", "千3"]);
    assert.equal(parsed.total, 20000 + 5000 + 3000);
    assert.equal(parsed.bills["10000"], 2);
    assert.equal(parsed.bills["5000"], 1);
    assert.equal(parsed.bills["1000"], 3);
  });

  it("突合の差分を判定する", () => {
    assert.equal(reconcile(28000, 28000).ok, true);
    assert.match(reconcile(28000, 27000).message, /少ない/);
    assert.match(reconcile(28000, 29000).message, /多い/);
  });

  it("まとめ案を出す", () => {
    const tips = bundlingAdvice({ 1000: 30, 5000: 0, 10000: 0 });
    assert.ok(tips.some((t) => t.includes("25枚帯")));
  });
});
