## 1. Setup

- [x] 1.1 Create and switch to branch `m3-primitives-and-transforms` from `main`

## 2. Transforms (math)

- [x] 2.1 Implement `src/core/transform.js` (design D-1/D-2): placements `{ s, R, t }`, `translation`, `rotation` (`Rz·Ry·Rx`, exact `sinDeg`/`cosDeg` for multiples of 90°), `scaling`, `compose`, `toLocal` (no renormalization), `normalToWorld`
- [x] 2.2 Add `test/core/transform.test.js`:
  - the D4 direction scenarios (`[90,0,0]`: +Z → −Y; `[0,90,0]`: +Z → +X; `[90,90,0]`: +Y → +X)
  - exactness for 90° and 180° (strict equality)
  - composition order (translate ∘ rotate)
  - a `toLocal` round trip
  - the direction stays unnormalized, so `t` is preserved

## 3. Primitives (intersection)

- [x] 3.1 Rewrite `src/core/sphere.js` with the general quadratic (design D-3); the existing sphere tests and goldens still pass
- [x] 3.2 Implement `src/core/box.js` (slabs, with deterministic edge ties, parallel rays, and the ε drop) and `src/core/cylinder.js` (side quadratic ∩ cap slab, the parallel-axis case, and normals from whichever bound decides)
- [x] 3.3 Add `test/core/primitives.test.js` covering:
  - the box centered at the origin, with endpoint normals
  - the cylinder: cap hit and normal, side hit and normal, a ray above the cap misses
  - a tangent to the cylinder side and a box edge graze (length ≤ ε → miss); a ray lying in a box face, along the cylinder side line, or in a cap plane is a hit (D20, added in 9.3)
  - the tie-breaks: the box's lowest axis at a corner, and the cylinder's side at the rim (added in 9.4)
  - rays parallel to a box face and along the cylinder axis
  - a non-unit local direction gives world `t`

## 4. Evaluator and renderer

- [x] 4.1 Extend `src/core/evaluate.js` (design D-5):
  - the parameter table for sphere, cube, box, and cylinder, with kind and positivity messages
  - transform binding (exactly one positional argument, kinds, scale > 0) and composed placements for bodies
  - implicit union across bodies
  - only Booleans, `light`, and `material` remain unsupported; primitives inside them are checked but not rendered
- [x] 4.2 Update `src/core/render.js` (design D-4): intersect each placed primitive in local space and map its normals to world space
- [x] 4.3 Parser: argument-list parentheses count as a nesting level (design D-6)
- [x] 4.4 Update the tests:
  - `test/core/language.test.js`: the vision example expects only `difference` and `union`; the not-supported lists shrink; primitive and transform binding (argument count, named arguments, kinds, scale > 0, cube/box/cylinder dimension errors); cylinder positional and named equivalence; primitives inside an unsupported Boolean are still checked
  - `test/core/parser.test.js`: the argument-parentheses nesting scenario (99 levels pass; 100 fail at the 100th `-`)
  - `test/core/scene.test.js` (new, scene-level through `sceneIntervals`): cube equals box `[s,s,s]` (identical images); scaled sphere `[90, 110]`; rotated box world normal `[0, −1, 0]` at y = −1; translated sphere at x = 9; scale(2) sphere(3) entering at x = −6; the nested translate/rotate box occupying `[9, 11] × [−2, 2] × [−1, 1]`; the transform-body union scenarios `[95, 105]` and `[115, 130]`

## 5. Goldens and capture

- [x] 5.1 Add `test/support/scenes.js` with `cube`, `box`, `cylinder`, and `arrangement` (all four primitives placed with translate, rotate, and scale) sources. Add them in a new `test/core/primitives-golden.test.js`, generate them with `npm run golden:update -- test/core/primitives-golden.test.js`, inspect each image, then confirm `npm test` passes without update mode
- [x] 5.2 Add a `primitives` shot to `tools/capture.mjs` (the `arrangement` scene)

## 6. Backlog items

- [x] 6.1 e2e: at a 400 px window, the editor is 240 px and the preview gets the rest (`editor-preview.spec.js`)
- [x] 6.2 e2e: a resize during a heavy render cancels it (`rendersCancelled` +1), one render completes at the new size, and the canvas equals a full render (`live-rebuild.spec.js`)

## 7. Documentation

- [x] 7.1 CONSTRAINTS §2: add `transform.js`, `box.js`, and `cylinder.js` to the module layout; the scene's solids carry a `placement`
- [ ] 7.2 ROADMAP: set M3's status, and strike the three M2 backlog lines as delivered

## 8. Verification, review, and merge

- [x] 8.1 Seen to fail: in an isolated worktree, break a transform (rotation order `Rx·Ry·Rz`; renormalized local direction; non-exact 90°; missing normal transform) and a primitive (wrong cap normal sign), and watch the relevant tests and goldens fail. Record the output
- [x] 8.2 `npm run check < /dev/null` green, then a fresh clone at the branch head (`npm ci`, `npx playwright install`, `npm run hooks:install`, `npm run check`) green
- [x] 8.3 `npm run capture -- M3` (`app`, `stale`, `primitives`), then write `docs/progress/M3/README.md`: each M3 "done when" criterion with its evidence, scenario coverage, the seen-to-fail records, and the manual Safari smoke check (performed by the owner)
- [ ] 8.4 A separate Critic review (`project-critic`) of `main..m3-primitives-and-transforms`. Fix findings and re-review until `[APPROVED]`
- [ ] 8.5 Merge into `main`, mark M3 complete in ROADMAP, and archive with `/opsx:archive` (syncing the specs)

## 9. Critic round 1 fixes

- [x] 9.1 `test/core/scene.test.js`: a translate nested inside a rotate (`[[109, 111]]` along +Y) and inside a scale (`[[118, 122]]`) is applied first
- [x] 9.2 `test/core/transform.test.js`: Y before Z (`rotation([0, 90, 90])` takes +Z to +Y)
- [x] 9.3 In-face rays: the owner chose closed solids (DESIGN D20). `test/core/primitives.test.js` checks that a ray in a box face plane, along the cylinder side line, and in either cap plane is a hit
- [x] 9.4 `test/core/primitives.test.js`: the box corner tie takes the lowest axis (`[-1, 0, 0]` in, `[1, 0, 0]` out), and an exact rim tie gives the cylinder's side normal
- [x] 9.5 `test/core/language.test.js`: the DESIGN §8 cylinder argument examples (positional after named, duplicate, missing)
- [x] 9.6 Seen to fail: each new test fails against its mutant in a worktree, with the test files listed explicitly; recorded in the README

## 10. Critic round 2 fixes

- [x] 10.1 D20 tolerance (owner decision): the in-face checks in `src/core/box.js` and `src/core/cylinder.js` allow `ε` in world units (`ε·|d|` locally); DESIGN D20 and §8 amended; design D-3 updated
- [x] 10.2 `test/core/scene.test.js`: in-face rays of translated solids hit (box face, cylinder cap, cylinder side line); rays beyond `ε` miss, at scale 1, 1000, and 0.001
- [x] 10.3 The `ray-intervals` delta spec carries D20: a MODIFIED "Closed intervals with normals and the ε length rule" with in-face, translated, and beyond-`ε` scenarios
- [x] 10.4 `test/core/primitives.test.js`: the exit-rim tie gives the side normal
- [x] 10.5 Seen to fail for the round 2 tests; the full gate and a fresh clone at the new head (`ad4bdaa`: 210/210, 69/69); recorded in the README

## 11. Critic round 3 fixes

- [x] 11.1 D20 narrowed (owner decision): the in-face guarantee covers `translate`, `scale`, and right-angle rotations; DESIGN D20 and §8, the `ray-intervals` delta spec, and design D-3 amended
- [x] 11.2 `test/core/scene.test.js`: an in-face ray of a translated, right-angle rotated box is a hit; under 45° and 10° rotations, rays `1e-5` inside a box face, cylinder side line, or cap are hits and rays `1e-5` outside miss
- [x] 11.3 ROADMAP backlog: revisit in-face rays under other rotations when `ε` is finalized in M4
- [ ] 11.4 Seen to fail, the full gate, and a fresh clone at the new head; recorded in the README
