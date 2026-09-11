// M4 Boolean operations and the tolerance rules that follow every operation,
// checked through the renderer's own ray-interval function (DESIGN §8 Boolean
// operations; Ray–solid intervals and tolerance).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { facingNormal, visibleHit } from '../../src/core/intervals.js';
import { compile, renderSource, sceneIntervals } from '../../src/core/render.js';

const CAMERA = 'camera { position: [0, -100, 30]; lookAt: [0, 0, 0]; }\n';
const BACKGROUND = [31, 31, 36, 255];
const X = [1, 0, 0];
const DOWN = [0, 0, -1];

function sceneOf(body) {
  const { diagnostics, scene } = compile(CAMERA + body);
  assert.deepEqual(diagnostics, []);
  return scene;
}
const ray = (origin, direction) => ({ origin, direction });
const spans = (scene, r) => sceneIntervals(scene, r).map((interval) => [interval.in.t, interval.out.t]);
// + 0 turns any -0 component into 0 before strict comparison.
const clean = (v) => v.map((c) => c + 0);

// Boolean operations

test('a union block renders its children as one solid', () => {
  const scene = sceneOf('union { sphere(5); translate([8, 0, 0]) { sphere(5); } }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], X)), [[95, 113]]);
});

test('a transform places a Boolean block as a whole', () => {
  const scene = sceneOf('translate([20, 0, 0]) { intersection { sphere(5); cube(8); } }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], X)), [[116, 124]]);
});

test('an intersection keeps what all children share', () => {
  assert.deepEqual(spans(sceneOf('intersection { sphere(5); cube(8); }'), ray([-100, 0, 0], X)), [[96, 104]]);
});

test('disjoint children have an empty intersection', () => {
  const scene = sceneOf('intersection { sphere(1); translate([10, 0, 0]) { sphere(1); } }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], X)), []);
});

test('multi-child difference is the first child minus the union of the rest', () => {
  const scene = sceneOf('difference { cube(20); translate([-5, 0, 0]) { cube(4); } translate([5, 0, 0]) { cube(4); } }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], X)), [[90, 93], [97, 103], [107, 110]]);
});

test('self-difference is empty, and its pixels show the background', () => {
  for (const body of ['difference { sphere(5); sphere(5); }', 'difference { cube(10); cube(10); }']) {
    const scene = sceneOf(body);
    assert.deepEqual(spans(scene, ray([-100, 0, 0], X)), [], body);
    assert.deepEqual(spans(scene, ray([0, 0, 100], DOWN)), [], body);
    const { rgba } = renderSource(CAMERA + body, 8, 6);
    for (let i = 0; i < rgba.length; i += 4) assert.deepEqual([...rgba.slice(i, i + 4)], BACKGROUND, body);
  }
});

test('a single-child difference is the child', () => {
  assert.deepEqual(spans(sceneOf('difference { sphere(5); }'), ray([-100, 0, 0], X)), [[95, 105]]);
});

test('difference boundaries shade with reversed cutter normals', () => {
  // The bore runs along X; a ray down the Z axis crosses it.
  const scene = sceneOf('difference { cube(20); rotate([0, 90, 0]) { cylinder(3, 22); } }');
  const intervals = sceneIntervals(scene, ray([0, 0, 100], DOWN));
  assert.deepEqual(intervals.map((i) => [i.in.t, i.out.t]), [[90, 97], [103, 110]]);
  const [upper, lower] = intervals;
  // The cylinder's outward normals ([0, 0, 1] at z = 3, [0, 0, -1] at z = -3), reversed into the bore.
  assert.deepEqual(clean(upper.out.normal), [0, 0, -1]);
  assert.deepEqual(clean(lower.in.normal), [0, 0, 1]);
  assert.equal(upper.out.primitive.type, 'cylinder');
  assert.equal(lower.in.primitive.type, 'cylinder');
  // The cube's own faces keep their outward normals.
  assert.deepEqual(clean(upper.in.normal), [0, 0, 1]);
  assert.deepEqual(clean(lower.out.normal), [0, 0, -1]);
});

// Tolerance rules after every operation

test('flush union faces leave no seam', () => {
  const scene = sceneOf('union { box([10, 10, 10]); translate([10, 0, 0]) { box([10, 10, 10]); } }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], X)), [[95, 115]]);
});

test('a flush difference opens the face', () => {
  const scene = sceneOf('difference { cube(10); cylinder(radius: 2, height: 10); }');
  assert.deepEqual(spans(scene, ray([0, 0, 100], DOWN)), []);
});

test('a near-flush difference leaves no sliver of length ≤ ε, but keeps a longer one', () => {
  // The cutter sits 5e-7 higher than the cube, leaving 5e-7 of the cube at its bottom face.
  assert.deepEqual(spans(sceneOf('difference { cube(10); translate([0, 0, 0.0000005]) { cube(10); } }'), ray([0, 0, 100], DOWN)), []);
  // 5e-6 higher leaves a sliver longer than ε, which stays.
  const [[tIn, tOut]] = spans(sceneOf('difference { cube(10); translate([0, 0, 0.000005]) { cube(10); } }'), ray([0, 0, 100], DOWN));
  assert.equal(tOut, 105);
  assert.ok(Math.abs(tIn - 104.999995) < 1e-9, `sliver starts at ${tIn}`);
});

test('a bore wall seen from inside the bore: the reversed normal already faces the camera', () => {
  const source = 'camera { position: [0, 0, 0]; lookAt: [1, 0, 0]; }\ndifference { cube(20); cylinder(3, 22); }';
  const { scene } = compile(source);
  const hit = visibleHit(sceneIntervals(scene, ray([0, 0, 0], X)));
  assert.equal(hit.t, 3);
  assert.equal(hit.primitive.type, 'cylinder');
  // The cylinder's outward normal at x = 3 is [1, 0, 0]; reversed, it faces the camera and is not flipped again.
  assert.deepEqual(clean(hit.normal), [-1, 0, 0]);
  assert.deepEqual(clean(facingNormal(hit.normal, [-1, 0, 0])), [-1, 0, 0]);
  // A 1 × 1 render looks exactly along [1, 0, 0] and shows the wall, not the background.
  const { rgba } = renderSource(source, 1, 1);
  assert.notDeepEqual([...rgba], BACKGROUND);
});

test('a multi-child transform body inside a Boolean is one child (the union of its body)', () => {
  // The first child is cube(10) ∪ sphere(8) = [-8, 8]; minus cube(4) = [-2, 2].
  const scene = sceneOf('difference { translate([0, 0, 0]) { cube(10); sphere(8); } cube(4); }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], X)), [[92, 98], [102, 108]]);
});

test('an intersection of three children keeps what all of them share', () => {
  // cube(10) is [-5, 5], sphere(8) is [-8, 8], and the translated cube is [-2, 8]: all three share [-2, 5].
  const scene = sceneOf('intersection { cube(10); sphere(8); translate([3, 0, 0]) { cube(10); } }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], X)), [[98, 105]]);
});

test('a cutter that stops just short of the base leaves its face (DESIGN D21)', () => {
  // The cutter starts 5e-7 above the cube's top face: a gap ≤ ε, but no overlap.
  const [hit, ...rest] = sceneIntervals(sceneOf('difference { cube(10); translate([0, 0, 10.0000005]) { cube(10); } }'), ray([0, 0, 100], DOWN));
  assert.deepEqual(rest, []);
  assert.deepEqual([hit.in.t, hit.out.t], [95, 105]);
  assert.deepEqual(clean(hit.in.normal), [0, 0, 1]);
  assert.equal(hit.in.primitive.size, 10);
  assert.equal(hit.in.primitive.placement.t[2], 0, 'the entry is the base cube\'s own top face');
});

test('a cutter that only touches the base leaves its face (DESIGN D21)', () => {
  // The cutter's bottom face coincides with the cube's top face: a gap of 0, no overlap.
  const [hit, ...rest] = sceneIntervals(sceneOf('difference { cube(10); translate([0, 0, 10]) { cube(10); } }'), ray([0, 0, 100], DOWN));
  assert.deepEqual(rest, []);
  assert.deepEqual([hit.in.t, hit.out.t], [95, 105]);
  assert.deepEqual(clean(hit.in.normal), [0, 0, 1]);
  assert.equal(hit.in.primitive.placement.t[2], 0, 'the entry is the base cube\'s own top face');
});
