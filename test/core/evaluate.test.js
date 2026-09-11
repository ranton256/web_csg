import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile } from '../../src/core/render.js';

const CAMERA = 'camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; }\n';

const diagnosticsOf = (source) => compile(source).diagnostics.map((d) => [d.line, d.column, d.message]);
// The placed primitives of a scene tree, in source order.
function leaves(node) {
  return node.kind === 'primitive' ? [node] : node.children.flatMap(leaves);
}
const solidsOf = (source) => {
  const { diagnostics, scene } = compile(source);
  assert.deepEqual(diagnostics, []);
  return leaves(scene.root).map(({ type, radius }) => ({ type, radius }));
};

test('unary minus negates numbers and each vector component', () => {
  const { diagnostics, scene } = compile(
    'let d = 100;\nlet v = -[1, 2, 3];\nlet w = [d, -d, d];\ncamera { position: w; lookAt: v; }\n',
  );
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(scene.camera.position, [100, -100, 100]);
  assert.deepEqual(scene.camera.lookAt, [-1, -2, -3]);
});

test('vector elements must be numbers', () => {
  assert.deepEqual(diagnosticsOf('let v = [1, [2, 3, 4], 5];\n' + CAMERA), [[1, 13, 'vector elements must be numbers']]);
});

test('a name is visible only after its declaration', () => {
  assert.deepEqual(diagnosticsOf('sphere(r); let r = 5;\n' + CAMERA), [[1, 8, '`r` is undeclared']]);
  assert.deepEqual(diagnosticsOf('let r = r;\n' + CAMERA), [[1, 9, '`r` is undeclared']]);
});

test('redeclaration is an error at the second name', () => {
  assert.deepEqual(diagnosticsOf('let r = 5;\nlet r = 6;\n' + CAMERA), [[2, 5, '`r` is already declared']]);
});

test('an error in a let value does not cascade', () => {
  assert.deepEqual(diagnosticsOf('let a = b;\nsphere(a);\n' + CAMERA), [[1, 9, '`b` is undeclared']]);
});

test('positional and named arguments are equivalent', () => {
  assert.deepEqual(solidsOf('sphere(12);\n' + CAMERA), solidsOf('sphere(radius: 12);\n' + CAMERA));
  assert.deepEqual(solidsOf('sphere(12);\n' + CAMERA), [{ type: 'sphere', radius: 12 }]);
});

test('missing, duplicate, unknown, and extra arguments', () => {
  assert.deepEqual(diagnosticsOf('sphere();\n' + CAMERA), [[1, 1, 'missing parameter `radius` for sphere']]);
  assert.deepEqual(diagnosticsOf('sphere(1, radius: 2);\n' + CAMERA), [[1, 11, 'parameter `radius` is given more than once']]);
  // An unknown name does not fill `radius`, so it is also missing.
  assert.deepEqual(diagnosticsOf('sphere(r: 5);\n' + CAMERA), [
    [1, 1, 'missing parameter `radius` for sphere'],
    [1, 8, 'unknown parameter `r` for sphere'],
  ]);
  assert.deepEqual(diagnosticsOf('sphere(1, 2);\n' + CAMERA), [[1, 11, 'sphere takes 1 argument']]);
});

test('sphere radius must be a positive number', () => {
  assert.deepEqual(diagnosticsOf('sphere(0);\n' + CAMERA), [[1, 8, 'the radius must be greater than 0']]);
  assert.deepEqual(diagnosticsOf('sphere(-2);\n' + CAMERA), [[1, 8, 'the radius must be greater than 0']]);
  assert.deepEqual(diagnosticsOf('sphere([1, 2, 3]);\n' + CAMERA), [[1, 8, 'the radius must be a number']]);
});

test('all semantic errors are reported, ordered by position', () => {
  const source = [
    'let a = 1;',
    CAMERA.trim(),
    '',
    'sphere(b);',
    '', '', '', '',
    'sphere(c);',
  ].join('\n');
  assert.deepEqual(diagnosticsOf(source), [
    [4, 8, '`b` is undeclared'],
    [9, 8, '`c` is undeclared'],
  ]);
});

test('a camera-only source is a valid empty scene', () => {
  const { diagnostics, scene } = compile(CAMERA);
  assert.deepEqual(diagnostics, []);
  assert.deepEqual(scene.root, { kind: 'union', children: [] });
});

test('comments do not change the scene', () => {
  const plain = 'let r = 5;\n' + CAMERA + 'sphere(r);\n';
  const commented = '// note\nlet r = 5; /* multi\nline */\n' + CAMERA + '// another\nsphere(r);\n';
  assert.deepEqual(compile(commented).scene.camera, compile(plain).scene.camera);
  assert.deepEqual(solidsOf(commented), solidsOf(plain));
});
