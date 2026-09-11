## Context

See proposal.md for why. The current state that shapes the approach:

- **`tools/serve.mjs`:**
  - `resolveTarget` decodes the request path. It refuses `..` segments,
    backslashes, and NUL with `403`, then resolves inside the real root.
    Nothing filters dot-segments, so `/.git/config` is served.
  - `isMainModule()` compares `fs.realpathSync(process.argv[1])` with
    `fileURLToPath(import.meta.url)`. Under `--preserve-symlinks-main`,
    `import.meta.url` keeps the symlinked path, so the comparison fails and
    the process exits 0 without starting.
  - `test/serve.test.js` already spawns the CLI through a symlinked checkout.
- **The editor:** it is a plain `<textarea id="source">`. `main.js` listens
  to `input`, which updates the gutter and debounces the rebuild, and to
  `scroll`. It handles no keys, so Tab moves focus.
- **`index.html`:** the header is a single `<h1>`, and there is no dialog.
- **Tests:** browser behavior is covered by Playwright on Chromium, Firefox,
  and WebKit. Pure UI logic is unit-tested under `test/ui/`.

## Goals / Non-Goals

**Goals:**
- Close the four backlog items with behavior pinned by tests on all three
  engines.
- Keep the editor a plain `<textarea>`, and keep browser APIs confined to
  `src/ui/` (CONSTRAINTS §2).
- Put the indentation rules and the help text in modules without browser
  APIs, so Node tests can check them directly.

**Non-Goals:**
- A code-editor component, syntax highlighting, auto-indent on Enter, or
  bracket matching (parked or unrequested).
- CI and point lights, which stay in the backlog.

## Decisions

### D-1: Dot-paths get 404 in `resolveTarget`
After decoding, and after the existing `..` refusal, any path segment that
starts with `.` returns `{ status: 404 }`, before any file-system access.
The check runs on the decoded path, so `/%2egit/config` is caught too.
`404` rather than `403`, so the response does not reveal whether such a file
exists. No app asset lives under a dot-path.

*Alternative:* an allow-list of served directories. Rejected: the dot rule
is the specific risk the backlog names, and an allow-list would need
updating whenever the layout changes.

### D-2: The main-module check compares real paths on both sides
`isMainModule()` compares `realpathSync(process.argv[1])` with
`realpathSync(fileURLToPath(import.meta.url))`. This covers:
- a plain start;
- a start through a symlinked path, where Node resolves `import.meta.url`;
- a start under `--preserve-symlinks-main`, where it does not.

### D-3: Indentation is pure logic in `src/ui/indent.js`
The module exports `indentEdit(text, start, end, { outdent })`. It returns
the replacement range, the replacement text, and the new selection, and it
has no browser APIs.

**Rules** (from the `editor-preview` spec):
- Tab with no selection, or a selection inside one line, replaces the
  selection with two spaces.
- A multi-line selection adds two spaces before each touched line. A line is
  not touched when the selection ends at its column 1.
- Shift+Tab removes up to two leading spaces from each touched line.
- The selection moves with the text it covered. Indentation inserted inside
  the selection (at the start of a later touched line) becomes part of it.

**Wiring in `main.js`:** a `keydown` handler on `#source` handles Tab and
Shift+Tab only when no other modifier is held.
- **Applying an edit:** it selects the replacement range and applies it with
  `document.execCommand('insertText', false, text)`. That fires a real
  `input` event, so the gutter and the rebuild update as for typing. The
  browser's undo treats it exactly like typed text, which the owner accepted:
  Chromium and Firefox undo it in one step, and WebKit groups it with
  adjacent typing, as it does typed characters.
- **Removing a whole range:** when the edit's replacement is empty (Shift+Tab
  on a line of only spaces), it uses `execCommand('delete')` instead, so undo
  still treats it like the same deletion typed by hand (Critic round 1).
- **Fallback:** if the command returns `false`, it uses `setRangeText` plus a
  synthetic `input` event. Undo is then best effort, and the risk is
  recorded below.
- **The Esc escape:** Esc sets an `escapeArmed` flag. The next Tab or
  Shift+Tab is not intercepted, so the browser moves focus, and the flag
  clears. Any other key, or `blur`, clears it.

*Alternative:* insert a literal tab. The owner chose two spaces, so
diagnostic columns and the visual layout agree.

### D-4: Help is a `<dialog>` whose content comes from `src/ui/help-content.js`
`help-content.js` exports the reference as data: a list of sections, each
with a heading and paragraphs or code, plus the example source. It has no
browser APIs, so a Node test can:
- compile the example;
- check that every reserved word appears.

**`index.html`** gains:
- a header row, with the `<h1>` and a `<button id="help-button">Help</button>`;
- a `<dialog id="help" aria-labelledby="help-title">`, with a Close button.

`main.js` renders the sections into the dialog once.

**Opening and closing:**
- `showModal()` gives focus containment, inert content behind the dialog,
  and Esc closing on all three engines.
- Closing a modal `<dialog>` returns focus to the element that had it when
  the dialog opened, and the editor's selection is untouched. An explicit
  refocus was planned, but seen-to-fail run E3 showed it was redundant:
  removing it changed nothing on Chromium, Firefox, or WebKit. It was
  removed, and `e2e/help.spec.js` checks the browsers' own focus return on
  all three engines.

**Content outline, from DESIGN §5 and §8:**
- comments and statements;
- `let`;
- primitives, with their parameters;
- transforms: the one-argument rule, and the rotation order and degrees;
- Booleans, including the multi-child difference;
- `camera`: its properties and defaults;
- `light`: `direction` and `intensity`, the default of 1, at most 4 blocks,
  and the default key light;
- `material`: `color`, and the default grey;
- a short example: the bored cube with one light.

### D-5: Tests
- **`test/serve.test.js`:**
  - dot-paths get 404, including the encoded form, and no body leaks;
  - the CLI started with `--preserve-symlinks-main` through a symlinked
    checkout listens on a valid port and exits non-zero on `--port abc`.
- **`test/ui/indent.test.js`:** every rule in D-3, including the touched-line
  boundary, and Shift+Tab with 0, 1, 2, and 3 leading spaces.
- **`test/ui/help-content.test.js`:**
  - every reserved word appears;
  - the example compiles with no diagnostics and renders a non-background
    image;
  - every topic in the spec has a section.
- **e2e, on Chromium, Firefox, and WebKit:**
  - in `editor-preview.spec.js`: Tab, multi-line Tab, Shift+Tab, Esc then
    Tab leaving the editor, the rebuild after Tab, undo after Tab, and the
    header Help button;
  - a new `help.spec.js`: open with the keyboard, the title and content, Esc
    and Close, focus return, and no change to the source, caret, or rebuild
    count.

### D-6: Documentation and evidence
- **DESIGN:**
  - §4: the Help button;
  - §8: a new feature, "Editor indentation and help", after Live rebuild and
    progressive rendering, with Gherkin scenarios for Tab indentation and
    Help;
  - §12: D23, the owner's decisions: scope, two-space Tab with the Esc
    escape, the Help dialog, and undo that treats indentation like typing.
- **CONSTRAINTS §2:** the module list gains `indent.js` and
  `help-content.js`.
- **ROADMAP:** strike the four delivered backlog lines. Annotate CI (waiting
  for a remote) and point lights (parked; needs its own proposal).
- **Evidence:**
  - `npm run capture -- backlog-closeout`, with new `help` and `indented`
    shots;
  - `docs/progress/backlog-closeout/README.md`, with the criteria, the test
    coverage, seen-to-fail records, and the owner's Safari smoke check.

## Risks / Trade-offs

- **[`execCommand('insertText')` is deprecated, and a browser could drop it
  or break native undo]** → The fallback keeps Tab working. The e2e undo
  test compares Tab+undo with typed-spaces+undo on all three engines, and
  checks one-step undo in Chromium and Firefox, so a regression is detected.
  The fallback is noted in the README.
- **[Esc means "close" inside the dialog but "arm the escape" in the
  editor]** → They never apply together: while the dialog is open, the
  editor is inert. An e2e test covers each.
- **[Browsers restore focus differently after `dialog.close()`]** → All
  three engines return focus from a closed modal `<dialog>`. An e2e test on
  each engine checks it, so a browser that stops doing so is detected.
- **[A dot-path rule could hide a future app asset]** → None exists, and
  CONSTRAINTS §2 keeps app files under `src/` and `index.html`. The
  `dev-server` spec makes the rule explicit.
- **[Playwright's Tab handling differs by engine]** → The e2e tests press
  keys on the focused text area, and check focus with `document.activeElement`
  instead of assuming a specific next element.
