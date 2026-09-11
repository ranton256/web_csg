// DESIGN §8 "Scaled scenes render identically": the bored cube with every
// coordinate and dimension, including the camera position, multiplied by one
// factor renders within 1 per channel of the unscaled image. This is the check
// that finalizes ε and the supported scene scale (DESIGN §5, D7).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile, renderSource, sceneIntervals } from '../../src/core/render.js';
import { VISION_EXAMPLE } from '../support/vision-example.js';

// The factor is written as a decimal literal: the language has no exponent form.
export const scaledBoredCube = (k) => `let k = ${k};
let size = 60 * k;
let bore = 12 * k;

camera {
  position: [120, -160, 100] * k;
  lookAt: [0, 0, 0];
  up: [0, 0, 1];
  fov: 45;
}

difference {
  cube(size);
  union {
    cylinder(radius: bore, height: size + 2 * k);
    rotate([90, 0, 0]) { cylinder(radius: bore, height: size + 2 * k); }
    rotate([0, 90, 0]) { cylinder(radius: bore, height: size + 2 * k); }
  }
}
`;

function render(source) {
  const { diagnostics, rgba } = renderSource(source, 64, 48);
  assert.deepEqual(diagnostics, []);
  return rgba;
}

export const maxDifference = (a, b) => a.reduce((max, value, i) => Math.max(max, Math.abs(value - b[i])), 0);

test('the scaling helper at ×1 renders exactly as the bored-cube example', () => {
  assert.deepEqual(render(scaledBoredCube('1')), render(VISION_EXAMPLE));
});

for (const factor of ['0.001', '100000']) {
  test(`the bored cube scaled ×${factor} matches the unscaled render within 1 per channel`, () => {
    const difference = maxDifference(render(scaledBoredCube(factor)), render(VISION_EXAMPLE));
    assert.ok(difference <= 1, `largest channel difference is ${difference}`);
  });
}

// A point light's position scales with the scene. With no falloff (D25), the
// render is unchanged too (lighting-and-shading "Declared lights").
const withPointLight = (k) => `${scaledBoredCube(k)}light { position: [40, -50, 50] * k; }\n`;

for (const factor of ['0.001', '100000']) {
  test(`the bored cube with a point light, scaled ×${factor}, matches the unscaled render within 1 per channel`, () => {
    const difference = maxDifference(render(withPointLight(factor)), render(withPointLight('1')));
    assert.ok(difference <= 1, `largest channel difference is ${difference}`);
  });
}

// Outside the guarantee: ε is absolute, so a feature thinner than the supported
// scale can change with scaling (the scope recorded in DESIGN §5 and D7).
test('a floor plate thinner than the supported scale is dropped at ×1 but kept at ×100000', () => {
  const plate = (k) => compile(`let k = ${k};
camera { position: [0, -10, 5] * k; lookAt: [0, 0, 0]; }
difference { cube(2 * k); translate([0, 0, 1.0000005 * k]) { box([4, 4, 4] * k); } }
`).scene;
  const down = (k) => ({ origin: [0, 0, 10 * k], direction: [0, 0, -1] });
  assert.equal(sceneIntervals(plate('1'), down(1)).length, 0, 'the 5e-7 plate is a sliver at ×1');
  assert.equal(sceneIntervals(plate('100000'), down(100000)).length, 1, 'the plate is 0.05 thick at ×100000');
});
