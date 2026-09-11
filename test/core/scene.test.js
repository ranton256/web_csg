// M3 scene-level behavior: placed primitives, transforms, and unions in bodies,
// checked through the renderer's own ray-interval function.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile, renderSource, sceneIntervals } from '../../src/core/render.js';
import { rotation, toWorld } from '../../src/core/transform.js';
import { length } from '../../src/core/vec3.js';

const CAMERA = 'camera { position: [0, -100, 30]; lookAt: [0, 0, 0]; }\n';
const VIEW = 'camera { position: [120, -160, 100]; lookAt: [0, 0, 0]; }\n';

function sceneOf(body) {
  const { diagnostics, scene } = compile(CAMERA + body);
  assert.deepEqual(diagnostics, []);
  return scene;
}
const ray = (origin, direction) => ({ origin, direction });
const spans = (scene, r) => sceneIntervals(scene, r).map((interval) => [interval.in.t, interval.out.t]);
const clean = (v) => v.map((c) => c + 0);

test('a translated sphere', () => {
  assert.deepEqual(spans(sceneOf('translate([10, 0, 0]) { sphere(1); }'), ray([-100, 0, 0], [1, 0, 0])), [[109, 111]]);
});

test('a scaled solid still reports world distances', () => {
  assert.deepEqual(spans(sceneOf('scale(2) { sphere(5); }'), ray([-100, 0, 0], [1, 0, 0])), [[90, 110]]);
  const [[tIn]] = spans(sceneOf('scale(2) { sphere(3); }'), ray([-100, 0, 0], [1, 0, 0]));
  assert.equal(-100 + tIn, -6);
});

test('normals of a rotated solid are in world space', () => {
  const [hit] = sceneIntervals(sceneOf('rotate([0, 0, 90]) { box([2, 4, 6]); }'), ray([0, -100, 0], [0, 1, 0]));
  assert.equal(hit.in.t, 99);
  assert.deepEqual(clean(hit.in.normal), [0, -1, 0]);
  assert.equal(length(hit.in.normal), 1);
  assert.equal(length(hit.out.normal), 1);
});

test('a rotated cylinder is capped along its new axis', () => {
  const [hit] = sceneIntervals(sceneOf('rotate([90, 0, 0]) { cylinder(5, 10); }'), ray([0, -100, 0], [0, 1, 0]));
  assert.deepEqual([hit.in.t, hit.out.t], [95, 105]);
  assert.deepEqual(clean(hit.in.normal), [0, -1, 0]);
});

test('nested transforms compose from the inside outward', () => {
  const scene = sceneOf('translate([10, 0, 0]) { rotate([0, 0, 90]) { box([4, 2, 2]); } }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], [1, 0, 0])), [[109, 111]], 'x in [9, 11]');
  assert.deepEqual(spans(scene, ray([10, -100, 0], [0, 1, 0])), [[98, 102]], 'y in [-2, 2]');
  assert.deepEqual(spans(scene, ray([10, 0, -100], [0, 0, 1])), [[99, 101]], 'z in [-1, 1]');
});

test('a rotation nested inside a rotation is applied first', () => {
  // The inner X90 turns the axis +Z to -Y; the outer Z90 then turns -Y to +X (the other order leaves it along Y).
  const scene = sceneOf('rotate([0, 0, 90]) { rotate([90, 0, 0]) { cylinder(1, 10); } }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], [1, 0, 0])), [[95, 105]]);
});

test('a translate nested inside a rotate or scale is applied first', () => {
  // Inner translate first, then the outer rotate: the sphere ends up at [0, 10, 0].
  assert.deepEqual(spans(sceneOf('rotate([0, 0, 90]) { translate([10, 0, 0]) { sphere(1); } }'), ray([0, -100, 0], [0, 1, 0])), [[109, 111]]);
  // Inner translate first, then the outer scale: the sphere's center moves to x = 20, radius 2.
  assert.deepEqual(spans(sceneOf('scale(2) { translate([10, 0, 0]) { sphere(1); } }'), ray([-100, 0, 0], [1, 0, 0])), [[118, 122]]);
});

test('D20 holds for placed solids: in-face rays of translated solids are hits', () => {
  // Each face sits at exactly 0.4 in world space, but in local space it comes out as 0.10000000000000003.
  const X = [1, 0, 0];
  assert.deepEqual(spans(sceneOf('translate([0, 0.3, 0]) { box([2, 0.2, 2]); }'), ray([-100, 0.4, 0], X)), [[99, 101]], 'box face');
  assert.deepEqual(spans(sceneOf('translate([0, 0, 0.3]) { cylinder(5, 0.2); }'), ray([-100, 0, 0.4], X)), [[95, 105]], 'cylinder top cap');
  // The bottom cap sits at world z = -0.4; locally it comes out as -0.10000000000000003.
  assert.deepEqual(spans(sceneOf('translate([0, 0, -0.3]) { cylinder(5, 0.2); }'), ray([-100, 0, -0.4], X)), [[95, 105]], 'cylinder bottom cap');
  assert.deepEqual(spans(sceneOf('translate([0.3, 0, 0]) { cylinder(0.1, 10); }'), ray([0.4, 0, 100], [0, 0, -1])), [[95, 105]], 'cylinder side line');
});

test('the D20 tolerance is ε in world units: rays just beyond it miss, at any scale', () => {
  const X = [1, 0, 0];
  const count = (source, origin) => sceneIntervals(sceneOf(source), ray(origin, X)).length;
  assert.equal(count('translate([0, 0.3, 0]) { box([2, 0.2, 2]); }', [-100, 0.4 + 1e-5, 0]), 0, 'box face');
  assert.equal(count('translate([0, 0, 0.3]) { cylinder(5, 0.2); }', [-100, 0, 0.4 + 1e-5]), 0, 'cylinder cap');
  assert.equal(sceneIntervals(sceneOf('translate([0.3, 0, 0]) { cylinder(0.1, 10); }'), ray([0.4 + 1e-5, 0, 100], [0, 0, -1])).length, 0, 'cylinder side line');
  // Scaled solids: within ε (world) of the face is a hit, 2ε beyond it a miss.
  assert.equal(count('scale(1000) { box([2, 2, 2]); }', [-5000, 1000 + 5e-7, 0]), 1);
  assert.equal(count('scale(1000) { box([2, 2, 2]); }', [-5000, 1000 + 2e-6, 0]), 0);
  assert.equal(count('scale(0.001) { box([2, 2, 2]); }', [-5, 0.001 + 5e-7, 0]), 1);
  assert.equal(count('scale(0.001) { box([2, 2, 2]); }', [-5, 0.001 + 2e-6, 0]), 0);
  assert.equal(count('scale(0.001) { cylinder(1, 2); }', [-5, 0, 0.001 + 5e-7]), 1);
  assert.equal(count('scale(0.001) { cylinder(1, 2); }', [-5, 0, 0.001 + 2e-6]), 0);
});

test('D20 holds under right-angle rotations: an in-face ray of a translated, rotated box is a hit', () => {
  // Turned 90° about Z, the box's local y = -0.1 face lies at world x = 0.4; locally it comes out as -0.10000000000000003.
  const scene = sceneOf('translate([0.3, 0, 0]) { rotate([0, 0, 90]) { box([2, 0.2, 2]); } }');
  assert.deepEqual(spans(scene, ray([0.4, -100, 0], [0, 1, 0])), [[99, 101]]);
});

test('under other rotations, rays clearly inside or outside a face behave normally (D20 narrowed)', () => {
  const count = (scene, origin, direction) => sceneIntervals(scene, ray(origin, direction)).length;
  // Parallel to the local x = 1 face of a box turned 45° about Z, 1e-5 inside or outside it.
  const B = rotation([0, 0, 45]);
  const box = sceneOf('rotate([0, 0, 45]) { box([2, 2, 2]); }');
  const along = toWorld(B, [0, 1, 0]);
  assert.equal(count(box, toWorld(B, [1 - 1e-5, -100, 0]), along), 1, 'box, inside');
  assert.equal(count(box, toWorld(B, [1 + 1e-5, -100, 0]), along), 0, 'box, outside');
  // The side line and the top cap of a cylinder turned 10° about X.
  const C = rotation([10, 0, 0]);
  const cylinder = sceneOf('rotate([10, 0, 0]) { cylinder(5, 10); }');
  const down = toWorld(C, [0, 0, -1]);
  assert.equal(count(cylinder, toWorld(C, [5 - 1e-5, 0, 100]), down), 1, 'side, inside');
  assert.equal(count(cylinder, toWorld(C, [5 + 1e-5, 0, 100]), down), 0, 'side, outside');
  const across = toWorld(C, [1, 0, 0]);
  assert.equal(count(cylinder, toWorld(C, [-100, 0, 5 - 1e-5]), across), 1, 'cap, inside');
  assert.equal(count(cylinder, toWorld(C, [-100, 0, 5 + 1e-5]), across), 0, 'cap, outside');
});

test('several children of a transform block are unioned', () => {
  assert.deepEqual(spans(sceneOf('translate([0, 0, 0]) { sphere(5); cube(8); }'), ray([-100, 0, 0], [1, 0, 0])), [[95, 105]]);
});

test('the transform applies to the whole union in its body', () => {
  const scene = sceneOf('translate([20, 0, 0]) { sphere(5); translate([5, 0, 0]) { sphere(5); } }');
  assert.deepEqual(spans(scene, ray([-100, 0, 0], [1, 0, 0])), [[115, 130]]);
});

test('a cube renders exactly as the box with equal sides', () => {
  assert.deepEqual(renderSource(VIEW + 'cube(10);', 64, 48).rgba, renderSource(VIEW + 'box([10, 10, 10]);', 64, 48).rgba);
});

test('top-level primitives are placed at the world origin (identity placement)', () => {
  const scene = sceneOf('sphere(1);\ncube(2);\nbox([1, 2, 3]);\ncylinder(1, 2);');
  assert.deepEqual(scene.solids.map((solid) => [solid.type, solid.placement.s, solid.placement.t]), [
    ['sphere', 1, [0, 0, 0]],
    ['cube', 1, [0, 0, 0]],
    ['box', 1, [0, 0, 0]],
    ['cylinder', 1, [0, 0, 0]],
  ]);
});
