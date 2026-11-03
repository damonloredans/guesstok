import settings from './settings.js';

const KEY = 'guesstok.leaderboard';

// Local calendar date of `now`, shifted back so the day rolls over at the reset hour.
const dayOf = (now) => {
  const d = new Date(now - settings.leaderboardResetHour * 3600000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function createLeaderboard(store) {
  // Returns { day, scores: Map, order: [] } for today; stale or corrupt data becomes empty.
  const load = (now) => {
    const day = dayOf(now);
    try {
      const data = JSON.parse(store.get(KEY));
      if (data.day === day && Array.isArray(data.order) && typeof data.scores === 'object') {
        return { day, scores: new Map(Object.entries(data.scores)), order: data.order };
      }
    } catch { /* missing or corrupt: start empty */ }
    return { day, scores: new Map(), order: [] };
  };

  return {
    add(user, points, now) {
      const board = load(now);
      board.scores.set(user, (board.scores.get(user) ?? 0) + points);
      // order = when each viewer reached their current score; latest mover goes last
      board.order = board.order.filter((u) => u !== user).concat(user);
      store.set(KEY, JSON.stringify({
        day: board.day,
        scores: Object.fromEntries(board.scores),
        order: board.order,
      }));
    },
    top(n, now) {
      const { scores, order } = load(now);
      return order
        .filter((user) => scores.has(user))
        .map((user) => ({ user, points: scores.get(user) }))
        .sort((a, b) => b.points - a.points) // stable: ties keep order
        .slice(0, n);
    },
  };
}

// Falls back to an in-memory store when localStorage is missing or throws (private windows).
export function browserStore() {
  const mem = new Map();
  const fallback = { get: (k) => mem.get(k) ?? null, set: (k, v) => void mem.set(k, v) };
  try {
    const ls = globalThis.localStorage;
    ls.getItem(KEY);
    return {
      get: (k) => { try { return ls.getItem(k) ?? fallback.get(k); } catch { return fallback.get(k); } },
      set: (k, v) => { try { ls.setItem(k, v); } catch { fallback.set(k, v); } },
    };
  } catch {
    return fallback;
  }
}
