## 1. Branch and project setup

- [x] 1.1 Rename `master` to `main` (`git branch -m master main`), then create and switch to branch `m0-foundations` (design D-9)
- [x] 1.2 Look up the current `@playwright/test` release (`npm view @playwright/test version`) and record it for the exact pin
- [x] 1.3 Create `package.json`: `private: true`, `type: "module"`, `engines.node: ">=22"`, no `dependencies`, `@playwright/test` pinned to an exact version in `devDependencies`, and the scripts `start`, `test`, `test:e2e`, `check`, `capture`, `golden:update`, `hooks:install` (design D-2, D-3, D-5, D-6, D-7)
- [x] 1.4 Create `.gitignore` covering `node_modules/`, `test-results/`, `playwright-report/`
- [x] 1.5 Run `npm install` and `npx playwright install chromium firefox webkit`; confirm `package-lock.json` pins the same version

## 2. Dev server

- [x] 2.1 Implement `tools/serve.mjs` with an exported `startServer({ port, root })` and a CLI entry point supporting `--port`, `PORT`, and the default `8080`, bound to `127.0.0.1` (design D-4)
- [x] 2.2 Add `test/serve.test.js` covering every dev-server scenario:
  - root and port selection
  - loopback-only binding
  - the MIME table, including the unknown extension
  - `Cache-Control: no-store`
  - raw `..` and percent-encoded traversal
  - directory `404`, missing-file `404`
  - `POST` → `405`, and `HEAD`
- [x] 2.3 Create the placeholder `index.html` with `<title>Web CSG</title>`, a heading, and an inline module script (design D-8); confirm `npm start` serves it in a browser

## 3. Golden images

- [x] 3.1 Implement `test/support/ppm.js` (binary P6 read/write, RGBA in, RGB stored) and `test/support/golden.js` (`expectMatchesGolden`, tolerance 1 per channel, `GOLDEN_UPDATE=1` mode, and the actual image written to `test-results/golden/<name>.actual.ppm` on mismatch) (design D-3)
- [x] 3.2 Add `test/golden-support.test.js` covering:
  - round trip and malformed file
  - within tolerance, outside tolerance (message contents and actual file written), size mismatch
  - a missing golden fails without creating a file

  Use a temporary directory for these, not `test/golden/`
- [x] 3.3 Implement `tools/golden-update.mjs` and wire up `npm run golden:update`
- [x] 3.4 Add `test/golden-smoke.test.js`, which compares a fixed synthetic 64×48 gradient buffer against `test/golden/smoke.ppm`. Generate the file with `npm run golden:update`, inspect it, then confirm that `npm test` passes without update mode

## 4. Browser tests and full gate

- [x] 4.1 Create `playwright.config.js` with:
  - `testDir: 'e2e'`
  - `chromium`, `firefox`, and `webkit` projects
  - `retries: 0`, `forbidOnly: true`, `reporter: 'list'`
  - a `webServer` on port 4173 with `reuseExistingServer: true`

  (design D-5)
- [x] 4.2 Add `e2e/app.spec.js`, asserting the page title `Web CSG` and no console errors or uncaught page errors
- [x] 4.3 Confirm that `npm run test:e2e` passes in all three engines, and that `npm run check < /dev/null` passes and exits without waiting for input

## 5. Capture and pre-commit hook

- [x] 5.1 Implement `tools/capture.mjs` (design D-6): an in-process server, Chromium at 1280×800 and scale 1, and a shot list with `app` → `/`
- [x] 5.2 Add a unit test showing that `capture.mjs` with no milestone argument exits non-zero with a usage message and writes no files
- [x] 5.3 Create `tools/hooks/pre-commit` (POSIX `sh`, runs `npm test`) committed as executable, and wire `npm run hooks:install` to `git config core.hooksPath tools/hooks` (design D-7). Run the install twice and confirm the config is identical and no error occurs

## 6. Seen to fail (in an isolated `git worktree` under the scratchpad)

- [x] 6.1 Break a unit assertion and observe that `npm test` exits non-zero and names the test
- [x] 6.2 Change one channel of the smoke buffer by 2 and observe the golden failure message and the written `.actual.ppm`. Delete the golden file and observe the "missing golden" failure, with no file created
- [x] 6.3 Change the expected title and observe that `npm run test:e2e` fails, naming each engine. Observe that `npm run check` fails when either suite fails
- [x] 6.4 With the hook installed in the worktree and a failing unit test, observe that `git commit` is refused. Restore it and observe that the commit proceeds
- [x] 6.5 Record each command and its observed failure output for the M0 evidence README; remove the worktree

## 7. Documentation

- [x] 7.1 Populate `openspec/config.yaml`:
  - `context` naming DESIGN.md, CONSTRAINTS.md, and ROADMAP.md, plus the standing constraints (pure-JS CPU renderer with no ThreeJS/WebGL, no build step, no runtime dependencies, DOM-free `src/core/`, full gate `npm run check`, Critic before archive)
  - artifact `rules` pointing specs at DESIGN §8 scenarios
- [x] 7.2 Update `CONSTRAINTS.md`:
  - §1: the pinned Playwright version
  - §2: the repository layout from design D-1, replacing the "Deferred" note
  - §4: commands marked verified, `capture` usage `npm run capture -- <milestone>`, default branch `main`
- [x] 7.3 Update `CLAUDE.md`:
  - remove the "not verified" and "planned" notes
  - show the real layout
  - set the default branch to `main`
  - add the `capture` usage
- [x] 7.4 Update `ROADMAP.md`: set M0 status and add a backlog line "Core-purity check: `src/core/` must not reference browser APIs — add with the first core code (M1)"

## 8. Evidence, review, and merge

- [x] 8.1 Run `npm run capture -- M0` and write `docs/progress/M0/README.md` containing:
  - the M0 "done when" criteria, each with its evidence
  - the `npm run check` result summary
  - the seen-to-fail records from 6.5
  - the manual Safari smoke check (performed by the user, with the result recorded)
- [x] 8.2 Clone the branch into a fresh scratch directory, follow the CONSTRAINTS §4 setup exactly, and confirm `npm run check` is green there
- [ ] 8.3 Run a separate Critic review (`project-critic`) of `main..m0-foundations`. Fix any `[REJECTED]` findings and re-review until `[APPROVED]`
- [ ] 8.4 Merge `m0-foundations` into `main`, mark M0 complete in `ROADMAP.md`, and archive the change with `/opsx:archive`

## 9. Critic round 1 fixes ([REJECTED] at `bf1f36d`)

- [x] 9.1 Golden comparison fails when the RGBA buffer does not hold width × height pixels (compare and update mode), with a spec scenario and tests for empty and truncated buffers
- [x] 9.2 Test the `GOLDEN_UPDATE` default (unset → compare only, `1` → write), and test that `tools/golden-update.mjs` writes goldens while a plain `node --test` run does not. `golden-update.mjs` accepts optional test files for this
- [x] 9.3 Set Playwright `outputDir` to `test-results/playwright`, so e2e runs no longer delete `test-results/golden/*.actual.ppm`; add a config test and check it manually
- [x] 9.4 `capture.mjs` rejects milestone names that do not start with a letter or digit (e.g. `--help`); `parsePort` rejects `--port` without a value and accepts `--port=<n>`; spec scenarios and tests for both
- [x] 9.5 Fix the documented `npm test` command in CONSTRAINTS §4 and DESIGN §9
- [x] 9.6 Watch each new test fail against the reviewed code (`bf1f36d`) in an isolated worktree; `npm run check` green; update the M0 evidence README; commit

## 10. Critic round 2 fixes ([REJECTED] at `2c4ce39`)

- [x] 10.1 `parsePort` accepts decimal digits only (`" "` was port 0, and `1e3`, `0x1F90`, `+80` were accepted); spec wording and scenario updated; tests for `--port`, `PORT`, and the CLI
- [x] 10.2 Fix the CLAUDE.md layout (`test/**/*.test.js`); add a ROADMAP backlog line for dotfile serving (informational)
- [x] 10.3 Watch the new tests fail against `2c4ce39`; `npm run check` green; update the evidence README; commit

## 11. Critic round 3 fixes ([REJECTED] at `7cec485`)

- [x] 11.1 The PPM reader accepts only plain decimal header numbers (it accepted `0xFF`, `2e0`, `+2`); spec scenario made explicit; tests
- [x] 11.2 `parsePort` accepts any number of decimal digits within 0–65535 (`000080` was rejected by the 5-digit cap; informational)
- [x] 11.3 Watch the new tests fail against `7cec485`; `npm run check` green (fresh clone); update the evidence README; commit

## 12. Critic round 4 fixes ([REJECTED] at `0b5b815`)

- [x] 12.1 The PPM header is checked at byte level: tokens decoded as latin1 (not ascii, which clears the high bit), with ASCII-only whitespace; the separator after the maximum value must be whitespace; tests for high-bit and NBSP headers; spec scenario updated
- [x] 12.2 Fix design D-3 drift (PPM read/write live in `test/support/ppm.js`)
- [x] 12.3 Watch the new tests fail against `0b5b815`; `npm run check` green (fresh clone); update the evidence README; commit

## 13. Critic round 5 fixes ([REJECTED] at `71f8502`)

- [x] 13.1 `serve.mjs` detects that it is the entry point by comparing real paths, so it runs when started through a symlinked path (it silently exited 0); spec scenario and test
- [x] 13.2 Put section 8 back in numeric order in this file (cosmetic)
- [ ] 13.3 Watch the new test fail against `71f8502`; `npm run check` green (fresh clone); update the evidence README; commit
