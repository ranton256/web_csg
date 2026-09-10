import { expect, test } from '@playwright/test';
import { DEFAULT_SOURCE } from '../src/ui/default-source.js';
import { counter, dragDivider, editAndSettle, imageStats, openApp, waitForCounter, waitForIdle } from './support.js';

const CAMERA = 'camera {\n  position: [120, -160, 100];\n  lookAt: [0, 0, 0];\n}\n';
const INVALID = DEFAULT_SOURCE.replace('sphere(radius: r);', 'sphere(radius: r - 40);');

// Concentric spheres make a render take long enough (about a second) to
// interact with while it is in progress.
const heavy = (count = 12, radius = 40) =>
  CAMERA + Array.from({ length: count }, (_, i) => `sphere(${radius} - ${i} * 0.25);`).join('\n');

// Checks the canvas against the core's own single full render of the source.
const mismatchesWithFullRender = (page) => page.evaluate(async () => {
  const { renderSource } = await import('/src/core/render.js');
  const canvas = document.getElementById('preview');
  const expected = renderSource(document.getElementById('source').value, canvas.width, canvas.height).rgba;
  const actual = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let mismatches = 0;
  for (let i = 0; i < expected.length; i++) if (expected[i] !== actual[i]) mismatches++;
  return mismatches;
});

test.describe('on a fake clock', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, { clock: true });
    await page.clock.pauseAt(Date.now() + 60_000);
    await waitForIdle(page);
  });

  test('edits rebuild 300 ms after the last keystroke, and not before', async ({ page }) => {
    const rebuilds = await counter(page, 'rebuilds');
    await page.locator('#source').fill(DEFAULT_SOURCE.replace('40', '50'));
    await page.clock.runFor(299);
    expect(await counter(page, 'rebuilds')).toBe(rebuilds);
    await page.clock.runFor(1);
    expect(await counter(page, 'rebuilds')).toBe(rebuilds + 1);
  });

  test('each edit restarts the wait', async ({ page }) => {
    const rebuilds = await counter(page, 'rebuilds');
    await page.locator('#source').fill(DEFAULT_SOURCE.replace('40', '50'));
    await page.clock.runFor(200);
    await page.locator('#source').fill(DEFAULT_SOURCE.replace('40', '55'));
    await page.clock.runFor(299);
    expect(await counter(page, 'rebuilds')).toBe(rebuilds);
    await page.clock.runFor(1);
    expect(await counter(page, 'rebuilds')).toBe(rebuilds + 1);
    await page.clock.runFor(1000);
    expect(await counter(page, 'rebuilds')).toBe(rebuilds + 1);
  });

  test('a resize re-renders 150 ms after the last resize event', async ({ page }) => {
    const started = await counter(page, 'rendersStarted');
    const events = await counter(page, 'resizeEvents');
    await page.setViewportSize({ width: 1100, height: 720 });
    await waitForCounter(page, 'resizeEvents', events + 1);
    await page.clock.runFor(149);
    expect(await counter(page, 'rendersStarted')).toBe(started);
    await page.clock.runFor(1);
    expect(await counter(page, 'rendersStarted')).toBe(started + 1);
  });
});

test.describe('on real time', () => {
  // Heavy renders plus an in-page full render for comparison take a few seconds.
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await waitForIdle(page);
  });

  test('a progressive render shows its status and ends equal to a full render', async ({ page }) => {
    const started = await counter(page, 'rendersStarted');
    await page.locator('#source').fill(heavy());
    await waitForCounter(page, 'rendersStarted', started + 1);
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#status')).toHaveText('Rendering…');
    await waitForIdle(page);
    await expect(page.locator('#status')).toBeHidden();
    expect(await mismatchesWithFullRender(page)).toBe(0);
    expect(page.errors).toEqual([]);
  });

  test('a newer model cancels the render in progress', async ({ page }) => {
    const started = await counter(page, 'rendersStarted');
    const done = await counter(page, 'rendersDone');
    const cancelled = await counter(page, 'rendersCancelled');
    // The first model must still be rendering when the second arrives (300 ms
    // debounce later), even on the fastest engine, so it is much heavier.
    await page.locator('#source').fill(heavy(40));
    await waitForCounter(page, 'rendersStarted', started + 1);
    await expect(page.locator('#status')).toBeVisible();
    await page.locator('#source').fill(heavy(12, 30));
    await waitForCounter(page, 'rendersStarted', started + 2);
    await waitForIdle(page);
    expect(await counter(page, 'rendersCancelled')).toBe(cancelled + 1);
    expect(await counter(page, 'rendersDone')).toBe(done + 1);
    expect(await mismatchesWithFullRender(page)).toBe(0);
  });

  test('typing stays responsive while rendering', async ({ page }) => {
    const started = await counter(page, 'rendersStarted');
    await page.locator('#source').fill(heavy());
    await waitForCounter(page, 'rendersStarted', started + 1);
    await page.locator('#source').evaluate((el) => el.setSelectionRange(el.value.length, el.value.length));
    await page.keyboard.type('//x');
    const [typed, rendering] = await page.evaluate(() => [
      document.getElementById('source').value.endsWith('//x'),
      !document.getElementById('status').hidden,
    ]);
    expect(typed).toBe(true);
    expect(rendering).toBe(true);
  });

  test('a window resize re-renders at the new size', async ({ page }) => {
    const started = await counter(page, 'rendersStarted');
    await page.setViewportSize({ width: 1000, height: 700 });
    await waitForCounter(page, 'rendersStarted', started + 1);
    await waitForIdle(page);
    const panel = await page.locator('#preview-panel').evaluate((el) => [el.clientWidth, el.clientHeight]);
    const stats = await imageStats(page);
    expect([stats.width, stats.height]).toEqual(panel.map(Math.floor));
    expect(await mismatchesWithFullRender(page)).toBe(0);
  });

  test('a divider move re-renders, preserving the vertical field of view', async ({ page }) => {
    const before = await imageStats(page);
    const started = await counter(page, 'rendersStarted');
    await dragDivider(page, 100);
    await waitForCounter(page, 'rendersStarted', started + 1);
    await waitForIdle(page);
    const after = await imageStats(page);
    expect(after.width).toBe(before.width - 100);
    expect(after.height).toBe(before.height);
    expect([after.rows, after.columns]).toEqual([before.rows, before.columns]);
  });

  test('an invalid edit keeps the last valid model, marked stale; fixing it clears the mark', async ({ page }) => {
    const before = await imageStats(page);
    await editAndSettle(page, INVALID);
    await expect(page.locator('#stale')).toBeVisible();
    await expect(page.locator('#diagnostics button')).toHaveText(['9:8 the radius must be greater than 0']);
    expect(await imageStats(page)).toEqual(before);

    await editAndSettle(page, DEFAULT_SOURCE.replace('let r = 40;', 'let r = 20;'));
    await expect(page.locator('#stale')).toBeHidden();
    await expect(page.locator('#diagnostics li')).toHaveCount(0);
    const fixed = await imageStats(page);
    expect(fixed.foreground).toBeGreaterThan(0);
    expect(fixed.foreground).toBeLessThan(before.foreground);
    expect(page.errors).toEqual([]);
  });

  test('resizing while stale re-renders the last valid model and stays stale', async ({ page }) => {
    const valid = await imageStats(page);
    await editAndSettle(page, INVALID);
    const started = await counter(page, 'rendersStarted');
    await dragDivider(page, -100);
    await waitForCounter(page, 'rendersStarted', started + 1);
    await waitForIdle(page);
    await expect(page.locator('#stale')).toBeVisible();
    const after = await imageStats(page);
    expect(after.width).toBe(valid.width + 100);
    expect([after.rows, after.columns]).toEqual([valid.rows, valid.columns]);
  });
});
