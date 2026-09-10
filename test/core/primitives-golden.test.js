// Golden-image regression guards for the M3 primitives and transforms.
// Correctness comes from the analytic tests; these catch unintended changes.

import { test } from 'node:test';
import { renderSource } from '../../src/core/render.js';
import { expectMatchesGolden } from '../support/golden.js';
import { SCENES } from '../support/scenes.js';

for (const name of ['cube', 'box', 'cylinder', 'arrangement']) {
  test(`scene "${name}" matches its golden image`, () => {
    const { diagnostics, rgba } = renderSource(SCENES[name], 64, 48);
    if (diagnostics.length > 0) throw new Error(JSON.stringify(diagnostics));
    expectMatchesGolden(name, 64, 48, rgba);
  });
}
