# Constraints

> **Status: Agreed** in the planning interview (readback confirmed
> 2026-09-10). Commands and tooling were verified in M0. Spec gaps are
> recorded in [DESIGN §12](DESIGN.md#12-open-decisions).

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
| Dev dependencies | `@playwright/test` only, pinned exactly at `1.63.0` in `package.json` (M0). Adding any other dependency, or changing the pin, requires updating this table. |
| Dev server | `tools/serve.mjs`: a small zero-dependency static file server on `node:http`, used by `npm start` and Playwright's `webServer` (D12). |
| Node / npm | Node.js 22 or newer (agreed at readback, 2026-09-10; author's machine: v22.20.0, npm 10.9.3); recorded in `package.json` `engines` as `>=22`. |
| Python | Not currently used. If any Python tooling is added, it runs in `.venv` (or `venv`), created before installing packages. |
| Hosting | The published app is static: `index.html` plus `src/`, served by Vercel at <https://csg.ranton.org> (project `web_csg`, scope `richard-antons-projects`). No build step, no server code, no environment variables; `vercel.json` disables the install and build steps and serves the repository root. `.vercelignore` keeps the tests, tools, and planning sources out of the deployment. Hosting is a delivery detail only: nothing in `src/` may depend on it. |

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

**Repository layout** (M0, design D-1 of `m0-foundations`):

```text
index.html                 # App entry page
src/core/                  # DOM-free core (from M1)
src/ui/                    # Browser shell (from M1)
test/**/*.test.js          # Node unit + golden tests (npm test)
test/support/              # Test helpers (PPM, golden comparison); never run as tests
test/golden/*.ppm          # Committed reference images
e2e/**/*.spec.js           # Playwright tests (npm run test:e2e)
tools/                     # serve.mjs, capture.mjs, golden-update.mjs, hooks/
docs/progress/<M>/         # Milestone evidence
```

**Module layout** (M1, design D-1 of `m1-first-pixels`):

```text
src/core/
  constants.js   # Every DESIGN §5 number; change DESIGN first, then here
  vec3.js        # [x, y, z] helpers; never modify their arguments
  lexer.js       # tokenize(source) → tokens with line/column; SourceError
  parser.js      # parse(tokens) → syntax tree with locations; throws at the first syntax error
  evaluate.js    # evaluate(program) → { diagnostics, scene }; reports every semantic error
  camera.js      # validateCamera, cameraBasis, primaryRay
  properties.js  # readProperties, missing, lengthProblem: the property-block rules shared by camera, light, and material
  lighting.js    # validateLight, validateMaterial
  transform.js   # placements { s, R, t }: translation, rotation (exact right angles), scaling, compose, toLocal, normalToWorld
  sphere.js      # intersectSphere → interval list (general quadratic: local directions need not be unit)
  box.js         # intersectBox (slabs; cube = box with equal sides)
  cylinder.js    # intersectCylinder (side quadratic ∩ cap slab)
  intervals.js   # union, intersect, subtract (reversed cutter normals), visibleHit, facingNormal
  shade.js       # keyLight, shade, encode
  render.js      # compile, renderRows, renderSource (the public entry points)
src/ui/
  examples.js        # EXAMPLES, FIRST_LAUNCH_SOURCE: the built-in examples (no browser APIs)
  persistence.js     # createStore, needsConfirm, saveFileName: autosave and replacement rules (storage passed in)
  indent.js          # indentEdit: the Tab and Shift+Tab rules (no browser APIs)
  help-content.js    # HELP_SECTIONS, HELP_EXAMPLE: the Help dialog's reference (no browser APIs)
  settings.js        # Editor numbers mirroring DESIGN §5 (debounces, time slice, divider)
  text-position.js   # lineCount, lineColumnToOffset (code-point columns → UTF-16 offsets)
  debounce.js        # createDebouncer(delay, timers): injectable timers
  render-job.js      # startRenderJob: time-sliced, cancelable progressive rendering (injectable clock/scheduler)
  divider.js         # clampEditorWidth (pure) and the divider's pointer/keyboard wiring
  main.js            # Page wiring (browser APIs live only here and in divider wiring)
```

**Interfaces:**
- `compile(source)` returns `{ diagnostics, scene }`. `scene` is `null` when
  any diagnostic exists.
- `renderSource(source, width, height)` returns `{ diagnostics, rgba }`.
  `rgba` is a `Uint8ClampedArray` of `width·height·4` bytes (row-major, top
  row first), or `null`.
- `renderRows(scene, width, height, y0, y1, rgba)` fills rows `[y0, y1)`.
  Any split into bands equals one full render; the shell uses this for
  progressive rendering from M2.
- Diagnostics are `{ line, column, message }`, with 1-based positions.
- `scene.root` is a tree (M4).
  - A leaf is a placed primitive
    `{ kind: 'primitive', type, <parameters>, placement, loc }`.
  - An interior node is
    `{ kind: 'union' | 'intersection' | 'difference', children }`.
  - The root is the union of the top-level solids.
  - A transform block is a union node. Its placement is folded into every
    leaf below it at evaluation.

  `sceneIntervals(scene, ray)` returns the tree's world-space intervals.
- `scene.lights` lists the declared lights in world space, directional
  `{ kind: 'directional', toLight, intensity }` or point
  `{ kind: 'point', position, intensity }` (D25); an empty list means the
  default key light. `scene.color` is the model
  color, the `material` color or the default (M5).
- `test/core-purity.test.js` enforces the boundary: no browser identifiers,
  and only relative imports within `src/core/`.
- The pure `src/ui/` helpers (`text-position`, `debounce`, `render-job`,
  `clampEditorWidth`, `settings`, `examples`, `persistence`) take their
  timers, clock, and storage as parameters, and are unit-tested in Node under
  `test/ui/`. `main.js` is covered by the
  e2e tests.

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
  - The default branch is `main`. No remote exists yet, so there are no pull
    requests. The project has no CI, by the owner's decision (DESIGN §12 D24).
  - One branch per OpenSpec change, merged into `main` only after the full gate
    (§5) passes and the Critic returns `[APPROVED]` (§6).
  - A committed pre-commit hook (`tools/hooks/pre-commit`, installed by
    `npm run hooks:install`) runs `npm test`. The e2e suite is enforced by
    this process before merge/archive, not by the hook.
  - Stage specific files; never `git add -A` or `git add .`. Do not commit
    broken or untested code.
- **Golden images:** reference renders live in `test/golden/` as binary PPM
  files. They are regenerated only deliberately (`npm run golden:update`),
  and the image diff is reviewed in the same change.
- **Commands** *(agreed in D12, verified in M0 on 2026-09-10)*:

  | Purpose | Command |
  | --- | --- |
  | Setup | `npm install`, then `npx playwright install` for browser binaries, then `npm run hooks:install` |
  | Run the app | `npm start` (serves the repo root over HTTP; ES modules do not load from `file://`) |
  | Unit + golden suite | `npm test` → `node --test "test/**/*.test.js"` |
  | One test file | `node --test path/to/file.test.js` |
  | Browser e2e | `npm run test:e2e` → `playwright test` (Chromium, Firefox, WebKit) |
  | **Full gate** | `npm run check` → `npm test` then `npm run test:e2e` |
  | Milestone captures | `npm run capture -- <milestone>` (e.g. `npm run capture -- M1`) → screenshots into `docs/progress/<milestone>/`; the shot list lives in `tools/capture.mjs` |
  | Update goldens | `npm run golden:update` (deliberate use only), optionally limited to files: `npm run golden:update -- test/x.test.js` |
  | Deploy the app | `npx vercel deploy --prod` from the repository root (preview: `npx vercel deploy`). Deploy only what has passed the full gate. |

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
