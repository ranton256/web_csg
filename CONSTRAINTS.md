# Constraints

> **Status: Agreed** in the planning interview (readback confirmed
> 2026-09-10). Commands and tooling are agreed but not yet verified — nothing
> exists to run until M0. Spec gaps are recorded in [DESIGN §12](DESIGN.md#12-open-decisions).

How Web CSG is built and judged. Behavior is specified in
[DESIGN.md](DESIGN.md), which wins over this document on questions of *what*
the product does; this document governs *how*. §5 is the definition of done;
§6 is how it is judged.

## 1. Platform and toolchain

| Area | Requirement |
| --- | --- |
| Runtime target | Current stable desktop Chrome, Firefox, and Safari (D11). Browser APIs used must be available in all three. No mobile/touch support. |
| Rendering stack | Pure JavaScript CPU ray tracing written to an HTML 2D `<canvas>`. No ThreeJS, WebGL, GPU shaders, or rendering framework (D1, agreed 2026-09-10). |
| Language / frameworks | Plain modern JavaScript as native ES modules. No TypeScript, bundler, transpiler, or UI framework. The browser loads the source files exactly as written (D2, agreed 2026-09-10). |
| Runtime dependencies | None. |
| Unit tests | Node's built-in test runner (`node:test`, `node:assert`), including golden-image render tests of the core (D12). |
| Browser tests | `@playwright/test`, headless Chromium, Firefox, and WebKit (D12). WebKit stands in for Safari; real Safari gets a manual smoke check at each milestone. |
| Dev dependencies | `@playwright/test` only, pinned to an exact version in `package.json` (npm's current release on 2026-09-10 was 1.63.0; verify when installing). Adding any other dependency requires updating this table. |
| Dev server | `tools/serve.mjs`: a small zero-dependency static file server on `node:http`, used by `npm start` and Playwright's `webServer` (D12). |
| Node / npm | Node.js 22 or newer (agreed at readback, 2026-09-10; author's machine: v22.20.0, npm 10.9.3); recorded in `package.json` `engines` in M0. |
| Python | Not currently used. If any Python tooling is added, it runs in `.venv` (or `venv`), created before installing packages. |

## 2. Architecture and boundaries

The vision names these components (source: `vision.md` §Core Components):

- Parser: source text → syntax tree with source locations.
- Validator/evaluator: resolves names and arithmetic; checks dimensions and
  operation arguments.
- CSG representation: tree of primitives, transforms, and Boolean nodes.
- Renderer: casts one ray per pixel and shades hits.
- Editor interface: diagnostics, live rebuilding, save/load.

Boundaries agreed so far:

- **DOM-free core:** the parser, validator/evaluator, CSG representation, and
  ray tracer/shader SHALL NOT reference `window`, `document`, canvas, or other
  browser APIs, so they run unchanged under Node for unit tests (D2).
- **Thin browser shell:** the editor interface and canvas display depend on the
  core, never the reverse. The shell turns the core's pixel output into
  canvas `ImageData`.

**Deferred to the M0/M1 OpenSpec proposals:** module/file layout and the exact
interfaces between layers (including how the shell drives band-by-band
rendering). Record them here when those proposals are accepted. This does not
block planning; it must be settled before M1 is implemented.

## 3. Runtime and operational requirements

- Coordinate convention: Z up; primitives centered at local origin (DESIGN §5).
- Rays are transformed into primitive-local coordinates while preserving a
  common ray parameter, so intervals from different primitives are comparable
  (source: `vision.md` §Considerations).
- Numerical tolerance and interval rules: defined in
  [DESIGN §8 Ray–solid intervals and tolerance](DESIGN.md#feature-raysolid-intervals-and-tolerance);
  the constants live only in DESIGN §5.
- Rendering is deterministic: the same source and canvas size produce
  identical pixels. No randomness is used (no jittered sampling).
- The modeling language never executes arbitrary JavaScript (DESIGN §3).

## 4. Development and planning workflow

- **Planning:** OpenSpec 1.9.0 (`schema: spec-driven`), via `/opsx:explore`,
  `/opsx:propose`, `/opsx:apply`, `/opsx:archive`. Each roadmap milestone is
  delivered as one or more changes.
- **Document authority:** DESIGN.md → CONSTRAINTS.md → ROADMAP.md → OpenSpec
  specs/changes. Spec gaps are recorded in [DESIGN §12](DESIGN.md#12-open-decisions),
  never resolved silently. `CLAUDE.md` is the agent entrypoint: it summarizes
  and links these documents and must be kept consistent with them. It does
  not override them.
- **Git** (D13, agreed 2026-09-10):
  - The default branch is `main` (the current local `master` is renamed in M0).
    No remote exists yet, so there is no CI or pull requests.
  - One branch per OpenSpec change, merged into `main` only after the full gate
    (§5) passes and the Critic returns `[APPROVED]` (§6).
  - A committed pre-commit hook (`tools/hooks/pre-commit`, installed by
    `npm run hooks:install`) runs `npm test`. The e2e suite is enforced by
    this process before merge/archive, not by the hook, until CI exists.
  - Stage specific files; never `git add -A` or `git add .`. Do not commit
    broken or untested code.
- **Golden images:** reference renders live in `test/golden/` as binary PPM
  files. They are regenerated only deliberately (`npm run golden:update`),
  and the image diff is reviewed in the same change.
- **Commands** *(agreed in D12; not yet verified — nothing exists to run)*:

  | Purpose | Command |
  | --- | --- |
  | Setup | `npm install`, then `npx playwright install` for browser binaries, then `npm run hooks:install` |
  | Run the app | `npm start` (serves the repo root over HTTP; ES modules do not load from `file://`) |
  | Unit + golden suite | `npm test` → `node --test` |
  | One test file | `node --test path/to/file.test.js` |
  | Browser e2e | `npm run test:e2e` → `playwright test` (Chromium, Firefox, WebKit) |
  | **Full gate** | `npm run check` → `npm test` then `npm run test:e2e` |
  | Milestone captures | `npm run capture` → screenshots of the app with each example into `docs/progress/<milestone>/` |
  | Update goldens | `npm run golden:update` (deliberate use only) |

## 5. Definition of done

A change or milestone is done only when all of the following hold:

1. The full gate `npm run check` (unit, golden, and e2e on all three engines)
   passes, and the results have been inspected. The pre-commit hook runs
   `npm test` on every commit; the full gate is run before every merge to
   `main`, OpenSpec archive, and milestone. A check that could not run has
   not passed.
2. The affected DESIGN §8 acceptance scenarios are verified.
3. Documentation reflects the change (DESIGN, CONSTRAINTS, ROADMAP, OpenSpec
   specs as affected) in the same commit.
4. Deferred work is recorded in the ROADMAP backlog.
5. Milestones include committed verification evidence in
   `docs/progress/<milestone>/`: `npm run capture` screenshots, plus a
   `README.md` listing the acceptance criteria checked, the gate output
   summary, and the result of the manual Safari smoke check.
6. Golden-image changes, if any, were regenerated deliberately and their
   diffs reviewed.
7. A separate Critic review (§6) returned `[APPROVED]`.

Failing tests are fixed before committing; they are never dismissed as
pre-existing or insignificant.

## 6. Critic review

- A separate Writer and Critic pass is required before every OpenSpec archive
  and every milestone completion.
- Tool: the `project-critic` skill, installed at
  `.claude/skills/project-critic/`. Invoke it with an explicit review target
  (commit range, base commit, or working tree).
- The Critic obtains the diff and runs the gates itself, returns an explicit
  `[APPROVED]` or `[REJECTED]`, and pins findings with failing tests seen to
  fail against the reviewed code where feasible (otherwise concrete
  reproduction evidence).
- Any gate failure, or a required check that cannot run, is `[REJECTED]`.
- Rejected work returns to the Writer, is fixed, and gets a new review.
  Silence is not approval.
