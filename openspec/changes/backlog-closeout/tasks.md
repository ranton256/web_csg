## 1. Setup

- [x] 1.1 Create and switch to branch `backlog-closeout` from `main`

## 2. Dev server

- [x] 2.1 `tools/serve.mjs`: after decoding, a path segment starting with `.` (other than the refused `..`) returns `404` before any file-system access (design D-1)
- [x] 2.2 `tools/serve.mjs`: `isMainModule()` compares the real paths of `process.argv[1]` and `import.meta.url` (design D-2)
- [x] 2.3 `test/serve.test.js`:
  - `/.git/config`, `/.gitignore`, and `/%2egit/config` get `404` with no file contents in the body
  - the CLI started with `node --preserve-symlinks-main` through a symlinked checkout listens on a valid `--port`, and exits non-zero on `--port abc`

## 3. Tab indentation

- [x] 3.1 Add `src/ui/indent.js`: `indentEdit(text, start, end, { outdent })` (design D-3). It has no browser APIs.
- [x] 3.2 Add `test/ui/indent.test.js`, covering:
  - Tab with no selection, and with a selection inside one line
  - multi-line Tab, including the boundary where a selection ending at column 1 leaves that line untouched
  - Shift+Tab with 0, 1, 2, and 3 leading spaces, and over several lines
  - the selection kept over the same text
- [x] 3.3 `src/ui/main.js`: a `keydown` handler for Tab and Shift+Tab, applied with `execCommand('insertText')`, falling back to `setRangeText` plus an `input` event. Add the Esc escape flag, which any other key or `blur` clears.

## 4. Help dialog

- [x] 4.1 Add `src/ui/help-content.js` (design D-4): the reference sections and the example source, with no browser APIs
- [x] 4.2 Add `test/ui/help-content.test.js`:
  - every reserved word appears
  - the example compiles with no diagnostics and renders a non-background image
  - each topic in the `language-help` spec has a section
- [x] 4.3 `index.html`: a header row with the Help button, and a `<dialog id="help">` with a title and a Close button
- [x] 4.4 `src/ui/main.js`:
  - render the sections into the dialog
  - open it with `showModal()`; the modal `<dialog>` returns focus on close (an explicit refocus was planned, then removed as redundant after seen-to-fail run E3)

## 5. End-to-end tests (Chromium, Firefox, WebKit)

- [x] 5.1 `e2e/editor-preview.spec.js`, covering:
  - Tab inserts two spaces with focus kept
  - Tab indents every selected line
  - Shift+Tab removes up to two spaces
  - Esc then Tab moves focus out, with the text unchanged
  - a rebuild follows a Tab edit
  - undo restores the text
  - the header has a keyboard-focusable Help button
- [x] 5.2 `e2e/help.spec.js` (new), covering:
  - open with the keyboard, and the dialog has focus
  - the title and topics are shown
  - Esc closes the dialog and focus returns to the Help button
  - the Close button closes the dialog
  - opening and closing leaves the source, caret, and rebuild count unchanged

## 6. Documentation

- [x] 6.1 DESIGN:
  - §4: the Help button
  - §8: a new feature, "Editor indentation and help", after Live rebuild and progressive rendering, with Gherkin scenarios for Tab indentation and Help
  - §12: D23, the owner's decisions of 2026-09-11 (scope, two-space Tab with the Esc escape, and the Help dialog)
- [x] 6.2 CONSTRAINTS §2: the module list gains `indent.js` and `help-content.js`
- [x] 6.3 ROADMAP: strike the four delivered backlog lines, and annotate the CI line (waiting for a git remote) and the point-lights line (parked; needs its own proposal)

## 7. Verification, review, and merge

- [x] 7.1 Seen to fail, in an isolated copy, with the test files listed explicitly and a passing baseline:
  - dot-paths served again
  - the real-path comparison reverted
  - Tab indents only the first selected line
  - the column-1 boundary ignored
  - Shift+Tab removing three spaces
  - the Esc escape never armed
  - the Tab handler removed
  - no refocus after the dialog closes
  - the help example made invalid
  - a reserved word dropped from the help

  Watch the relevant unit and e2e tests fail, and record the output.
- [ ] 7.2 `npm run check < /dev/null` green, then a fresh clone at the branch head (`npm ci`, `npx playwright install`, `npm run hooks:install`, `npm run check`) green
- [x] 7.3 Add the `help` and `indented` shots to `tools/capture.mjs`, then run `npm run capture -- backlog-closeout`. Write `docs/progress/backlog-closeout/README.md`, covering:
  - each backlog item closed, with its evidence
  - test coverage
  - the seen-to-fail records
  - the manual Safari smoke check (performed by the owner)
- [ ] 7.4 A separate Critic review (`project-critic`) of `main..backlog-closeout`. Fix findings and re-review until `[APPROVED]`
- [ ] 7.5 Merge into `main`, and archive with `/opsx:archive` (syncing the specs, including the new `language-help` capability)

## 8. Critic round 1 fixes

- [x] 8.1 Defect: an indentation edit that removes the whole range (Shift+Tab on a line of only spaces) goes through `execCommand('delete')`, so undo treats it like deleting those spaces
- [x] 8.2 e2e: Shift+Tab followed by undo matches two Backspaces followed by undo, on all three engines, and is exactly one step in Chromium and Firefox
- [x] 8.3 e2e: the Esc escape is cancelled by another key (Esc, ArrowLeft, Tab indents) and by leaving the editor (Esc, blur, refocus, Tab indents)
- [x] 8.4 Document drift: tasks 4.4, the design risks, the proposal's help-content and CONSTRAINTS lines, and the README's fresh-checkout row. The help text now states the full arithmetic rule
- [ ] 8.5 Seen to fail for the new tests; the full gate and a fresh clone; the README Critic round 1 section

## 9. Critic round 2 fixes

- [x] 9.1 e2e: Esc, then Shift+Tab, leaves the editor with the text unchanged, on all three engines
- [x] 9.2 The delta spec and design D-3: a modifier key pressed on its own does not cancel the escape; an Esc then Shift+Tab scenario
- [x] 9.3 The `capture.mjs` comment ("Tab once"), and the README coverage row
- [ ] 9.4 Seen to fail (M4: Shift cancels the escape; M5: the escape applies only without Shift); re-capture `help.png`; the full gate and a fresh clone; the README round 2 section
