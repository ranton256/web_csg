// The built-in examples (DESIGN §8 Save, load, and examples; §4 asset
// inventory; D6): exactly three, in order, each valid, each with a golden image.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compile, renderSource } from '../../src/core/render.js';
import { EXAMPLES, FIRST_LAUNCH_SOURCE } from '../../src/ui/examples.js';
import { expectMatchesGolden } from '../support/golden.js';

// The source without its // comments, so words in comments do not count.
const code = (source) => source.replace(/\/\/.*$/gm, '');

test('exactly three examples, in order, with their titles and file names', () => {
  assert.deepEqual(EXAMPLES.map(({ id, title, fileName }) => [id, title, fileName]), [
    ['bored-cube', 'Bored cube', 'bored-cube.csg'],
    ['primitives', 'Primitives', 'primitives.csg'],
    ['boolean-operations', 'Boolean operations', 'boolean-operations.csg'],
  ]);
});

test('the bored cube is the vision.md example, verbatim, and is the first-launch source', () => {
  const vision = readFileSync(new URL('../../vision.md', import.meta.url), 'utf8');
  const block = vision.split('```')[1].replace(/^\n/, '');
  assert.equal(EXAMPLES[0].source, block);
  assert.equal(FIRST_LAUNCH_SOURCE, EXAMPLES[0].source);
});

test('every example evaluates with no diagnostics', () => {
  for (const example of EXAMPLES) assert.deepEqual(compile(example.source).diagnostics, [], example.id);
});

test('Primitives uses all four primitives, and Boolean operations all three operations', () => {
  const primitives = code(EXAMPLES[1].source);
  for (const word of ['sphere', 'cube', 'box', 'cylinder']) assert.match(primitives, new RegExp(`\\b${word}\\(`), word);
  const booleans = code(EXAMPLES[2].source);
  for (const word of ['union', 'intersection', 'difference']) assert.match(booleans, new RegExp(`\\b${word} \\{`), word);
});

for (const example of EXAMPLES) {
  test(`the ${example.title} example matches golden "example-${example.id}"`, () => {
    const { diagnostics, rgba } = renderSource(example.source, 64, 48);
    assert.deepEqual(diagnostics, []);
    expectMatchesGolden(`example-${example.id}`, 64, 48, rgba);
  });
}
