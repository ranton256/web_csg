// Golden-image regression guards for the core renderer. Correctness comes from
// the analytic tests; these catch unintended changes to whole images.

import { test } from 'node:test';
import { renderSource } from '../../src/core/render.js';
import { SPHERE_SOURCE } from '../support/sphere-source.js';
import { expectMatchesGolden } from '../support/golden.js';

test('the sphere example matches golden "sphere"', () => {
  const { rgba } = renderSource(SPHERE_SOURCE, 64, 48);
  expectMatchesGolden('sphere', 64, 48, rgba);
});

test('the camera inside sphere(50) matches golden "sphere-inside"', () => {
  const { rgba } = renderSource('camera { position: [0, 0, 0]; lookAt: [1, 0, 0]; }\nsphere(50);', 64, 48);
  expectMatchesGolden('sphere-inside', 64, 48, rgba);
});
