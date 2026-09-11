import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { EXAMPLES, FIRST_LAUNCH_SOURCE } from '../src/ui/examples.js';
import { SPHERE_SOURCE } from '../test/support/sphere-source.js';
import { BACKGROUND, counter, editAndSettle, imageStats, openApp, pixelAt, waitForCounter, waitForIdle } from './support.js';

// Save, load, and examples (DESIGN §8; D6, D17, D26). Each test starts in a
// fresh browser context, so localStorage is empty: a first launch.

const CONFIRM_REPLACE = 'Replace the editor text? Changes since the last Open, Save, or example will be lost.';
const INVALID = SPHERE_SOURCE.replace('sphere(radius: r);', 'sphere(radius: r - 40);');
const INVALID_DIAGNOSTIC = '9:8 the radius must be greater than 0';
const [BORED_CUBE, PRIMITIVES, BOOLEANS] = EXAMPLES;

// Records every confirmation prompt, answering each with prompts.answer.
function trackPrompts(page) {
  const prompts = { messages: [], answer: 'dismiss' };
  page.on('dialog', async (dialog) => {
    prompts.messages.push(dialog.message());
    await (prompts.answer === 'accept' ? dialog.accept() : dialog.dismiss());
  });
  return prompts;
}

async function start(page, options) {
  const prompts = trackPrompts(page);
  await openApp(page, options);
  return prompts;
}

// Reloads, and waits for the module to start again.
async function reload(page) {
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-module-loaded', 'true');
}

// Chooses an example, and waits for its rebuild when one is expected.
async function chooseExample(page, id, { loads = true } = {}) {
  const before = await counter(page, 'rebuilds');
  await page.locator('#examples').selectOption(id);
  if (loads) await waitForCounter(page, 'rebuilds', before + 1);
}

// Chooses a file through the Open button's file chooser.
async function openFile(page, name, content, { loads = true } = {}) {
  const before = await counter(page, 'rebuilds');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#open-button').click()]);
  await chooser.setFiles({ name, mimeType: 'text/plain', buffer: Buffer.isBuffer(content) ? content : Buffer.from(content) });
  if (loads) await waitForCounter(page, 'rebuilds', before + 1);
}

// Clicks Save, and returns the downloaded file's name and bytes.
async function save(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#save-button').click()]);
  return { name: download.suggestedFilename(), bytes: readFileSync(await download.path()) };
}

const editorText = (page) => page.locator('#source').inputValue();

// Lets any prompt, rebuild, or render that is under way finish.
async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 400)));
  await waitForIdle(page);
}

test.describe('autosave and first launch', () => {
  test('first launch shows the bored cube, rendered, with no diagnostics', async ({ page }) => {
    await start(page);
    await waitForIdle(page);
    await expect(page.locator('#source')).toHaveValue(FIRST_LAUNCH_SOURCE);
    await expect(page.locator('#diagnostics li')).toHaveCount(0);
    const stats = await imageStats(page);
    expect(await pixelAt(page, Math.floor(stats.width / 2), Math.floor(stats.height / 2))).not.toEqual([...BACKGROUND, 255]);
    expect(page.errors).toEqual([]);
  });

  test('the edited source is autosaved and restored on reload, and rendered from it', async ({ page }) => {
    await start(page);
    await waitForIdle(page);
    await editAndSettle(page, SPHERE_SOURCE);
    const rendered = await imageStats(page);
    await reload(page);
    await waitForIdle(page);
    await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
    expect(await imageStats(page)).toEqual(rendered);
    expect(page.errors).toEqual([]);
  });

  test('a reload straight after typing keeps the edit', async ({ page }) => {
    await start(page);
    await waitForIdle(page);
    await page.locator('#source').fill(SPHERE_SOURCE);
    await reload(page);
    await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
  });

  test('an opened file and a chosen example are autosaved: a reload shows them', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await openFile(page, 'sphere.csg', SPHERE_SOURCE);
    await reload(page);
    await waitForIdle(page);
    await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
    await chooseExample(page, PRIMITIVES.id);
    await reload(page);
    await waitForIdle(page);
    await expect(page.locator('#source')).toHaveValue(PRIMITIVES.source);
    expect(prompts.messages).toEqual([]);
  });

  test('an invalid source is restored exactly, with its diagnostics and no stale indicator (D27)', async ({ page }) => {
    await start(page);
    await waitForIdle(page);
    await page.locator('#source').fill(INVALID);
    await reload(page);
    await expect(page.locator('#source')).toHaveValue(INVALID);
    await expect(page.locator('#diagnostics button')).toHaveText([INVALID_DIAGNOSTIC]);
    // No valid model exists yet: nothing is drawn (the canvas stays fully
    // transparent), so nothing is stale.
    await expect(page.locator('#stale')).toBeHidden();
    expect(await page.evaluate(() => {
      const canvas = document.getElementById('preview');
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) opaque++;
      return opaque;
    })).toBe(0);
    await editAndSettle(page, SPHERE_SOURCE);
    await expect(page.locator('#stale')).toBeHidden();
    expect((await imageStats(page)).foreground).toBeGreaterThan(0);
    expect(page.errors).toEqual([]);
  });

  test('with localStorage unavailable, the app starts with the bored cube and edits still rebuild', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('storage is disabled', 'SecurityError');
        },
      });
    });
    await start(page);
    expect(await page.evaluate(() => {
      try {
        return typeof window.localStorage;
      } catch {
        return 'blocked';
      }
    })).toBe('blocked');
    await waitForIdle(page);
    await expect(page.locator('#source')).toHaveValue(FIRST_LAUNCH_SOURCE);
    await editAndSettle(page, SPHERE_SOURCE);
    await expect(page.locator('#diagnostics li')).toHaveCount(0);
    expect(page.errors).toEqual([]);
  });
});

test.describe('Save', () => {
  test('Save downloads exactly the editor text, valid or not', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    for (const text of [SPHERE_SOURCE, `${INVALID}\t// café \u{1F600}  \n\n`, '']) {
      await page.locator('#source').fill(text);
      const value = await editorText(page);
      const saved = await save(page);
      expect(saved.bytes.equals(Buffer.from(value, 'utf8'))).toBe(true);
    }
    expect(prompts.messages).toEqual([]);
  });

  test('the save file name: model.csg, then the last example, then the last opened file, and model.csg after a reload', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    expect((await save(page)).name).toBe('model.csg');
    await chooseExample(page, PRIMITIVES.id);
    expect((await save(page)).name).toBe('primitives.csg');
    await openFile(page, 'part.csg', SPHERE_SOURCE);
    expect((await save(page)).name).toBe('part.csg');
    // The name lasts for the page session only (D26 a).
    await reload(page);
    await waitForIdle(page);
    expect((await save(page)).name).toBe('model.csg');
    expect(prompts.messages).toEqual([]);
  });

  test('a Save is remembered across a reload: an example then replaces without a prompt', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await editAndSettle(page, SPHERE_SOURCE);
    await save(page);
    await reload(page);
    await waitForIdle(page);
    await chooseExample(page, PRIMITIVES.id);
    await expect(page.locator('#source')).toHaveValue(PRIMITIVES.source);
    expect(prompts.messages).toEqual([]);
  });

  test('saved text replaces without a prompt', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await editAndSettle(page, SPHERE_SOURCE);
    await save(page);
    await chooseExample(page, BOOLEANS.id);
    await expect(page.locator('#source')).toHaveValue(BOOLEANS.source);
    expect(prompts.messages).toEqual([]);
  });
});

test.describe('Open', () => {
  test('Open loads a .csg file: its exact text, evaluated and rendered', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await openFile(page, 'sphere.csg', SPHERE_SOURCE);
    await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
    await expect(page.locator('#diagnostics li')).toHaveCount(0);
    // The file input is emptied after each Open, so the same file can be chosen again.
    await expect(page.locator('#open-file')).toHaveValue('');
    await waitForIdle(page);
    const stats = await imageStats(page);
    expect(await pixelAt(page, Math.floor(stats.width / 2), Math.floor(stats.height / 2))).not.toEqual([...BACKGROUND, 255]);

    await openFile(page, 'broken.csg', INVALID);
    await expect(page.locator('#source')).toHaveValue(INVALID);
    await expect(page.locator('#diagnostics button')).toHaveText([INVALID_DIAGNOSTIC]);
    expect(prompts.messages).toEqual([]);
    expect(page.errors).toEqual([]);
  });

  test('a file with \\r\\n or lone \\r line breaks opens with \\n line breaks, and then replaces and saves as loaded (D28)', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    for (const [name, text] of [['windows.csg', SPHERE_SOURCE.replace(/\n/g, '\r\n')], ['old-mac.csg', SPHERE_SOURCE.replace(/\n/g, '\r')]]) {
      await openFile(page, name, text);
      await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
      await expect(page.locator('#diagnostics li')).toHaveCount(0);
      // Unedited since the Open: an example replaces it without a prompt.
      await chooseExample(page, PRIMITIVES.id);
      expect(prompts.messages).toEqual([]);
      // Open again, then Save: the file comes back with \n line breaks.
      await openFile(page, name, text);
      const saved = await save(page);
      expect(saved.bytes.equals(Buffer.from(SPHERE_SOURCE, 'utf8'))).toBe(true);
    }
    expect(prompts.messages).toEqual([]);
  });

  test('a file with \\r\\n line breaks, reloaded, still replaces without a prompt (D28)', async ({ page }) => {
    // The stored baseline must be the normalized text too, not only the one in memory.
    const prompts = await start(page);
    await waitForIdle(page);
    await openFile(page, 'windows.csg', SPHERE_SOURCE.replace(/\n/g, '\r\n'));
    await reload(page);
    await waitForIdle(page);
    await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
    await chooseExample(page, PRIMITIVES.id);
    await expect(page.locator('#source')).toHaveValue(PRIMITIVES.source);
    expect(prompts.messages).toEqual([]);
  });

  test('a file that begins with a byte-order mark opens and evaluates with no diagnostics', async ({ page }) => {
    await start(page);
    await waitForIdle(page);
    await openFile(page, 'bom.csg', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(SPHERE_SOURCE)]));
    await expect(page.locator('#diagnostics li')).toHaveCount(0);
    const text = await editorText(page);
    test.info().annotations.push({ type: 'editor text', description: text.startsWith('﻿') ? 'kept the byte-order mark' : 'no byte-order mark' });
    expect(text.replace(/^﻿/, '')).toBe(SPHERE_SOURCE);
  });

  test('cancelling the file chooser changes nothing and asks nothing', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await editAndSettle(page, SPHERE_SOURCE);
    const rebuilds = await counter(page, 'rebuilds');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#open-button').click()]);
    await chooser.setFiles([]);
    await settle(page);
    await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
    expect(await counter(page, 'rebuilds')).toBe(rebuilds);
    expect(prompts.messages).toEqual([]);
  });
});

test.describe('examples', () => {
  test('the picker lists exactly the three examples after its prompt', async ({ page }) => {
    await start(page);
    const options = page.locator('#examples option');
    await expect(options).toHaveText(['Examples…', 'Bored cube', 'Primitives', 'Boolean operations']);
    await expect(options.first()).toBeDisabled();
    await expect(page.locator('#examples')).toHaveValue('');
  });

  test('choosing each example loads its source, with no diagnostics, and the picker resets', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    for (const example of [PRIMITIVES, BOOLEANS, BORED_CUBE]) {
      await chooseExample(page, example.id);
      await expect(page.locator('#source')).toHaveValue(example.source);
      await expect(page.locator('#diagnostics li')).toHaveCount(0);
      await expect(page.locator('#examples')).toHaveValue('');
      await waitForIdle(page);
    }
    expect(prompts.messages).toEqual([]);
    expect(page.errors).toEqual([]);
  });

  test('the same example can be chosen again', async ({ page }) => {
    await start(page);
    await waitForIdle(page);
    await chooseExample(page, PRIMITIVES.id);
    const rebuilds = await counter(page, 'rebuilds');
    await chooseExample(page, PRIMITIVES.id);
    expect(await counter(page, 'rebuilds')).toBe(rebuilds + 1);
    await expect(page.locator('#source')).toHaveValue(PRIMITIVES.source);
  });

  test('an example loads and rebuilds at once, with no 300 ms wait', async ({ page }) => {
    await start(page, { clock: true });
    await page.clock.pauseAt(Date.now() + 60_000);
    await waitForIdle(page);
    const rebuilds = await counter(page, 'rebuilds');
    await page.locator('#examples').selectOption(PRIMITIVES.id);
    expect(await counter(page, 'rebuilds')).toBe(rebuilds + 1);
  });
});

test.describe('confirmation before replacing edited text', () => {
  test('choosing an example over edited text asks; declining leaves the text', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await editAndSettle(page, SPHERE_SOURCE);
    const rebuilds = await counter(page, 'rebuilds');
    await chooseExample(page, PRIMITIVES.id, { loads: false });
    await expect.poll(() => prompts.messages.length).toBe(1);
    expect(prompts.messages).toEqual([CONFIRM_REPLACE]);
    await settle(page);
    await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
    await expect(page.locator('#examples')).toHaveValue('');
    expect(await counter(page, 'rebuilds')).toBe(rebuilds);
  });

  test('choosing an example over edited text asks; accepting replaces it', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await editAndSettle(page, SPHERE_SOURCE);
    prompts.answer = 'accept';
    await chooseExample(page, PRIMITIVES.id);
    expect(prompts.messages).toEqual([CONFIRM_REPLACE]);
    await expect(page.locator('#source')).toHaveValue(PRIMITIVES.source);
  });

  test('opening a file over edited text asks; declining leaves the text, and accepting replaces it', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await editAndSettle(page, SPHERE_SOURCE);
    await openFile(page, 'part.csg', PRIMITIVES.source, { loads: false });
    await expect.poll(() => prompts.messages.length).toBe(1);
    await settle(page);
    await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
    prompts.answer = 'accept';
    await openFile(page, 'part.csg', PRIMITIVES.source);
    expect(prompts.messages).toEqual([CONFIRM_REPLACE, CONFIRM_REPLACE]);
    await expect(page.locator('#source')).toHaveValue(PRIMITIVES.source);
  });

  test('replacing unedited text does not ask, starting with the first-launch bored cube', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await chooseExample(page, PRIMITIVES.id);
    await chooseExample(page, BOOLEANS.id);
    await openFile(page, 'sphere.csg', SPHERE_SOURCE);
    await chooseExample(page, BORED_CUBE.id);
    await expect(page.locator('#source')).toHaveValue(BORED_CUBE.source);
    expect(prompts.messages).toEqual([]);
  });

  test('after a reload, edited text still asks, and unedited text still does not', async ({ page }) => {
    const prompts = await start(page);
    await waitForIdle(page);
    await chooseExample(page, PRIMITIVES.id);
    await reload(page);
    await waitForIdle(page);
    await chooseExample(page, BOOLEANS.id);
    expect(prompts.messages).toEqual([]);

    await editAndSettle(page, SPHERE_SOURCE);
    await reload(page);
    await waitForIdle(page);
    await chooseExample(page, PRIMITIVES.id, { loads: false });
    await expect.poll(() => prompts.messages.length).toBe(1);
    await settle(page);
    await expect(page.locator('#source')).toHaveValue(SPHERE_SOURCE);
  });
});
