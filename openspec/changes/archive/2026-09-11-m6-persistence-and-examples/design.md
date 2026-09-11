## Context

See proposal.md for why. The current state that shapes the approach:

- **`src/ui/main.js`:**
  - It sets `source.value = DEFAULT_SOURCE` (the M1 sphere, from
    `src/ui/default-source.js`) at start.
  - An `input` listener updates the gutter and debounces the rebuild
    (300 ms). The rebuild calls the core, shows diagnostics, and restarts the
    progressive render.
  - Counters (`data-rebuilds` and others) are exposed for tests.
  - The header holds the `<h1>` and the Help button.
- **`DEFAULT_SOURCE` users:** the `sphere` golden, `render.test.js`,
  `render-job.test.js`, the e2e initial-value and Tab-undo checks, the
  `live-rebuild` e2e fills, and the capture tool's `stale` shot.
- **Test support:**
  - `test/support/vision-example.js` holds the bored cube (`VISION_EXAMPLE`),
    used by goldens, the scaled-render check, and captures;
  - `test/support/scenes.js` holds the `arrangement` and `booleans` scenes,
    with their goldens.
- **`src/core/lexer.js`:** advances by characters, with code-point columns.
  It has no BOM handling, so a U+FEFF is an "unexpected character".
- **Tests:** Playwright gives each test a fresh browser context, so
  `localStorage` starts empty. That is a first launch.

## Goals / Non-Goals

**Goals:**
- Every `save-load-and-examples` scenario, tested end to end on Chromium,
  Firefox, and WebKit.
- The decision logic (whether to confirm, the file name, storage) is pure,
  and unit-tested under Node.
- Every existing golden is unchanged. Tests that relied on the sphere keep
  the sphere, through a fixture.

**Non-Goals:**
- A file-system integration beyond `<input type="file">` and a download
  link: no File System Access API, no drag and drop, and no recent files.
- Syncing between tabs. The last write wins, and this is recorded as a risk.
- Undo across a load. Setting the text programmatically starts a new undo
  history, as a fresh document does.

## Decisions

### D-1: `src/ui/examples.js` holds the examples
It exports `EXAMPLES`, an ordered list of `{ id, title, fileName, source }`:
- `bored-cube`, "Bored cube", `bored-cube.csg`;
- `primitives`, "Primitives", `primitives.csg`;
- `boolean-operations`, "Boolean operations", `boolean-operations.csg`.

It also exports `FIRST_LAUNCH_SOURCE`, the bored cube's source. The module
has no browser APIs, so Node tests compile and render every example.

**The sources:**
- **Bored cube:** the `vision.md` example, verbatim. It moves here from
  `test/support/vision-example.js`, which re-exports it as `VISION_EXAMPLE`,
  so every existing test and golden keeps its input.
- **Primitives:**
  - the `arrangement` scene's four placed primitives;
  - comments naming each primitive and its parameters;
  - a warm `material`, and two directional lights.
- **Boolean operations:**
  - the `booleans` scene's union, intersection, and difference;
  - comments explaining each;
  - a point light above and in front, and a dim directional fill.

The test scenes in `scenes.js` stay as they are, so the `arrangement` and
`booleans` goldens are unchanged. The examples get their own goldens.

`src/ui/default-source.js` is removed. `main.js` imports
`FIRST_LAUNCH_SOURCE`, and the old sphere text moves to
`test/support/sphere-source.js` as `SPHERE_SOURCE`.

### D-2: `src/ui/persistence.js`: pure logic, and a storage wrapper
- **`needsConfirm(text, baseline)`** is `text !== baseline`. A missing
  baseline (`null`) always confirms.
- **`saveFileName(lastName)`** returns `lastName ?? 'model.csg'`. The caller
  keeps `lastName` up to date:
  - after an Open, the file's name;
  - after an example load, the example's `fileName`.
- **`createStore(getStorage)`** returns `{ load, saveSource, saveBaseline }`.
  - `getStorage` returns a Storage-like object, or throws.
  - Every access is inside `try`/`catch`. On failure, `load()` returns
    `null`, and the writes do nothing, so autosave is silently off (D26).
  - The keys are `web-csg.source` and `web-csg.baseline`.
  - `load()` returns `{ source, baseline }`, with `baseline` `null` when
    only a source was saved.

*Alternative:* call `localStorage` directly in `main.js`. Rejected: the
failure cases (throwing access, quota) would then be testable only in a
browser.

### D-3: Wiring in `main.js`
- **Start:**
  - With a saved source, the editor gets `saved.source`, and the baseline
    is `saved.baseline`.
  - Otherwise, the editor gets `FIRST_LAUNCH_SOURCE`, which is also the
    baseline.
  - Then the usual first rebuild runs.
- **Autosave:** the existing `input` listener also calls
  `store.saveSource(source.value)`. It is synchronous and cheap, so a reload
  right after typing keeps the edit.
- **`load(text, name)`,** for an Open or an example:
  1. set `source.value` to the text with each `\r\n`, or lone `\r`,
     normalized to `\n` (D28, the owner's decision after Critic round 1),
     and put the caret and scroll at the start;
  2. cancel any pending debounced rebuild, then update the gutter and
     rebuild at once;
  3. set the baseline to the text the editor now holds (`source.value`),
     and `lastName` to `name`;
  4. save both the source and the baseline.
- **Open:**
  - The toolbar button clicks a hidden
    `<input type="file" accept=".csg,text/plain">`.
  - On `change` with a file: read `file.text()`, which decodes UTF-8 and
    drops a leading BOM. If `needsConfirm` and `confirm(...)` is declined,
    stop. Otherwise, call `load`.
  - The input's `value` is reset afterwards, so the same file can be chosen
    again.
  - A `change` with no file (a cancel) does nothing.
- **Save:**
  - It creates a `Blob` of the exact text (`text/plain`), and an object URL.
  - A temporary `<a download="…">` is clicked, and the URL is revoked
    afterwards.
  - The baseline becomes the text, and it is saved.
- **Examples:**
  - A `<select id="examples">` has a disabled, selected "Examples…"
    placeholder with an empty value, then one option per example.
  - On `change`, it confirms if needed, and loads the example. Either way,
    it resets to the placeholder.
- **The confirmation message:** "Replace the editor text? Changes since the
  last Open, Save, or example will be lost."

### D-4: D17 in the lexer
- **The leading BOM:** before the main loop, if `source[0] === '\uFEFF'`,
  start at index 1 without advancing the column. A later U+FEFF, including a
  second leading one, is not whitespace (`isSpace` is ASCII only), so it
  stays an unexpected character at its position.
- **Identifiers and whitespace:** unchanged, since both are already ASCII
  only. The spec now says so explicitly.
- **The message:** a small pure function, `describeCharacter(codePoint)`,
  builds the text after "unexpected character":
  - An invisible character matches `/[\p{Zs}\p{Zl}\p{Zp}\p{Cc}\p{Cf}]/u`,
    a Unicode property escape that Node 22 and every target browser
    support. It gives `U+XXXX`, plus ` (name)` from a frozen `CHARACTER_NAMES`
    map of the 14 names in the spec.
  - Any other non-ASCII character gives `'X' (U+XXXX)`.
  - Visible ASCII gives `'X'`, as today.
  - The hex part is `codePoint.toString(16).toUpperCase().padStart(4, '0')`.
  - The error position is unchanged.

*Alternative:* show code points for every character, ASCII included.
Rejected: `unexpected character '$' (U+0024)` adds noise to the common case,
and the existing ASCII messages stay as they are.

### D-5: Tests
- **Unit:**
  - `test/ui/persistence.test.js`: `needsConfirm`, `saveFileName`, and
    `createStore`, with a fake storage, a throwing `getStorage`, a storage
    whose `setItem` throws (quota), and a missing baseline.
  - `test/ui/examples.test.js`:
    - the ids, titles, and file names, in order;
    - every example compiles with no diagnostics;
    - the bored cube equals `VISION_EXAMPLE`;
    - the Primitives example contains all four primitives, and the Boolean
      example all three Boolean operations;
    - each matches its golden, `example-<id>` (64×48).
  - `test/core/lexer.test.js`: a leading BOM ignored, with the same tokens
    and positions; a second BOM, or one after the start, rejected at its
    position; `let é = 1;` rejected at `é`.
- **e2e** (`e2e/persistence.spec.js`, on all three engines), one test or
  more per scenario:
  - **Reload:** fill, reload, then check the value is equal and the render
    finished; also an invalid source restored with its diagnostics.
  - **No storage:** an init script makes the `localStorage` getter throw.
    The page shows the bored cube, edits rebuild, and no `pageerror` occurs.
  - **First launch:** the bored cube.
  - **Save:** `page.waitForEvent('download')`. Read the file, and compare it
    exactly, for both a valid and an invalid source. The file name follows
    each rule.
  - **Open:** `setInputFiles` with an in-memory `.csg` file. Check the text,
    diagnostics, and render; also a BOM-prefixed file, and a cancel
    (`setInputFiles([])`), which changes nothing and shows no dialog.
  - **Examples:** the exact options, each loads with no diagnostics, and the
    picker resets.
  - **Confirmation:** declining leaves the text; accepting replaces it; no
    dialog when the text is unedited, after a Save, or on first launch; and
    a dialog after a reload of edited text.
  - **Detecting a prompt:** each test registers `page.on('dialog')`, and
    fails if a prompt appears where none is expected.
- **Existing tests:**
  - render, golden, and render-job tests, the `live-rebuild` fills, and the
    `stale` capture move to `SPHERE_SOURCE`, so the `sphere` golden and
    their expectations are unchanged;
  - the `editor-preview` e2e initial-value and Tab-undo checks use
    `FIRST_LAUNCH_SOURCE`;
  - the "Order of top-level solids" test uses `SPHERE_SOURCE`, per the
    reworded `implicit-union` scenario.

### D-6: Documentation and evidence
- **DESIGN:**
  - §4: the header toolbar;
  - §8 Save, load, and examples: scenarios for the save file name, a file
    with a BOM, a cancelled Open, the picker reset, and the app working
    without storage;
  - §8 Modeling language: the D17 rules (ASCII identifiers and whitespace,
    the leading BOM, and the unexpected-character messages);
  - §12: D26 (the writer's defaults from the proposal, for the owner to
    accept). D17 was resolved during planning, in the owner's D17
    interview.
- **CONSTRAINTS §2:** the modules `examples.js` and `persistence.js`
  (`default-source.js` is removed).
- **ROADMAP:** M6 status. When archived, M6 is complete, and so is the
  first release.
- **Evidence:**
  - `npm run capture -- M6`, with the `app` shot (the first launch is now
    the bored cube) and one shot per example;
  - `docs/progress/M6/README.md`, with the criteria, the gates, the
    seen-to-fail records, and the owner's full manual pass of DESIGN §8 in
    Safari, as a checklist.

## Risks / Trade-offs

- **[The bored cube renders more slowly than the sphere on first launch,
  and e2e tests that wait for a finished render may take longer]** → Only
  tests that depend on the sphere switch to `SPHERE_SOURCE` by filling it
  first. Measure the full e2e run time before and after, and record it in
  the README.
- **[`File.text()` removes a BOM only by the Encoding Standard]** → The
  e2e BOM test checks it on all three engines. The lexer rule (D17) covers
  pasted text, and would also cover a browser that kept the mark.
- **[`confirm()` is unstyled, and blocks the page]** → This is the owner's
  choice. Playwright handles it through `page.on('dialog')` on all engines.
- **[Two open tabs overwrite each other's autosave]** → The last write
  wins. This is out of scope, and noted in the README.
- **[Downloads in WebKit under Playwright]** → `waitForEvent('download')`
  is supported by all three engines in Playwright 1.63. If WebKit fails, stop
  and report the result, rather than skipping the engine.
- **[Setting `source.value` clears undo]** → A load is a new document, not
  an edit. This is recorded as a non-goal.
