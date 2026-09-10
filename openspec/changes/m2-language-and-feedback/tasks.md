## 1. Setup

- [x] 1.1 Create and switch to branch `m2-language-and-feedback` from `main`
- [x] 1.2 Confirm with the owner whether DESIGN §12 D18 (12 ms slice; divider 240/420/16 px; nesting cap also counts parentheses and bodies) is accepted; if amended, update the specs and design first. Then move the values into DESIGN §5 and `src/core/constants.js` (the nesting wording) or UI constants

## 2. Parser: full grammar

- [x] 2.1 Extend `src/core/parser.js` per design D-1:
  - `expr`/`term` chain nodes with precedence and left associativity; parentheses
  - property blocks `camera`/`light`/`material`
  - calls `sphere`/`cube`/`box`/`cylinder`
  - transform blocks with a required braced body (no chaining)
  - Boolean blocks, and bodies containing statements
  - the depth counter covering unary minus, `[`, `(`, and bodies
- [x] 2.2 Update `test/core/parser.test.js`:
  - remove the M1 "binary arithmetic / parentheses not supported" and "later constructs not supported" syntax tests
  - add:
    - precedence and chain shapes
    - transform without a body, and chained transforms (error at `rotate`)
    - the vision example parses
    - 101 nested `(` and 101 nested `union {` fail at the 101st
    - a 100,000-term `+ 1` chain compiles
    - existing nesting and missing-semicolon tests still pass

## 3. Evaluator: arithmetic, bodies, and unsupported constructs

- [x] 3.1 Implement iterative chain evaluation and the operand-kind table (design D-2): number∘number, vector±vector, vector×number, number×vector, vector÷number; other combinations are an error at the operator naming the kinds; division by zero is an error at `/`; `null` does not cascade
- [x] 3.2 Implement `evaluateStatements` with child scopes (design D-3):
  - unsupported constructs report "`kw` is not supported yet" at the keyword, evaluate their arguments and properties, and walk their bodies
  - the empty-body rule
  - `camera` in a body is an error but is still validated
  - top-level spheres behave as in M1
- [x] 3.3 Add tests (`test/core/language.test.js`, `test/core/camera.test.js`) covering:
  - the Expressions scenarios: precedence and associativity values, vector arithmetic, invalid kinds at the operator, division by zero for numbers and vectors
  - Empty bodies
  - let scoped to its block, and shadowing inside a block
  - unsupported-construct contents still checked
  - the vision example's diagnostics are only "not supported yet"
  - a camera block inside a body
  - the D14 non-unit up scenario (backlog item)

## 4. UI helpers (pure, Node-tested)

- [x] 4.1 `src/ui/text-position.js`: `lineCount`, and `lineColumnToOffset` (code-point columns → UTF-16 offsets). Test that an emoji before the column shifts the offset by 2 code units, as well as out-of-range lines and columns, and `\r\n`
- [x] 4.2 `src/ui/debounce.js` with injectable timers. Test on fake timers: 300 ms after the last trigger and not before; a restart on each trigger; `cancel`
- [x] 4.3 `src/ui/render-job.js` (design D-5) with an injectable clock and scheduler. Test on a fake clock:
  - slices stop at the 12 ms budget
  - `onBand` ranges cover every row exactly once, in order
  - `cancel` stops further work and drawing
  - the finished buffer equals `renderSource`
- [x] 4.4 `clampEditorWidth` in `src/ui/divider.js`. Test the 240 px limits on both sides, the 420 px initial width, and a window narrower than 480 px

## 5. Page

- [x] 5.1 Rewrite `index.html` for the layout: gutter plus textarea (`wrap="off"`), diagnostics list of buttons, separator divider, and a preview panel (`flex: 1`) holding the canvas, `#stale`, and `#status`
- [x] 5.2 Rewrite `src/ui/main.js` (design D-6/D-7/D-8):
  - immediate initial render
  - 300 ms debounced rebuild
  - stale state, keeping the last valid job running
  - the progressive render job drawing bands with `MessageChannel` scheduling
  - `ResizeObserver` → 150 ms → resize the canvas with a scaled placeholder, then restart
  - gutter sync, diagnostic click → caret, divider pointer and keyboard
  - test counters as `data-rebuilds`, `data-renders-started`, and `data-renders-done`
  - keep `data-module-loaded`
- [x] 5.3 Rewrite `e2e/editor-preview.spec.js` covering:
  - initial render, with canvas size equal to panel size and a hidden stale indicator
  - gutter numbers and scroll sync
  - diagnostic click at line 4, column 7, and after an emoji
  - divider drag, clamping, and keyboard
- [x] 5.4 Add `e2e/live-rebuild.spec.js` covering:
  - the debounce and its restart on `page.clock`
  - cancellation by a newer model
  - the status during a large render
  - the finished canvas equal to the in-page `renderSource`
  - typing responsiveness on real timers
  - window and divider resizes re-render after 150 ms at the new size
  - resizing preserves the vertical field of view (same sphere rows and columns)
  - stale: shows on error with the image unchanged, clears on fix, and stays visible across a resize
- [x] 5.5 Confirm that `e2e/app.spec.js` still passes, or update it with a recorded reason. Extend `tools/capture.mjs` with a `stale` shot

## 6. Core-purity scanner (backlog item)

- [x] 6.1 Allow optional whitespace in the import and re-export patterns (design D-9). Add fixtures for `import{readFileSync}from'node:fs';` and `export*from'node:fs';`, and watch the fixture test fail against the old patterns

## 7. Documentation

- [x] 7.1 CONSTRAINTS §2: add the `src/ui/` modules and their Node-testable helpers
- [x] 7.2 DESIGN: apply the D18 decision (§5 rows, D15 wording, §12 resolved)
- [ ] 7.3 ROADMAP: set M2's status, and strike the two backlog lines as delivered

## 8. Verification, review, and merge

- [x] 8.1 Seen to fail: in an isolated worktree, run the new e2e tests against a version where the debounce is 0 ms and where a cancelled job keeps drawing, and watch the relevant tests fail. Record the output
- [x] 8.2 `npm run check < /dev/null` green, then a fresh clone at the branch head (`npm ci`, `npx playwright install`, `npm run hooks:install`, `npm run check`) green
- [x] 8.3 `npm run capture -- M2` (valid and stale shots), then write `docs/progress/M2/README.md`: each M2 "done when" criterion with its evidence, scenario coverage, render times for a large preview, the seen-to-fail records, and the manual Safari smoke check (performed by the owner)
- [ ] 8.4 A separate Critic review (`project-critic`) of `main..m2-language-and-feedback`. Fix findings and re-review until `[APPROVED]`
- [ ] 8.5 Merge into `main`, mark M2 complete in ROADMAP, and archive with `/opsx:archive` (syncing the specs)
