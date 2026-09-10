// Golden-image comparison (CONSTRAINTS §4, DESIGN §7): a rendered RGBA image
// matches its golden when the sizes are equal and every R, G, and B value is
// within CHANNEL_TOLERANCE. Goldens are written only in update mode
// (`npm run golden:update`, which sets GOLDEN_UPDATE=1).

import { AssertionError } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPPM, writePPM } from './ppm.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const GOLDEN_DIR = path.join(REPO_ROOT, 'test', 'golden');
export const ACTUAL_DIR = path.join(REPO_ROOT, 'test-results', 'golden');
export const CHANNEL_TOLERANCE = 1;

// Compares RGBA pixels against RGB golden pixels.
export function compareImages(actual, golden) {
  if (actual.width !== golden.width || actual.height !== golden.height) {
    return { ok: false, sizeMismatch: true, differingPixels: 0, maxDifference: 0 };
  }
  let differingPixels = 0;
  let maxDifference = 0;
  for (let pixel = 0; pixel < actual.width * actual.height; pixel++) {
    let pixelDiffers = false;
    for (let channel = 0; channel < 3; channel++) {
      const difference = Math.abs(actual.rgba[pixel * 4 + channel] - golden.rgb[pixel * 3 + channel]);
      maxDifference = Math.max(maxDifference, difference);
      if (difference > CHANNEL_TOLERANCE) pixelDiffers = true;
    }
    if (pixelDiffers) differingPixels++;
  }
  return { ok: differingPixels === 0, sizeMismatch: false, differingPixels, maxDifference };
}

export function expectMatchesGolden(name, width, height, rgba, options = {}) {
  const {
    goldenDir = GOLDEN_DIR,
    actualDir = ACTUAL_DIR,
    update = process.env.GOLDEN_UPDATE === '1',
  } = options;
  const goldenPath = path.join(goldenDir, `${name}.ppm`);

  if (update) {
    writePPM(goldenPath, width, height, rgba);
    return;
  }

  if (!fs.existsSync(goldenPath)) {
    throw new AssertionError({
      message: `Golden image "${name}" not found at ${goldenPath}. ` +
        'Run `npm run golden:update` to create it deliberately, then review it.',
    });
  }

  const golden = readPPM(goldenPath);
  const result = compareImages({ width, height, rgba }, golden);
  if (result.ok) return;

  const actualPath = path.join(actualDir, `${name}.actual.ppm`);
  writePPM(actualPath, width, height, rgba);
  const detail = result.sizeMismatch
    ? `golden is ${golden.width}×${golden.height} but the rendered image is ${width}×${height}`
    : `${result.differingPixels} pixel(s) differ by more than ${CHANNEL_TOLERANCE} ` +
      `(largest channel difference ${result.maxDifference})`;
  throw new AssertionError({
    message: `Golden image "${name}" mismatch: ${detail}. Actual image written to ${actualPath}.`,
  });
}
