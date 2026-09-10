// M3 scene-level behavior: placed primitives, transforms, and unions in bodies,
// checked through the renderer's own ray-interval function.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile, renderSource, sceneIntervals } from '../../src/core/render.js';
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
