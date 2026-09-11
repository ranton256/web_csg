# M4 — CSG: verification evidence

Change: `openspec/changes/m4-csg` on branch `m4-csg`. Recorded 2026-09-10.
Machine: macOS, Node v22.20.0, npm 10.9.3, `@playwright/test` 1.63.0.

Owner decisions in this change:
- **D16:** best effort outside the supported scale. There is no range check,
  non-finite values stay errors, and an overflowing camera distance gets a
  clear diagnostic.
- **Scale range:** keep DESIGN's ×1e-3 and ×1e5 scaled-render scenario. If
  it passes, widen the range to what it exercises, `[1e-3, 2e7]`.
- **D20:** keep the narrowed rule, and close its backlog line.
- **Backlog:** fold in the mixed-type top-level union test.

## Captures

`npm run capture -- M4` (Chromium, 1280×800, device scale factor 1):

| Shot | Shows |
| --- | --- |
| ![Bored cube](bored-cube.png) | `bored-cube.png`: the `vision.md` example in the editor, with no diagnostics and no stale badge. The preview shows a cube of size 60 bored through by three orthogonal cylinders of radius 12. The holes open on the top, front, and right faces, and the bore walls are lit by the key light |
| ![Four primitives](primitives.png) | `primitives.png`: the M3 `arrangement` scene, unchanged |
| ![Valid render](app.png) | `app.png`: the default sphere example. The bored cube becomes the first-launch default in M6 |
| ![Stale state](stale.png) | `stale.png`: the stale badge and diagnostic (unchanged M2 behavior) |

## ROADMAP "done when" criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| All Boolean operations and Ray–solid intervals and tolerance scenarios pass, including `difference { A; A; }` being empty | [Scenario coverage](#scenario-coverage) | Pass |
| The scaled-render scenario passes at ×1e-3 and ×1e5; `ε` and the scale range marked final in DESIGN §5, or revised with the measured reason | [Scaled render](#scaled-render-measurement): byte-identical renders. DESIGN §5 marks `ε = 1e-6` final and revises the range to `[1e-3, 2e7]`, with the reason in §12 D7 | Pass |
| The bored-cube golden image is committed and passing | `test/golden/bored-cube.ppm` (64×48), in `test/core/csg-golden.test.js`. This is the core-render "callable without a browser" scenario | Pass |
| Evidence: a capture of the bored cube | `bored-cube.png` above | Pass |
| Full gate in the working tree | `npm run check < /dev/null` on the final tree (after the `booleans` camera change) | Pass: exit 0; `node --test` 244/244; Playwright 69/69 |
| Full gate from a fresh checkout | `git clone --branch m4-csg` at `5465dfd`, then `npm ci`, `npx playwright install`, `npm run hooks:install`, and `npm run check < /dev/null` | Pass: exit 0; `node --test` 244/244; Playwright 69/69 |
| Manual Safari smoke check | See below | Pass |
| Separate Critic review returns `[APPROVED]` | Pending | Pending |

## Scenario coverage

| Capability (delta spec) | Tests |
| --- | --- |
| `boolean-operations` | `test/core/boolean.test.js` covers the union block (`[95, 113]`), a transformed intersection (`[116, 124]`), the intersection (`[96, 104]`), a disjoint intersection, the multi-child difference (`[90, 93]`, `[97, 103]`, `[107, 110]`), self-difference of a sphere and a cube (no intervals, background pixels), the single-child difference, and reversed cutter normals (`[0, 0, -1]` at 97, `[0, 0, 1]` at 103). `test/core/intervals.test.js` covers the DESIGN "Interval combination along a ray" (`[2, 8]`, `[4, 6]`, and `[2, 4]` with `[6, 8]`) |
| `ray-intervals` | `test/core/boolean.test.js` covers the flush union (`[95, 115]`), the flush difference (no hit), a near-flush difference (a 5e-7 sliver dropped, a 5e-6 one kept), and a bore wall seen from inside (t = 3, normal `[-1, 0, 0]`, not flipped again). `test/core/scaled-render.test.js` covers the scaled renders. `test/core/intervals.test.js` covers the tie rules and sliver drops for `intersect` and `subtract` |
| `implicit-union` | `test/core/scene.test.js`: several top-level solids of different types (`[95, 105]` along X, `[90, 110]` along Z) |
| `modeling-language` | `test/core/language.test.js` covers: the vision example has no diagnostics, and its tree is a cube minus the union of three cylinders; `light` and `material` are rejected at their keyword (line 5, column 1) and their contents are still checked; errors inside a Boolean carry no "not supported" diagnostic; `union { }` is still an empty-body error |
| `core-render` | `test/core/csg-golden.test.js`: the bored cube has no diagnostics, a 64 × 48 × 4 buffer, and matches the `bored-cube` golden |
| `camera-definition` | `test/core/camera.test.js`: a 1e200 camera reports only "position and lookAt are too far apart" at `lookAt`, and `position: [16000000, 0, 0]` is accepted |

## Scaled-render measurement

The bored cube was rendered at 64×48, with every coordinate and dimension
multiplied by `k`: `size`, `bore`, the `+ 2` height margin, and the camera
position. The helper is `scaledBoredCube` in
`test/core/scaled-render.test.js`. Its ×1 source renders byte-identical to
the vision example.

| Factor | Largest channel difference | Channels differing |
| --- | --- | --- |
| ×0.001 | 0 | 0 of 12,288 |
| ×100000 | 0 | 0 of 12,288 |

Both scaled renders are byte-identical to the unscaled one. The ×1e-3 render's
smallest magnitude is the 0.001 overhang; the ×1e5 render's largest is the
camera coordinate at 1.6e7. DESIGN §5 now states `ε = 1e-6` (final) and the
supported scale `[1e-3, 2e7]` (final), and §12 D7 records the measurement.

## Goldens

Each image was inspected when created. I converted each to PNG and viewed
it; the `booleans` scene was also viewed at 256×192.
- **`bored-cube`:** the cube with holes on three faces and lit bore walls.
- **`booleans`:** a union (a sphere bulging from a cube), an intersection (a
  cube with rounded edges), and a difference (a cube with spherical holes in
  its faces).
  - The first version used the M3 camera distance, where the solids were only
    a few pixels across.
  - I moved the camera closer to `[70, -150, 80]` and regenerated the
    golden, before any commit.
- **Earlier goldens:** all M1 and M3 goldens pass unchanged.

## Seen to fail

Each break was made in a scratch copy of the working tree, before the first
M4 commit. Each run listed nine files explicitly: `intervals`, `boolean`,
`scene`, `camera`, `language`, `csg-golden`, `render-golden`,
`primitives-golden`, and `scaled-render`. The baseline was 98/98 passing, and
each file was restored after its run.

| Break | Tests that failed |
| --- | --- |
| N1: `subtract` does not reverse cutter normals | 3/98: `difference boundaries shade with reversed cutter normals`, `a bore wall seen from inside the bore…`, `interval combination along a ray…` |
| N2: a cutter reaching into the next base interval is skipped for it | 1/98: `several base intervals and cutters, including one cutter spanning two base intervals` |
| N3: `intersect` lets `b` win exact ties | 1/98: `intersect keeps the first operand's endpoint on an exact tie` |
| N4: `difference` is evaluated as a union of all children | 8/98, including `multi-child difference…`, `self-difference is empty…`, `a flush difference opens the face`, and both M4 goldens |
| N5: no `ε` drop after `subtract` (`> 0`) | 1/98: `subtract and intersect drop slivers of length ≤ ε and keep longer pieces` |
| N6: no finite-distance camera check | 1/98: `a camera too far away is reported as such…` |

Notes:
- **Tie mutant replaced:** tasks.md 7.1 listed "`subtract` letting the base
  win ties". That mutant is equivalent to the real code. At an exact tie the
  base's remaining piece has zero length, and the `ε` drop removes it either
  way. It was replaced by N2, which exercises the same sweep bookkeeping.
- **N5 is caught at interval level only:** in a scene, the root union
  applies its own `ε` drop. So the 5e-7 sliver still disappears at scene
  level under N5, and only the interval-level test fails.

## Critic round 1: `[REJECTED]`, and fixes

The Critic reviewed `a3d91be` and ran the gates itself (244/244, 69/69). Its
independent reference was a membership sampler, with its own rotation math,
over 1,400 random CSG trees and 35,000 rays. It found:
- 0 membership mismatches with `sceneIntervals`;
- 0 slivers or gaps ≤ `ε`;
- 0 endpoints off their primitive's surface;
- 0 normal-orientation errors in about 81,000 endpoints.

It rejected the milestone on three blocking findings.

| Finding | Fix |
| --- | --- |
| B1, spec defect. The scaled-render requirement promised invariance for any in-range scene. `ε` is absolute, so a derived feature can flip sides of it with scaling. In `difference { cube(2k); translate([0, 0, 1.0000005k]) { box([4, 4, 4] * k); } }`, a 5e-7 floor plate is dropped at ×1 but kept at ×1e5 (102 channels differ, by up to 136) | Owner decision: scope the guarantee to scenes whose dimensions, coordinates, and derived feature sizes stay in the supported scale, before and after scaling. The requirement, DESIGN §5, the D7 note, and design D-6 say so. A test (`a floor plate thinner than the supported scale…`) and a spec scenario record the plate case as outside the guarantee |
| B2, test gap. A transform body pushing its leaves straight into a Boolean's children passed 244/244 | `a multi-child transform body inside a Boolean is one child` (`[92, 98]`, `[102, 108]`), plus a `boolean-operations` scenario |
| B3, test gap. Intersections of three or more children were untested | `an intersection of three children keeps what all of them share` (`[98, 105]`), plus a scenario |
| I1: design.md said the goldens cover reversed normals through a union | Reworded. The analytic tests cover it; two-sided shading hides a normal's sign in the images |
| I2: the difference rule was ambiguous when a cutter stops just short of the base | Owner decision: the base face stays. DESIGN §8, a new D21, the `ray-intervals` spec and scenario, and a test (`a cutter that stops just short of the base leaves its face`) |
| I3: an overflowing `up` still got "up must not be parallel" | Owner decision: fix it in M4. It now reports "up is too large" at `up`, with a spec scenario, a test, and a D16 note |
| I4: a stale let-scope clause about "bodies of constructs that are not supported yet" | A MODIFIED "Immutable let bindings with lexical scope" in the `modeling-language` delta drops the clause |
| I5: the D16 row was out of order in §12 | Moved after D15 |

Seen to fail, in a scratch copy of the working tree with the round 1 changes.
Each run listed seven files explicitly: `boolean`, `scaled-render`, `camera`,
`intervals`, `scene`, `language`, and `csg-golden`. The baseline was 97/97.

| Break | Tests that failed |
| --- | --- |
| R1: a transform body pushes its leaves into the parent's children (the pre-M4 flattening) | 2/97: `a multi-child transform body inside a Boolean is one child…` and `an intersection of three children…` |
| R2: an intersection uses only its first two children | 1/97: `an intersection of three children keeps what all of them share` |
| R3: a near-miss cutter within `ε` opens the base face | 2/97: `a cutter that stops just short of the base leaves its face (DESIGN D21)` and `a cutter that only touches the base changes nothing` |
| R4: no finiteness check on `up` | 1/97: `an up vector too large to measure is reported as such…` |
| R5: `ε = 0` | 10/97, including `a floor plate thinner than the supported scale…` |

Gate after the fixes: `npm test` passed 249/249, and
`openspec validate m4-csg --strict` is valid.

## Implementation notes

- **Scene tree:** the scene is now `{ camera, root }`. The M3 tests that
  inspected `scene.solids` read `scene.root` instead.
- **Evaluator:** `context.rendered` is gone, because no solid construct is
  left unrendered. This resolves the M3 Critic's informational note.
- **D20:** the narrowed rule stays, and its backlog line is closed (owner).

## Manual Safari smoke check

Done on 2026-09-10 by the project owner, in desktop Safari at
`http://127.0.0.1:8080/` (served by `npm start`). **Pass:**
- after pasting the bored-cube example from `vision.md`, the preview renders
  a cube with three orthogonal round bores;
- the holes show on the top, front, and right faces, and the bore walls are
  lit;
- there are no diagnostics and no stale badge;
- the console shows no errors.
