// M5 lights and material (DESIGN §8 Lighting and shading): declared lights,
// the material color, their validation, and the defaults when none is given.
// Point lights (D25) were added by the `point-lights` change.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cameraBasis } from '../../src/core/camera.js';
import { DEFAULT_COLOR } from '../../src/core/constants.js';
import { compile, renderSource } from '../../src/core/render.js';
import { encode, keyLight, lightsAt, shade } from '../../src/core/shade.js';
import { add, normalize } from '../../src/core/vec3.js';

const SIDE = 'camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; }\n';
const BACKGROUND = [31, 31, 36, 255];
const AMBIENT = [31, 31, 31, 255]; // 0.15 × 0.8 = 0.12, encoded as 31
const P = '1' + '0'.repeat(200); // 1e200, whose square overflows
const T = '0.' + '0'.repeat(199) + '1'; // 1e-200, whose square underflows

const diagnosticsOf = (source) => compile(source).diagnostics.map((d) => [d.line, d.column, d.message]);
const pixels = (rgba) => Array.from({ length: rgba.length / 4 }, (_, i) => [...rgba.slice(i * 4, i * 4 + 4)]);
const isBackground = (p) => p.every((v, i) => v === BACKGROUND[i]);
const column = (source, text) => source.indexOf(text) + 1;
const close = (actual, expected, tolerance = 1e-12) =>
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) <= tolerance, `${actual} ≉ ${expected}`));

// Declared lights

test('declared lights replace the default key light', () => {
  // The center ray hits the sphere at (0, -10, 0), where N = [0, -1, 0] is perpendicular to the light.
  const lit = renderSource(SIDE + 'sphere(10);\nlight { direction: [0, 0, -1]; }', 1, 1);
  assert.deepEqual(lit.diagnostics, []);
  assert.deepEqual([...lit.rgba], AMBIENT);
  // The key light would have lit the same point.
  assert.notDeepEqual([...renderSource(SIDE + 'sphere(10);', 1, 1).rgba], AMBIENT);
});

test('a light\'s direction is the direction light travels: the top of the sphere is lit, the bottom only ambient', () => {
  const { scene } = compile(SIDE + 'sphere(10);\nlight { direction: [0, 0, -1]; }');
  assert.deepEqual(scene.lights, [{ kind: 'directional', toLight: [-0, -0, 1], intensity: 1 }]);
  const solid = [];
  const { rgba } = renderSource(SIDE + 'sphere(10);\nlight { direction: [0, 0, -1]; }', 64, 64);
  pixels(rgba).forEach((p, i) => { if (!isBackground(p)) solid.push({ row: Math.floor(i / 64), p }); });
  const top = solid[0];
  const bottom = solid[solid.length - 1];
  assert.ok(top.row < bottom.row);
  assert.ok(top.p[0] > 31, `the top is lit: ${top.p}`);
  assert.deepEqual(bottom.p, AMBIENT, 'the bottom gets only ambient light');
});

test('intensity 0 leaves only the ambient term: every solid pixel is 0.15 × the model color', () => {
  const { rgba } = renderSource(SIDE + 'sphere(10);\ncube(12);\nlight { direction: [1, 2, -3]; intensity: 0; }', 32, 32);
  const solid = pixels(rgba).filter((p) => !isBackground(p));
  assert.ok(solid.length > 0);
  for (const p of solid) assert.deepEqual(p, AMBIENT);
});

test('several lights add their contributions: two lights at 0.5 equal one at 1', () => {
  const body = 'difference { cube(20); cylinder(6, 22); }\n';
  const one = renderSource(SIDE + body + 'light { direction: [1, 2, -3]; }', 32, 32).rgba;
  const two = renderSource(SIDE + body + 'light { direction: [1, 2, -3]; intensity: 0.5; }\nlight { direction: [1, 2, -3]; intensity: 0.5; }', 32, 32).rgba;
  assert.deepEqual(two, one);
});

// Point lights (D25)

test('a point light\'s direction depends on the shaded point', () => {
  const light = { kind: 'point', position: [0, 0, 10], intensity: 1 };
  const n = [0, 0, 1];
  const color = [0.4, 0.4, 0.4];
  const [atCenter] = lightsAt([light], [0, 0, 0]);
  const [atSide] = lightsAt([light], [10, 0, 0]);
  close(atCenter.toLight, [0, 0, 1]);
  close(atSide.toLight, normalize([-10, 0, 10]));
  // Seen along N, so H = normalize(L + N). The diffuse term is 0.75·C·(N·L):
  // 0.75·C at the center, and 0.75·C/√2 at the side.
  const expected = (nDotL, nDotH) => 0.15 * 0.4 + 0.75 * nDotL * 0.4 + 0.3 * nDotH ** 32;
  close(shade(n, n, [atCenter], color), Array(3).fill(expected(1, 1)));
  close(shade(n, n, [atSide], color), Array(3).fill(expected(Math.SQRT1_2, normalize(add(atSide.toLight, n))[2])));
});

test('a point light has no falloff: at 10 and at 1000 units it gives the same color', () => {
  const at = (z) => shade([0, 0, 1], [0, 0, 1], lightsAt([{ kind: 'point', position: [0, 0, z], intensity: 1 }], [0, 0, 0]), [0.4, 0.4, 0.4]);
  assert.ok(at(10)[0] > 0.15 * 0.4, 'the light contributes');
  assert.deepEqual(at(1000), at(10));
});

test('a light inside a solid does not light its outside: every solid pixel is ambient', () => {
  const { diagnostics, rgba } = renderSource(SIDE + 'sphere(10);\nlight { position: [0, 0, 0]; }', 32, 32);
  assert.deepEqual(diagnostics, []);
  const solid = pixels(rgba).filter((p) => !isBackground(p));
  assert.ok(solid.length > 0);
  for (const p of solid) assert.deepEqual(p, AMBIENT);
});

test('solids do not block a light: a cube between the sphere and the light changes none of the sphere\'s pixels', () => {
  // The cube (z from 25 to 35) sits between the sphere (top at z = 10) and the light at z = 50.
  // From the side, the two do not overlap in the image.
  const light = 'light { position: [0, 0, 50]; }\n';
  const without = pixels(renderSource(SIDE + light + 'sphere(10);', 32, 32).rgba);
  const withCube = renderSource(SIDE + light + 'sphere(10);\ntranslate([0, 0, 30]) { cube(10); }', 32, 32);
  assert.deepEqual(withCube.diagnostics, []);
  const blocked = pixels(withCube.rgba);
  const sphere = without.map((p, i) => i).filter((i) => !isBackground(without[i]));
  assert.ok(sphere.some((i) => without[i][0] > AMBIENT[0]), 'the light reaches the sphere');
  assert.ok(blocked.some((p, i) => !isBackground(p) && isBackground(without[i])), 'the cube is visible');
  for (const i of sphere) assert.deepEqual(blocked[i], without[i], `pixel ${i}`);
});

test('a point at the light receives nothing from it: the color is exactly 0.15 · C', () => {
  const color = [0.4, 0.6, 0.8];
  for (const offset of [0, 5e-7]) {
    const lit = lightsAt([{ kind: 'point', position: [offset, 0, 0], intensity: 1 }], [0, 0, 0]);
    assert.deepEqual(shade([1, 0, 0], [1, 0, 0], lit, color), color.map((c) => 0.15 * c), `offset ${offset}`);
  }
});

test('point and directional lights together: both are used, adding their contributions, and the key light is not', () => {
  const source = SIDE + 'sphere(10);\nlight { direction: [1, 2, -3]; intensity: 0.4; }\nlight { position: [-30, -40, 20]; intensity: 0.4; }';
  const { scene } = compile(source);
  assert.deepEqual(scene.lights.map((light) => light.kind), ['directional', 'point']);
  // The center hit is (0, -10, 0), where N and V are both [0, -1, 0].
  const hit = [0, -10, 0];
  const n = [0, -1, 0];
  const expected = shade(n, n, lightsAt(scene.lights, hit), DEFAULT_COLOR);
  assert.deepEqual([...renderSource(source, 1, 1).rgba], [...expected.map(encode), 255]);
  // Ambient once, plus each light's own direct term.
  const ambient = DEFAULT_COLOR.map((c) => 0.15 * c);
  const direct = scene.lights.map((light) => shade(n, n, lightsAt([light], hit), DEFAULT_COLOR).map((c, k) => c - ambient[k]));
  for (const d of direct) assert.ok(d[0] > 0, 'each light lights the point');
  close(expected, ambient.map((a, k) => a + direct[0][k] + direct[1][k]));
});

// Light validation

test('light validation: a missing, zero, too large, or too small direction', () => {
  assert.deepEqual(diagnosticsOf(SIDE + 'light { intensity: 1; }'), [[2, 1, 'light block is missing `direction` or `position`']]);
  assert.deepEqual(diagnosticsOf(SIDE + 'light { direction: [0, 0, 0]; }'), [[2, 9, 'direction must be nonzero']]);
  assert.deepEqual(diagnosticsOf(SIDE + `light { direction: [0, ${P}, ${P}]; }`), [[2, 9, 'direction is too large']]);
  assert.deepEqual(diagnosticsOf(SIDE + `light { direction: [0, ${T}, ${T}]; }`), [[2, 9, 'direction is too small']]);
});

test('light validation: a negative intensity', () => {
  const source = 'light { direction: [0, 0, -1]; intensity: -1; }';
  assert.deepEqual(diagnosticsOf(SIDE + source), [[2, column(source, 'intensity'), 'intensity must be at least 0']]);
  assert.deepEqual(diagnosticsOf(SIDE + 'light { direction: [0, 0, -1]; intensity: 0; }'), []);
});

test('light validation: unknown, duplicate, and mistyped properties use the shared property-block messages', () => {
  assert.deepEqual(diagnosticsOf(SIDE + 'light { direction: [0, 0, -1]; color: [1, 0, 0]; }').map(([, , m]) => m), ['unknown light property `color`']);
  assert.deepEqual(diagnosticsOf(SIDE + 'light { direction: [0, 0, -1]; intensity: 1; intensity: 2; }').map(([, , m]) => m), ['light property `intensity` is given more than once']);
  assert.deepEqual(diagnosticsOf(SIDE + 'light { direction: [0, 0, -1]; intensity: [1, 2, 3]; }').map(([, , m]) => m), ['light property `intensity` must be a number']);
  assert.deepEqual(diagnosticsOf(SIDE + 'light { direction: 5; }').map(([, , m]) => m), ['light property `direction` must be a vector']);
});

test('four lights are allowed; a fifth is reported at its keyword, and its contents are still checked', () => {
  const light = 'light { direction: [0, 0, -1]; }\n';
  const four = compile(SIDE + light.repeat(4) + 'sphere(1);');
  assert.deepEqual(four.diagnostics, []);
  assert.equal(four.scene.lights.length, 4);
  assert.deepEqual(diagnosticsOf(SIDE + light.repeat(5)), [[6, 1, 'at most 4 light blocks are allowed']]);
  assert.deepEqual(diagnosticsOf(SIDE + light.repeat(4) + 'light { direction: [0, 0, 0]; }\n'), [
    [6, 1, 'at most 4 light blocks are allowed'],
    [6, 9, 'direction must be nonzero'],
  ]);
});

test('a light inside a body is an error at its keyword, is still checked, and does not count toward the limit', () => {
  const source = 'union { light { direction: [0, 0, q]; } sphere(1); }';
  assert.deepEqual(diagnosticsOf(SIDE + source), [
    [2, column(source, 'light'), 'the light block must be at the top level'],
    [2, column(source, 'q'), '`q` is undeclared'],
  ]);
  const light = 'light { direction: [0, 0, -1]; }\n';
  // The misplaced light comes first: if it were counted, the fourth top-level light would be "the fifth".
  assert.deepEqual(diagnosticsOf(SIDE + 'translate([0, 0, 0]) { light { direction: [0, 0, -1]; } sphere(1); }\n' + light.repeat(4)).map(([, , m]) => m), [
    'the light block must be at the top level',
  ]);
});

test('light validation: a block with both direction and position is reported at the second, and its direction is still checked', () => {
  const both = 'light { position: [0, 0, 5]; direction: [0, 0, 0]; }';
  assert.deepEqual(diagnosticsOf(SIDE + both), [
    [2, column(both, 'direction'), 'light block cannot have both `direction` and `position`'],
    [2, column(both, 'direction'), 'direction must be nonzero'],
  ]);
  const reversed = 'light { direction: [0, 0, -1]; position: [0, 0, 5]; }';
  assert.deepEqual(diagnosticsOf(SIDE + reversed), [[2, column(reversed, 'position'), 'light block cannot have both `direction` and `position`']]);
});

test('light validation: a point light\'s position must be a vector, and any position is valid', () => {
  assert.deepEqual(diagnosticsOf(SIDE + 'light { position: 5; }').map(([, , m]) => m), ['light property `position` must be a vector']);
  const inside = compile(SIDE + 'sphere(10);\nlight { position: [0, 0, 0]; }');
  assert.deepEqual(inside.diagnostics, []);
  assert.deepEqual(inside.scene.lights, [{ kind: 'point', position: [0, 0, 0], intensity: 1 }]);
  assert.deepEqual(diagnosticsOf(SIDE + 'light { position: [0, 0, 5]; position: [0, 0, 6]; }').map(([, , m]) => m), ['light property `position` is given more than once']);
  assert.deepEqual(diagnosticsOf(SIDE + 'light { position: [0, 0, 5]; range: 3; }').map(([, , m]) => m), ['unknown light property `range`']);
});

test('both kinds share the limit of four: three directional and two point lights report the fifth', () => {
  const directional = 'light { direction: [0, 0, -1]; }\n';
  const point = 'light { position: [0, 0, 50]; }\n';
  assert.deepEqual(diagnosticsOf(SIDE + directional.repeat(3) + point.repeat(2)), [[6, 1, 'at most 4 light blocks are allowed']]);
  const four = compile(SIDE + directional.repeat(2) + point.repeat(2) + 'sphere(1);');
  assert.deepEqual(four.diagnostics, []);
  assert.deepEqual(four.scene.lights.map((light) => light.kind), ['directional', 'directional', 'point', 'point']);
});

// Material color

test('material color: green and blue come only from the white specular term', () => {
  const { diagnostics, rgba } = renderSource(SIDE + 'sphere(10);\nmaterial { color: [1, 0, 0]; }', 64, 64);
  assert.deepEqual(diagnostics, []);
  const solid = pixels(rgba).filter((p) => !isBackground(p));
  assert.ok(solid.length > 0);
  for (const p of solid) assert.equal(p[1], p[2], `green equals blue: ${p}`);
  assert.ok(solid.some((p) => p[1] > 0), 'the white highlight shows');
  // The red diffuse term shows: a grey (default) render would have red equal to green everywhere.
  assert.ok(solid.some((p) => p[0] > p[1] + 100), 'lit pixels are red');
});

test('material color: where N, V, and L coincide at intensity 1, the color is [1, 0.3, 0.3]', () => {
  const n = [0, 0, 1];
  assert.deepEqual(shade(n, n, [{ toLight: n, intensity: 1 }], [1, 0, 0]), [1, 0.3, 0.3]);
});

test('a valid material sets the scene color; without one the color is the default', () => {
  assert.deepEqual(compile(SIDE + 'material { color: [0.9, 0.35, 0.2]; }').scene.color, [0.9, 0.35, 0.2]);
  assert.deepEqual(compile(SIDE).scene.color, [0.8, 0.8, 0.8]);
});

// Material validation

test('material validation: a second block, a component outside [0, 1], a missing color', () => {
  assert.deepEqual(diagnosticsOf(SIDE + 'material { color: [1, 0, 0]; }\nmaterial { color: [0, 1, 0]; }'), [[3, 1, 'at most one material block is allowed']]);
  assert.deepEqual(diagnosticsOf(SIDE + 'material { color: [1.5, 0, 0]; }'), [[2, 12, 'each color component must be between 0 and 1']]);
  assert.deepEqual(diagnosticsOf(SIDE + 'material { color: [0, -0.1, 0]; }'), [[2, 12, 'each color component must be between 0 and 1']]);
  assert.deepEqual(diagnosticsOf(SIDE + 'material { color: [0, 0, 1]; }'), []);
  assert.deepEqual(diagnosticsOf(SIDE + 'material { colour: [1, 0, 0]; }'), [
    [2, 1, 'material block is missing `color`'],
    [2, 12, 'unknown material property `colour`'],
  ]);
  assert.deepEqual(diagnosticsOf(SIDE + 'material { color: 1; }').map(([, , m]) => m), ['material property `color` must be a vector']);
});

test('a material inside a body is an error at its keyword, and is still checked', () => {
  const source = 'translate([0, 0, 0]) { material { color: [2, 0, 0]; } sphere(1); }';
  assert.deepEqual(diagnosticsOf(SIDE + source), [
    [2, column(source, 'material'), 'the material block must be at the top level'],
    [2, column(source, 'color'), 'each color component must be between 0 and 1'],
  ]);
});

// The defaults (MODIFIED requirements)

test('with no light block, shading uses exactly the default key light at intensity 1', () => {
  const source = SIDE + 'sphere(10);';
  const { scene } = compile(source);
  assert.deepEqual(scene.lights, []);
  // The center hit is (0, -10, 0): N and V are both [0, -1, 0].
  const expected = shade([0, -1, 0], [0, -1, 0], [keyLight(cameraBasis(scene.camera))], DEFAULT_COLOR).map(encode);
  assert.deepEqual([...renderSource(source, 1, 1).rgba], [...expected, 255]);
});

// Critic round 1: the placement and count rules with invalid and misplaced blocks.

test('an invalid light still counts toward the limit of four (B1)', () => {
  const valid = 'light { direction: [0, 0, -1]; }\n';
  assert.deepEqual(diagnosticsOf(SIDE + 'light { direction: [0, 0, 0]; }\n' + valid.repeat(4)), [
    [2, 9, 'direction must be nonzero'],
    [6, 1, 'at most 4 light blocks are allowed'],
  ]);
});

test('an invalid material still takes the single material slot (B2)', () => {
  assert.deepEqual(diagnosticsOf(SIDE + 'material { color: [2, 0, 0]; }\nmaterial { color: [1, 0, 0]; }'), [
    [2, 12, 'each color component must be between 0 and 1'],
    [3, 1, 'at most one material block is allowed'],
  ]);
});

test('a misplaced material does not take the material slot (B3)', () => {
  // The misplaced material comes first: if it took the slot, the top-level one would be "a second".
  const source = 'translate([0, 0, 0]) { material { color: [1, 0, 0]; } sphere(1); }\nmaterial { color: [0, 1, 0]; }';
  assert.deepEqual(diagnosticsOf(SIDE + source).map(([, , m]) => m), ['the material block must be at the top level']);
});

test('shading uses all four declared lights (B4)', () => {
  const lights = [
    'light { direction: [0, 1, -1]; intensity: 0.3; }\n',
    'light { direction: [1, 1, 0]; intensity: 0.3; }\n',
    'light { direction: [-1, 1, 0]; intensity: 0.3; }\n',
    'light { direction: [0, 1, 0]; intensity: 0.3; }\n',
  ];
  const four = renderSource(SIDE + 'sphere(10);\n' + lights.join(''), 32, 32);
  const three = renderSource(SIDE + 'sphere(10);\n' + lights.slice(0, 3).join(''), 32, 32);
  assert.deepEqual(four.diagnostics, []);
  assert.notDeepEqual(four.rgba, three.rgba, 'the fourth light changes the image');
});
