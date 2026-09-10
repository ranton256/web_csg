## Why

The project has agreed plans (DESIGN.md, CONSTRAINTS.md, ROADMAP.md) but
nothing that runs, so no later change can meet the definition of done in
CONSTRAINTS §5. M0 builds the verification harness first. Every rendering
milestone after it is judged by the gate, golden images, and captures, so
these must exist and be seen to fail before there is real code to protect.

## What Changes

- Rename the `master` branch to `main` (D13). Deliver this change on a
  branch, merged only after the full gate and Critic review.
- Add `package.json`: private, ES modules, Node ≥ 22 `engines`, no runtime
  dependencies, `@playwright/test` pinned to an exact version as the only dev
  dependency, and the npm scripts from CONSTRAINTS §4 (`start`, `test`,
  `test:e2e`, `check`, `capture`, `golden:update`, `hooks:install`).
- Add `.gitignore` for `node_modules/` and test/report output.
- Add `tools/serve.mjs`: a zero-dependency static server used by `npm start`
  and the e2e runner.
- Add a minimal placeholder app page (`index.html`) so the server, e2e, and
  capture paths have something real to load. It is not a feature.
- Add golden-image support: binary PPM read/write, comparison within 1 per
  channel, deliberate regeneration only, and one golden test against a
  fixed synthetic buffer.
- Add Playwright configuration for Chromium, Firefox, and WebKit, with one e2e
  test that loads the page.
- Add `npm run capture`, which writes screenshots into
  `docs/progress/<milestone>/`.
- Add a committed pre-commit hook that runs `npm test`, and
  `npm run hooks:install` to enable it.
- Populate `openspec/config.yaml` with project context and standing
  constraints.
- Update `CLAUDE.md` and `CONSTRAINTS.md`: the toolchain is verified, the
  real layout and commands are recorded, and the branch is `main`.
- Commit M0 evidence in `docs/progress/M0/`.

## Capabilities

### New Capabilities
- `dev-server`: serves the app over local HTTP for development, e2e tests,
  and captures, safely confined to the repository.
- `verification-tooling`: the gate commands, golden-image comparison and
  regeneration, cross-engine browser tests, milestone capture, and the
  pre-commit hook.

### Modified Capabilities
None. There are no existing specs.

## Impact

- **New files:**
  - `package.json`, `package-lock.json`, `.gitignore`, `index.html`
  - `playwright.config.js`
  - `tools/serve.mjs`, `tools/capture.mjs`, `tools/hooks/pre-commit`
  - `test/` (unit and golden tests, helpers, `test/golden/`), `e2e/`
  - `docs/progress/M0/`
- **Dependencies:** `@playwright/test` (dev only) and its browser binaries,
  downloaded by `npx playwright install`.
- **Git:** default branch renamed to `main`. `core.hooksPath` is set locally
  by `npm run hooks:install`.
- **Docs:** `openspec/config.yaml`, `CLAUDE.md`, `CONSTRAINTS.md` §1–§4, and
  `ROADMAP.md` (M0 status and backlog).
- **Out of scope:** any modeling-language, rendering, or editor behavior
  (M1 onward).
