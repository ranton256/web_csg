// Golden-image regression guards for M5 lights and material, all on the bored
// cube. Correctness comes from the analytic tests; these catch unintended
// changes to whole images. The default-light goldens are "bored-cube" and
// "sphere".

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderSource } from '../../src/core/render.js';
import { expectMatchesGolden } from '../support/golden.js';
import { SCENES } from '../support/scenes.js';

for (const name of ['lit-one', 'lit-two', 'lit-material', 'lit-point']) {
  test(`scene "${name}" matches its golden image`, () => {
    const { diagnostics, rgba } = renderSource(SCENES[name], 64, 48);
    assert.deepEqual(diagnostics, []);
    expectMatchesGolden(name, 64, 48, rgba);
  });
}
