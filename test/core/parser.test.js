import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tokenize } from '../../src/core/lexer.js';
import { parse } from '../../src/core/parser.js';
import { compile } from '../../src/core/render.js';
import { VISION_EXAMPLE } from '../support/vision-example.js';

const CAMERA = 'camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; }\n';
const parseSource = (source) => parse(tokenize(source));

// The single syntax diagnostic for source, as [line, column, message].
function syntaxError(source) {
  const { diagnostics, scene } = compile(source);
  assert.equal(scene, null);
  assert.equal(diagnostics.length, 1, JSON.stringify(diagnostics));
  const [d] = diagnostics;
  return [d.line, d.column, d.message];
}

test('nodes carry source locations', () => {
  const program = parseSource('let r = 5;\nsphere(radius: r);');
  const [letStatement, call] = program.statements;
  assert.deepEqual(letStatement.nameLoc, { line: 1, column: 5 });
  assert.deepEqual(call.loc, { line: 2, column: 1 });
  assert.deepEqual(call.args[0].loc, { line: 2, column: 8 });
});

test('binary operators build flat chains, with * and / binding tighter than + and -', () => {
  const [statement] = parseSource('let a = 2 + 3 * 4 - 6 / 2;').statements;
  const chain = statement.value;
  assert.equal(chain.type, 'Chain');
  assert.equal(chain.first.value, 2);
  assert.deepEqual(chain.rest.map((part) => part.op), ['+', '-']);
  assert.deepEqual(chain.rest[0].operand.rest.map((part) => part.op), ['*']);
  assert.deepEqual(chain.rest[1].operand.rest.map((part) => part.op), ['/']);
  assert.deepEqual(chain.rest[0].loc, { line: 1, column: 11 });
});

test('parentheses group without adding nodes, and unary minus binds tightest', () => {
  const [grouped, negated] = parseSource('let a = (2 + 3) * 4;\nlet b = -2 * 3;').statements;
  assert.equal(grouped.value.first.type, 'Chain');
  assert.deepEqual(grouped.value.first.rest.map((part) => part.op), ['+']);
  assert.equal(negated.value.first.type, 'Negate');
  assert.deepEqual(negated.value.rest.map((part) => part.op), ['*']);
});

test('every statement form parses', () => {
  const program = parseSource([
    'box([1, 2, 3]);',
    'cylinder(1, 2);',
    'scale(2) { sphere(1); }',
    'translate([1, 0, 0]) { rotate([0, 0, 90]) { cube(1); } }',
    'intersection { sphere(1); sphere(2); }',
    'difference { sphere(2); union { sphere(1); } }',
    'light { direction: [0, 0, -1]; }',
    'material { color: [1, 0, 0]; }',
  ].join('\n'));
  assert.deepEqual(program.statements.map((s) => s.type), [
    'Call', 'Call', 'Transform', 'Transform', 'Boolean', 'Boolean', 'PropertyBlock', 'PropertyBlock',
  ]);
  assert.equal(program.statements[3].body[0].body[0].callee, 'cube');
});

test('the vision example parses', () => {
  assert.doesNotThrow(() => parseSource(VISION_EXAMPLE));
});

test('a missing semicolon is reported at the next token', () => {
  const [line, column, message] = syntaxError('let r = 5\nsphere(r);\n' + CAMERA);
  assert.deepEqual([line, column], [2, 1]);
  assert.match(message, /expected `;` but found `sphere`/);
});

test('a transform requires a braced body, and transforms are not chained', () => {
  assert.deepEqual(syntaxError('translate([1, 0, 0]) sphere(1);'), [1, 22, 'expected `{` but found `sphere`']);
  assert.deepEqual(syntaxError('translate([1, 0, 0]) rotate([0, 0, 90]) { sphere(1); }'), [1, 22, 'expected `{` but found `rotate`']);
});

test('an unclosed body is a syntax error', () => {
  assert.deepEqual(syntaxError('union { sphere(1);'), [1, 19, 'expected `}` but found the end of the source']);
});

test('vectors need exactly three elements', () => {
  const [line, column, message] = syntaxError('let v = [1, 2];\n' + CAMERA);
  assert.deepEqual([line, column], [1, 14]);
  assert.match(message, /exactly three elements/);
  assert.match(syntaxError('let v = [1, 2, 3, 4];\n' + CAMERA)[2], /exactly three elements/);
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

test('expressions may nest up to 100 levels (D15)', () => {
  assert.deepEqual(compile(`let a = ${'-'.repeat(100)}1;\n` + CAMERA).diagnostics, []);
  assert.deepEqual(syntaxError(`let a = ${'-'.repeat(101)}1;\n` + CAMERA), [1, 109, 'expressions are nested too deeply (more than 100 levels)']);
  const nestedVectors = (k) => `let v = ${'['.repeat(k)}1${', 2, 3]'.repeat(k)};\n` + CAMERA;
  assert.equal(compile(nestedVectors(100)).diagnostics[0].message, 'vector elements must be numbers');
  assert.match(syntaxError(nestedVectors(101))[2], /nested too deeply/);
});

test('parentheses and bodies count as nesting levels (D18)', () => {
  const parens = (k) => `let a = ${'('.repeat(k)}1${')'.repeat(k)};\n` + CAMERA;
  assert.deepEqual(compile(parens(100)).diagnostics, []);
  assert.deepEqual(syntaxError(parens(101)), [1, 109, 'expressions are nested too deeply (more than 100 levels)']);

  const bodies = (k) => `${'union { '.repeat(k)}sphere(1);${' }'.repeat(k)}\n` + CAMERA;
  assert.ok(compile(bodies(100)).diagnostics.every((d) => !/nested too deeply/.test(d.message)));
  assert.deepEqual(syntaxError(bodies(101)), [1, 801, 'blocks are nested too deeply (more than 100 levels)']);

  // Levels are shared: 99 bodies plus 2 levels of unary minus is 101.
  assert.match(syntaxError(`${'union { '.repeat(99)}sphere(--1);${' }'.repeat(99)}`)[2], /nested too deeply/);
});

test('pathologically deep input yields a diagnostic, not a crash', () => {
  assert.match(syntaxError(`let a = ${'-'.repeat(10000)}1;`)[2], /nested too deeply/);
  assert.match(syntaxError(`let v = ${'['.repeat(5000)}1;`)[2], /nested too deeply/);
  assert.match(syntaxError(`let v = ${'('.repeat(5000)}1;`)[2], /nested too deeply/);
  assert.match(syntaxError(`${'union { '.repeat(5000)}`)[2], /nested too deeply/);
});
