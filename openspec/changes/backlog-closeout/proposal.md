## Why

This change delivers no ROADMAP milestone. It is a backlog close-out between
**M5** (complete) and **M6** (Persistence & examples). The owner asked to
close out the backlog, and four items can be built now:
- two small dev-server items the M0 Critic reported;
- two editor features the owner requested on 2026-09-11.

Closing them before M6 keeps the first release from carrying known rough
edges in the editor it ships.

## What Changes

- **Dev server: dot-paths are not served** (backlog, M0 Critic round 2). A
  request path with any segment starting with `.` (for example
  `/.git/config` or `/openspec/.openspec.yaml`) gets `404`, so repository
  metadata is never served even on loopback. No app file lives under a
  dot-path.
- **Dev server: the symlinked entry-point check** (backlog, M0 Critic
  round 6). Started through a symlinked path under Node's
  `--preserve-symlinks-main`, the server now starts, or exits non-zero on an
  invalid port, exactly as through its real path. Before, it exited 0
  silently. The main-module check compares real paths on both sides.
- **Editor: Tab indents** (owner request, 2026-09-11; the owner's choices).
  - Tab inserts two spaces at the caret. With several lines selected, it
    indents each selected line by two spaces.
  - Shift+Tab removes up to two leading spaces from the current or selected
    lines.
  - Esc, then Tab, moves focus out of the editor as usual, so keyboard users
    are never trapped (WCAG 2.1.2).
  - Tab edits trigger the normal rebuild, and native undo still works.
- **Help for the modeling language on request** (owner request, 2026-09-11;
  the owner's choice).
  - A "Help" button in the page header opens a dialog with a concise
    language reference: statements and `let`; primitives; transforms;
    Booleans; the `camera`, `light`, and `material` blocks; and a short
    example.
  - Esc or a Close button closes it, and focus returns to where it was.
  - The editor and preview stay underneath, unchanged.
- **The backlog after this change:**
  - The four lines above are struck through as delivered.
  - "Add CI" stays open, waiting for a git remote.
  - "Point lights" stays open, as a parked DESIGN feature that needs its own
    proposal.
  - The "Parked optional features" line is a standing list, and stays.

## Capabilities

### New Capabilities
- `language-help`: the on-request help dialog: how it opens and closes, its
  focus behavior, and the topics it must cover.

### Modified Capabilities
- `dev-server`:
  - "Confined to the repository" gains the dot-path rule;
  - "Serve repository files over local HTTP" gains the
    `--preserve-symlinks-main` scenario.
- `editor-preview`:
  - a new requirement for Tab and Shift+Tab indentation, with the Esc
    escape;
  - the page layout gains the Help button.

## Impact

- **Code:**
  - `tools/serve.mjs`: the dot-path check and the real-path comparison;
  - `src/ui/indent.js` (new): pure indentation logic;
  - `src/ui/main.js`: key handling, and the Help dialog wiring;
  - `index.html`: the Help button, the `<dialog>`, and its reference text.
- **Tests:**
  - dev-server tests for dot-paths and the preserved-symlink start;
  - unit tests for the indentation logic;
  - e2e tests on Chromium, Firefox, and WebKit for Tab, Shift+Tab, the Esc
    escape, undo, and the Help dialog (open, content, close, focus return).
- **Documents:**
  - DESIGN §4 (the Help button), §8 (Tab and Help behavior), and §12 (D23,
    the owner's decisions);
  - CONSTRAINTS §2 (the `indent.js` module);
  - the ROADMAP backlog.
- **Evidence:** a `docs/progress/backlog-closeout/` README with captures of
  the Help dialog and of indented source, plus the owner's Safari smoke
  check.
- **Dependencies:** none added.
- **Out of scope:**
  - CI (no remote);
  - point lights (parked);
  - syntax highlighting and other editor features (parked);
  - M6 persistence and examples.
