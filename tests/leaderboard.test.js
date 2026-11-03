import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLeaderboard } from '../src/leaderboard.js';

const at = (d, h, min = 0) => new Date(2026, 10, d, h, min).getTime(); // local time
const memStore = () => {
  const m = new Map();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v) };
};

test('points add up per viewer', () => {
  const lb = createLeaderboard(memStore());
  lb.add('ann', 5, at(3, 12));
  lb.add('ann', 3, at(3, 12, 1));
  assert.deepEqual(lb.top(5, at(3, 13)), [{ user: 'ann', points: 8 }]);
});

test('top returns the highest first and respects n', () => {
  const lb = createLeaderboard(memStore());
  lb.add('ann', 5, at(3, 12));
  lb.add('bob', 9, at(3, 12));
  lb.add('cy', 7, at(3, 12));
  assert.deepEqual(lb.top(2, at(3, 13)), [
    { user: 'bob', points: 9 },
    { user: 'cy', points: 7 },
  ]);
});

test('ties keep the viewer who reached the score first on top', () => {
  const lb = createLeaderboard(memStore());
  lb.add('ann', 5, at(3, 12));
  lb.add('bob', 3, at(3, 12));
  lb.add('bob', 2, at(3, 12)); // bob reaches 5 after ann
  assert.deepEqual(lb.top(2, at(3, 13)).map((r) => r.user), ['ann', 'bob']);
});

test('scores reset after the reset hour passes', () => {
  const lb = createLeaderboard(memStore());
  lb.add('ann', 5, at(3, 23));
  assert.deepEqual(lb.top(5, at(4, 0, 1)), []);
});

test('reloading before the reset keeps the scores', () => {
  const store = memStore();
  createLeaderboard(store).add('ann', 5, at(3, 23));
  assert.deepEqual(createLeaderboard(store).top(5, at(3, 23, 30)), [{ user: 'ann', points: 5 }]);
});

test('reloading after the reset shows nothing', () => {
  const store = memStore();
  createLeaderboard(store).add('ann', 5, at(3, 23));
  assert.deepEqual(createLeaderboard(store).top(5, at(4, 0, 30)), []);
});

test('adding after the reset starts a fresh day', () => {
  const lb = createLeaderboard(memStore());
  lb.add('ann', 5, at(3, 23));
  lb.add('bob', 2, at(4, 0, 30));
  assert.deepEqual(lb.top(5, at(4, 1)), [{ user: 'bob', points: 2 }]);
});

test('corrupt stored data is treated as empty', () => {
  for (const bad of ['not json', 'null', '{"day":1}', '{"day":"x","scores":5,"order":[]}']) {
    const store = memStore();
    store.set('guesstok.leaderboard', bad);
    const lb = createLeaderboard(store);
    assert.deepEqual(lb.top(5, at(3, 12)), []);
    lb.add('ann', 1, at(3, 12));
    assert.deepEqual(lb.top(5, at(3, 12)), [{ user: 'ann', points: 1 }]);
  }
});
