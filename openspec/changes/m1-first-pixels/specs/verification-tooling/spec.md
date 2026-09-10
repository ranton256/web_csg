## ADDED Requirements

### Requirement: Core purity check
Source: CONSTRAINTS §2 (DOM-free core); DESIGN §6 item 3.

`npm test` SHALL include a check that fails when any JavaScript file under
`src/core/` references a browser API or imports anything outside `src/core/`.
- **Browser APIs:** `window`, `document`, `navigator`, `localStorage`,
  `sessionStorage`, `requestAnimationFrame`, `HTMLCanvasElement`, `ImageData`,
  `CanvasRenderingContext2D`, `fetch`, and `self`.
- **Imports:** the only permitted form is a relative specifier that resolves
  inside `src/core/`. Package, `node:`, and URL imports are forbidden. This
  applies to `import`, dynamic `import()`, and every re-export form, including
  `export * as name from`.

Bracket access with a literal name (for example `globalThis['document']`)
SHALL count as a reference. Other occurrences inside comments and string
literals SHALL be ignored. The
failure SHALL name the file, the line, and the offending identifier or import.

#### Scenario: A browser API in the core fails the suite
- **WHEN** a file in `src/core/` contains `document.title = 'x';` on line 3
- **THEN** `npm test` fails, naming that file, line 3, and `document`

#### Scenario: An import from outside the core fails the suite
- **WHEN** a file in `src/core/` imports `../ui/main.js` or `node:fs`, or contains `export * as fs from 'node:fs';`
- **THEN** `npm test` fails, naming the file and the import

#### Scenario: Mentions in comments are allowed
- **WHEN** a core file mentions `window` only inside a comment
- **THEN** the check passes
