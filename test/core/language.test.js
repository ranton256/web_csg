// M2 language rules: arithmetic, bodies and scope, and constructs that parse
// now but are rejected until their milestone.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile } from '../../src/core/render.js';
import { VISION_EXAMPLE } from '../support/vision-example.js';

const CAMERA = 'camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; }\n';

const diagnosticsOf = (source) => compile(source).diagnostics.map((d) => [d.line, d.column, d.message]);

// Evaluates expr through the camera position, which must be valid.
function numberOf(expr) {
  const { diagnostics, scene } = compile(`let v = ${expr};\ncamera { position: [v, -100, 1]; lookAt: [0, 0, 0]; }`);
  assert.deepEqual(diagnostics, []);
  return scene.camera.position[0];
}
function vectorOf(expr) {
  const { diagnostics, scene } = compile(`camera { position: ${expr}; lookAt: [0, 0, 0]; }`);
  assert.deepEqual(diagnostics, []);
  return scene.camera.position;
}

test('precedence and associativity', () => {
  assert.equal(numberOf('2 + 3 * 4 - 6 / 2'), 11);
  assert.equal(numberOf('10 - 4 - 3'), 3);
  assert.equal(numberOf('12 / 2 / 3'), 2);
  assert.equal(numberOf('(2 + 3) * 4'), 20);
  assert.equal(numberOf('-2 * 3'), -6);
  assert.equal(numberOf('2 - -3'), 5);
});

test('vector arithmetic', () => {
  assert.deepEqual(vectorOf('[1, 2, 3] * 2 + [1, 1, 1]'), [3, 5, 7]);
  assert.deepEqual(vectorOf('2 * [1, 2, 3]'), [2, 4, 6]);
  assert.deepEqual(vectorOf('[2, 4, 6] / 2'), [1, 2, 3]);
  assert.deepEqual(vectorOf('[5, 5, 5] - [1, 2, 3]'), [4, 3, 2]);
  assert.deepEqual(vectorOf('-[1, 2, 3] * 2'), [-2, -4, -6]);
  assert.deepEqual(vectorOf('[1 + 1, 2 * 3, (4 - 1) / 3]'), [2, 6, 1]);
});

test('invalid operand kinds are errors at the operator', () => {
  assert.deepEqual(diagnosticsOf('let v = [1, 2, 3] * [1, 2, 3];\n' + CAMERA), [[1, 19, 'invalid operands for `*`: vector and vector']]);
  assert.deepEqual(diagnosticsOf('let w = 1 + [1, 2, 3];\n' + CAMERA), [[1, 11, 'invalid operands for `+`: number and vector']]);
  assert.deepEqual(diagnosticsOf('let u = 2 / [1, 2, 3];\n' + CAMERA), [[1, 11, 'invalid operands for `/`: number and vector']]);
  assert.deepEqual(diagnosticsOf('let t = [1, 2, 3] - 1;\n' + CAMERA), [[1, 19, 'invalid operands for `-`: vector and number']]);
});

test('division by zero is an error at the /', () => {
  assert.deepEqual(diagnosticsOf('let a = 1 / (2 - 2);\n' + CAMERA), [[1, 11, 'division by zero']]);
  assert.deepEqual(diagnosticsOf('let v = [1, 2, 3] / 0;\n' + CAMERA), [[1, 19, 'division by zero']]);
});

test('arithmetic overflow is an error at the operator', () => {
  const huge = `1${'0'.repeat(200)}`;
  assert.deepEqual(diagnosticsOf(`let a = ${huge} * ${huge};\n` + CAMERA), [[1, 211, 'the result is too large']]);
});

test('an error inside an expression does not cascade', () => {
  assert.deepEqual(diagnosticsOf('let a = q + 1;\nlet b = a * 2;\n' + CAMERA), [[1, 9, '`q` is undeclared']]);
});

test('long operator chains evaluate without nesting limits or crashes', () => {
  assert.equal(numberOf(`1${' + 1'.repeat(100000)}`), 100001);
});

test('empty bodies are errors at the block keyword', () => {
  assert.ok(diagnosticsOf('union { }\n' + CAMERA).some(([l, c, m]) => l === 1 && c === 1 && m === 'the `union` block contains no solids'));
  const letOnly = diagnosticsOf('translate([1, 0, 0]) { let a = 1; }\n' + CAMERA);
  assert.ok(letOnly.some(([, , m]) => m === 'the `translate` block contains no solids'), JSON.stringify(letOnly));
  assert.ok(!diagnosticsOf('union { sphere(1); }\n' + CAMERA).some(([, , m]) => /no solids/.test(m)));
});

test('let is scoped to its block', () => {
  assert.deepEqual(diagnosticsOf('union { let r = 5; sphere(r); }\nsphere(r);\n' + CAMERA), [
    [1, 1, '`union` is not supported yet'],
    [2, 8, '`r` is undeclared'],
  ]);
});

test('shadowing inside a block is an error', () => {
  assert.deepEqual(diagnosticsOf('let r = 5; union { let r = 6; sphere(r); }\n' + CAMERA), [
    [1, 12, '`union` is not supported yet'],
    [1, 24, '`r` is already declared'],
  ]);
});

test('the contents of unsupported constructs are still checked', () => {
  assert.deepEqual(diagnosticsOf('union { sphere(q); }\ncube(1 + [1, 2, 3]);\n' + CAMERA), [
    [1, 1, '`union` is not supported yet'],
    [1, 16, '`q` is undeclared'],
    [2, 1, '`cube` is not supported yet'],
    [2, 8, 'invalid operands for `+`: number and vector'],
  ]);
  assert.deepEqual(diagnosticsOf('union { sphere(0); }\n' + CAMERA), [
    [1, 1, '`union` is not supported yet'],
    [1, 16, 'the radius must be greater than 0'],
  ]);
  assert.deepEqual(diagnosticsOf('light { direction: [0, 0, q]; }\n' + CAMERA), [
    [1, 1, '`light` is not supported yet'],
    [1, 27, '`q` is undeclared'],
  ]);
});

test('every later construct is reported as not supported yet, at its keyword', () => {
  const cases = {
    cube: 'cube(1);',
    box: 'box([1, 2, 3]);',
    cylinder: 'cylinder(1, 2);',
    translate: 'translate([1, 0, 0]) { sphere(1); }',
    rotate: 'rotate([0, 0, 90]) { sphere(1); }',
    scale: 'scale(2) { sphere(1); }',
    union: 'union { sphere(1); }',
    intersection: 'intersection { sphere(1); }',
    difference: 'difference { sphere(1); }',
    light: 'light { direction: [0, 0, -1]; }',
    material: 'material { color: [1, 0, 0]; }',
  };
  for (const [keyword, source] of Object.entries(cases)) {
    assert.deepEqual(diagnosticsOf(`\n\n\n\n${source}\n` + CAMERA), [[5, 1, `\`${keyword}\` is not supported yet`]], keyword);
  }
});

test('the vision example reports only constructs that are not supported yet', () => {
  const diagnostics = compile(VISION_EXAMPLE).diagnostics;
  assert.ok(diagnostics.length > 0);
  const keywords = new Set(diagnostics.map((d) => {
    const match = /^`(\w+)` is not supported yet$/.exec(d.message);
    assert.ok(match, `unexpected diagnostic ${JSON.stringify(d)}`);
    return match[1];
  }));
  assert.deepEqual([...keywords].sort(), ['cube', 'cylinder', 'difference', 'rotate', 'union']);
});

test('a camera block inside a body is an error, and is still checked', () => {
  const diagnostics = diagnosticsOf(CAMERA + 'union { camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; } sphere(1); }');
  assert.deepEqual(diagnostics, [
    [2, 1, '`union` is not supported yet'],
    [2, 9, 'the camera block must be at the top level'],
  ]);
  const checked = diagnosticsOf(CAMERA + 'union { camera { zoom: 1; } sphere(1); }');
  assert.ok(checked.some(([, , m]) => m === 'unknown camera property `zoom`'), JSON.stringify(checked));
});

test('the default example still compiles to one sphere', () => {
  const { diagnostics, scene } = compile('let r = 40;\n' + CAMERA + 'sphere(radius: r / 2 + 20);');
  assert.deepEqual(diagnostics, []);
  assert.equal(scene.solids[0].radius, 40);
});
