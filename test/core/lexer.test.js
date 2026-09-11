import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHARACTER_NAMES, SourceError, describeCharacter, tokenize } from '../../src/core/lexer.js';

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
  assert.deepEqual([error.column, error.message], [5, "unexpected character '😀' (U+1F600)"]);
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

// D17: the leading byte-order mark, and how unexpected characters are named.
// Characters that cannot be seen are built from their code points, so every
// source below is readable as written.

const BOM = String.fromCodePoint(0xfeff);
const NBSP = String.fromCodePoint(0xa0);
const EM_SPACE = String.fromCodePoint(0x2003);
const BELL = String.fromCodePoint(0x7);
const FUNCTION_APPLICATION = String.fromCodePoint(0x2061); // invisible, with no name in the list
const ZERO_WIDTH_SPACE = String.fromCodePoint(0x200b);
const E_ACUTE = String.fromCodePoint(0xe9);
const EMOJI = String.fromCodePoint(0x1f600);

const failure = (source) => {
  const error = errorFrom(source);
  return [error.line, error.column, error.message];
};

test('a leading byte-order mark is skipped and takes no column', () => {
  assert.deepEqual(summary(tokenize(`${BOM}let r = 1.5;`)), summary(tokenize('let r = 1.5;')));
  assert.deepEqual(failure(`${BOM}let a = 1;\nlet $ = 2;`), [2, 5, "unexpected character '$'"]);
  assert.deepEqual(failure(`${BOM}$`), [1, 1, "unexpected character '$'"]);
});

test('a byte-order mark anywhere else is an unexpected character', () => {
  const message = 'unexpected character U+FEFF (byte-order mark)';
  assert.deepEqual(failure(`${BOM}${BOM}let a = 1;`), [1, 1, message]);
  assert.deepEqual(failure(`let a = 1;${BOM}`), [1, 11, message]);
  assert.deepEqual(failure(`let a = 1;\n${BOM}`), [2, 1, message]);
});

test('identifiers are ASCII: a non-ASCII letter is named with its code point', () => {
  assert.deepEqual(failure(`let ${E_ACUTE} = 1;`), [1, 5, `unexpected character '${E_ACUTE}' (U+00E9)`]);
});

test('whitespace is ASCII: a non-breaking space or an em space is named, not shown', () => {
  assert.deepEqual(failure(`sphere(${NBSP}5);`), [1, 8, 'unexpected character U+00A0 (no-break space)']);
  assert.deepEqual(failure(`sphere(${EM_SPACE}5);`), [1, 8, 'unexpected character U+2003 (em space)']);
});

test('an invisible character without a name shows its code point, padded to four digits', () => {
  assert.deepEqual(failure(`let a = 1;${BELL}`), [1, 11, 'unexpected character U+0007']);
  assert.deepEqual(failure(`let a${FUNCTION_APPLICATION} = 1;`), [1, 6, 'unexpected character U+2061']);
});

test('comments may contain any character', () => {
  const source = `// caf${E_ACUTE} ${ZERO_WIDTH_SPACE}${BOM}${NBSP}${EMOJI}\n/*${NBSP}${E_ACUTE}${BELL} */ x`;
  // Line 2 is "/*", three characters, " */", then " x": x is at column 10.
  assert.deepEqual(summary(tokenize(source)), [['identifier', 'x', 2, 10], ['eof', null, 2, 11]]);
});

test('every name in the D17 list belongs to an invisible character with that code point', () => {
  const expected = [
    [0x00a0, 'no-break space'], [0x00ad, 'soft hyphen'], [0x2002, 'en space'], [0x2003, 'em space'],
    [0x2009, 'thin space'], [0x200b, 'zero-width space'], [0x200c, 'zero-width non-joiner'],
    [0x200d, 'zero-width joiner'], [0x2028, 'line separator'], [0x2029, 'paragraph separator'],
    [0x202f, 'narrow no-break space'], [0x2060, 'word joiner'], [0x3000, 'ideographic space'],
    [0xfeff, 'byte-order mark'],
  ];
  assert.deepEqual([...CHARACTER_NAMES], expected);
  for (const [codePoint, name] of expected) {
    const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
    assert.equal(describeCharacter(String.fromCodePoint(codePoint)), `U+${hex} (${name})`);
  }
  assert.equal(describeCharacter('$'), "'$'");
  assert.equal(describeCharacter(EMOJI), `'${EMOJI}' (U+1F600)`);
});
