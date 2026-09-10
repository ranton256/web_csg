import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SourceError, tokenize } from '../../src/core/lexer.js';

const summary = (tokens) => tokens.map((t) => [t.type, t.value, t.line, t.column]);

function errorFrom(source) {
  try {
    tokenize(source);
  } catch (error) {
    assert.ok(error instanceof SourceError, `expected SourceError, got ${error}`);
    return error;
  }
  assert.fail(`expected ${JSON.stringify(source)} to fail`);
}

test('numbers, names, reserved words, and punctuation carry positions', () => {
  assert.deepEqual(summary(tokenize('let r = 1.5;')), [
    ['keyword', 'let', 1, 1],
    ['identifier', 'r', 1, 5],
    ['punct', '=', 1, 7],
    ['number', 1.5, 1, 9],
    ['punct', ';', 1, 12],
    ['eof', null, 1, 13],
  ]);
});

test('comments are ignored but still advance positions', () => {
  const tokens = tokenize('// note\nlet /* a\nb */ r');
  assert.deepEqual(summary(tokens), [
    ['keyword', 'let', 2, 1],
    ['identifier', 'r', 3, 6],
    ['eof', null, 3, 7],
  ]);
});

test('exponent numbers are rejected at their start', () => {
  const error = errorFrom('let a = 1e3;');
  assert.deepEqual([error.line, error.column], [1, 9]);
  assert.match(error.message, /malformed number/);
});

test('a bare leading or trailing . is rejected', () => {
  assert.deepEqual([errorFrom('let a = .5;').column, errorFrom('let a = .5;').message], [9, "unexpected character '.'"]);
  const trailing = errorFrom('let a = 5.;');
  assert.equal(trailing.column, 9);
  assert.match(trailing.message, /malformed number/);
});

test('an unterminated block comment is reported at its start', () => {
  const error = errorFrom('let a = 1;\n/* never closed');
  assert.deepEqual([error.line, error.column, error.message], [2, 1, 'unterminated block comment']);
});

test('\\r\\n counts as one line break and a tab as one column', () => {
  const crlf = tokenize('a\r\nb');
  assert.deepEqual([crlf[1].line, crlf[1].column], [2, 1]);
  const tab = tokenize('\tb');
  assert.deepEqual([tab[0].line, tab[0].column], [1, 2]);
});

test('columns count characters: an emoji is one column', () => {
  const tokens = tokenize('/*😀*/ sphere(0);');
  assert.deepEqual(tokens.find((t) => t.type === 'number').column, 14);
  const error = errorFrom('let 😀 = 1;');
  assert.deepEqual([error.column, error.message], [5, "unexpected character '😀'"]);
  assert.equal(tokenize('x\n/*😀*/ y')[1].column, 7);
});

test('numbers too large to represent are rejected', () => {
  const error = errorFrom(`sphere(1${'0'.repeat(400)});`);
  assert.deepEqual([error.line, error.column, error.message], [1, 8, 'number is too large']);
});

test('an unexpected character is reported where it appears', () => {
  const error = errorFrom('let a = 1;\nlet $ = 2;');
  assert.deepEqual([error.line, error.column, error.message], [2, 5, "unexpected character '$'"]);
});
