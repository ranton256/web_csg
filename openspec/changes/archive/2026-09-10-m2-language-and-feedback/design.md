## Context

See proposal.md (Why). M1 left:
- **Core:** a recursive-descent parser for the subset; an evaluator that
  reports every semantic error, with `null` as the "already reported" value;
  `renderRows` for band rendering; and the D15 nesting cap for unary minus and
  vectors.
- **Page:** a synchronous page with a fixed 640×480 canvas.

DESIGN §5 fixes the 300 ms rebuild and 150 ms resize debounces and one ray per
CSS pixel. DESIGN §8 specifies the editor behaviors. The owner chose
window-plus-divider resizing and folded in the two M1 backlog items. New
numbers this design needs are proposed in DESIGN §12 D18.

## Goals / Non-Goals

**Goals:**
- A complete grammar, so M3–M5 add evaluation only. The parser does not
  change again before M6.
- Editor behavior that is deterministic to test: timing logic in pure
  modules with injectable clocks, and e2e timing on Playwright's fake clock.
- No unbounded recursion anywhere in compile, for any input.

**Non-Goals:**
- Semantics of any construct beyond `sphere` and the camera.
- Web Worker rendering, syntax highlighting, and persisting the divider
  position (the first two are parked; the last may come with M6 persistence).

## Decisions

### D-1: Grammar and parser shape
```text
statement  := 'let' NAME '=' expr ';'
            | PROPBLOCK '{' (NAME ':' expr ';')* '}'          PROPBLOCK := camera | light | material
            | PRIMITIVE '(' args? ')' ';'                      PRIMITIVE := sphere | cube | box | cylinder
            | TRANSFORM '(' args? ')' body                     TRANSFORM := translate | rotate | scale
            | BOOLEAN body                                     BOOLEAN   := union | intersection | difference
body       := '{' statement* '}'
expr       := term (('+' | '-') term)*
term       := unary (('*' | '/') unary)*
unary      := '-' unary | primary
primary    := NUMBER | NAME | '(' expr ')' | '[' expr ',' expr ',' expr ']'
```
- `expr` and `term` build **chain nodes**
  `{ type: 'Chain', first, rest: [{ op, operand, loc }] }` instead of nested
  binary nodes. Operator chains of any length therefore add no recursion.
- The D15/D18 depth counter is incremented on unary minus, `[`, `(`, and
  entering a body, and throws at 101.
- Argument lists stay generic (positional or named); binding them to
  parameters remains the evaluator's job. In M2 only `sphere` is bound.

*Alternative:* nested binary nodes with an explicit stack in the evaluator.
Rejected: chains keep both the parser and the evaluator plainly iterative,
and they read like the precedence table.

### D-2: Arithmetic evaluation
`evaluateChain` folds left over `rest` with `applyOperator(op, left, right,
loc)`.
- A table keyed by operand kinds (`number`, `vector`) implements the allowed
  combinations.
- Anything else reports ``invalid operands for `*`: vector and vector``,
  naming the operator and the kinds.
- Division checks for a zero divisor before dividing, for a number or a
  vector numerator alike.
- A `null` operand, meaning the error was already reported, yields `null`
  without a new diagnostic, so errors never cascade.

### D-3: Unsupported constructs, bodies, and scope
The evaluator gains `evaluateStatements(statements, scope, context)`. It is
used for the top level (`context.topLevel = true`) and for every body, with a
child `Scope`.
- **Sphere call** (top level only in M2): bound and validated as in M1.
- **Later primitives, transforms, Booleans:**
  - report "`kw` is not supported yet" at the keyword;
  - evaluate their argument expressions for name and arithmetic errors, with
    no parameter binding yet (M3);
  - walk the body in a child scope;
  - apply the empty-body rule: the body must contain at least one call or
    block statement.
- **Sphere inside a body:** only the enclosing unsupported construct is
  reported, and the sphere's arguments are checked. It can't be rendered
  until its parent's semantics exist.
- **`camera` in a body:** "the camera block must be at the top level".
  `validateCamera` still runs for its property errors, but the result is
  discarded.
- **`light` / `material`:** "not supported yet"; their property expressions
  are evaluated.
- **Solids for rendering:** only top-level spheres, as in M1. Any
  unsupported construct produces a diagnostic, so the scene is `null` anyway.

### D-4: UI modules
```text
src/ui/
  default-source.js   # unchanged
  text-position.js    # lineColumnToOffset(text, line, column): code points → UTF-16 offset; lineCount(text)
  debounce.js         # createDebouncer(delayMs, { setTimeout, clearTimeout }) → { trigger(fn), cancel() }
  render-job.js       # startRenderJob({ scene, width, height, rgba, budgetMs, now, schedule, onBand, onDone }) → { cancel() }
  divider.js          # clampEditorWidth(width, windowWidth, limits) and the pointer/keyboard wiring
  main.js             # Wiring: textarea, gutter, diagnostics, preview, divider, ResizeObserver
```
`text-position.js`, `debounce.js`, `render-job.js`, and `clampEditorWidth`
touch no DOM. They take their timers and clock as parameters, so
`test/ui/*.test.js` runs them in Node with fake time. The core-purity check
stays scoped to `src/core/`, and `src/ui/` may use the DOM.

### D-5: Progressive render job
- **Loop:** `startRenderJob` renders one row at a time with `renderRows`
  until `now() − sliceStart ≥ budgetMs` (12 ms, D18) or the image is done.
- **Drawing:** it calls `onBand(y0, y1)`, which draws only those rows
  (`putImageData(image, 0, 0, 0, y0, width, y1 − y0)`), then schedules the
  next slice.
- **Yielding:** `schedule` in the browser posts to a `MessageChannel`, which
  yields to input and paint without `setTimeout`'s nested-timer clamping.
- **Cancellation:** `cancel()` sets a flag that the next slice checks before
  doing any work, so a cancelled job never draws again.
- **Output:** because every row comes from `renderRows`, the finished buffer
  is byte-identical to `renderSource`. This is already guaranteed by M1's
  band test and re-checked in e2e.

### D-6: Rebuild pipeline and stale state
```text
input → debouncer(300 ms) → compile(text)
  diagnostics → render list; if any: show stale indicator (the last valid job keeps running)
  no diagnostics → hide stale; lastScene = scene; restartRender()
resize (ResizeObserver) → debouncer(150 ms) → resizeCanvas(); restartRender() with lastScene
```
- **`restartRender()`:** cancels the current job, allocates the RGBA buffer
  for the canvas size, starts a new job, and shows "Rendering…" until
  `onDone`.
- **`resizeCanvas()`:** first copies the current image into an offscreen
  canvas, sets the new `width`/`height` (which clears the canvas), and draws
  the copy scaled to fill. The picture is never blank while the new bands
  arrive.
- **Initial load:** compiles and renders immediately, with no debounce.

*Alternative:* re-render synchronously on resize. Rejected because DESIGN
requires the debounce and responsiveness.

### D-7: Gutter and caret
- **Gutter:** an `aria-hidden` `<div>` of line numbers, with the same font
  and line height as the textarea. The textarea uses `wrap="off"`, so one
  number is one line. On `input` it re-renders the numbers (from
  `lineCount`), and on the textarea's `scroll` it copies `scrollTop`.
- **Diagnostics:** each entry is a `<button>` inside its `<li>`, showing
  `line:column message`. Clicking it focuses the textarea and calls
  `setSelectionRange(offset, offset)` with
  `offset = lineColumnToOffset(text, line, column)`. Code points are converted
  to UTF-16 here, so an emoji before the error doesn't shift the caret.

### D-8: Divider
- **Element:** a `<div role="separator" aria-orientation="vertical" tabindex="0">`.
- **Pointer:** `pointerdown` calls `setPointerCapture`, and `pointermove`
  sets the editor width through a CSS custom property.
- **Keyboard:** ArrowLeft/Right move it ±16 px.
- **Clamping:** `clampEditorWidth` keeps both sides ≥ 240 px (D18), even when
  the window is too narrow, in which case the editor gets 240 px.
- **Accessibility:** `aria-valuenow` reports the width.
- **Layout:** the preview panel is `flex: 1`, and the `ResizeObserver` on it
  picks up both divider moves and window resizes.

### D-9: Scanner patterns (backlog item)
The import and re-export patterns change from requiring `\s+` to allowing
`\s*` wherever JavaScript permits no whitespace:
`\bimport\s*(?:[\w$*{}\s,]*?\bfrom\s*)?(['"])…` and
`\bexport\s*(?:\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*(['"])…`.
New fixtures cover the two forms the Critic found.

### D-10: Test strategy
- **Node unit tests:**
  - grammar: precedence, chains, parentheses, body parsing, chaining errors,
    the depth cap for parentheses and bodies, a 100,000-term chain;
  - arithmetic tables and division by zero;
  - scopes in bodies; unsupported constructs with checked contents; the
    empty-body rule; camera in a body; the D14 non-unit test;
  - `test/ui/`: `lineColumnToOffset`, the debouncer on fake timers, the
    render job (slicing on a fake clock, cancellation, and output equal to
    `renderSource`), and `clampEditorWidth`;
  - the scanner fixtures.
- **e2e (`e2e/editor-preview.spec.js`, rewritten; plus `e2e/live-rebuild.spec.js`):**
  - **Debounce:** runs on `page.clock` (install, fill, `runFor(299)` → no
    rebuild, `runFor(1)` → rebuild), with counters exposed as `data-*`
    attributes (`data-rebuilds`, `data-renders-done`).
  - **Responsiveness:** runs on real timers with a costly scene (many
    concentric spheres) and a large viewport. The test asserts that a typed
    key is in the textarea while `#status` still shows "Rendering…".
  - **Cancellation:** a second valid edit mid-render increases
    `data-renders-started` twice, but `data-renders-done` only once, for the
    newer model.
  - **Divider:** drag and keyboard, then the resize rule. Window resize uses
    `page.setViewportSize`.
  - **Result:** pixel equality with a full render, computed in the page by
    importing `/src/core/render.js`.
  - **Stale:** the indicator shows on error, the image checksum is unchanged,
    the indicator clears on fix, and it stays visible across a resize.
- **Capture:** the shot list gains `stale` (the page with an error and the
  indicator showing), driven by `capture.mjs` typing into the page.

## Risks / Trade-offs

- [Timing tests are flaky] → The debounce and cancellation logic is
  unit-tested with fake timers. Browser debounce tests use `page.clock`. The
  one real-time test (responsiveness) asserts an ordering, not a duration,
  and uses a scene that renders for well over 100 ms.
- [`ResizeObserver` warnings count as console errors in some engines] → The
  callback only schedules a debounced action, and never changes the observed
  element's size synchronously.
- [Resizing a canvas clears it] → The scaled copy of the old image covers
  the gap (D-6).
- [Large windows make full renders slow (e.g. 2560×1400 ≈ 3.6M rays)] →
  Progressive slices keep the page responsive. There is no speed target;
  render times are recorded in the evidence.
- [D18 values may not match the owner's taste] → They are single constants,
  proposed in DESIGN §12, and accepted or amended before implementation.

## Migration Plan

`index.html` and `src/ui/main.js` are rewritten; M1's `e2e/editor-preview.spec.js`
is replaced. The core API (`compile`, `renderRows`, `renderSource`) is
unchanged, so the goldens and core tests carry over. The two M1
requirements named "… of the M1 subset", and M1's "Re-render on every edit",
are removed by this change's deltas. Roll back by reverting the branch.

## Open Questions

- Whether D18's numbers are accepted as written. This does not change the
  approach or tasks; only constants and DESIGN §5 wording change.
