import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  extractCommands,
  extractBareCommands,
  parseCommand,
  parseAmount,
} from "../src/parser.js";
import { handleCommand } from "../src/commands.js";

const TEST_CHANNEL = "test-channel-unit";
const DATA_FILE = path.resolve("data", `${TEST_CHANNEL}.json`);

function reset() {
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
}

describe("parser", () => {
  it("括弧コマンドを抽出する", () => {
    assert.deepEqual(extractCommands("(総額)"), ["総額"]);
    assert.deepEqual(extractCommands("（つむぎ 入金 太郎 1000）"), [
      "つむぎ 入金 太郎 1000",
    ]);
  });

  it("入力者つきコマンドを分解する", () => {
    assert.deepEqual(parseCommand("つむぎ 入金 太郎 1,000"), {
      collector: "つむぎ",
      action: "入金",
      args: ["太郎", "1,000"],
      raw: "つむぎ 入金 太郎 1,000",
    });
    assert.deepEqual(parseCommand("登録 太郎 3000"), {
      collector: null,
      action: "登録",
      args: ["太郎", "3000"],
      raw: "登録 太郎 3000",
    });
  });

  it("改行の連続コマンドを抽出する", () => {
    assert.deepEqual(
      extractBareCommands("つむぎ 入金 太郎 3000\nれんた 入金 花子 3000"),
      ["つむぎ 入金 太郎 3000", "れんた 入金 花子 3000"]
    );
  });

  it("金額をパースする", () => {
    assert.equal(parseAmount("1000"), 1000);
    assert.equal(parseAmount("1,000円"), 1000);
    assert.equal(parseAmount("abc"), null);
  });
});

describe("commands", () => {
  it("入力者別金庫で入金・総額・未集金できる", () => {
    reset();
    assert.match(
      handleCommand(TEST_CHANNEL, { action: "入力者", args: ["つむぎ"] }),
      /つむぎ/
    );
    assert.match(
      handleCommand(TEST_CHANNEL, { action: "入力者", args: ["れんた"] }),
      /れんた/
    );
    handleCommand(TEST_CHANNEL, {
      action: "登録",
      args: ["太郎", "3000"],
      collector: null,
    });
    handleCommand(TEST_CHANNEL, {
      action: "登録",
      args: ["花子", "3000"],
      collector: null,
    });

    assert.match(
      handleCommand(TEST_CHANNEL, {
        action: "入金",
        args: ["太郎", "3000"],
        collector: "つむぎ",
      }),
      /\[つむぎ\]/
    );
    assert.match(
      handleCommand(TEST_CHANNEL, {
        action: "入金",
        args: ["花子", "1000"],
        collector: "れんた",
      }),
      /\[れんた\]/
    );

    const total = handleCommand(TEST_CHANNEL, {
      action: "総額",
      args: [],
      collector: null,
    });
    assert.match(total, /4,000円/);
    assert.match(total, /つむぎ 金庫: 3,000円/);
    assert.match(total, /れんた 金庫: 1,000円/);

    const tsumugi = handleCommand(TEST_CHANNEL, {
      action: "総額",
      args: [],
      collector: "つむぎ",
    });
    assert.match(tsumugi, /\[つむぎ\] 金庫: 3,000円/);

    const unpaid = handleCommand(TEST_CHANNEL, {
      action: "未集金",
      args: [],
      collector: null,
    });
    assert.match(unpaid, /花子/);
    assert.match(unpaid, /2,000円/);
    assert.doesNotMatch(unpaid, /太郎/);
  });

  it("入力者なしの入金は拒否する", () => {
    reset();
    const res = handleCommand(TEST_CHANNEL, {
      action: "入金",
      args: ["太郎", "1000"],
      collector: null,
    });
    assert.match(res, /入力者をつけてください/);
  });

  it("出金は同じ入力者の分だけ減らせる", () => {
    reset();
    handleCommand(TEST_CHANNEL, { action: "入力者", args: ["つむぎ"] });
    handleCommand(TEST_CHANNEL, { action: "入力者", args: ["れんた"] });
    handleCommand(TEST_CHANNEL, {
      action: "登録",
      args: ["次郎", "5000"],
      collector: null,
    });
    handleCommand(TEST_CHANNEL, {
      action: "入金",
      args: ["次郎", "2000"],
      collector: "つむぎ",
    });
    assert.match(
      handleCommand(TEST_CHANNEL, {
        action: "出金",
        args: ["次郎", "500"],
        collector: "れんた",
      }),
      /出金できません/
    );
    assert.match(
      handleCommand(TEST_CHANNEL, {
        action: "出金",
        args: ["次郎", "500"],
        collector: "つむぎ",
      }),
      /出金 次郎/
    );
  });
});
