// Golden-image regression guards for the M4 Booleans. Correctness comes from
// the analytic tests; these catch unintended changes to whole images.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderSource } from '../../src/core/render.js';
import { expectMatchesGolden } from '../support/golden.js';
import { SCENES } from '../support/scenes.js';
import { VISION_EXAMPLE } from '../support/vision-example.js';

test('core render is callable without a browser: the bored cube matches golden "bored-cube"', () => {
  const { diagnostics, rgba } = renderSource(VISION_EXAMPLE, 64, 48);
  assert.deepEqual(diagnostics, []);
  assert.equal(rgba.length, 64 * 48 * 4);
  expectMatchesGolden('bored-cube', 64, 48, rgba);
});

test('scene "booleans" matches its golden image', () => {
  const { diagnostics, rgba } = renderSource(SCENES.booleans, 64, 48);
  assert.deepEqual(diagnostics, []);
  expectMatchesGolden('booleans', 64, 48, rgba);
});
