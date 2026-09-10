// Scanner for the core-purity check (CONSTRAINTS §2): files under src/core/
// must not reference browser APIs, and may import only other core modules.
// A small scanner is enough for the core's plain style; a full JavaScript
// parser would be a dependency.

import fs from 'node:fs';
import path from 'node:path';

export const FORBIDDEN_IDENTIFIERS = [
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'requestAnimationFrame', 'HTMLCanvasElement', 'ImageData',
  'CanvasRenderingContext2D', 'fetch', 'self',
];

// Replaces comments (and, unless keepStrings, string and template text) with
// spaces, keeping line breaks so positions are unchanged. Expressions inside
// template literals stay visible as code.
export function blankCommentsAndStrings(text, { keepStrings = false } = {}) {
  let out = '';
  let i = 0;
  const n = text.length;
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  const literal = (s) => (keepStrings ? s : blank(s));

  function code(stopAtClosingBrace) {
    let depth = 0;
    while (i < n) {
      const ch = text[i];
      const nx = text[i + 1];
      if (ch === '/' && nx === '/') {
        const end = text.indexOf('\n', i);
        const stop = end < 0 ? n : end;
        out += blank(text.slice(i, stop));
        i = stop;
      } else if (ch === '/' && nx === '*') {
        const end = text.indexOf('*/', i + 2);
        const stop = end < 0 ? n : end + 2;
        out += blank(text.slice(i, stop));
        i = stop;
      } else if (ch === "'" || ch === '"') {
        let j = i + 1;
        while (j < n && text[j] !== ch && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
        const stop = Math.min(j + 1, n);
        out += literal(text.slice(i, stop));
        i = stop;
      } else if (ch === '`') {
        template();
      } else if (ch === '{') {
        depth++;
        out += ch;
        i++;
      } else if (ch === '}') {
        if (stopAtClosingBrace && depth === 0) return;
        depth--;
        out += ch;
        i++;
      } else {
        out += ch;
        i++;
      }
    }
  }

  function template() {
    let start = i;
    i++; // opening backtick
    while (i < n && text[i] !== '`') {
      if (text[i] === '\\') {
        i += 2;
      } else if (text[i] === '$' && text[i + 1] === '{') {
        out += literal(text.slice(start, i + 2));
        i += 2;
        code(true); // the embedded expression, up to its closing brace
        start = i;
        i++;
      } else {
        i++;
      }
    }
    const stop = Math.min(i + 1, n);
    out += literal(text.slice(start, stop));
    i = stop;
  }

  code(false);
  return out;
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

const IMPORT_PATTERNS = [
  // Whitespace is optional wherever JavaScript allows none: import{x}from'y'.
  /\bimport\s*(?:[\w$*{}\s,]*?\bfrom\s*)?(['"])([^'"\n]*)\1/g,
  /\bexport\s*(?:\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*(['"])([^'"\n]*)\1/g,
  /\bimport\s*\(\s*(['"])([^'"\n]*)\1\s*\)/g,
];
const NON_LITERAL_DYNAMIC_IMPORT = /\bimport\s*\((?!\s*['"])/g;

// Returns violations in one file: [{ file, line, token }].
export function scanFile(file, coreDir) {
  const text = fs.readFileSync(file, 'utf8');
  const violations = [];

  const code = blankCommentsAndStrings(text);
  for (const identifier of FORBIDDEN_IDENTIFIERS) {
    const pattern = new RegExp(`(?<![\\w$])${identifier}(?![\\w$])`, 'g');
    for (const match of code.matchAll(pattern)) {
      violations.push({ file, line: lineAt(code, match.index), token: identifier });
    }
  }

  const codeWithStrings = blankCommentsAndStrings(text, { keepStrings: true });
  // Bracket access with a literal name, e.g. globalThis['document'].
  const bracketAccess = new RegExp(`\\[\\s*(['"\`])(${FORBIDDEN_IDENTIFIERS.join('|')})\\1\\s*\\]`, 'g');
  for (const match of codeWithStrings.matchAll(bracketAccess)) {
    violations.push({ file, line: lineAt(codeWithStrings, match.index), token: match[2] });
  }
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of codeWithStrings.matchAll(pattern)) {
      const specifier = match[2];
      const relative = specifier.startsWith('./') || specifier.startsWith('../');
      const target = relative ? path.relative(coreDir, path.resolve(path.dirname(file), specifier)) : null;
      if (!relative || target.startsWith('..') || path.isAbsolute(target)) {
        violations.push({ file, line: lineAt(codeWithStrings, match.index), token: `import '${specifier}'` });
      }
    }
  }
  for (const match of codeWithStrings.matchAll(NON_LITERAL_DYNAMIC_IMPORT)) {
    violations.push({ file, line: lineAt(codeWithStrings, match.index), token: 'import() with a non-literal specifier' });
  }

  return violations.sort((a, b) => a.line - b.line);
}

export function listJsFiles(dir) {
  return fs.readdirSync(dir, { recursive: true })
    .filter((name) => name.endsWith('.js') || name.endsWith('.mjs'))
    .map((name) => path.join(dir, name))
    .sort();
}

export function scanCoreDir(coreDir) {
  return listJsFiles(coreDir).flatMap((file) => scanFile(file, coreDir));
}

export const formatViolation = (v) => `${v.file}:${v.line} ${v.token}`;
