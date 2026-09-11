// Saves milestone evidence screenshots of the running app.
//
// Usage: npm run capture -- <milestone>     e.g. npm run capture -- M0
// Writes docs/progress/<milestone>/<shot>.png using Chromium at 1280×800,
// device scale factor 1.

import fs from 'node:fs';
import path from 'node:path';
import { SPHERE_SOURCE } from '../test/support/sphere-source.js';
import { SCENES } from '../test/support/scenes.js';
import { VISION_EXAMPLE } from '../test/support/vision-example.js';
import { REPO_ROOT, startServer } from './serve.mjs';

// Waits until no render is in progress (a cancelled render never finishes,
// so the status is the reliable signal).
const renderIdle = (page) => page.waitForFunction(() => document.getElementById('status').hidden
  && Number(document.body.dataset.rendersDone ?? 0) > 0);

// Replaces the editor text, then waits for the rebuild and its render.
async function showSource(page, text) {
  const before = await page.evaluate(() => Number(document.body.dataset.rebuilds ?? 0));
  await page.locator('#source').fill(text);
  await page.waitForFunction((count) => Number(document.body.dataset.rebuilds ?? 0) > count, before);
  await renderIdle(page);
}

// Chooses a built-in example with the picker, then waits for its render (M6).
async function chooseExample(page, id) {
  const before = await page.evaluate(() => Number(document.body.dataset.rebuilds ?? 0));
  await page.locator('#examples').selectOption(id);
  await page.waitForFunction((count) => Number(document.body.dataset.rebuilds ?? 0) > count, before);
  await renderIdle(page);
}

// Each shot starts from a first launch: the bored cube, since M6.
const SHOTS = [
  { name: 'app', prepare: async () => {} },
  {
    name: 'stale',
    prepare: async (page) => {
      await showSource(page, SPHERE_SOURCE.replace('sphere(radius: r);', 'sphere(radius: r - 40);'));
      await page.locator('#stale').waitFor({ state: 'visible' });
    },
  },
  { name: 'primitives', prepare: (page) => showSource(page, SCENES.arrangement) },
  { name: 'bored-cube', prepare: (page) => showSource(page, VISION_EXAMPLE) },
  { name: 'lit-custom', prepare: (page) => showSource(page, SCENES['lit-custom']) },
  { name: 'lit-point', prepare: (page) => showSource(page, SCENES['lit-point']) },
  {
    // The Help dialog open over the app (backlog-closeout).
    name: 'help',
    prepare: async (page) => {
      await page.locator('#help-button').click();
      await page.locator('#help').waitFor({ state: 'visible' });
    },
  },
  {
    // Lines indented with Tab: the difference body selected, then Tab once (backlog-closeout).
    name: 'indented',
    prepare: async (page) => {
      await showSource(page, VISION_EXAMPLE.replace(/^ {2}/gm, ''));
      const before = await page.evaluate(() => Number(document.body.dataset.rebuilds ?? 0));
      await page.locator('#source').evaluate((el) => {
        const start = el.value.indexOf('cube(size);');
        el.setSelectionRange(start, el.value.lastIndexOf('}'));
      });
      await page.keyboard.press('Tab');
      await page.waitForFunction((count) => Number(document.body.dataset.rebuilds ?? 0) > count, before);
      await renderIdle(page);
    },
  },
  // One shot per built-in example, loaded with the Examples… picker (M6).
  { name: 'example-bored-cube', prepare: (page) => chooseExample(page, 'bored-cube') },
  { name: 'example-primitives', prepare: (page) => chooseExample(page, 'primitives') },
  { name: 'example-boolean-operations', prepare: (page) => chooseExample(page, 'boolean-operations') },
];
const VIEWPORT = { width: 1280, height: 800 };

const milestone = process.argv[2];
// Must start with a letter or digit, so flags like --help are never taken as a name.
if (!milestone || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(milestone)) {
  console.error('Usage: npm run capture -- <milestone>   (starts with a letter or digit; then letters, digits, "-" or "_"; e.g. M0)');
  process.exit(2);
}

// Imported only after the argument check, so usage errors need no browser.
const { chromium } = await import('@playwright/test');

const outputDir = path.join(REPO_ROOT, 'docs', 'progress', milestone);
const server = await startServer({ port: 0 });
const baseURL = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const shot of SHOTS) {
    // A new page has a new browser context, so no autosaved source carries
    // over from the previous shot.
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await page.goto(`${baseURL}/`, { waitUntil: 'load' });
    await renderIdle(page);
    await shot.prepare(page);
    const file = path.join(outputDir, `${shot.name}.png`);
    await page.screenshot({ path: file });
    console.log(`Wrote ${path.relative(REPO_ROOT, file)}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
