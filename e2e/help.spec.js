import { expect, test } from '@playwright/test';
import { counter, openApp, waitForCounter, waitForIdle } from './support.js';

// The Help dialog (language-help; DESIGN §8 Editor indentation and help; D23).
test.beforeEach(async ({ page }) => {
  await openApp(page);
  await waitForIdle(page);
});

const focusedId = (page) => page.evaluate(() => document.activeElement?.id ?? '');
const focusInsideHelp = (page) => page.evaluate(() => document.getElementById('help').contains(document.activeElement));

test('Help opens with the keyboard, shows the reference, and Esc returns focus to the Help button', async ({ page }) => {
  await page.locator('#help-button').focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('#help');
  await expect(dialog).toBeVisible();
  expect(await focusInsideHelp(page)).toBe(true);
  await expect(page.locator('#help-title')).toHaveText('Modeling language help');
  for (const title of ['Statements and comments', 'let', 'Primitives', 'Transforms', 'Booleans', 'camera', 'light', 'material', 'Example']) {
    await expect(dialog.getByRole('heading', { name: title, exact: true })).toHaveCount(1);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await focusedId(page)).toBe('help-button');
  expect(page.errors).toEqual([]);
});

test('the Close button closes Help', async ({ page }) => {
  await page.locator('#help-button').click();
  await expect(page.locator('#help')).toBeVisible();
  await page.locator('#help-close').click();
  await expect(page.locator('#help')).toBeHidden();
});

test('opening and closing Help leaves the source, caret, and rebuild count unchanged', async ({ page }) => {
  const text = 'let r = 5;\ncamera { position: [0, -100, 0]; lookAt: [0, 0, 0]; }\nsphere(r);\ncube(2);\n';
  const filled = await counter(page, 'rebuilds');
  await page.locator('#source').fill(text);
  // Let the rebuild from the fill happen first, so only Help could change the count below.
  await waitForCounter(page, 'rebuilds', filled + 1);
  const caret = text.indexOf('sphere') + 4; // line 3, column 5
  await page.locator('#source').evaluate((el, at) => el.setSelectionRange(at, at), caret);
  await waitForIdle(page);
  const rebuilds = await counter(page, 'rebuilds');
  await page.locator('#help-button').click();
  await expect(page.locator('#help')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#help')).toBeHidden();
  await page.waitForTimeout(500); // past the 300 ms rebuild debounce
  await expect(page.locator('#source')).toHaveValue(text);
  expect(await page.locator('#source').evaluate((el) => [el.selectionStart, el.selectionEnd])).toEqual([caret, caret]);
  expect(await counter(page, 'rebuilds')).toBe(rebuilds);
});
