import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointsFor, createGiftBook } from '../src/score.js';

test('points are 5,4,3,2,1 by stage times the multiplier', () => {
  assert.equal(pointsFor(0, 1), 5);
  assert.equal(pointsFor(4, 1), 1);
  assert.equal(pointsFor(1, 3), 12);
});

test('one gift makes x2', () => {
  const book = createGiftBook();
  book.add('ann', 1, 0);
  assert.equal(book.multiplier('ann', 1000), 2);
});

test('no gifts is x1', () => {
  assert.equal(createGiftBook().multiplier('ann', 0), 1);
});

test('gifts stack and expire one by one', () => {
  const book = createGiftBook();
  book.add('ann', 1, 0);
  book.add('ann', 1, 10000);
  assert.equal(book.multiplier('ann', 29999), 3);
  assert.equal(book.multiplier('ann', 30000), 2);
  assert.equal(book.multiplier('ann', 39999), 2);
  assert.equal(book.multiplier('ann', 40000), 1);
});

test('gift count adds that many', () => {
  const book = createGiftBook();
  book.add('ann', 4, 0);
  assert.equal(book.multiplier('ann', 0), 5);
});

test('gifts belong to the sender only', () => {
  const book = createGiftBook();
  book.add('ann', 1, 0);
  assert.equal(book.multiplier('bob', 0), 1);
});
