## 1. Setup

- [x] 1.1 Create and switch to branch `m4-csg` from `main`

## 2. Interval algebra

- [x] 2.1 Add `intersect(a, b)` and `subtract(a, b)` to `src/core/intervals.js` (design D-2):
  - exact coverage, then drop intervals of length ≤ `ε`
  - on ties: `intersect` keeps `a`'s endpoint; `subtract` lets `b` remove the boundary
  - `subtract` gives endpoints taken from `b` a reversed normal as new objects, keeping `b`'s primitive and leaving `b` unmodified
- [x] 2.2 Analytic interval tests (extend `test/core/intervals.test.js`):
  - DESIGN "Interval combination along a ray" (box `[2, 8]`, cylinder `[4, 6]`): union `[2, 8]`, intersection `[4, 6]`, subtraction `[2, 4]` and `[6, 8]`
  - the tie rules
  - reversed normals and primitives, with the operands unmodified
  - sliver drops
  - a disjoint intersection is empty

## 3. Scene tree, evaluator, renderer, camera

- [x] 3.1 `src/core/evaluate.js` (design D-1, D-4):
  - the scene becomes `{ camera, root }`, built through a `sink` in the context
  - Boolean blocks become nodes, and transform blocks become `union` nodes, with placements composed into the leaves
  - `context.rendered` is removed
  - `light` and `material` still report "not supported yet" and check their expressions
- [x] 3.2 `src/core/render.js`: `nodeIntervals` recursion (union fold, intersection fold with early exit, and `difference` as first minus the union of the rest); `sceneIntervals` evaluates `scene.root` (design D-3)
- [x] 3.3 `src/core/camera.js`: a non-finite `position`–`lookAt` distance reports "position and lookAt are too far apart" at `lookAt` and skips the up checks (design D-5)
- [x] 3.4 Update the M3 tests that inspect `scene.solids` or rely on unsupported Booleans:
  - `scene.test.js`: the identity placement test inspects `scene.root`
  - `language.test.js`: the vision example, the not-supported lists, and "primitives inside an unsupported Boolean"

## 4. Scenario tests

- [x] 4.1 `test/core/boolean.test.js` (new), through `sceneIntervals`, covering the `boolean-operations` delta:
  - a union block `[95, 113]`
  - a transformed intersection `[116, 124]`
  - a disjoint intersection is empty
  - an intersection `[96, 104]`
  - a multi-child difference `[90, 93]`, `[97, 103]`, `[107, 110]`
  - self-difference of a sphere and of a cube is empty, and its pixel is the background
  - a single-child difference `[95, 105]`
  - reversed cutter normals: `[90, 97]` and `[103, 110]`, with normals `[0, 0, -1]` at 97 and `[0, 0, 1]` at 103
- [x] 4.2 The `ray-intervals` delta:
  - flush union `[95, 115]`
  - a flush difference has no hit
  - a near-flush difference leaves no sliver
  - a bore wall seen from inside: visible hit at t = 3, shading normal `[-1, 0, 0]`, not flipped again
- [x] 4.3 The `implicit-union` delta: a mixed-type top-level union (`sphere(5); box([4, 4, 20]);`), `[95, 105]` along X and `[90, 110]` along Z
- [x] 4.4 The `modeling-language` delta:
  - the vision example has no diagnostics, and its tree is a cube minus the union of three cylinders
  - `light` is rejected at its keyword
  - `light` and `material` contents are still checked
  - errors inside a Boolean are reported without a "not supported" diagnostic
  - `union { }` is still an empty-body error
- [x] 4.5 The `camera-definition` delta:
  - `position: [1e200-literal, 0, 0]` reports only "position and lookAt are too far apart" at `lookAt`
  - `position: [16000000, 0, 0]` is accepted
- [x] 4.6 The scaled-render test (design D-6): the bored cube scaled ×1e-3 and ×1e5 matches the unscaled 64×48 render within 1 per channel. If either fails, stop and take the measurement to the owner before continuing

## 5. Goldens and capture

- [x] 5.1 Golden `bored-cube` (64×48, vision example):
  - the core-render "callable without a browser" test uses it, and the sphere golden test stays
  - generate it with `npm run golden:update -- <file>`, inspect the image, then confirm `npm test` passes without update mode
- [x] 5.2 Golden `booleans`: a union, an intersection, and a difference side by side, added to `test/support/scenes.js`. Generate it, inspect it, and confirm the same way
- [x] 5.3 Add a `bored-cube` shot to `tools/capture.mjs`

## 6. Documentation

- [x] 6.1 DESIGN:
  - §5: `ε` and the supported scale range final, per the measured result (design D-6)
  - §12: D16 resolved (best effort, and the camera diagnostic), and a D7 note with the measurement
- [x] 6.2 CONSTRAINTS §2: the scene is `{ camera, root }`, a tree whose leaves carry placements
- [x] 6.3 ROADMAP: set M4's status; strike the `ε` line (delivered), the D20 revisit line (closed, narrowed rule kept, per the owner), and the mixed-type union line (delivered)

## 7. Verification, review, and merge

- [x] 7.1 Seen to fail, in an isolated worktree, with the test files listed explicitly and a passing baseline:
  - `subtract` without normal reversal
  - `subtract` letting the base win ties
  - `intersect` letting `b` win ties
  - `difference` evaluated as a union of all children
  - no `ε` drop after `subtract`
  - no finite-distance camera check

  Watch the relevant tests and goldens fail, and record the output
- [x] 7.2 `npm run check < /dev/null` green, then a fresh clone at the branch head (`npm ci`, `npx playwright install`, `npm run hooks:install`, `npm run check`) green
- [x] 7.3 `npm run capture -- M4` (`app`, `stale`, `primitives`, `bored-cube`), then write `docs/progress/M4/README.md`:
  - each M4 "done when" criterion with its evidence
  - scenario coverage
  - the scaled-render measurement
  - the seen-to-fail records
  - the manual Safari smoke check (performed by the owner)
- [ ] 7.4 A separate Critic review (`project-critic`) of `main..m4-csg`. Fix findings and re-review until `[APPROVED]`
- [ ] 7.5 Merge into `main`, mark M4 complete in ROADMAP, and archive with `/opsx:archive` (syncing the specs)

## 8. Critic round 1 fixes

- [x] 8.1 B1 (owner: scope to derived features): the `ray-intervals` "Scaled scenes render identically" requirement, DESIGN §5, and D7 cover scenes whose dimensions, coordinates, and derived feature sizes stay within the supported scale; a test records the thin-plate case outside it
- [x] 8.2 B2: a multi-child transform body inside a Boolean is one child (spec scenario and test)
- [x] 8.3 B3: an intersection of three children (spec scenario and test)
- [x] 8.4 I2 (owner: the base face stays): DESIGN §8 and the `ray-intervals` spec say a cutter that stops short of the base leaves its boundary; DESIGN D21; a test
- [x] 8.5 I3 (owner: fix in M4): an `up` whose length overflows reports "up is too large" (`camera.js`, spec scenario, test, D16 note)
- [x] 8.6 I1, I4, I5: the design.md risk wording; the stale let-scope clause (MODIFIED in the `modeling-language` delta); the D16 row in order in DESIGN §12
- [ ] 8.7 Seen to fail for the new tests; the full gate and a fresh clone; the README Critic round 1 section

## 9. Critic round 2 fixes

- [x] 9.1 Finding 1 (owner: the measured scenario): the `ray-intervals` "Scaled scenes render identically" requirement is the 64×48 bored-cube check at ×1e-3 and ×1e5, with an explicit limit for near-`ε` crossings; DESIGN §5, D7, and design D-6 match
- [x] 9.2 Finding 2 (owner: `[1e-3, 3e7]`, zero exempt): DESIGN §5 and D7, design D-6, the proposal, ROADMAP, and the README state the range for nonzero magnitudes, covering the 2.75e7 camera-to-model distance
- [x] 9.3 Finding 3: D21, DESIGN §8, the `ray-intervals` spec, and design D-2 say that a cutter that only touches the base leaves its boundary; a scene test and a scenario for the touching cutter
- [x] 9.4 Informational: the README's R1 mutant description; a ROADMAP backlog line for an underflowing `up`
- [ ] 9.5 Seen to fail for the new test; the full gate and a fresh clone; the README Critic round 2 section
