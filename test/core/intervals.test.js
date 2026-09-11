import assert from 'node:assert/strict';
import { test } from 'node:test';
import { facingNormal, intersect, subtract, union, visibleHit } from '../../src/core/intervals.js';
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

// Intervals with normals and primitives, for the Boolean operations: the entry
// normal faces -X and the exit normal +X, as for a ray along +X.
const solid = (primitive, ...spans) => spans.map(([tIn, tOut]) => ({
  in: { t: tIn, normal: [-1, 0, 0], primitive },
  out: { t: tOut, normal: [1, 0, 0], primitive },
}));
const ends = (intervals) => intervals.map((i) => [i.in.t, i.in.primitive, i.out.t, i.out.primitive]);
const clean = (v) => v.map((c) => c + 0);

test('interval combination along a ray (DESIGN §8 Boolean operations)', () => {
  const box = solid('box', [2, 8]);
  const cylinder = solid('cylinder', [4, 6]);
  assert.deepEqual(span(union(box, cylinder)), [[2, 8]]);
  assert.deepEqual(ends(intersect(box, cylinder)), [[4, 'cylinder', 6, 'cylinder']]);
  const cut = subtract(box, cylinder);
  assert.deepEqual(ends(cut), [[2, 'box', 4, 'cylinder'], [6, 'cylinder', 8, 'box']]);
  // The cylinder's boundaries are exposed with reversed normals, pointing into the cut.
  assert.deepEqual(clean(cut[0].out.normal), [1, 0, 0]);
  assert.deepEqual(clean(cut[1].in.normal), [-1, 0, 0]);
  assert.deepEqual(cut[0].in.normal, [-1, 0, 0]);
  assert.deepEqual(cut[1].out.normal, [1, 0, 0]);
});

test('subtract reverses cutter normals in new endpoints and leaves both operands unchanged', () => {
  const base = solid('base', [2, 8]);
  const cutter = solid('cutter', [4, 6]);
  const before = JSON.stringify([base, cutter]);
  const [first, second] = subtract(base, cutter);
  assert.notEqual(first.out, cutter[0].in);
  assert.notEqual(second.in, cutter[0].out);
  assert.equal(first.in, base[0].in);
  assert.equal(second.out, base[0].out);
  assert.equal(JSON.stringify([base, cutter]), before);
});

test('intersect keeps the first operand\'s endpoint on an exact tie', () => {
  assert.deepEqual(ends(intersect(solid('a', [2, 8]), solid('b', [2, 8]))), [[2, 'a', 8, 'a']]);
  assert.deepEqual(ends(intersect(solid('a', [2, 8]), solid('b', [2, 6]))), [[2, 'a', 6, 'b']]);
  assert.deepEqual(ends(intersect(solid('a', [3, 8]), solid('b', [2, 8]))), [[3, 'a', 8, 'a']]);
});

test('subtract lets the cutter win an exact tie, so a flush cut removes the base boundary', () => {
  assert.deepEqual(ends(subtract(solid('a', [2, 8]), solid('b', [2, 5]))), [[5, 'b', 8, 'a']]);
  assert.deepEqual(ends(subtract(solid('a', [2, 8]), solid('b', [5, 8]))), [[2, 'a', 5, 'b']]);
  assert.deepEqual(subtract(solid('a', [2, 8]), solid('b', [2, 8])), []);
});

test('a cutter that only touches the base changes nothing', () => {
  assert.deepEqual(ends(subtract(solid('a', [0, 10]), solid('b', [10, 12]))), [[0, 'a', 10, 'a']]);
  assert.deepEqual(ends(subtract(solid('a', [0, 10]), solid('b', [-2, 0]))), [[0, 'a', 10, 'a']]);
});

test('subtract and intersect drop slivers of length ≤ ε and keep longer pieces', () => {
  assert.deepEqual(subtract(solid('a', [2, 8]), solid('b', [2 + 5e-7, 8])), []);
  assert.deepEqual(span(subtract(solid('a', [2, 8]), solid('b', [2 + 5e-6, 8]))), [[2, 2 + 5e-6]]);
  assert.deepEqual(intersect(solid('a', [0, 1]), solid('b', [1 - 5e-7, 2])), []);
  assert.deepEqual(span(intersect(solid('a', [0, 1]), solid('b', [1 - 5e-6, 2]))), [[1 - 5e-6, 1]]);
});

test('disjoint lists have an empty intersection', () => {
  assert.deepEqual(intersect(solid('a', [0, 1]), solid('b', [2, 3])), []);
  assert.deepEqual(intersect([], solid('b', [2, 3])), []);
});

test('several base intervals and cutters, including one cutter spanning two base intervals', () => {
  const base = solid('a', [0, 10], [20, 30]);
  const cutters = solid('b', [2, 3], [8, 22], [25, 26]);
  assert.deepEqual(span(subtract(base, cutters)), [[0, 2], [3, 8], [22, 25], [26, 30]]);
  assert.deepEqual(span(intersect(base, cutters)), [[2, 3], [8, 10], [20, 22], [25, 26]]);
});
