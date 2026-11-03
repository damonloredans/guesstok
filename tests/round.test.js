import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound, createPicker, roundKind } from '../src/round.js';
import settings from '../src/settings.js';

const pizza = { id: 'pizza', name: 'Pizza', answers: [], difficulty: 'easy', file: 'pizza.png', pack: 'food' };
const mk = () => createRound({ item: pizza, startedAt: 0, settings });

test('stage rises every 5 seconds up to 9 stages', () => {
  const r = mk();
  assert.equal(r.stage(0), 0);
  assert.equal(r.stage(5000), 1);
  assert.equal(r.stage(40000), 8);
  assert.equal(r.stage(44999), 8);
});

test('the first correct guess ends the round and is the only winner', () => {
  const r = mk();
  assert.equal(r.isOver(7000), false);
  assert.deepEqual(r.guess({ user: 'ann', text: 'pizza', now: 7000, multiplier: 2 }), { correct: true, points: 16 });
  assert.deepEqual(r.winners, [{ user: 'ann', points: 16, stage: 1, multiplier: 2 }]);
  assert.equal(r.isOver(7000), true);
  assert.deepEqual(r.guess({ user: 'bob', text: 'pizza', now: 7001, multiplier: 1 }), { correct: false, points: 0 });
  assert.equal(r.winners.length, 1);
});

test('wrong guess scores nothing and the round carries on', () => {
  const r = mk();
  assert.deepEqual(r.guess({ user: 'ann', text: 'burger', now: 1000, multiplier: 1 }), { correct: false, points: 0 });
  assert.equal(r.winners.length, 0);
  assert.equal(r.isOver(1000), false);
});

test('guess after the 45 seconds are up scores nothing', () => {
  const r = mk();
  assert.equal(r.isOver(44999), false);
  assert.equal(r.isOver(45000), true);
  assert.deepEqual(r.guess({ user: 'ann', text: 'pizza', now: 45000, multiplier: 1 }), { correct: false, points: 0 });
});

test('roundKind follows the pattern and a zoom round comes after every 10 rounds', () => {
  const kinds = Array.from({ length: 11 }, (_, i) => roundKind(i + 1));
  assert.deepEqual(kinds, ['easy', 'easy', 'easy', 'easy', 'medium', 'easy', 'easy', 'medium', 'medium', 'hard', 'zoom']);
  assert.equal(roundKind(12), 'easy');
  assert.equal(roundKind(22), 'zoom');
});

const mkItem = (id, difficulty) => ({ id, name: id, answers: [], difficulty, file: id, pack: 'p' });
const items = [...['a', 'b', 'c'].map((id) => mkItem(id, 'easy')), mkItem('m', 'medium'), mkItem('m2', 'medium'), mkItem('h', 'hard')];
const seeded = () => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

test('picker picks the difficulty the pattern asks for, and a medium item for a zoom round', () => {
  const p = createPicker(items, seeded());
  const want = ['easy', 'easy', 'easy', 'easy', 'medium', 'easy', 'easy', 'medium', 'medium', 'hard', 'medium'];
  want.forEach((tier, i) => assert.equal(p.next(i + 1).difficulty, tier, `round ${i + 1}`));
});

test('picker plays every item of a difficulty once before any repeats', () => {
  const p = createPicker(items, seeded());
  const firstDeck = [1, 2, 3].map(() => p.next(1).id).sort();
  assert.deepEqual(firstDeck, ['a', 'b', 'c']);
  const secondDeck = [1, 2, 3].map(() => p.next(1).id).sort();
  assert.deepEqual(secondDeck, ['a', 'b', 'c']);
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
