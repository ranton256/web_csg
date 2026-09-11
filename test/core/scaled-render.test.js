// DESIGN §8 "Scaled scenes render identically": the bored cube with every
// coordinate and dimension, including the camera position, multiplied by one
// factor renders within 1 per channel of the unscaled image. This is the check
// that finalizes ε and the supported scene scale (DESIGN §5, D7).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderSource } from '../../src/core/render.js';
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
