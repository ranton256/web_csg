import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile, renderRows, renderSource } from '../../src/core/render.js';
import { SPHERE_SOURCE } from '../support/sphere-source.js';

const BACKGROUND = [31, 31, 36];
const isBackground = (rgba, i) => rgba[i] === BACKGROUND[0] && rgba[i + 1] === BACKGROUND[1] && rgba[i + 2] === BACKGROUND[2];

// Numbers of rows and of columns that contain any non-background pixel.
function coverage(rgba, width, height) {
  const rows = new Set();
  const columns = new Set();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isBackground(rgba, (y * width + x) * 4)) {
        rows.add(y);
        columns.add(x);
      }
    }
  }
  return { rows: rows.size, columns: columns.size };
}

test('the sphere example renders to a width × height RGBA buffer', () => {
  const { diagnostics, rgba } = renderSource(SPHERE_SOURCE, 64, 48);
  assert.deepEqual(diagnostics, []);
  assert.ok(rgba instanceof Uint8ClampedArray);
  assert.equal(rgba.length, 64 * 48 * 4);
  for (let i = 3; i < rgba.length; i += 4) assert.equal(rgba[i], 255);
  assert.ok(!isBackground(rgba, (24 * 64 + 32) * 4), 'center shows the sphere');
  assert.ok(isBackground(rgba, 0), 'top-left corner is background');
});

test('invalid source returns its diagnostics and no buffer', () => {
  assert.deepEqual(renderSource('let a = 1;\nlet $ = 2;', 64, 48), {
    diagnostics: [{ line: 2, column: 5, message: "unexpected character '$'" }],
    rgba: null,
  });
});

test('a camera-only source renders only the background', () => {
  const { rgba } = renderSource('camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; }', 16, 12);
  for (let i = 0; i < rgba.length; i += 4) assert.deepEqual([...rgba.subarray(i, i + 4)], [31, 31, 36, 255]);
});

test('rendering is deterministic', () => {
  assert.deepEqual(renderSource(SPHERE_SOURCE, 64, 48).rgba, renderSource(SPHERE_SOURCE, 64, 48).rgba);
});

test('rendering in bands equals one full render', () => {
  const { scene } = compile(SPHERE_SOURCE);
  const banded = new Uint8ClampedArray(64 * 48 * 4);
  renderRows(scene, 64, 48, 0, 17, banded);
  renderRows(scene, 64, 48, 17, 31, banded);
  renderRows(scene, 64, 48, 31, 48, banded);
  assert.deepEqual(banded, renderSource(SPHERE_SOURCE, 64, 48).rgba);
});

test('width does not change the vertical field of view', () => {
  const narrow = coverage(renderSource(SPHERE_SOURCE, 64, 48).rgba, 64, 48);
  const wide = coverage(renderSource(SPHERE_SOURCE, 96, 48).rgba, 96, 48);
  assert.ok(narrow.rows > 0);
  assert.deepEqual(wide, narrow);
});

test('from inside sphere(50) every pixel shows the sphere', () => {
  const { rgba } = renderSource('camera { position: [0, 0, 0]; lookAt: [1, 0, 0]; }\nsphere(50);', 32, 24);
  for (let i = 0; i < rgba.length; i += 4) assert.ok(!isBackground(rgba, i), `pixel ${i / 4} is background`);
});

test('from outside, overlapping spheres render as their union regardless of order', () => {
  // sphere(5) is listed first but lies behind sphere(10)'s surface on every ray.
  assert.deepEqual(
    renderSource(SPHERE_SOURCE.replace('sphere(radius: r);', 'sphere(5);\nsphere(radius: r);'), 64, 48).rgba,
    renderSource(SPHERE_SOURCE, 64, 48).rgba,
  );
});

test('inside nested spheres, the image equals the outer sphere alone', () => {
  const camera = 'camera { position: [0, 0, 0]; lookAt: [1, 0, 0]; }\n';
  assert.deepEqual(
    renderSource(camera + 'sphere(5);\nsphere(10);', 32, 24).rgba,
    renderSource(camera + 'sphere(10);', 32, 24).rgba,
  );
});

test('bad sizes and row ranges are programming errors', () => {
  const { scene } = compile(SPHERE_SOURCE);
  assert.throws(() => renderSource(SPHERE_SOURCE, 0, 48), RangeError);
  assert.throws(() => renderSource(SPHERE_SOURCE, 64.5, 48), RangeError);
  assert.throws(() => renderRows(scene, 4, 4, 2, 5, new Uint8ClampedArray(64)), RangeError);
  assert.throws(() => renderRows(scene, 4, 4, 0, 4, new Uint8ClampedArray(60)), RangeError);
});
