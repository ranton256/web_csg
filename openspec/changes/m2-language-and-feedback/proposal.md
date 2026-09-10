## Why

This change delivers ROADMAP **M2 — Language & feedback**. M1 proves the
pipeline, but the language stops at unary minus, and the page re-renders
synchronously on every keystroke into a fixed 640×480 canvas. M2 completes the
grammar, so later milestones only add *semantics*. It also turns the page into
the editor DESIGN describes: live but debounced, never losing the picture, and
responsive while it renders.

## What Changes

- **Full grammar in the parser:**
  - binary `+ - * /` with the usual precedence and left associativity, and
    parentheses
  - the calls `cube`, `box`, `cylinder`
  - the transform blocks `translate(…) { … }`, `rotate(…) { … }`, `scale(…) { … }`
  - the Boolean blocks `union`, `intersection`, `difference`
  - `light` and `material` property blocks
  - nested bodies that may contain `let`
- **Evaluator rules:**
  - arithmetic operand types for numbers and vectors
  - division by zero
  - block-scoped `let` inside bodies, with no shadowing
  - the empty-body rule
  - the camera block allowed only at the top level
- **Constructs whose semantics arrive in M3–M5:** these are every primitive
  except `sphere`, transforms, Booleans, `light`, and `material`. They parse,
  and their contents are checked (names, arithmetic, scopes, empty bodies),
  but they are rejected with a "not supported yet" diagnostic at their
  keyword.
- **Bounded nesting:** the D15 cap of 100 now also counts parentheses and
  block bodies, so the new grammar cannot crash on deep input. Long operator
  chains are evaluated iteratively. This is an extension proposed in DESIGN
  §12 D18.
- **Editor, replacing M1's synchronous trigger:**
  - a line-number gutter kept in sync with the textarea
  - the diagnostics list, where clicking an entry puts the caret at its line
    and column
  - rebuilds 300 ms after the last edit
  - a stale indicator whenever the preview shows the last valid model instead
    of the current source
  - progressive rendering in time-sliced row bands, which a newer model
    cancels, with a "Rendering…" status
  - a preview that fills the rest of the window, with a draggable,
    keyboard-accessible divider between editor and preview (agreed with the
    owner); window and divider resizes re-render 150 ms after the last change,
    one ray per CSS pixel, with the vertical field of view preserved
- **Backlog items folded in (agreed with the owner):**
  - the core-purity scanner catches imports and re-exports written without
    spaces
  - a D14 parallel-up test with a non-unit `up` vector
- **Documentation:**
  - DESIGN §4 layout
  - DESIGN §12 D18, the new UI numbers and the nesting-cap extension, for the
    owner to accept; then they move to §5
  - CONSTRAINTS §2 `src/ui/` module layout
  - ROADMAP M2 status and backlog

## Capabilities

### New Capabilities
- `live-rebuild`: the debounced rebuild, progressive and cancelable rendering
  in row bands, the "Rendering…" status, typing responsiveness, and resize
  re-rendering (DESIGN §8 Live rebuild and progressive rendering; Camera
  definition, "Resizing preserves vertical field of view").
- `stale-preview`: keeping the last valid image with a visible stale
  indicator, and clearing it when the source is valid again (DESIGN §8 Invalid
  edits keep the last valid preview).

### Modified Capabilities
- `modeling-language`: the full grammar (operators, parentheses, calls,
  transform, Boolean and property blocks, bodies); arithmetic rules; block
  scope; empty bodies; the nesting cap extended to parentheses and bodies;
  constructs parsed but rejected until their milestone. The requirements
  named "… of the M1 subset" are renamed.
- `camera-definition`: a camera block inside a body is an error, and D14 is
  tested with a non-unit up vector.
- `editor-preview`: the new layout (gutter, divider, the preview filling the
  window, the status and stale areas) and clickable diagnostics. The M1
  "Re-render on every edit" requirement is removed in favor of `live-rebuild`.
- `verification-tooling`: the core-purity check covers imports and re-exports
  written without whitespace.

## Impact

- **Code:**
  - `src/core/parser.js` and `src/core/evaluate.js`: grammar, arithmetic,
    bodies, and rejection of unsupported constructs
  - `src/core/constants.js`: nesting cap wording, unchanged value
  - new pure UI helpers in `src/ui/` (text positions, debounce, progressive
    render job) that are unit-testable in Node
  - `src/ui/main.js` and `index.html` rewritten
- **Tests:**
  - unit tests for the grammar, arithmetic, scopes, bodies, the UI helpers,
    and the scanner
  - e2e tests for the gutter, diagnostic click, debounce (Playwright's fake
    clock), stale indicator, cancellation, responsiveness, divider and window
    resize, on three engines
  - M1's `e2e/editor-preview.spec.js` is rewritten for the new behavior
- **Capture:** `npm run capture -- M2` shows a valid render and the stale
  state (two shots).
- **Dependencies:** none added. Playwright's clock API ships with the pinned
  1.63.0.
- **Out of scope:**
  - semantics of cube, box, and cylinder, and of transforms (M3); Booleans (M4);
    lights and materials (M5); save/load (M6)
  - syntax highlighting, and Web Worker rendering (parked)
