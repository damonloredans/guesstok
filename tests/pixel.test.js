import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pixelWidthFor } from '../src/pixelwidth.js';

test('pixelWidthFor returns the configured width and clamps out-of-range stages', () => {
  assert.equal(pixelWidthFor(0), 12);
  assert.equal(pixelWidthFor(4), 192);
  assert.equal(pixelWidthFor(99), 192);
  assert.equal(pixelWidthFor(-1), 12);
});
