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
| `npm run check` is green from a fresh checkout following the CONSTRAINTS §4 setup, with at least one unit, one golden, and one e2e test | Fresh `git clone --branch m0-foundations` into a scratch directory, then `npm install`, `npx playwright install`, `npm run hooks:install`, and `npm run check < /dev/null`. First run at `dcb3864`; re-run at `d3e2975`, `2b134cd`, `2072b70`, `5278f6d`, and `bf4baba` (the last three with `npm ci`) after each Critic round's fixes | Pass at all six: exit 0. At `bf4baba`: `node --test` 39/39; Playwright 3/3 (Chromium, Firefox, WebKit). The clone sits under macOS `/tmp` (a symlink); `node <clone>/tools/serve.mjs --port abc` exits 1 with `serve: Invalid port "abc"` |
| Each gate has been seen to fail once | [Seen to fail](#seen-to-fail) below, run in an isolated `git worktree` | Pass: every gate failed as intended and was restored |
| `openspec/config.yaml` names DESIGN, CONSTRAINTS, and ROADMAP and carries the standing constraints | `openspec/config.yaml` (commit `dcb3864`) | Pass |
| `CLAUDE.md` describes the toolchain as verified and matches the actual commands and layout | `CLAUDE.md` (commit `dcb3864`) | Pass |
| The default branch is `main` | `git branch -m master main` before the change branch was cut | Pass |
| Evidence: a first capture of the page is committed | `app.png` above | Pass |
| Manual Safari smoke check | See below | Pass |
| Separate Critic review returns `[APPROVED]` | Round 1 at `bf1f36d`: `[REJECTED]` ([details](#critic-round-1)). Round 2 at `2c4ce39`: `[REJECTED]` ([details](#critic-round-2)). Round 3 at `7cec485`: `[REJECTED]` ([details](#critic-round-3)). Round 4 at `0b5b815`: `[REJECTED]` ([details](#critic-round-4)). Round 5 at `71f8502`: `[REJECTED]` ([details](#critic-round-5)). Round 6 is recorded in the merge | Round 6 pending at time of writing |

## Full gate summary

```text
$ npm run check < /dev/null          # in the fresh clone at bf4baba
# tests 39
# pass 39
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

## Critic round 2

A fresh `project-critic` review of the full range at `2c4ce39` confirmed that
all five round 1 fixes hold under mutation, and that the gate is green,
including from a fresh `npm ci` clone. It returned **`[REJECTED]`** for one
finding, fixed in `2b134cd`:

| # | Finding | Fix | New test seen red against `2c4ce39` |
| --- | --- | --- | --- |
| 1 | `parsePort` treated `--port " "` and `PORT=" "` as port 0, so the server started on a random port instead of exiting with an error, as the spec requires. It also accepted `1e3`, `0x1F90`, and `+80` | Port values must be decimal digits only, from 0 to 65535; spec wording and scenario updated | `only plain decimal digits are ports` (`Missing expected exception: --port " "`) and `the CLI exits non-zero on a missing or invalid port`: both `not ok` |

Informational items from round 2:
- The CLAUDE.md layout said `test/*.test.js`; it is now `test/**/*.test.js`.
- The server serves dotfiles such as `/.git/config`. This is within the spec and loopback-only; it is now a ROADMAP backlog line.
- The buffer-size guards overlap (defense in depth), and the HEAD test cannot fail by itself. Both were accepted as they are.

## Critic round 3

A fresh review at `7cec485` confirmed the round 2 fix under mutation:
- The two port tests go red without it.
- The hook blocks on those failures.
- An injected `console.error` fails e2e in each of the three engines.

It returned **`[REJECTED]`** for one low-severity finding, fixed in `2072b70`:

| # | Finding | Fix | New test seen red against `7cec485` |
| --- | --- | --- | --- |
| 1 | The PPM reader parsed header numbers with `Number()`, so `0x2`, `0xFF`, `2e0`, and `+2` passed, contradicting the "Malformed file" scenario | Header numbers must be plain decimal digits; the scenario now lists these examples | `malformed files are rejected with the file name` (`Missing expected exception: hexwidth.ppm`): `not ok` |
| 2 (informational) | `parsePort` rejected `000080` because of a 5-digit cap, although the spec allows any decimal digits within 0–65535 | Cap removed; the range check still rejects `65536` | `only plain decimal digits are ports` (`Invalid port "000080"`): `not ok` |

The "Failure in one engine" scenario was also demonstrated with only WebKit
broken (Critic round 1): exit 1, `✘ [webkit]`, Chromium and Firefox `✓`.

## Critic round 4

A fresh review at `0b5b815` found the round 3 fix incomplete and returned
**`[REJECTED]`**. The fix is in `5278f6d`.

| # | Finding | Fix | Evidence against `0b5b815` |
| --- | --- | --- | --- |
| 1 | The PPM header was decoded as `'ascii'`, which clears each byte's high bit: `0xB2` read as `"2"`, `0xB2 0xB5 0xB5` as `"255"`, and `0xD0 0xB6` as `"P6"`. A non-breaking space (`0xA0`) counted as a separator | The header is checked byte by byte: tokens are decoded as latin1, separators must be ASCII whitespace, and whitespace is required after the maximum value; the spec scenario was updated | `malformed files are rejected with the file name` (`Missing expected exception: highbit-width.ppm`): `not ok`. A per-case probe showed all four files (high-bit width, high-bit maximum value, high-bit magic, NBSP) **accepted** by the old reader and **rejected** by the new one |
| — (informational) | Design D-3 said the PPM helpers were in `golden.js` | D-3 now names `test/support/ppm.js` | Documentation only |

## Critic round 5

A fresh review at `71f8502` confirmed the round 4 fix under mutation:
- Decoding as `ascii` fails the test on `highbit-width.ppm`.
- Treating NBSP as whitespace fails it on `nbsp.ppm`.

It also checked every channel of the smoke golden against its formula. It
returned **`[REJECTED]`** for one finding:

| # | Finding | Fix | New test seen red against `71f8502` |
| --- | --- | --- | --- |
| 1 | Started through a path that contains a symlink (e.g. under macOS `/tmp` → `/private/tmp`), `tools/serve.mjs` exited 0 silently: no server, and no port check. Its entry-point check compared the already-resolved `import.meta.url` with the unresolved `process.argv[1]`. `npm start` and Playwright were unaffected because they use a relative path from the real directory | Compare real paths (`fs.realpathSync(process.argv[1])`); spec scenario "Started through a symlinked path" | `the CLI works when started through a symlinked path` (`exit 0, stderr ""`): `not ok` |
| — (cosmetic) | Sections 9–12 of `tasks.md` came before section 8 | Section 8 moved back into order | — |

## Manual Safari smoke check

2026-09-10, done by the project owner in desktop Safari at
`http://127.0.0.1:8080/` (served by `npm start`). The page showed the
"Web CSG" heading and placeholder text, and the Web Inspector console showed
no errors. **Pass.**
