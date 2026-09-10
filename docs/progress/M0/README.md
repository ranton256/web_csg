# M0 — Foundations: verification evidence

Change: `openspec/changes/m0-foundations` on branch `m0-foundations`.
Recorded 2026-09-10. Machine: macOS, Node v22.20.0, npm 10.9.3,
`@playwright/test` 1.63.0.

## Capture

![App page in Chromium, 1280×800](app.png)

`npm run capture -- M0` → `docs/progress/M0/app.png` (1280×800, Chromium,
device scale factor 1): the placeholder page with the "Web CSG" heading.

## ROADMAP "done when" criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| `npm run check` is green from a fresh checkout following the CONSTRAINTS §4 setup, with at least one unit, one golden, and one e2e test | Fresh `git clone --branch m0-foundations` into a scratch directory, then `npm install`, `npx playwright install`, `npm run hooks:install`, and `npm run check < /dev/null`. First run at `dcb3864`; re-run at `d3e2975` after the Critic round 1 fixes | Pass at both: exit 0. At `d3e2975`: `node --test` 37/37; Playwright 3/3 (Chromium, Firefox, WebKit) |
| Each gate has been seen to fail once | [Seen to fail](#seen-to-fail) below, run in an isolated `git worktree` | Pass: every gate failed as intended and was restored |
| `openspec/config.yaml` names DESIGN, CONSTRAINTS, and ROADMAP and carries the standing constraints | `openspec/config.yaml` (commit `dcb3864`) | Pass |
| `CLAUDE.md` describes the toolchain as verified and matches the actual commands and layout | `CLAUDE.md` (commit `dcb3864`) | Pass |
| The default branch is `main` | `git branch -m master main` before the change branch was cut | Pass |
| Evidence: a first capture of the page is committed | `app.png` above | Pass |
| Manual Safari smoke check | See below | Pass |
| Separate Critic review returns `[APPROVED]` | Round 1 at `bf1f36d`: `[REJECTED]` ([details](#critic-round-1)); round 2 recorded in the merge | Round 2 pending at time of writing |

## Full gate summary

```text
$ npm run check < /dev/null          # in the fresh clone at d3e2975
# tests 37
# pass 37
# fail 0
  ✓  [chromium] › e2e/app.spec.js › app page loads without errors
  ✓  [webkit]   › e2e/app.spec.js › app page loads without errors
  ✓  [firefox]  › e2e/app.spec.js › app page loads without errors
  3 passed
exit 0
```

## Seen to fail

Each gate was broken on purpose in a scratch worktree of commit `72aa4a6`,
observed failing, and restored.

| Check | Break | Observed |
| --- | --- | --- |
| `npm test` | `assert.equal(DEFAULT_PORT, 8081)` in `test/serve.test.js` | exit 1; `not ok 1 - --port wins over PORT, which wins over the default`; `expected: 8081, actual: 8080`; pass 24 / fail 1 |
| Golden mismatch | Smoke buffer `rgba[0] += 2` | exit 1; `Golden image "smoke" mismatch: 1 pixel(s) differ by more than 1 (largest channel difference 2). Actual image written to …/test-results/golden/smoke.actual.ppm`; file present (9229 bytes) |
| Missing golden | Deleted `test/golden/smoke.ppm` | exit 1; `Golden image "smoke" not found at …/test/golden/smoke.ppm. Run \`npm run golden:update\` to create it deliberately, then review it.`; golden not recreated |
| `npm run test:e2e` | Expected title changed to `Web CSG (broken)` | exit 1; `✘ [chromium]`, `✘ [webkit]`, `✘ [firefox]` with `expect(page).toHaveTitle(expected) failed`; 3 failed |
| `npm run check` (e2e broken) | Same e2e break | exit 1; unit 25/25, then 3 e2e failures |
| `npm run check` (unit broken) | Same unit break as above | exit 1; pass 24 / fail 1; gate stopped before e2e |
| Pre-commit hook | Unit break, then `git commit -am` | exit 1; hook ran `npm test` (fail 1); HEAD unchanged, so no commit was created |
| Pre-commit hook (passing) | Restore, add a comment line, `git commit -am` | exit 0; new commit created |

## Critic round 1

A separate `project-critic` review of `main..m0-foundations` at `bf1f36d`
returned **`[REJECTED]`**. The gate was green, but the Critic found the
following. All were fixed in `d3e2975`.

| # | Finding | Fix | New test seen red against the reviewed code (or the Critic's mutation) |
| --- | --- | --- | --- |
| 1 | Golden comparison passed empty or truncated RGBA buffers: missing pixels read as `undefined`, which gives `NaN` differences, which never exceed 1 | `checkBufferSize` in `test/support/golden.js`, applied in compare and update mode; spec scenario "Buffer does not hold the stated image" | `a buffer that does not hold width × height pixels fails`: `not ok` at `bf1f36d` |
| 2 | No test went through the `GOLDEN_UPDATE` default or `tools/golden-update.mjs` | Env-default tests; fixture-based command tests (`golden-update.mjs` accepts optional test files) | With `update = true` as the default: `unset GOLDEN_UPDATE compares and never writes` and `a plain node --test run … creates nothing` both `not ok`. With `GOLDEN_UPDATE: '0'` in `golden-update.mjs`: `npm run golden:update … writes the golden` is `not ok` |
| 3 | The e2e run emptied `test-results/`, deleting golden `.actual.ppm` review images | Playwright `outputDir: 'test-results/playwright'` | `Playwright output stays out of test-results/golden/`: `not ok` at `bf1f36d`. Manually, `keep.actual.ppm` survived a full e2e run |
| 4 | `capture --help` wrote `docs/progress/--help/`; `--port` without a value fell back to 8080 | Milestone names must start with a letter or digit; `parsePort` errors on a valueless `--port` and accepts `--port=<n>`; spec scenarios added | `capture ["--help"]`, `capture ["-M0"]`, `--port=<n> is accepted`, `--port without a value is rejected`, `the CLI exits non-zero on a missing or invalid port`: all `not ok` at `bf1f36d` |
| 5 | CONSTRAINTS §4 and DESIGN §9 documented `npm test` as bare `node --test` | Documented `node --test "test/**/*.test.js"` | Documentation only |

The Critic also noted three informational items, left as they are:
- The HEAD test cannot fail, because Node suppresses bodies on HEAD responses itself.
- The traversal guards overlap with the realpath check (defense in depth).
- A root file literally named `..foo` gets a 403.

## Manual Safari smoke check

2026-09-10, done by the project owner in desktop Safari at
`http://127.0.0.1:8080/` (served by `npm start`). The page showed the
"Web CSG" heading and placeholder text, and the Web Inspector console showed
no errors. **Pass.**
