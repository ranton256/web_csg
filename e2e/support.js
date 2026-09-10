// Shared helpers for the e2e specs (not a spec file itself).
import { expect } from '@playwright/test';

export const BACKGROUND = [31, 31, 36];

// Opens the app, collecting console and page errors into page.errors.
export async function openApp(page, { clock = false } = {}) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.errors = errors;
  if (clock) await page.clock.install();
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-module-loaded', 'true');
}

export const counter = (page, name) => page.evaluate((key) => Number(document.body.dataset[key] ?? 0), name);

export async function waitForCounter(page, name, atLeast) {
  await page.waitForFunction(([key, value]) => Number(document.body.dataset[key] ?? 0) >= value, [name, atLeast]);
}

// Waits until no render is in progress. (A cancelled render never finishes,
// so "done" can stay below "started"; the status is the reliable signal.)
export async function waitForIdle(page) {
  await page.waitForFunction(() => document.getElementById('status').hidden
    && Number(document.body.dataset.rendersDone ?? 0) > 0);
}

// Replaces the source, waits for the debounced rebuild, then for rendering.
export async function editAndSettle(page, text) {
  const before = await counter(page, 'rebuilds');
  await page.locator('#source').fill(text);
  await waitForCounter(page, 'rebuilds', before + 1);
  await waitForIdle(page);
}

// Canvas summary: size, count of non-background pixels, the numbers of rows
// and columns containing any, and a checksum of every byte.
export const imageStats = (page) => page.evaluate(([r, g, b]) => {
  const canvas = document.getElementById('preview');
  const { width, height } = canvas;
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let foreground = 0;
  const rows = new Set();
  const columns = new Set();
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data[i], 16777619) >>> 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!(data[i] === r && data[i + 1] === g && data[i + 2] === b)) {
        foreground++;
        rows.add(y);
        columns.add(x);
      }
    }
  }
  return { width, height, foreground, rows: rows.size, columns: columns.size, hash };
}, BACKGROUND);

export const pixelAt = (page, x, y) => page.evaluate(([px, py]) =>
  [...document.getElementById('preview').getContext('2d').getImageData(px, py, 1, 1).data], [x, y]);

export const widthOf = async (page, selector) => (await page.locator(selector).boundingBox()).width;

// Drags the divider horizontally by dx pixels. Keep the target inside the
// viewport: some engines do not deliver pointer moves outside it.
export async function dragDivider(page, dx) {
  const box = await page.locator('#divider').boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y);
  await page.mouse.move(x + dx, y);
  await page.mouse.up();
}

// Drags the divider so the pointer ends at viewport x coordinate targetX.
export async function dragDividerTo(page, targetX) {
  const box = await page.locator('#divider').boundingBox();
  await dragDivider(page, targetX - (box.x + box.width / 2));
}
