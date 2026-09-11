import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEdit, indentEdit } from '../../src/ui/indent.js';

// Applies Tab (or Shift+Tab) to text with the selection [start, end) and
// returns the new text and selection.
function press(text, start, end = start, outdent = false) {
  const edit = indentEdit(text, start, end, { outdent });
  return { text: applyEdit(text, edit), start: edit.selectionStart, end: edit.selectionEnd };
}

const SOURCE = 'sphere(1);\ncube(2);\nbox([1, 2, 3]);';
const LINE2 = SOURCE.indexOf('cube');
const LINE3 = SOURCE.indexOf('box');

test('Tab with no selection inserts two spaces at the caret', () => {
  assert.deepEqual(press(SOURCE, LINE2), { text: 'sphere(1);\n  cube(2);\nbox([1, 2, 3]);', start: LINE2 + 2, end: LINE2 + 2 });
  assert.deepEqual(press('abc', 1), { text: 'a  bc', start: 3, end: 3 });
});

test('Tab with a selection inside one line replaces it with two spaces', () => {
  assert.deepEqual(press('cube(20);', 5, 7), { text: 'cube(  );', start: 7, end: 7 });
});

test('Tab with a multi-line selection indents every touched line; the selection moves with its text', () => {
  const result = press(SOURCE, 3, LINE2 + 2);
  assert.equal(result.text, '  sphere(1);\n  cube(2);\nbox([1, 2, 3]);');
  // It covers the same text, plus the indentation inserted inside it (the start of line 2).
  assert.equal(result.text.slice(result.start, result.end), 'ere(1);\n  cu');
});

test('a selection ending at the start of a line does not touch that line', () => {
  // Lines 1 and 2 in full, ending exactly at column 1 of line 3.
  const result = press(SOURCE, 0, LINE3);
  assert.equal(result.text, '  sphere(1);\n  cube(2);\nbox([1, 2, 3]);');
  assert.equal(result.text.slice(result.start, result.end), '  sphere(1);\n  cube(2);\n'.slice(2));
  // A selection of line 1 and its newline indents line 1 only, and keeps the newline.
  assert.equal(press(SOURCE, 0, LINE2).text, '  sphere(1);\ncube(2);\nbox([1, 2, 3]);');
});

test('Shift+Tab removes up to two leading spaces from the caret line', () => {
  for (const [spaces, left] of [[0, 0], [1, 0], [2, 0], [3, 1]]) {
    const line = ' '.repeat(spaces) + 'cube(2);';
    const result = press(line, line.length, line.length, true);
    assert.equal(result.text, ' '.repeat(left) + 'cube(2);', `${spaces} leading spaces`);
    assert.equal(result.start, line.length - (spaces - left));
  }
});

test('Shift+Tab over several lines outdents each touched line and keeps the selection over the same text', () => {
  const text = '    a;\n b;\nc;\n  d;';
  const start = text.indexOf('a');
  const end = text.indexOf('d');
  const result = press(text, start, end, true);
  assert.equal(result.text, '  a;\nb;\nc;\nd;');
  assert.equal(result.text.slice(result.start, result.end), 'a;\nb;\nc;\n');
});

test('Shift+Tab with the caret inside the removed spaces moves it to the line start', () => {
  const result = press('  a;', 1, 1, true);
  assert.deepEqual(result, { text: 'a;', start: 0, end: 0 });
});
