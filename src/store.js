import fs from "node:fs";
import path from "node:path";
import { emptyBills } from "./cash.js";

const DATA_DIR = path.resolve("data");

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
    collectors: {},
    members: {},
    history: [],
    period: null, // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
    remind: {
      enabled: false,
      dayOfWeek: 0, // 0=日 ... 6=土
      hourJst: 20,
      channelId: null,
      lastSentDate: null, // 'YYYY-MM-DD'
    },
  };
}

function normalizeMember(member, defaultTarget = 0) {
  const byCollector =
    member.byCollector && typeof member.byCollector === "object"
      ? member.byCollector
      : {};
  const paidFromCollectors = Object.values(byCollector).reduce(
    (sum, n) => sum + (Number(n) || 0),
    0
  );
  const paid =
    Object.keys(byCollector).length > 0
      ? paidFromCollectors
      : Number(member.paid) || 0;
  return {
    target: Number(member.target) || defaultTarget || 0,
    paid,
    byCollector,
  };
}

function normalizeCollector(collector) {
  return {
    balance: Number(collector?.balance) || 0,
    bills: { ...emptyBills(), ...(collector?.bills || {}) },
    lastCountAt: collector?.lastCountAt || null,
    lastBundleAt: collector?.lastBundleAt || null,
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
    const defaultTarget = Number(raw.defaultTarget) || 0;
    const members = {};
    if (raw.members && typeof raw.members === "object") {
      for (const [name, member] of Object.entries(raw.members)) {
        members[name] = normalizeMember(member, defaultTarget);
      }
    }
    const collectors = {};
    if (raw.collectors && typeof raw.collectors === "object") {
      for (const [name, c] of Object.entries(raw.collectors)) {
        collectors[name] = normalizeCollector(c);
      }
    }
    const base = defaultState();
    return {
      defaultTarget,
      collectors,
      members,
      history: Array.isArray(raw.history) ? raw.history : [],
      period: raw.period || null,
      remind: { ...base.remind, ...(raw.remind || {}) },
    };
  } catch {
    return defaultState();
  }
}

export function saveChannel(channelId, state) {
  ensureDir();
  fs.writeFileSync(filePath(channelId), JSON.stringify(state, null, 2), "utf8");
}

export function listChannelIds() {
  ensureDir();
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function getOrCreateMember(state, name) {
  if (!state.members[name]) {
    state.members[name] = {
      target: state.defaultTarget,
      paid: 0,
      byCollector: {},
    };
  }
  if (!state.members[name].byCollector) {
    state.members[name].byCollector = {};
  }
  return state.members[name];
}

export function ensureCollector(state, collector) {
  if (!state.collectors) state.collectors = {};
  if (!state.collectors[collector]) {
    state.collectors[collector] = normalizeCollector({});
  } else {
    state.collectors[collector] = normalizeCollector(state.collectors[collector]);
  }
  return state.collectors[collector];
}

export function syncMemberPaid(member) {
  const by = member.byCollector || {};
  member.paid = Object.values(by).reduce((sum, n) => sum + (Number(n) || 0), 0);
  return member.paid;
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
