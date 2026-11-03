import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound, createPicker } from '../src/round.js';
import settings from '../src/settings.js';

const pizza = { id: 'pizza', name: 'Pizza', answers: [], difficulty: 'easy', file: 'pizza.png', pack: 'food' };
const mk = (over = {}) => createRound({ item: pizza, startedAt: 0, settings: { ...settings, ...over } });

test('stage rises every 3 seconds', () => {
  const r = mk();
  assert.equal(r.stage(0), 0);
  assert.equal(r.stage(3000), 1);
  assert.equal(r.stage(12000), 4);
  assert.equal(r.stage(14999), 4);
});

test('likes push the stage ahead', () => {
  const a = mk({ likesPerStage: 100 });
  a.addLikes(100);
  assert.equal(a.stage(0), 1);
  const b = mk({ likesPerStage: 100 });
  b.addLikes(250);
  assert.equal(b.stage(0), 2);
});

test('a huge like batch cannot pass the last stage', () => {
  const r = mk({ likesPerStage: 100 });
  r.addLikes(1e9);
  assert.equal(r.stage(0), 4);
});

test('correct guess scores by stage and multiplier', () => {
  const r = mk();
  assert.deepEqual(r.guess({ user: 'ann', text: 'pizza', now: 7000, multiplier: 2 }), { correct: true, points: 6 });
  assert.deepEqual(r.winners, [{ user: 'ann', points: 6, stage: 2 }]);
});

test('wrong guess scores nothing', () => {
  const r = mk();
  assert.deepEqual(r.guess({ user: 'ann', text: 'burger', now: 1000, multiplier: 1 }), { correct: false, points: 0 });
  assert.equal(r.winners.length, 0);
});

test('a viewer scores only once per round', () => {
  const r = mk();
  r.guess({ user: 'ann', text: 'pizza', now: 1000, multiplier: 1 });
  assert.deepEqual(r.guess({ user: 'ann', text: 'pizza', now: 2000, multiplier: 1 }), { correct: true, points: 0 });
  assert.equal(r.winners.length, 1);
});

test('guess after the round ends scores nothing', () => {
  const r = mk();
  assert.equal(r.isOver(14999), false);
  assert.equal(r.isOver(15000), true);
  assert.deepEqual(r.guess({ user: 'ann', text: 'pizza', now: 15000, multiplier: 1 }), { correct: false, points: 0 });
});

const items = [
  ...['a', 'b', 'c'].map((id) => ({ id, name: id, answers: [], difficulty: 'easy', file: id, pack: 'p' })),
  { id: 'm', name: 'm', answers: [], difficulty: 'medium', file: 'm', pack: 'p' },
  { id: 'h', name: 'h', answers: [], difficulty: 'hard', file: 'h', pack: 'p' },
];
const seeded = () => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

test('picker uses easy items first', () => {
  const p = createPicker(items, seeded());
  for (let i = 0; i < 30; i++) assert.equal(p.next(1).difficulty, 'easy');
});

test('picker does not repeat the previous item back to back', () => {
  const p = createPicker(items, () => 0);
  let last;
  for (let i = 0; i < 20; i++) {
    const it = p.next(1);
    assert.notEqual(it.id, last);
    last = it.id;
  }
});
