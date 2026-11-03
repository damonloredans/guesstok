import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { credits } from '../src/credits.js';

const items = JSON.parse(readFileSync(new URL('../src/items.json', import.meta.url), 'utf8'));
const root = new URL('../models/', import.meta.url);

test('every item file exists on disk', () => {
  for (const it of items) assert.ok(existsSync(new URL(it.file, root)), `missing ${it.file}`);
});

test('every item has a non-empty name, a valid difficulty and a pack listed in credits', () => {
  const packs = credits.map((c) => c.pack);
  for (const it of items) {
    assert.ok(it.name.trim(), `empty name ${it.id}`);
    assert.ok(['easy', 'medium', 'hard'].includes(it.difficulty), `difficulty ${it.id}`);
    assert.ok(packs.includes(it.pack), `pack ${it.id}`);
  }
});

test('item ids are unique', () => {
  const ids = items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('there are at least 10 items of each difficulty', () => {
  for (const d of ['easy', 'medium', 'hard']) {
    assert.ok(items.filter((i) => i.difficulty === d).length >= 10, d);
  }
});

test('no item file comes from the excluded list', () => {
  for (const it of items) {
    assert.ok(!/gundam/i.test(it.file), `gundam ${it.file}`);
    assert.ok(!/-[A-Za-z0-9]{10}\.glb$/.test(it.file), `random-suffix duplicate ${it.file}`);
  }
});
