import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tokenize } from '../../src/core/lexer.js';
import { parse } from '../../src/core/parser.js';
import { compile } from '../../src/core/render.js';

const CAMERA = 'camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; }\n';

// The single syntax diagnostic for source, as [line, column, message].
function syntaxError(source) {
  const { diagnostics, scene } = compile(source);
  assert.equal(scene, null);
  assert.equal(diagnostics.length, 1, JSON.stringify(diagnostics));
  const [d] = diagnostics;
  return [d.line, d.column, d.message];
}

test('nodes carry source locations', () => {
  const program = parse(tokenize('let r = 5;\nsphere(radius: r);'));
  const [letStatement, call] = program.statements;
  assert.deepEqual(letStatement.nameLoc, { line: 1, column: 5 });
  assert.deepEqual(call.loc, { line: 2, column: 1 });
  assert.deepEqual(call.args[0].loc, { line: 2, column: 8 });
});

test('a missing semicolon is reported at the next token', () => {
  const [line, column, message] = syntaxError('let r = 5\nsphere(r);\n' + CAMERA);
  assert.deepEqual([line, column], [2, 1]);
  assert.match(message, /expected `;` but found `sphere`/);
});

test('vectors need exactly three elements', () => {
  const [line, column, message] = syntaxError('let v = [1, 2];\n' + CAMERA);
  assert.deepEqual([line, column], [1, 14]);
  assert.match(message, /exactly three elements/);
  assert.match(syntaxError('let v = [1, 2, 3, 4];\n' + CAMERA)[2], /exactly three elements/);
});

test('binary arithmetic and parentheses are not supported yet', () => {
  const [line, column, message] = syntaxError('let a = 1 + 2;\n' + CAMERA);
  assert.deepEqual([line, column], [1, 11]);
  assert.match(message, /binary arithmetic .* is not supported yet/);
  assert.match(syntaxError('let a = 2 - 1;\n' + CAMERA)[2], /binary arithmetic .* is not supported yet/);
  const parens = syntaxError('let a = (1);\n' + CAMERA);
  assert.deepEqual(parens, [1, 9, 'parentheses are not supported yet']);
});

test('later constructs are reported as not supported yet, at their location', () => {
  assert.deepEqual(syntaxError('\n\n\n\ncube(10);'), [5, 1, '`cube` is not supported yet']);
  for (const word of ['box', 'cylinder', 'translate', 'rotate', 'scale', 'union', 'intersection', 'difference', 'light', 'material']) {
    assert.deepEqual(syntaxError(`${word} { }`), [1, 1, `\`${word}\` is not supported yet`]);
  }
});

test('reserved words cannot be names', () => {
  const [line, column, message] = syntaxError('let camera = 1;');
  assert.deepEqual([line, column], [1, 5]);
  assert.match(message, /reserved word/);
});

test('a positional argument after a named one is reported at that argument', () => {
  assert.deepEqual(syntaxError('sphere(radius: 12, 5);\n' + CAMERA), [1, 20, 'positional arguments must come before named arguments']);
});

test('parsing stops at the first syntax error', () => {
  const [line] = syntaxError('let a = 1;\nlet b = 2;\nlet $ = 3;\n\n\n\nlet % = 4;\n');
  assert.equal(line, 3);
});

test('an unclosed camera block is a syntax error', () => {
  assert.match(syntaxError('camera { position: [0, 0, 1];')[2], /expected a camera property name or `}` but found the end of the source/);
});
