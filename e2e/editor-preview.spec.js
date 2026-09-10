import { expect, test } from '@playwright/test';
import { DEFAULT_SOURCE } from '../src/ui/default-source.js';

// Reads canvas pixels in the page: RGBA at (x, y), the count of
// non-background pixels, and a checksum of the whole image.
const pixelAt = (page, x, y) => page.evaluate(([px, py]) =>
  [...document.getElementById('preview').getContext('2d').getImageData(px, py, 1, 1).data], [x, y]);

const imageStats = (page) => page.evaluate(() => {
  const data = document.getElementById('preview').getContext('2d').getImageData(0, 0, 640, 480).data;
  let foreground = 0;
  let hash = 2166136261;
  for (let i = 0; i < data.length; i += 4) {
    if (!(data[i] === 31 && data[i + 1] === 31 && data[i + 2] === 36)) foreground++;
  }
  for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data[i], 16777619) >>> 0;
  return { foreground, hash };
});

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.errors = errors;
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-module-loaded', 'true');
});

test('the example renders on load', async ({ page }) => {
  await expect(page.locator('#source')).toHaveValue(DEFAULT_SOURCE);
  expect(await pixelAt(page, 320, 240)).not.toEqual([31, 31, 36, 255]);
  expect(await pixelAt(page, 0, 0)).toEqual([31, 31, 36, 255]);
  await expect(page.locator('#diagnostics li')).toHaveCount(0);
  expect(page.errors).toEqual([]);
});

test('a valid edit updates the image', async ({ page }) => {
  const before = await imageStats(page);
  await page.locator('#source').fill(DEFAULT_SOURCE.replace('let r = 40;', 'let r = 60;'));
  const after = await imageStats(page);
  expect(after.foreground).toBeGreaterThan(before.foreground);
  await expect(page.locator('#diagnostics li')).toHaveCount(0);
  const renderMs = Number(await page.locator('body').getAttribute('data-render-ms'));
  console.log(`[${test.info().project.name}] 640×480 render after edit: ${renderMs} ms`);
  expect(page.errors).toEqual([]);
});

test('an invalid edit keeps the image and lists the error; fixing it clears the list', async ({ page }) => {
  const before = await imageStats(page);
  const invalid = [
    '// A sphere lit by the default key light.',
    'let r = 40;',
    '',
    'camera {',
    '  position: [120, -160, 100];',
    '  lookAt: [0, 0, 0];',
    '}',
    'sphere(0);',
  ].join('\n');
  await page.locator('#source').fill(invalid);
  await expect(page.locator('#diagnostics li')).toHaveText(['8:8 the radius must be greater than 0']);
  expect(await imageStats(page)).toEqual(before);

  await page.locator('#source').fill(invalid.replace('sphere(0);', 'sphere(20);'));
  await expect(page.locator('#diagnostics li')).toHaveCount(0);
  const fixed = await imageStats(page);
  expect(fixed.foreground).toBeGreaterThan(0);
  expect(fixed.foreground).toBeLessThan(before.foreground);
  expect(page.errors).toEqual([]);
});
