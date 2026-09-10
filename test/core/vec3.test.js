import assert from 'node:assert/strict';
import { test } from 'node:test';
import { add, cross, dot, length, negate, normalize, scale, sub } from '../../src/core/vec3.js';

test('add, sub, scale, negate, dot', () => {
  assert.deepEqual(add([1, 2, 3], [4, 5, 6]), [5, 7, 9]);
  assert.deepEqual(sub([1, 2, 3], [4, 5, 6]), [-3, -3, -3]);
  assert.deepEqual(scale([1, 2, 3], 2), [2, 4, 6]);
  assert.deepEqual(negate([1, -2, 3]), [-1, 2, -3]);
  assert.equal(dot([1, 2, 3], [4, 5, 6]), 32);
});

test('cross is right-handed', () => {
  assert.deepEqual(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  assert.deepEqual(cross([0, 1, 0], [0, 0, 1]), [1, 0, 0]);
  assert.deepEqual(cross([0, 0, 1], [1, 0, 0]), [0, 1, 0]);
});

test('length and normalize', () => {
  assert.equal(length([3, 4, 12]), 13);
  const unit = normalize([3, 4, 12]);
  assert.ok(Math.abs(length(unit) - 1) < 1e-15);
  assert.deepEqual(unit, [3 / 13, 4 / 13, 12 / 13]);
});

test('functions do not modify their arguments', () => {
  const a = Object.freeze([1, 2, 3]);
  const b = Object.freeze([4, 5, 6]);
  add(a, b); sub(a, b); scale(a, 2); negate(a); cross(a, b); normalize(a);
  assert.deepEqual(a, [1, 2, 3]);
});
