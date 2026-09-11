import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cameraBasis, primaryRay } from '../../src/core/camera.js';
import { length } from '../../src/core/vec3.js';
import { compile } from '../../src/core/render.js';

const CAMERA = 'camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; }\n';
const messages = (source) => compile(source).diagnostics.map((d) => d.message);
const cameraOf = (body) => compile(`camera { ${body} }\n`);

const assertClose = (actual, expected, tolerance = 1e-12) => {
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= tolerance, `${actual} ≉ ${expected}`));
};

test('camera defaults: up [0, 0, 1] and fov 45', () => {
  const { diagnostics, scene } = cameraOf('position: [0, -100, 0]; lookAt: [0, 0, 0];');
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(scene.camera.up, [0, 0, 1]);
  assert.equal(scene.camera.fov, 45);
});

test('exactly one camera block is required', () => {
  assert.deepEqual(compile('sphere(1);').diagnostics, [{ line: 1, column: 1, message: 'exactly one camera block is required' }]);
  assert.deepEqual(compile(CAMERA + CAMERA).diagnostics, [{ line: 2, column: 1, message: 'exactly one camera block is required' }]);
});

test('position and lookAt are required', () => {
  assert.deepEqual(messages('camera { lookAt: [0, 0, 0]; }'), ['camera block is missing `position`']);
  assert.deepEqual(messages('camera { position: [0, 0, 1]; }'), ['camera block is missing `lookAt`']);
});

test('unknown, duplicate, and mistyped properties', () => {
  assert.deepEqual(messages('camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; zoom: 2; }'), ['unknown camera property `zoom`']);
  assert.deepEqual(messages('camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; fov: 30; fov: 40; }'), ['camera property `fov` is given more than once']);
  assert.deepEqual(messages('camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; fov: [1, 2, 3]; }'), ['camera property `fov` must be a number']);
  assert.deepEqual(messages('camera { position: 5; lookAt: [0, 0, 0]; }'), ['camera property `position` must be a vector']);
});

test('independent camera errors are all reported', () => {
  assert.deepEqual(messages('camera { position: 5; lookAt: [0, 0, 0]; fov: 0; }'), [
    'camera property `position` must be a vector',
    'fov must be strictly between 0 and 180 degrees',
  ]);
  assert.deepEqual(messages('camera { position: [0, -100, 0]; lookAt: q; up: [0, 0, 0]; }'), [
    '`q` is undeclared',
    'up must be nonzero',
  ]);
});

test('a second camera block is still checked', () => {
  assert.deepEqual(compile(CAMERA + 'camera { position: [q, 0, 0]; lookAt: [0, 0, 0]; fov: 200; }').diagnostics.map((d) => [d.line, d.column, d.message]), [
    [2, 1, 'exactly one camera block is required'],
    [2, 21, '`q` is undeclared'],
    [2, 50, 'fov must be strictly between 0 and 180 degrees'],
  ]);
});

test('camera expressions may use earlier bindings', () => {
  const { scene } = compile('let d = 100;\ncamera { position: [d, -d, d]; lookAt: [0, 0, 0]; }');
  assert.deepEqual(scene.camera.position, [100, -100, 100]);
});

test('position and lookAt must differ by more than ε (D14)', () => {
  assert.deepEqual(messages('camera { position: [1, 2, 3]; lookAt: [1, 2, 3]; }'), ['position and lookAt must differ']);
  // Offsets along X, so the view direction is not parallel to the default up.
  assert.deepEqual(messages('camera { position: [1, 2, 3]; lookAt: [1.0000005, 2, 3]; }'), ['position and lookAt must differ']);
  assert.deepEqual(messages('camera { position: [1, 2, 3]; lookAt: [1.00001, 2, 3]; }'), []);
});

test('up must be nonzero and not parallel to the view direction (D14)', () => {
  assert.deepEqual(messages('camera { position: [0, 0, 10]; lookAt: [0, 0, 0]; }'), ['up must not be parallel to the viewing direction']);
  assert.deepEqual(messages('camera { position: [0, 0, 10]; lookAt: [0, 0, 0]; up: [0.0000001, 0, 1]; }'), ['up must not be parallel to the viewing direction']);
  assert.deepEqual(messages('camera { position: [0, 0, 10]; lookAt: [0, 0, 0]; up: [0.01, 0, 1]; }'), []);
  assert.deepEqual(messages('camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; up: [0, 0, 0]; }'), ['up must be nonzero']);
});

test('the parallel test uses unit vectors, whatever the length of up (D14)', () => {
  assert.deepEqual(messages('camera { position: [0, 0, 10]; lookAt: [0, 0, 0]; up: [0.0005, 0, 1000]; }'), ['up must not be parallel to the viewing direction']);
  assert.deepEqual(messages('camera { position: [0, 0, 10]; lookAt: [0, 0, 0]; up: [0.01, 0, 1000]; }'), []);
});

test('fov must be strictly between 0 and 180 degrees', () => {
  for (const fov of ['0', '180', '-10', '200']) {
    assert.deepEqual(messages(`camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; fov: ${fov}; }`), ['fov must be strictly between 0 and 180 degrees'], fov);
  }
  assert.deepEqual(messages('camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; fov: 179.9; }'), []);
});

const basis = cameraBasis({ position: [0, -100, 0], lookAt: [0, 0, 0], up: [0, 0, 1], fov: 45 });

test('the center of a 3 × 3 image looks along the viewing direction', () => {
  const ray = primaryRay(basis, 3, 3, 1, 1);
  assert.deepEqual(ray.origin, [0, -100, 0]);
  assertClose(ray.direction, [0, 1, 0]);
});

test('image orientation: up is the top row, forward × up is the right', () => {
  assert.ok(primaryRay(basis, 64, 48, 32, 0).direction[2] > 0, 'top row looks up');
  assert.ok(primaryRay(basis, 64, 48, 32, 47).direction[2] < 0, 'bottom row looks down');
  assert.ok(primaryRay(basis, 64, 48, 63, 24).direction[0] > 0, 'right column looks right');
  assert.ok(primaryRay(basis, 64, 48, 0, 24).direction[0] < 0, 'left column looks left');
});

test('the vertical fov spans the image height', () => {
  // With fov 90, a 1 × 2 image's pixel centers are halfway to the top and bottom
  // edges, at tan(angle) = ±0.5.
  const wide = cameraBasis({ position: [0, 0, 0], lookAt: [0, 1, 0], up: [0, 0, 1], fov: 90 });
  const top = primaryRay(wide, 1, 2, 0, 0).direction;
  assert.ok(Math.abs(top[2] / top[1] - 0.5) < 1e-12);
});

test('ray directions are unit vectors', () => {
  for (const [x, y] of [[0, 0], [63, 0], [0, 47], [63, 47], [31, 23]]) {
    assert.ok(Math.abs(length(primaryRay(basis, 64, 48, x, y).direction) - 1) < 1e-12);
  }
});

test('a camera too far away is reported as such, not as an up-vector error (D16)', () => {
  const far = '1' + '0'.repeat(200);
  const source = `camera { position: [${far}, 0, 0]; lookAt: [0, 0, 0]; }\n`;
  const diagnostics = compile(source).diagnostics.map((d) => [d.line, d.column, d.message]);
  assert.deepEqual(diagnostics, [[1, source.indexOf('lookAt') + 1, 'position and lookAt are too far apart']]);
});

test('a large but finite camera is accepted (D16: no range check)', () => {
  assert.deepEqual(cameraOf('position: [16000000, 0, 0]; lookAt: [0, 0, 0];').diagnostics, []);
});

test('an up vector too large to measure is reported as such, not as parallel (D16)', () => {
  const huge = '1' + '0'.repeat(200);
  const source = `camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; up: [0, ${huge}, ${huge}]; }\n`;
  const diagnostics = compile(source).diagnostics.map((d) => [d.line, d.column, d.message]);
  assert.deepEqual(diagnostics, [[1, source.indexOf('up:') + 1, 'up is too large']]);
});
