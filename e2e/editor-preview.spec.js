import { expect, test } from '@playwright/test';
import { DEFAULT_SOURCE } from '../src/ui/default-source.js';
import { BACKGROUND, counter, dragDivider, dragDividerTo, editAndSettle, imageStats, openApp, pixelAt, waitForCounter, waitForIdle, widthOf } from './support.js';

const CAMERA = 'camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; }';

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await waitForIdle(page);
});

test('the example renders on load, one ray per CSS pixel of the panel', async ({ page }) => {
  await expect(page.locator('#source')).toHaveValue(DEFAULT_SOURCE);
  const panel = await page.locator('#preview-panel').evaluate((el) => [el.clientWidth, el.clientHeight]);
  const stats = await imageStats(page);
  expect([stats.width, stats.height]).toEqual(panel.map(Math.floor));
  expect(await pixelAt(page, Math.floor(stats.width / 2), Math.floor(stats.height / 2))).not.toEqual([...BACKGROUND, 255]);
  expect(await pixelAt(page, 0, 0)).toEqual([...BACKGROUND, 255]);
  await expect(page.locator('#diagnostics li')).toHaveCount(0);
  await expect(page.locator('#stale')).toBeHidden();
  await expect(page.locator('#status')).toBeHidden();
  expect(page.errors).toEqual([]);
});

test('the gutter numbers follow the line count', async ({ page }) => {
  await page.locator('#source').fill(Array.from({ length: 12 }, (_, i) => `// line ${i + 1}`).join('\n'));
  await expect(page.locator('#gutter')).toHaveText(Array.from({ length: 12 }, (_, i) => i + 1).join('\n'));
});

test('the gutter scrolls with the text', async ({ page }) => {
  await page.locator('#source').fill(Array.from({ length: 200 }, (_, i) => `// line ${i + 1}`).join('\n'));
  await page.locator('#source').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect.poll(() => page.evaluate(() => {
    const source = document.getElementById('source');
    const gutter = document.getElementById('gutter');
    return source.scrollTop > 0 && gutter.scrollTop === source.scrollTop;
  })).toBe(true);
  expect((await page.locator('#gutter').textContent()).endsWith('\n200')).toBe(true);
});

test('clicking a diagnostic moves the caret to its line and column', async ({ page }) => {
  const source = `// x\nlet r = 40;\n\nlet b=q;\n${CAMERA}\nsphere(radius: r);\n`;
  await editAndSettle(page, source);
  const entry = page.locator('#diagnostics button');
  await expect(entry).toHaveText(['4:7 `q` is undeclared']);
  await entry.click();
  expect(await page.evaluate(() => [document.activeElement.id, document.activeElement.selectionStart])).toEqual(['source', 24]);
});

test('the caret lands correctly after an emoji', async ({ page }) => {
  await editAndSettle(page, `/*😀*/ sphere(0);\n${CAMERA}\n`);
  const entry = page.locator('#diagnostics button');
  await expect(entry).toHaveText(['1:14 the radius must be greater than 0']);
  await entry.click();
  const [offset, char] = await page.locator('#source').evaluate((el) => [el.selectionStart, el.value[el.selectionStart]]);
  expect([offset, char]).toEqual([14, '0']);
});

test('dragging the divider trades editor width for preview width', async ({ page }) => {
  const editor = await widthOf(page, '#editor-pane');
  const preview = await widthOf(page, '#preview-panel');
  expect(Math.round(editor)).toBe(420);
  await dragDivider(page, 100);
  expect(Math.round(await widthOf(page, '#editor-pane') - editor)).toBe(100);
  expect(Math.round(preview - await widthOf(page, '#preview-panel'))).toBe(100);
});

test('the divider keeps both sides at least 240 px', async ({ page }) => {
  const viewportWidth = page.viewportSize().width;
  await dragDividerTo(page, 5);
  expect(Math.round(await widthOf(page, '#editor-pane'))).toBe(240);
  await dragDividerTo(page, viewportWidth - 5);
  expect(Math.round(await widthOf(page, '#preview-panel'))).toBe(240);
});

test('arrow keys move the focused divider 16 px', async ({ page }) => {
  const editor = await widthOf(page, '#editor-pane');
  await page.locator('#divider').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect(Math.round(await widthOf(page, '#editor-pane') - editor)).toBe(32);
  await expect(page.locator('#divider')).toHaveAttribute('aria-valuenow', String(Math.round(editor) + 32));
});

test('a window too narrow for both minimums keeps the editor at 240 px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 700 });
  await expect.poll(async () => Math.round(await widthOf(page, '#editor-pane'))).toBe(240);
  const divider = await widthOf(page, '#divider');
  expect(Math.round(await widthOf(page, '#preview-panel'))).toBe(Math.round(400 - 240 - divider));
});

// Tab indentation (DESIGN §8 Editor indentation and help; D23).
test.describe('Tab indentation', () => {
  const LINES = 'sphere(1);\ncube(2);\nbox([1, 2, 3]);';
  const LINE2 = LINES.indexOf('cube');

  async function setSource(page, text, start, end = start) {
    await page.locator('#source').fill(text);
    await page.locator('#source').evaluate((el, [s, e]) => el.setSelectionRange(s, e), [start, end]);
  }
  const selection = (page) => page.locator('#source').evaluate((el) => [el.selectionStart, el.selectionEnd]);
  const focusedId = (page) => page.evaluate(() => document.activeElement?.id ?? '');

  test('Tab inserts two spaces at the caret and keeps focus in the editor', async ({ page }) => {
    await setSource(page, LINES, LINE2);
    await page.keyboard.press('Tab');
    await expect(page.locator('#source')).toHaveValue('sphere(1);\n  cube(2);\nbox([1, 2, 3]);');
    expect(await selection(page)).toEqual([LINE2 + 2, LINE2 + 2]);
    expect(await focusedId(page)).toBe('source');
  });

  test('Tab indents every selected line', async ({ page }) => {
    await setSource(page, LINES, 3, LINE2 + 2);
    await page.keyboard.press('Tab');
    await expect(page.locator('#source')).toHaveValue('  sphere(1);\n  cube(2);\nbox([1, 2, 3]);');
  });

  test('Shift+Tab removes up to two leading spaces', async ({ page }) => {
    await setSource(page, '   cube(2);', 11);
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#source')).toHaveValue(' cube(2);');
  });

  test('Esc, then Tab, leaves the editor with the text unchanged', async ({ page }) => {
    await setSource(page, LINES, LINE2);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    expect(await focusedId(page)).not.toBe('source');
    await expect(page.locator('#source')).toHaveValue(LINES);
  });

  test('a Tab edit triggers a rebuild, and undo treats it exactly like typed spaces', async ({ page, browserName }) => {
    // The same state is built by real typing each time: "x" at the end, caret before it.
    async function undoAfter(action) {
      await page.reload();
      await waitForIdle(page);
      await page.locator('#source').click();
      await page.keyboard.press('ControlOrMeta+End');
      await page.keyboard.type('x');
      await page.keyboard.press('ArrowLeft');
      const before = await counter(page, 'rebuilds');
      await action();
      await waitForCounter(page, 'rebuilds', before + 1);
      await page.keyboard.press('ControlOrMeta+z');
      return page.locator('#source').inputValue();
    }
    const afterTab = await undoAfter(() => page.keyboard.press('Tab'));
    const afterSpaces = await undoAfter(() => page.keyboard.type('  '));
    expect(afterTab).toBe(afterSpaces);
    // Chromium and Firefox keep typing and the indentation as separate steps; WebKit groups them.
    if (browserName !== 'webkit') expect(afterTab).toBe(DEFAULT_SOURCE + 'x');
  });

  test('the header has a keyboard-focusable Help button', async ({ page }) => {
    const button = page.locator('header #help-button');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Help');
    await button.focus();
    expect(await focusedId(page)).toBe('help-button');
  });
});
