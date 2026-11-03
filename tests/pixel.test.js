import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pixelWidthFor, wipeState } from '../src/pixelwidth.js';

test('pixelWidthFor returns the configured width and clamps out-of-range stages', () => {
  assert.equal(pixelWidthFor(0), 8);
  assert.equal(pixelWidthFor(8), 192);
  assert.equal(pixelWidthFor(99), 192);
  assert.equal(pixelWidthFor(-1), 8);
});

test('wipeState sweeps a wipe line through each 5 second stage', () => {
  assert.deepEqual(wipeState(0, 5000, 9), { stage: 0, next: 1, progress: 0 });
  assert.deepEqual(wipeState(2500, 5000, 9), { stage: 0, next: 1, progress: 0.5 });
  assert.deepEqual(wipeState(5000, 5000, 9), { stage: 1, next: 2, progress: 0 });
});

test('wipeState has no wipe in the last stage and never goes negative', () => {
  assert.deepEqual(wipeState(40000, 5000, 9), { stage: 8, next: 8, progress: 0 });
  assert.deepEqual(wipeState(99999, 5000, 9), { stage: 8, next: 8, progress: 0 });
  assert.deepEqual(wipeState(-50, 5000, 9), { stage: 0, next: 1, progress: 0 });
});
