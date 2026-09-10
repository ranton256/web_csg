import assert from 'node:assert/strict';
import { test } from 'node:test';
import { facingNormal, union, visibleHit } from '../../src/core/intervals.js';
import { intersectSphere } from '../../src/core/sphere.js';

const X = [1, 0, 0];
const span = (intervals) => intervals.map((interval) => [interval.in.t, interval.out.t]);
const interval = (tIn, tOut) => ({ in: { t: tIn }, out: { t: tOut } });

test('sphere interval endpoints are world distances with outward normals', () => {
  const [hit] = intersectSphere(5, [-100, 0, 0], X, 'sphere');
  assert.deepEqual([hit.in.t, hit.out.t], [95, 105]);
  assert.deepEqual(hit.in.normal, [-1, 0, 0]);
  assert.deepEqual(hit.out.normal, [1, 0, 0]);
  assert.equal(hit.in.primitive, 'sphere');
});

test('the sphere is centered at the origin: entry at x = -5, exit at x = 5', () => {
  const [hit] = intersectSphere(5, [-100, 0, 0], X, null);
  assert.equal(-100 + hit.in.t, -5);
  assert.equal(-100 + hit.out.t, 5);
});

test('a tangent ray misses; a passing ray misses', () => {
  assert.deepEqual(intersectSphere(5, [-100, 5, 0], X, null), []);
  assert.deepEqual(intersectSphere(5, [-100, 6, 0], X, null), []);
});

test('from inside a solid, the visible hit is the exit, with the normal facing the viewer', () => {
  const intervals = intersectSphere(50, [0, 0, 0], X, null);
  const hit = visibleHit(intervals);
  assert.equal(hit.t, 50);
  assert.deepEqual(hit.normal, [1, 0, 0]);
  // + 0 turns the -0 components of a negated vector into 0 for comparison.
  assert.deepEqual(facingNormal(hit.normal, [-1, 0, 0]).map((v) => v + 0), [-1, 0, 0]);
  assert.deepEqual(facingNormal([-1, 0, 0], [-1, 0, 0]), [-1, 0, 0]);
});

test('overlapping top-level spheres form one interval', () => {
  const merged = union(intersectSphere(5, [-100, 0, 0], X, 'a'), intersectSphere(10, [-100, 0, 0], X, 'b'));
  assert.deepEqual(span(merged), [[90, 110]]);
  assert.equal(merged[0].in.primitive, 'b');
  assert.equal(merged[0].out.primitive, 'b');
});

test('inside nested spheres, the visible hit is the outer exit at t = 10', () => {
  const merged = union(intersectSphere(5, [0, 0, 0], X, 'inner'), intersectSphere(10, [0, 0, 0], X, 'outer'));
  const hit = visibleHit(merged);
  assert.equal(hit.t, 10);
  assert.equal(hit.primitive, 'outer');
});

test('union merges gaps ≤ ε and keeps larger gaps', () => {
  assert.deepEqual(span(union([interval(0, 1)], [interval(1 + 5e-7, 2)])), [[0, 2]]);
  assert.deepEqual(span(union([interval(0, 1)], [interval(1.00001, 2)])), [[0, 1], [1.00001, 2]]);
  assert.deepEqual(span(union([interval(3, 4)], [interval(0, 1)])), [[0, 1], [3, 4]]);
});

test('union drops intervals of length ≤ ε and keeps the surviving endpoint objects', () => {
  assert.deepEqual(union([interval(0, 5e-7)], []), []);
  const first = interval(0, 2);
  const second = interval(1, 3);
  const [merged] = union([first], [second]);
  assert.equal(merged.in, first.in);
  assert.equal(merged.out, second.out);
});

test('no visible hit when nothing is in front of the ray', () => {
  assert.equal(visibleHit([]), null);
  assert.equal(visibleHit([interval(-5, -1)]), null);
  assert.equal(visibleHit([interval(-5, 5e-7)]), null);
});
