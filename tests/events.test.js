import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBus } from '../src/events.js';

test('emit calls every listener for that type with the payload and not listeners of other types', () => {
  const bus = createBus();
  const got = [];
  let likeCalls = 0;
  bus.on('guess', (p) => got.push(p));
  bus.on('guess', (p) => got.push(p));
  bus.on('like', () => likeCalls++);
  const payload = { user: 'a', text: 'pizza' };
  bus.emit('guess', payload);
  assert.equal(got.length, 2);
  assert.equal(got[0], payload);
  assert.equal(got[1], payload);
  assert.equal(likeCalls, 0);
});
