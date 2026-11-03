import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCorrect } from '../src/match.js';

const pizza = { name: 'Pizza' };

test('ignores case and surrounding spaces', () => {
  assert.equal(isCorrect('  PiZZa ', pizza), true);
});

test('accepts regular plurals', () => {
  assert.equal(isCorrect('pizzas', pizza), true);
  assert.equal(isCorrect('tomatoes', { name: 'Tomato' }), true);
  assert.equal(isCorrect('cherries', { name: 'Cherry' }), true);
});

test('rejects typos', () => {
  assert.equal(isCorrect('pizzza', pizza), false);
  assert.equal(isCorrect('pizz', pizza), false);
  assert.equal(isCorrect('piza', pizza), false);
});

test('accepts extra answers', () => {
  assert.equal(isCorrect('hotdogs', { name: 'Hot Dog', answers: ['hotdog'] }), true);
});

test('ignores punctuation around the guess (writer\'s call)', () => {
  assert.equal(isCorrect('pizza!', pizza), true);
  assert.equal(isCorrect('"pizza"', pizza), true);
});

test('empty or whitespace guess is false', () => {
  assert.equal(isCorrect('', pizza), false);
  assert.equal(isCorrect('   ', pizza), false);
  assert.equal(isCorrect('!!!', pizza), false);
});
