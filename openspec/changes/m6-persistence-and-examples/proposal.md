## Why

This change delivers ROADMAP milestone **M6: Persistence & examples**, the
first release. Today every edit is lost on reload, and there is no way to hand
work in or share it. The app also opens on a bare sphere, not the bored cube
that DESIGN asks for. M6 makes work survive reloads and move as `.csg` files,
and ships three examples that teach the language.

D17 (which characters count as identifier letters) had to be decided before
files could be opened from disk. The owner has decided it, and this change
records it.

## What Changes

- **Autosave and restore:** every edit is saved in the browser's
  `localStorage`. On reload, the editor shows the saved source, and the
  preview renders it.
- **First launch:** with nothing saved, the editor shows the bored-cube
  example and renders it. This replaces the M1 sphere.
- **Save:** downloads a `.csg` file that contains exactly the editor text,
  valid or not.
- **Open:** loads a chosen `.csg` file into the editor, which evaluates and
  renders it as if it had been typed. Line breaks become `\n`, as a text area
  stores them (D28, the owner's decision after Critic round 1).
- **Examples:** an "Examples…" dropdown lists exactly three examples: Bored
  cube, Primitives, and Boolean operations. Choosing one loads its source.
  - Every example evaluates with no diagnostics, and has a golden image.
  - The Primitives and Boolean operations examples use lights and a
    material, which the roadmap asks for "where helpful". The Boolean
    example uses a point light.
- **Confirmation** (the owner's choice: the browser's native `confirm()`):
  - Open, or choosing an example, asks before replacing text that differs
    from the last Open, Save, or example load. Declining leaves the text
    unchanged.
  - Text equal to the last load is replaced without a prompt.
- **Header toolbar** (the owner's choice): Open…, Save, and the Examples…
  dropdown, beside Help.
- **D17** (the owner's choice):
  - Identifiers stay ASCII: letters, digits, and `_`.
  - The lexer skips one byte-order mark (U+FEFF) at the very start of the
    source. A BOM anywhere else is still an "unexpected character".
  - Whitespace stays ASCII. A non-breaking space or another Unicode space
    is an "unexpected character".
  - The diagnostic names the character:
    - a visible non-ASCII character adds its code point
      (`unexpected character 'é' (U+00E9)`);
    - an invisible one shows its code point and, for common ones, a name
      (`unexpected character U+00A0 (no-break space)`).

    **BREAKING (message text only):** these characters were reported by
    their bare glyph, which was unreadable when it was invisible.
- **The writer's defaults** (recorded in DESIGN §12 as D26, for the owner to
  accept):
  - **Save file name:** the last opened file's name, or the last example's
    file name, and otherwise `model.csg`.
  - **The baseline is saved too:** the text of the last Open, Save, or
    example load is saved alongside the source, so a reload does not change
    whether a replacement asks.
  - **When Open asks:** only after a file has been chosen, so cancelling the
    file picker never prompts.
  - **Rebuild on load:** an Open or an example rebuilds at once, with no
    300 ms debounce.
  - **No storage:** when `localStorage` is unavailable, the app works
    without autosave, and reports no error.
- **Documents:**
  - DESIGN: §4 (the toolbar), §8 (the Save, load, and examples scenarios,
    and the D17 rules in Modeling language), §12 (D26). D17 itself was
    resolved in the owner's interview before this change, and is already
    recorded;
  - CONSTRAINTS §2 (the new modules);
  - ROADMAP: M6 status, and the first release.

## Capabilities

### New Capabilities
- `save-load-and-examples`: autosave and restore, the first launch, Save,
  Open, the examples picker, and the confirmation before replacing edited
  text.

### Modified Capabilities
- `editor-preview`: "Page layout and initial render". The header gains the
  toolbar, and the editor starts with the autosaved source, or the bored
  cube on first launch.
- `modeling-language`: "Lexical structure". One leading byte-order mark is
  skipped (D17).
- `implicit-union`: its scenario about "the default example's sphere" names
  its source directly, since the default example is no longer a sphere.
- `stale-preview`: "Invalid edits keep the last valid preview". The stale
  indicator stays hidden while no valid model exists yet, as when an invalid
  saved source is restored (D27, the owner's decision during apply).

## Impact

- **Code:**
  - `src/ui/examples.js` (new): the three example sources. The bored cube
    moves here from `test/support/vision-example.js`, which re-exports it.
  - `src/ui/persistence.js` (new): pure logic and a storage wrapper. It
    decides whether to confirm, picks the save file name, and reads and
    writes the saved source and baseline, tolerating missing storage.
  - `src/ui/main.js`: the toolbar, autosave, restore, Open, Save, and the
    examples.
  - `index.html`: the toolbar.
  - `src/ui/default-source.js`: the first-launch source becomes the bored
    cube.
  - `src/core/lexer.js`: the leading-BOM rule.
- **Tests:**
  - unit tests for the persistence logic, the examples (each compiles, and
    matches its golden), and the BOM rule;
  - a new `e2e/persistence.spec.js` for every Save, load, and examples
    scenario, on Chromium, Firefox, and WebKit;
  - the existing tests and tools that rely on the sphere text move to a
    test fixture, `test/support/sphere-source.js`, so their goldens are
    unchanged.
- **Goldens:** three new ones, `example-bored-cube`, `example-primitives`,
  and `example-boolean-operations`. The existing goldens are unchanged.
- **Evidence:** `docs/progress/M6/README.md`, with a capture of each example
  and the owner's full manual pass of DESIGN §8 in Safari.
- **Dependencies:** none added.
- **Out of scope:**
  - servers and accounts;
  - several open documents, and recent files;
  - drag and drop, and the File System Access API;
  - Unicode identifiers (D17).
