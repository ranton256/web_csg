import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatViolation, listJsFiles, scanCoreDir } from './support/core-purity.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE_DIR = path.join(REPO_ROOT, 'src', 'core');

test('src/core/ uses no browser APIs and imports only core modules', () => {
  assert.ok(listJsFiles(CORE_DIR).length > 0, 'no core files found; the check would be vacuous');
  assert.deepEqual(scanCoreDir(CORE_DIR).map(formatViolation), []);
});

describe('core-purity scanner', () => {
  let tmp;
  let core;
  const write = (name, content) => fs.writeFileSync(path.join(core, name), content);

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-csg-purity-'));
    core = path.join(tmp, 'core');
    fs.mkdirSync(path.join(tmp, 'ui'));
    fs.mkdirSync(core);
    fs.writeFileSync(path.join(tmp, 'ui', 'main.js'), 'export {};\n');
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  test('a browser API is reported with file, line, and identifier', () => {
    write('a.js', '// line 1\nconst x = 1;\ndocument.title = \'x\';\n');
    assert.deepEqual(scanCoreDir(core).map((v) => [path.basename(v.file), v.line, v.token]), [['a.js', 3, 'document']]);
  });

  test('imports from outside the core are reported', () => {
    write('b.js', "import { y } from '../ui/main.js';\n");
    write('c.js', "import fs from 'node:fs';\nexport * from 'some-package';\nconst m = import('https://example.com/x.js');\n");
    assert.deepEqual(scanCoreDir(core).map((v) => [path.basename(v.file), v.line, v.token]), [
      ['b.js', 1, "import '../ui/main.js'"],
      ['c.js', 1, "import 'node:fs'"],
      ['c.js', 2, "import 'some-package'"],
      ['c.js', 3, "import 'https://example.com/x.js'"],
    ]);
  });

  test('namespace re-exports and bracket access are reported', () => {
    write('h.js', "export * as fs from 'node:fs';\nexport * as ui from '../ui/main.js';\nconst d = globalThis['document'];\n");
    assert.deepEqual(scanCoreDir(core).map((v) => [v.line, v.token]), [
      [1, "import 'node:fs'"],
      [2, "import '../ui/main.js'"],
      [3, 'document'],
    ]);
  });

  test('relative imports inside the core are allowed', () => {
    fs.mkdirSync(path.join(core, 'sub'));
    write('sub/d.js', "import { a } from '../vec.js';\nexport { b } from './e.js';\n");
    assert.deepEqual(scanCoreDir(core), []);
  });

  test('mentions in comments and strings are ignored; template expressions are code', () => {
    write('e.js', "// window here\n/* self */\nconst s = 'window';\nconst t = `document ${1}`;\n");
    assert.deepEqual(scanCoreDir(core), []);
    write('f.js', 'const t = `x ${window.innerWidth} y`;\n');
    assert.deepEqual(scanCoreDir(core).map((v) => [path.basename(v.file), v.line, v.token]), [['f.js', 1, 'window']]);
  });

  test('a non-literal dynamic import is reported', () => {
    write('g.js', 'const name = "x";\nimport(name);\n');
    assert.deepEqual(scanCoreDir(core).map((v) => [v.line, v.token]), [[2, 'import() with a non-literal specifier']]);
  });
});
