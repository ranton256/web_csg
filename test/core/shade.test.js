import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cameraBasis } from '../../src/core/camera.js';
import { BACKGROUND, DEFAULT_COLOR, EPSILON, KEY_LIGHT, SHADING } from '../../src/core/constants.js';
import { encode, keyLight, lightsAt, shade } from '../../src/core/shade.js';
import { length, normalize } from '../../src/core/vec3.js';

const close = (actual, expected, tolerance = 1e-12) =>
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= tolerance, `${actual} ≉ ${expected}`));

test('constants equal DESIGN §5', () => {
  assert.deepEqual({ ...SHADING }, { ambient: 0.15, diffuse: 0.75, specular: 0.3, shininess: 32 });
  assert.deepEqual([...DEFAULT_COLOR], [0.8, 0.8, 0.8]);
  assert.deepEqual([...BACKGROUND], [0.12, 0.12, 0.14]);
  assert.deepEqual({ ...KEY_LIGHT }, { up: 1, right: -0.5, back: 1, intensity: 1 });
});

test('a full highlight saturates to 1', () => {
  const n = [0, 0, 1];
  assert.deepEqual(shade(n, n, [{ toLight: n, intensity: 1 }], DEFAULT_COLOR), [1, 1, 1]);
});

test('an unlit side gets only ambient, even where N·H > 0', () => {
  // Grazing geometry: the light is just below the surface (N·L = -0.01) and
  // the viewer is low on the other side, so H is nearly N. Ungated, the
  // specular term would be about 0.29; the gate must remove it.
  const normal = [0, 0, 1];
  const toViewer = normalize([-1, 0, 0.1]);
  const toLight = normalize([1, 0, -0.01]);
  const halfway = normalize([toLight[0] + toViewer[0], 0, toLight[2] + toViewer[2]]);
  const ungatedSpecular = 0.3 * halfway[2] ** 32;
  assert.ok(toLight[2] < 0 && ungatedSpecular > 0.2, `geometry must make the gate matter (ungated ${ungatedSpecular})`);
  close(shade(normal, toViewer, [{ toLight, intensity: 1 }], DEFAULT_COLOR), [0.12, 0.12, 0.12]);
});

test('diffuse and specular follow the formula for a lit point', () => {
  const normal = [0, 0, 1];
  const toViewer = [0, 0, 1];
  const toLight = normalize([1, 0, 1]);
  const nDotL = Math.SQRT1_2;
  const nDotH = normalize([Math.SQRT1_2, 0, 1 + Math.SQRT1_2])[2];
  const expected = 0.15 * 0.8 + 0.75 * nDotL * 0.8 + 0.3 * nDotH ** 32;
  close(shade(normal, toViewer, [{ toLight, intensity: 1 }], DEFAULT_COLOR), [expected, expected, expected]);
  close(shade(normal, toViewer, [{ toLight, intensity: 0 }], DEFAULT_COLOR), [0.12, 0.12, 0.12]);
});

test('the key light sits above-left, behind the viewer', () => {
  const basis = cameraBasis({ position: [0, -10, 0], lookAt: [0, 0, 0], up: [0, 0, 1], fov: 45 });
  const light = keyLight(basis);
  close(light.toLight, normalize([-0.5, -1, 1]));
  assert.equal(light.intensity, 1);
  assert.equal(light.kind, 'directional');
});

// lightsAt: the lights as seen from one shaded point (D25).

const pointAt = (position) => lightsAt([{ kind: 'point', position, intensity: 1 }], [0, 0, 0]);

test('lightsAt: a point light at most ε from the point contributes nothing; just beyond ε it does', () => {
  assert.equal(length([EPSILON, 0, 0]), EPSILON, 'the boundary distance is exactly ε');
  assert.deepEqual(pointAt([EPSILON, 0, 0]), []);
  assert.deepEqual(pointAt([0, 0, 0]), []);
  const [beyond] = pointAt([EPSILON * 1.001, 0, 0]);
  close(beyond.toLight, [1, 0, 0]);
  assert.equal(beyond.intensity, 1);
});

test('lightsAt: a distance too large to compute drops the light', () => {
  assert.deepEqual(lightsAt([{ kind: 'point', position: [1e308, 0, 0], intensity: 1 }], [-1e308, 0, 0]), []);
  assert.deepEqual(pointAt([1e200, 1e200, 0]), [], 'the difference is finite, but its length overflows');
});

test('lightsAt: a point light\'s toLight is the unit vector toward its position', () => {
  const [light] = lightsAt([{ kind: 'point', position: [3, 4, 12], intensity: 0.5 }], [0, 0, 0]);
  close(light.toLight, [3 / 13, 4 / 13, 12 / 13]);
  assert.equal(light.intensity, 0.5);
});

test('lightsAt: directional lights pass through unchanged', () => {
  const light = { kind: 'directional', toLight: [0, 0, 1], intensity: 0.5 };
  const result = lightsAt([light], [3, 4, 5]);
  assert.equal(result.length, 1);
  assert.equal(result[0], light);
});

test('encoding: round(255 · clamp(c)), so unlit default color is 31 and the background is [31, 31, 36]', () => {
  assert.equal(encode(0.15 * 0.8), 31);
  assert.deepEqual(BACKGROUND.map(encode), [31, 31, 36]);
  assert.equal(encode(-0.5), 0);
  assert.equal(encode(1.5), 255);
});
