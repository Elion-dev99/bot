import fs from "node:fs";
import path from "node:path";

// Railway Volume 等: 環境変数 DATA_DIR で保存先を指定（例: /data）
const DATA_DIR = path.resolve(process.env.DATA_DIR || "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

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
  ensureDir();
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
  ensureDir();
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
