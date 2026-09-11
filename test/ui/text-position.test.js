import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lineColumnToOffset, lineCount } from '../../src/ui/text-position.js';

test('lineCount counts \\n-separated lines', () => {
  assert.equal(lineCount(''), 1);
  assert.equal(lineCount('a'), 1);
  assert.equal(lineCount('a\nb'), 2);
  assert.equal(lineCount('a\n'), 2);
  assert.equal(lineCount('a\r\nb\r\n'), 3);
});

test('lineColumnToOffset maps 1-based line and column to an offset', () => {
  assert.equal(lineColumnToOffset('ab\ncd', 1, 1), 0);
  assert.equal(lineColumnToOffset('ab\ncd', 2, 2), 4);
  assert.equal(lineColumnToOffset('// x\nlet r = 40;\n\nlet b=q;\n', 4, 7), 24);
});

test('an emoji before the column counts as one column but two code units', () => {
  const text = '/*😀*/ sphere(0);';
  const offset = lineColumnToOffset(text, 1, 14);
  assert.equal(offset, 14);
  assert.equal(text[offset], '0');
});

test('a leading byte-order mark takes no column, as in the lexer (D17)', () => {
  const bom = String.fromCodePoint(0xfeff);
  const text = `${bom}sphere(0);\ncube(1);`;
  // The lexer reports sphere(0)'s radius at 1:8, which is offset 8 here.
  assert.equal(lineColumnToOffset(text, 1, 8), 8);
  assert.equal(text[lineColumnToOffset(text, 1, 8)], '0');
  assert.equal(lineColumnToOffset(text, 1, 1), 1);
  // The mark (offset 0), sphere(0); (1 to 10), and the line feed (11): line 2 starts at 12.
  assert.equal(lineColumnToOffset(text, 2, 1), 12, 'later lines are unaffected');
  assert.equal(lineColumnToOffset(`a${bom}b`, 1, 3), 2, 'a mark that is not first is a character');
});

test('positions past the end are clamped', () => {
  assert.equal(lineColumnToOffset('ab\ncd', 1, 99), 2);
  assert.equal(lineColumnToOffset('ab\ncd', 9, 1), 5);
  assert.equal(lineColumnToOffset('ab\r\ncd', 1, 9), 2, 'a \\r before \\n is not part of the line');
  assert.equal(lineColumnToOffset('ab\r\ncd', 2, 1), 4);
});
