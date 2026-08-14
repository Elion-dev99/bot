import fs from "node:fs";
import path from "node:path";

function initDataDir() {
  const preferred = process.env.DATA_DIR || "data";
  const candidates = [path.resolve(preferred), path.resolve("data")];

  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      if (dir !== path.resolve(preferred)) {
        console.warn(
          `[warn] DATA_DIR=${preferred} は使えないため ${dir} を使用します`
        );
      }
      return dir;
    } catch (err) {
      console.warn(`[warn] data dir unavailable: ${dir} (${err.message})`);
    }
  }

  throw new Error("書き込み可能な data ディレクトリを確保できません");
}

const DATA_DIR = initDataDir();
console.log("[boot] using DATA_DIR=", DATA_DIR);

function filePath(channelId) {
  return path.join(DATA_DIR, `${channelId}.json`);
}

function defaultState() {
  return {
    defaultTarget: 0,
    members: {},
    history: [],
  };
}

export function loadChannel(channelId) {
  const file = filePath(channelId);
  if (!fs.existsSync(file)) {
    return defaultState();
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      defaultTarget: Number(raw.defaultTarget) || 0,
      members: raw.members && typeof raw.members === "object" ? raw.members : {},
      history: Array.isArray(raw.history) ? raw.history : [],
    };
  } catch {
    return defaultState();
  }
}

export function saveChannel(channelId, state) {
  fs.writeFileSync(filePath(channelId), JSON.stringify(state, null, 2), "utf8");
}

export function getOrCreateMember(state, name) {
  if (!state.members[name]) {
    state.members[name] = {
      target: state.defaultTarget,
      paid: 0,
    };
  }
  return state.members[name];
}

export function addHistory(state, entry) {
  state.history.push({
    ...entry,
    at: new Date().toISOString(),
  });
  if (state.history.length > 200) {
    state.history = state.history.slice(-200);
  }
}
