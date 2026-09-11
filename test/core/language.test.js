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

test('arguments of a transform are checked', () => {
  assert.deepEqual(diagnosticsOf('translate([q, 0, 0]) { sphere(1); }\n' + CAMERA), [
    [1, 12, '`q` is undeclared'],
  ]);
});

test('a nested transform or Boolean block counts as a solid in a body', () => {
  for (const source of ['union { union { sphere(1); } }', 'union { translate([1, 0, 0]) { sphere(1); } }']) {
    const diagnostics = diagnosticsOf(source + '\n' + CAMERA);
    assert.ok(!diagnostics.some(([, , m]) => /no solids/.test(m)), `${source}: ${JSON.stringify(diagnostics)}`);
  }
});

test('empty bodies are errors at the block keyword', () => {
  assert.ok(diagnosticsOf('union { }\n' + CAMERA).some(([l, c, m]) => l === 1 && c === 1 && m === 'the `union` block contains no solids'));
  const letOnly = diagnosticsOf('translate([1, 0, 0]) { let a = 1; }\n' + CAMERA);
  assert.ok(letOnly.some(([, , m]) => m === 'the `translate` block contains no solids'), JSON.stringify(letOnly));
  assert.ok(!diagnosticsOf('union { sphere(1); }\n' + CAMERA).some(([, , m]) => /no solids/.test(m)));
});

test('let is scoped to its block', () => {
  assert.deepEqual(diagnosticsOf('union { let r = 5; sphere(r); }\nsphere(r);\n' + CAMERA), [
    [2, 8, '`r` is undeclared'],
  ]);
});

test('shadowing inside a block is an error', () => {
  assert.deepEqual(diagnosticsOf('let r = 5; union { let r = 6; sphere(r); }\n' + CAMERA), [
    [1, 24, '`r` is already declared'],
  ]);
});

test('errors inside light and material blocks are reported, with no "not supported" diagnostic', () => {
  assert.deepEqual(diagnosticsOf('light { direction: [0, 0, q]; }\nmaterial { color: 1 + [1, 2, 3]; }\n' + CAMERA), [
    [1, 27, '`q` is undeclared'],
    [2, 21, 'invalid operands for `+`: number and vector'],
  ]);
});

test('errors inside a Boolean are reported, with no "not supported" diagnostic', () => {
  assert.deepEqual(diagnosticsOf('union { sphere(q); }\n' + CAMERA), [[1, 16, '`q` is undeclared']]);
  assert.deepEqual(diagnosticsOf('difference { sphere(0); }\n' + CAMERA), [[1, 21, 'the radius must be greater than 0']]);
  assert.deepEqual(diagnosticsOf('intersection { sphere(1); }\n' + CAMERA), []);
});

test('valid light and material blocks produce no diagnostics: no construct is "not supported yet"', () => {
  assert.deepEqual(diagnosticsOf('\n\n\n\nlight { direction: [0, 0, 1]; }\nmaterial { color: [1, 0, 0]; }\n' + CAMERA), []);
});

// The placed primitives of a scene tree, in source order.
function leaves(node) {
  return node.kind === 'primitive' ? [node] : node.children.flatMap(leaves);
}

test('the vision example has no diagnostics: a cube minus the union of three cylinders', () => {
  const { diagnostics, scene } = compile(VISION_EXAMPLE);
  assert.deepEqual(diagnostics, []);
  assert.equal(scene.root.children.length, 1);
  const [model] = scene.root.children;
  assert.equal(model.kind, 'difference');
  assert.equal(model.children.length, 2);
  const [cube, cutters] = model.children;
  assert.deepEqual([cube.kind, cube.type, cube.size], ['primitive', 'cube', 60]);
  assert.equal(cutters.kind, 'union');
  assert.deepEqual(leaves(cutters).map(({ type, radius, height }) => [type, radius, height]), [
    ['cylinder', 12, 62],
    ['cylinder', 12, 62],
    ['cylinder', 12, 62],
  ]);
});

test('primitive dimensions must be positive, of the right kind', () => {
  assert.deepEqual(diagnosticsOf('cube(0);\n' + CAMERA), [[1, 6, 'the size must be greater than 0']]);
  assert.deepEqual(diagnosticsOf('cube([1, 2, 3]);\n' + CAMERA), [[1, 6, 'the size must be a number']]);
  assert.deepEqual(diagnosticsOf('box([10, -1, 10]);\n' + CAMERA), [[1, 5, 'each size component must be greater than 0']]);
  assert.deepEqual(diagnosticsOf('box(10);\n' + CAMERA), [[1, 5, 'the size must be a vector']]);
  assert.deepEqual(diagnosticsOf('cylinder(0, 10);\n' + CAMERA), [[1, 10, 'the radius must be greater than 0']]);
  assert.deepEqual(diagnosticsOf('cylinder(5, -1);\n' + CAMERA), [[1, 13, 'the height must be greater than 0']]);
  assert.deepEqual(diagnosticsOf('cylinder(5);\n' + CAMERA), [[1, 1, 'missing parameter `height` for cylinder']]);
  assert.deepEqual(diagnosticsOf('cube(1, 2);\n' + CAMERA), [[1, 9, 'cube takes 1 argument']]);
});

test('cylinder argument errors (DESIGN §8 examples)', () => {
  assert.deepEqual(diagnosticsOf('cylinder(radius: 12, 62);\n' + CAMERA), [[1, 22, 'positional arguments must come before named arguments']]);
  assert.deepEqual(diagnosticsOf('cylinder(12, radius: 5);\n' + CAMERA), [
    [1, 1, 'missing parameter `height` for cylinder'],
    [1, 14, 'parameter `radius` is given more than once'],
  ]);
  assert.deepEqual(diagnosticsOf('cylinder(12);\n' + CAMERA), [[1, 1, 'missing parameter `height` for cylinder']]);
});

test('cylinder arguments in any order when named', () => {
  const solids = (source) => compile(source + '\n' + CAMERA).scene.root.children.map(({ type, radius, height }) => ({ type, radius, height }));
  assert.deepEqual(solids('cylinder(12, 62);'), solids('cylinder(height: 62, radius: 12);'));
  assert.deepEqual(solids('cylinder(12, 62);'), [{ type: 'cylinder', radius: 12, height: 62 }]);
});

test('transforms take exactly one positional argument (D19)', () => {
  for (const source of ['translate() { sphere(1); }', 'translate([1, 0, 0], [0, 1, 0]) { sphere(1); }', 'translate(by: [1, 0, 0]) { sphere(1); }']) {
    assert.deepEqual(diagnosticsOf(source + '\n' + CAMERA), [[1, 1, '`translate` takes exactly one positional argument']], source);
  }
  assert.deepEqual(diagnosticsOf('scale() { sphere(1); }\n' + CAMERA), [[1, 1, '`scale` takes exactly one positional argument']]);
});

test('transform argument kinds, and a positive scale factor', () => {
  assert.deepEqual(diagnosticsOf('translate(5) { sphere(1); }\n' + CAMERA), [[1, 11, '`translate` needs a vector']]);
  assert.deepEqual(diagnosticsOf('rotate(90) { sphere(1); }\n' + CAMERA), [[1, 8, '`rotate` needs a vector of angles in degrees']]);
  assert.deepEqual(diagnosticsOf('scale([1, 1, 1]) { sphere(1); }\n' + CAMERA), [[1, 7, 'the scale factor must be a number']]);
  assert.deepEqual(diagnosticsOf('scale(0) { sphere(1); }\n' + CAMERA), [[1, 7, 'the scale factor must be greater than 0']]);
  assert.deepEqual(diagnosticsOf('scale(-1) { sphere(1); }\n' + CAMERA), [[1, 7, 'the scale factor must be greater than 0']]);
});

test('an invalid transform still has its body checked', () => {
  assert.deepEqual(diagnosticsOf('scale(0) { sphere(q); }\n' + CAMERA), [
    [1, 7, 'the scale factor must be greater than 0'],
    [1, 19, '`q` is undeclared'],
  ]);
});

test('primitives inside a Boolean are checked', () => {
  assert.deepEqual(diagnosticsOf('union { translate([1, 0, 0]) { cube(0); } }\n' + CAMERA), [
    [1, 37, 'the size must be greater than 0'],
  ]);
});

test('a camera block inside a body is an error, and is still checked', () => {
  const diagnostics = diagnosticsOf(CAMERA + 'union { camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; } sphere(1); }');
  assert.deepEqual(diagnostics, [
    [2, 9, 'the camera block must be at the top level'],
  ]);
  const checked = diagnosticsOf(CAMERA + 'union { camera { zoom: 1; } sphere(1); }');
  assert.ok(checked.some(([, , m]) => m === 'unknown camera property `zoom`'), JSON.stringify(checked));
});

test('the sphere example\'s binding still compiles to one sphere', () => {
  const { diagnostics, scene } = compile('let r = 40;\n' + CAMERA + 'sphere(radius: r / 2 + 20);');
  assert.deepEqual(diagnostics, []);
  assert.equal(scene.root.children[0].radius, 40);
});
