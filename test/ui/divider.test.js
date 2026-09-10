import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampEditorWidth } from '../../src/ui/divider.js';
import { SETTINGS } from '../../src/ui/settings.js';

test('settings equal DESIGN §5', () => {
  assert.deepEqual({ ...SETTINGS.divider }, { initialEditor: 420, minEditor: 240, minPreview: 240, keyStep: 16 });
  assert.equal(SETTINGS.rebuildDebounceMs, 300);
  assert.equal(SETTINGS.resizeDebounceMs, 150);
  assert.equal(SETTINGS.renderSliceMs, 12);
});

test('the editor and preview each keep at least 240 px', () => {
  assert.equal(clampEditorWidth(420, 1000), 420);
  assert.equal(clampEditorWidth(100, 1000), 240);
  assert.equal(clampEditorWidth(900, 1000), 760);
});

test('when there is no room for both, the editor keeps its minimum', () => {
  assert.equal(clampEditorWidth(420, 400), 240);
  assert.equal(clampEditorWidth(100, 479), 240);
  assert.equal(clampEditorWidth(420, 480), 240);
});
