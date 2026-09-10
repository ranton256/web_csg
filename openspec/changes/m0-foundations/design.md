## Context

The repository has only planning documents (see proposal.md, Why). Tooling
choices are already fixed by CONSTRAINTS §1 and §4:
- plain ES modules with no build step
- Node ≥ 22 and `node:test`
- `@playwright/test` as the only dev dependency
- a zero-dependency `tools/serve.mjs`
- golden images as PPM files, compared within 1 per channel
- captures written to `docs/progress/<milestone>/`
- a pre-commit hook that runs `npm test`

CONSTRAINTS §2 deferred the source layout to the M0/M1 proposals.

This machine has Node v22.20.0 and npm 10.9.3. Playwright browser binaries are
cached, and npm's current `@playwright/test` release is 1.63.0 (checked
2026-09-10). The only branch is `master`, and there is no remote.

## Goals / Non-Goals

**Goals:**
- Every gate in CONSTRAINTS §5 exists, passes, and has been seen to fail.
- Decide the repository layout that M1 onward builds into.
- Keep the tooling small and readable enough for students to follow.

**Non-Goals:**
- No modeling-language, core rendering, or editor code. The core render
  function from DESIGN §7 arrives in M1.
- No CI, since there is no remote (ROADMAP backlog).
- No core-purity lint gate yet. There is no core code to guard; it is
  recorded as a backlog item for M1.

## Decisions

### D-1: Repository layout
```text
index.html                 # App entry page (placeholder in M0)
src/core/                  # DOM-free core (created in M1)
src/ui/                    # Browser shell (created in M1)
test/**/*.test.js          # Node unit + golden tests
test/support/              # Test helpers (PPM, golden comparison)
test/golden/*.ppm          # Committed reference images
e2e/**/*.spec.js           # Playwright tests
tools/serve.mjs            # Dev server
tools/capture.mjs          # Milestone screenshots
tools/golden-update.mjs    # Runs the suite in golden-update mode
tools/hooks/pre-commit     # Versioned git hook
docs/progress/<M>/         # Milestone evidence
```
The split into `src/core/` and `src/ui/` puts the DOM-free boundary
(CONSTRAINTS §2) in the directory structure, where it can later be checked
mechanically. `index.html` sits at the root, so `/` is the app and module
paths stay short.
*Alternative:* `public/` + `src/`. Rejected because with no build step,
there's nothing to separate.

### D-2: Explicit test discovery
`npm test` runs `node --test "test/**/*.test.js"`. Node ≥ 22 expands the
glob itself.
*Alternative:* bare `node --test`. Rejected because Node's default patterns
also run every `.js` file under a `test/` directory, which would include the
helpers, and could pick up files elsewhere later. With an explicit glob,
helpers are never run as tests, and e2e files (`*.spec.js` in `e2e/`) stay
out of the Node suite.

### D-3: Golden helper and update mode
`test/support/ppm.js` exports PPM `readPPM`/`writePPM` (and the in-memory
`encodePPM`/`decodePPM`). `test/support/golden.js` exports
`expectMatchesGolden(name, width, height, rgba)`. Update mode is on when
`GOLDEN_UPDATE=1`. `npm run golden:update` runs `tools/golden-update.mjs`,
which sets that variable and starts `node --test` with the same glob.
Using a Node wrapper instead of a shell-prefixed variable keeps the script
working in any shell. Mismatches write `test-results/golden/<name>.actual.ppm`
(gitignored).
*Alternative:* PNG via `node:zlib`. Rejected in D12: it needs more code for
no verification benefit. macOS Preview and most image tools open PPM.

### D-4: Dev server
`tools/serve.mjs` uses `node:http` and `node:fs`.
- It binds to `127.0.0.1`.
- It decodes the URL path, resolves it against the repository root, and
  refuses anything whose `path.relative` escapes the root.
- It streams files with the MIME table from the spec and sends
  `Cache-Control: no-store`.
- The port comes from `--port`, then `PORT`, then `8080`.

It exports a `startServer({ port, root })` function, so tests and
`capture.mjs` can start it in-process. The CLI entry point wraps that
function.
*Alternative:* `npx http-server`/`serve`. Rejected because it adds a dependency
and hides code students should be able to read.

### D-5: Playwright configuration
`playwright.config.js` has:
- `testDir: 'e2e'`
- three projects (`chromium`, `firefox`, `webkit`)
- `retries: 0`, so flakiness surfaces instead of being masked
- `forbidOnly: true`
- `reporter: 'list'`, which never opens an HTML report
- `webServer` running `node tools/serve.mjs --port 4173`, with
  `reuseExistingServer: true`

Using port 4173 keeps the e2e server separate from a developer's
`npm start` on 8080. `npx playwright install chromium firefox webkit` fetches
the binaries that match the pinned version.

### D-6: Capture tool
`tools/capture.mjs <milestone>` starts the server in-process on a free port.
It launches Chromium from `@playwright/test` with a 1280×800 viewport and
`deviceScaleFactor: 1`, and saves one PNG per entry in a shot list
(`[{ name: 'app', path: '/' }]` for M0). Later milestones add entries, such as
one per built-in example. Chromium alone is enough for evidence: cross-engine
correctness is the e2e suite's job, and one engine keeps captures consistent.

### D-7: Hook installation via `core.hooksPath`
`npm run hooks:install` runs `git config core.hooksPath tools/hooks`.
`tools/hooks/pre-commit` is a POSIX `sh` script, committed with its executable
bit, that runs `npm test`. Setting the same config value twice is naturally
idempotent.
*Alternative:* copy into `.git/hooks/`. Rejected because the copy can drift
from the versioned script.

### D-8: Placeholder page
`index.html` has `<title>Web CSG</title>`, a heading, and one ES-module script
(`src/ui/main.js` is created in M1, so in M0 the script is inline). The inline
script proves module loading works and logs nothing. This gives e2e and
capture a real target without anticipating M1's UI.

### D-9: Branch and delivery order
First rename `master` to `main` (`git branch -m master main`), so the change
branch `m0-foundations` is cut from `main`. The change is merged into `main`
only after `npm run check` passes and the Critic returns `[APPROVED]`.

## Risks / Trade-offs

- [WebKit is not Safari] → Record a manual Safari smoke check in
  `docs/progress/M0/README.md`, as CONSTRAINTS §5 requires.
- [The hook can be bypassed with `--no-verify`, and the e2e suite is not in
  the hook] → By process, the full gate and Critic run before every merge
  (CONSTRAINTS §4). CI stays in the backlog.
- [Browser binary downloads are large and version-coupled] → Pin
  `@playwright/test` exactly. Setup always runs `npx playwright install`.
- [A fixed e2e port can collide] → Port 4173 is used only by the e2e run.
  `reuseExistingServer` assumes whatever is on 4173 is our server; the page
  title assertion catches a foreign server.
- [A synthetic golden proves only the plumbing] → Accepted for M0 (ROADMAP
  allows a trivial fixed buffer). Real renders start in M1.
- [Seen-to-fail checks could damage the working tree] → Run them in an
  isolated copy (a scratch `git worktree`) and record the observed failures.

## Migration Plan

1. `git branch -m master main`. Roll back with `git branch -m main master`.
2. Apply the change on `m0-foundations`, then merge into `main` after the gate
   and Critic. No data migration is involved.
