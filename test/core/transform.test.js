import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compose, cosDeg, normalToWorld, rotation, scaling, sinDeg, toLocal, toWorld, translation,
} from '../../src/core/transform.js';
import { length } from '../../src/core/vec3.js';

// + 0 turns any -0 component into 0 before strict comparison.
const clean = (v) => v.map((c) => c + 0);
const close = (actual, expected, tolerance = 1e-12) =>
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= tolerance, `${actual} ≉ ${expected}`));

test('sine and cosine are exact for multiples of 90°', () => {
  assert.deepEqual([0, 90, 180, 270, 360, -90, 450].map(sinDeg), [0, 1, 0, -1, 0, -1, 1]);
  assert.deepEqual([0, 90, 180, 270, 360, -90, 450].map(cosDeg), [1, 0, -1, 0, 1, 0, 0]);
  assert.ok(Math.abs(sinDeg(30) - 0.5) < 1e-15);
  assert.ok(Math.abs(cosDeg(60) - 0.5) < 1e-15);
});

test('rotation about X turns +Z toward -Y', () => {
  assert.deepEqual(clean(toWorld(rotation([90, 0, 0]), [0, 0, 1])), [0, -1, 0]);
});

test('rotation about Y turns +Z toward +X', () => {
  assert.deepEqual(clean(toWorld(rotation([0, 90, 0]), [0, 0, 1])), [1, 0, 0]);
});

test('rotation components apply X first, then Y, then Z', () => {
  assert.deepEqual(clean(toWorld(rotation([90, 90, 0]), [0, 1, 0])), [1, 0, 0]);
  // Z-then-X order would give a different answer here.
  assert.deepEqual(clean(toWorld(rotation([90, 0, 90]), [1, 0, 0])), [0, 1, 0]);
  // Y before Z: +Z turns to +X about Y, then to +Y about Z (Z-then-Y would give +X).
  assert.deepEqual(clean(toWorld(rotation([0, 90, 90]), [0, 0, 1])), [0, 1, 0]);
});

test('right-angle rotations are exact', () => {
  assert.deepEqual(clean(toWorld(rotation([0, 0, 90]), [1, 0, 0])), [0, 1, 0]);
  assert.deepEqual(clean(toWorld(rotation([0, 0, 180]), [0, 1, 0])), [0, -1, 0]);
  assert.deepEqual(clean(toWorld(rotation([0, 0, -90]), [1, 0, 0])), [0, -1, 0]);
});

test('composition applies the child first, then the parent', () => {
  assert.deepEqual(clean(toWorld(compose(translation([10, 0, 0]), rotation([0, 0, 90])), [2, 0, 0])), [10, 2, 0]);
  assert.deepEqual(clean(toWorld(compose(rotation([0, 0, 90]), translation([10, 0, 0])), [2, 0, 0])), [0, 12, 0]);
  assert.deepEqual(toWorld(compose(scaling(2), translation([1, 0, 0])), [1, 0, 0]), [4, 0, 0]);
});

test('toLocal inverts the placement and keeps the direction unnormalized', () => {
  const placement = compose(translation([3, -2, 5]), compose(rotation([30, 45, 60]), scaling(2)));
  const point = [1, 2, 3];
  const local = toLocal(placement, point, [1, 0, 0]);
  close(toWorld(placement, local.origin), point);
  assert.ok(Math.abs(length(local.direction) - 0.5) < 1e-12, 'a unit world direction is half as long in a ×2 local space');
  assert.deepEqual(toLocal(scaling(2), [-100, 0, 0], [1, 0, 0]), { origin: [-50, 0, 0], direction: [0.5, 0, 0] });
});

test('normals come back through the rotation only, at unit length', () => {
  const placement = compose(rotation([30, 45, 60]), scaling(3));
  assert.ok(Math.abs(length(normalToWorld(placement, [0, 0, 1])) - 1) < 1e-12);
  assert.deepEqual(clean(normalToWorld(rotation([0, 0, 90]), [-1, 0, 0])), [0, -1, 0]);
});
