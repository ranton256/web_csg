import assert from 'node:assert/strict';
import { test } from 'node:test';
import { intersectBox } from '../../src/core/box.js';
import { intersectCylinder } from '../../src/core/cylinder.js';
import { intersectSphere } from '../../src/core/sphere.js';
import { normalize } from '../../src/core/vec3.js';

const X = [1, 0, 0];
const span = (intervals) => intervals.map((interval) => [interval.in.t, interval.out.t]);
const clean = (v) => v.map((c) => c + 0);

test('box centered at the origin, with endpoint normals', () => {
  const [hit] = intersectBox([4, 6, 8], [-100, 0, 0], X, 'box');
  assert.deepEqual([hit.in.t, hit.out.t], [98, 102]);
  assert.deepEqual(hit.in.normal, [-1, 0, 0]);
  assert.deepEqual(hit.out.normal, [1, 0, 0]);
  const [down] = intersectBox([4, 6, 8], [0, 0, 100], [0, 0, -1], 'box');
  assert.deepEqual([down.in.t, down.out.t, down.in.normal, down.out.normal], [96, 104, [0, 0, 1], [0, 0, -1]]);
});

test('box: parallel rays inside and outside a slab', () => {
  assert.deepEqual(intersectBox([4, 6, 8], [-100, 2.9, 0], X, null).length, 1);
  assert.deepEqual(intersectBox([4, 6, 8], [-100, 3.1, 0], X, null), []);
});

test('box: touching an edge from outside misses (length ≤ ε)', () => {
  assert.deepEqual(intersectBox([2, 2, 2], [0, 2, 0], normalize([1, -1, 0]), null), []);
});

test('box: a ray lying in a face plane is a hit (closed solids, D20)', () => {
  assert.deepEqual(span(intersectBox([4, 6, 8], [-100, 3, 0], X, null)), [[98, 102]]);
  assert.deepEqual(span(intersectBox([4, 6, 8], [-100, 0, -4], X, null)), [[98, 102]]);
});

test('box: a slab tie (a corner hit) takes its normals from the lowest axis', () => {
  // The x and y slabs are entered together and left together.
  const [hit] = intersectBox([2, 2, 2], [-10, -10, 0], normalize([1, 1, 0]), null);
  assert.deepEqual(hit.in.normal, [-1, 0, 0]);
  assert.deepEqual(hit.out.normal, [1, 0, 0]);
});

test('box: a non-unit local direction still yields world t', () => {
  assert.deepEqual(span(intersectBox([4, 4, 4], [-50, 0, 0], [0.5, 0, 0], null)), [[96, 104]]);
});

test('cylinder is capped and aligned to local Z', () => {
  const [hit] = intersectCylinder(5, 10, [0, 0, 100], [0, 0, -1], 'cylinder');
  assert.deepEqual([hit.in.t, hit.out.t], [95, 105]);
  assert.deepEqual(hit.in.normal, [0, 0, 1]);
  assert.deepEqual(hit.out.normal, [0, 0, -1]);
});

test('cylinder side', () => {
  const [hit] = intersectCylinder(5, 10, [-100, 0, 0], X, 'cylinder');
  assert.deepEqual([hit.in.t, hit.out.t], [95, 105]);
  assert.deepEqual(clean(hit.in.normal), [-1, 0, 0]);
  assert.deepEqual(clean(hit.out.normal), [1, 0, 0]);
});

test('cylinder: a ray above the cap misses, and a tangent to the side misses', () => {
  assert.deepEqual(intersectCylinder(5, 10, [-100, 0, 6], X, null), []);
  assert.deepEqual(intersectCylinder(5, 10, [-100, 5, 0], X, null), []);
  assert.deepEqual(intersectCylinder(5, 10, [0, 6, 100], [0, 0, -1], null), [], 'parallel to the axis, outside the radius');
});

test('cylinder: a slanted ray enters through the side and leaves through a cap', () => {
  const direction = normalize([1, 0, 1]);
  const [hit] = intersectCylinder(5, 10, [-10, 0, -5], direction, null);
  assert.deepEqual(clean(hit.in.normal), [-1, 0, 0]);
  assert.deepEqual(hit.out.normal, [0, 0, 1]);
  assert.ok(Math.abs((-10 + hit.in.t * direction[0]) + 5) < 1e-12, 'enters at x = -5');
  assert.ok(Math.abs((-5 + hit.out.t * direction[2]) - 5) < 1e-12, 'leaves at z = 5');
});

test('cylinder: a ray along the side line or in a cap plane is a hit (closed solids, D20)', () => {
  assert.deepEqual(span(intersectCylinder(5, 10, [5, 0, 100], [0, 0, -1], null)), [[95, 105]], 'along the side line');
  assert.deepEqual(span(intersectCylinder(5, 10, [-100, 0, 5], X, null)), [[95, 105]], 'in the top cap plane');
  assert.deepEqual(span(intersectCylinder(5, 10, [-100, 0, -5], X, null)), [[95, 105]], 'in the bottom cap plane');
});

test('cylinder: the side wins an exact tie with a cap (a rim hit)', () => {
  // Direction [1, 0, 1] (non-unit is fine in local space) meets x = -5 and z = -5 both at t = 5.
  const [hit] = intersectCylinder(5, 10, [-10, 0, -10], [1, 0, 1], null);
  assert.equal(hit.in.t, 5);
  assert.deepEqual(clean(hit.in.normal), [-1, 0, 0]);
  // Leaving from the center, x = 5 and z = 5 are both reached at t = 5 exactly.
  const [exit] = intersectCylinder(5, 10, [0, 0, 0], [1, 0, 1], null);
  assert.equal(exit.out.t, 5);
  assert.deepEqual(clean(exit.out.normal), [1, 0, 0]);
});

test('cylinder: a non-unit local direction still yields world t', () => {
  assert.deepEqual(span(intersectCylinder(5, 10, [-50, 0, 0], [0.5, 0, 0], null)), [[90, 110]]);
});

test('sphere: the general quadratic matches the unit-direction case and scales t', () => {
  assert.deepEqual(span(intersectSphere(5, [-100, 0, 0], X, null)), [[95, 105]]);
  assert.deepEqual(span(intersectSphere(5, [-50, 0, 0], [0.5, 0, 0], null)), [[90, 110]]);
});
