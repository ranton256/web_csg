import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RESERVED_WORDS } from '../../src/core/lexer.js';
import { renderSource } from '../../src/core/render.js';
import { HELP_EXAMPLE, HELP_SECTIONS, helpText } from '../../src/ui/help-content.js';

test('the help mentions every reserved word of the language', () => {
  const text = helpText();
  for (const word of RESERVED_WORDS) assert.match(text, new RegExp(`\\b${word}\\b`), word);
  assert.ok(RESERVED_WORDS.size >= 14);
});

test('the help example compiles with no diagnostics and renders a non-empty image', () => {
  const { diagnostics, rgba } = renderSource(HELP_EXAMPLE, 32, 24);
  assert.deepEqual(diagnostics, []);
  let solid = 0;
  for (let i = 0; i < rgba.length; i += 4) if (!(rgba[i] === 31 && rgba[i + 1] === 31 && rgba[i + 2] === 36)) solid++;
  assert.ok(solid > 0, 'some pixels show the model');
});

test('each topic of the language-help spec has a section', () => {
  const titles = HELP_SECTIONS.map((section) => section.title);
  for (const topic of ['Statements and comments', 'let', 'Primitives', 'Transforms', 'Booleans', 'camera', 'light', 'material', 'Example']) {
    assert.ok(titles.includes(topic), topic);
  }
  const text = helpText();
  assert.match(text, /first about X, then Y, then Z/, 'the rotation convention');
  assert.match(text, /first child minus all the others/, 'multi-child difference');
  for (const fact of ['`up` defaults to `[0, 0, 1]`', 'defaults to 45', '`intensity` defaults to 1', '`[0.8, 0.8, 0.8]`', 'Up to four']) {
    assert.ok(text.includes(fact), fact);
  }
});

test('inline code in help paragraphs is marked by balanced backticks', () => {
  // main.js shows odd-numbered backtick segments as <code>; an unbalanced backtick would mark the rest as code.
  for (const section of HELP_SECTIONS) {
    for (const block of section.body) {
      if (typeof block === 'string') assert.equal((block.match(/`/g) ?? []).length % 2, 0, `balanced backticks in ${section.title}`);
    }
  }
});
