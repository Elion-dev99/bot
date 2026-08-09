import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSlashCommands, slashToCommand } from "../src/slash.js";

describe("slash", () => {
  it("スラッシュコマンド定義が作れる", () => {
    const cmds = buildSlashCommands();
    assert.ok(cmds.length >= 10);
    assert.ok(cmds.some((c) => c.name === "nyukin"));
    assert.ok(cmds.some((c) => c.name === "mishukin"));
  });

  it("入金スラッシュを内部コマンドに変換する", () => {
    const interaction = {
      commandName: "nyukin",
      options: {
        get(name) {
          const map = {
            nyuryokusha: { value: "つむぎ" },
            namae: { value: "やまと" },
            kingaku: { value: 5000 },
          };
          return map[name];
        },
      },
    };
    assert.deepEqual(slashToCommand(interaction), {
      action: "入金",
      collector: "つむぎ",
      args: ["やまと", "5000"],
    });
  });
});
