import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractCommands, extractBareCommands, parseCommand, parseAmount } from "../src/parser.js";
import { handleCommand } from "../src/commands.js";

const TEST_CHANNEL = "test-channel-unit";
const DATA_FILE = path.resolve("data", `${TEST_CHANNEL}.json`);

function reset() {
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
}

describe("parser", () => {
  it("括弧コマンドを抽出する", () => {
    assert.deepEqual(extractCommands("(総額)"), ["総額"]);
    assert.deepEqual(extractCommands("（入金 太郎 1000）"), ["入金 太郎 1000"]);
    assert.deepEqual(extractCommands("確認 (一覧) と (未集金)"), ["一覧", "未集金"]);
  });

  it("コマンドを半角スペースで分解する", () => {
    assert.deepEqual(parseCommand("入金 太郎 1,000"), {
      action: "入金",
      args: ["太郎", "1,000"],
      raw: "入金 太郎 1,000",
    });
  });

  it("旧形式の+区切りも分解できる", () => {
    assert.deepEqual(parseCommand("入金+太郎+1000"), {
      action: "入金",
      args: ["太郎", "1000"],
      raw: "入金+太郎+1000",
    });
  });

  it("改行の連続コマンドを抽出する", () => {
    assert.deepEqual(
      extractBareCommands("登録 太郎 3000\n登録 花子 3000\n総額"),
      ["登録 太郎 3000", "登録 花子 3000", "総額"]
    );
    assert.deepEqual(extractBareCommands("雑談\n登録 太郎 3000"), []);
  });

  it("金額をパースする", () => {
    assert.equal(parseAmount("1000"), 1000);
    assert.equal(parseAmount("1,000円"), 1000);
    assert.equal(parseAmount("abc"), null);
  });
});

describe("commands", () => {
  it("登録・入金・総額・未集金の一連の流れ", () => {
    reset();
    assert.match(handleCommand(TEST_CHANNEL, { action: "登録", args: ["太郎", "3000"] }), /登録完了/);
    assert.match(handleCommand(TEST_CHANNEL, { action: "登録", args: ["花子", "3000"] }), /登録完了/);
    assert.match(handleCommand(TEST_CHANNEL, { action: "入金", args: ["太郎", "3000"] }), /入金記録/);
    assert.match(handleCommand(TEST_CHANNEL, { action: "入金", args: ["花子", "1000"] }), /入金記録/);

    const total = handleCommand(TEST_CHANNEL, { action: "総額", args: [] });
    assert.match(total, /4,000円/);

    const unpaid = handleCommand(TEST_CHANNEL, { action: "未集金", args: [] });
    assert.match(unpaid, /花子/);
    assert.match(unpaid, /2,000円/);
    assert.doesNotMatch(unpaid, /太郎/);
  });

  it("出金と取消ができる", () => {
    reset();
    handleCommand(TEST_CHANNEL, { action: "登録", args: ["次郎", "5000"] });
    handleCommand(TEST_CHANNEL, { action: "入金", args: ["次郎", "2000"] });
    assert.match(handleCommand(TEST_CHANNEL, { action: "出金", args: ["次郎", "500"] }), /出金記録/);
    const list = handleCommand(TEST_CHANNEL, { action: "一覧", args: [] });
    assert.match(list, /1,500円/);

    assert.match(handleCommand(TEST_CHANNEL, { action: "取消", args: [] }), /取消完了/);
    const afterUndo = handleCommand(TEST_CHANNEL, { action: "一覧", args: [] });
    assert.match(afterUndo, /2,000円/);
  });

  it("リセット確認で消える", () => {
    reset();
    handleCommand(TEST_CHANNEL, { action: "登録", args: ["三郎", "1000"] });
    assert.match(
      handleCommand(TEST_CHANNEL, { action: "リセット", args: [] }),
      /リセット確認/
    );
    assert.match(
      handleCommand(TEST_CHANNEL, { action: "リセット確認", args: [] }),
      /リセットしました/
    );
    assert.match(
      handleCommand(TEST_CHANNEL, { action: "一覧", args: [] }),
      /まだ名簿がありません/
    );
  });
});
