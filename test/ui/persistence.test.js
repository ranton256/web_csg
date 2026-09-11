// Saving the editor text, and the confirmation and file-name rules (DESIGN §8
// Save, load, and examples; D26).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStore, needsConfirm, saveFileName } from '../../src/ui/persistence.js';

function fakeStorage() {
  const items = new Map();
  return {
    items,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

test('needsConfirm: only when the text differs from the last loaded text', () => {
  assert.equal(needsConfirm('sphere(1);', 'sphere(1);'), false);
  assert.equal(needsConfirm('', ''), false);
  assert.equal(needsConfirm('sphere(1);', 'sphere(2);'), true);
  assert.equal(needsConfirm('sphere(1);', null), true, 'a missing baseline always asks');
});

test('saveFileName: the last opened file or example name, else model.csg', () => {
  assert.equal(saveFileName(null), 'model.csg');
  assert.equal(saveFileName('part.csg'), 'part.csg');
  assert.equal(saveFileName('primitives.csg'), 'primitives.csg');
});

test('createStore: the source and baseline are saved exactly, under their keys', () => {
  const storage = fakeStorage();
  const store = createStore(() => storage);
  assert.equal(store.load(), null, 'nothing saved');
  store.saveSource('sphere(1);\r\n');
  assert.deepEqual(store.load(), { source: 'sphere(1);\r\n', baseline: null }, 'a source without a baseline');
  store.saveBaseline('cube(2);');
  assert.deepEqual(store.load(), { source: 'sphere(1);\r\n', baseline: 'cube(2);' });
  store.saveSource('');
  assert.deepEqual(store.load(), { source: '', baseline: 'cube(2);' }, 'empty text is a saved source');
  assert.deepEqual([...storage.items.keys()].sort(), ['web-csg.baseline', 'web-csg.source']);
});

test('createStore: storage that cannot be reached means no autosave, and no error', () => {
  const store = createStore(() => {
    throw new Error('SecurityError: access denied');
  });
  assert.equal(store.load(), null);
  assert.doesNotThrow(() => {
    store.saveSource('sphere(1);');
    store.saveBaseline('sphere(1);');
  });
});

test('createStore: a failing write (a full storage) or read is ignored', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  const fullStore = createStore(() => full);
  assert.doesNotThrow(() => fullStore.saveSource('sphere(1);'));
  assert.equal(fullStore.load(), null);
  const unreadable = { getItem: () => { throw new Error('read failed'); }, setItem: () => {} };
  assert.equal(createStore(() => unreadable).load(), null);
});
