# M3 — Primitives & transforms: verification evidence

Change: `openspec/changes/m3-primitives-and-transforms` on branch
`m3-primitives-and-transforms`. Recorded 2026-09-10. Machine: macOS, Node
v22.20.0, npm 10.9.3, `@playwright/test` 1.63.0. Owner decisions in this
change:
- D19: transforms take exactly one positional argument;
- the three M2 backlog items are folded in.

## Captures

`npm run capture -- M3` (Chromium, 1280×800, device scale factor 1):

| Shot | Shows |
| --- | --- |
| ![Four primitives](primitives.png) | `primitives.png`: the `arrangement` scene. A sphere on the left, a cube turned 30° about Z at the back, a cylinder rotated 90° about X to lie along Y on the right, and a box scaled 1.5× at the front, all lit by the default key light |
| ![Valid render](app.png) | `app.png`: the default sphere example |
| ![Stale state](stale.png) | `stale.png`: the stale badge and the `9:8` diagnostic (unchanged M2 behavior) |

## ROADMAP "done when" criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| All Primitives, Transforms, and Implicit union scenarios pass | [Scenario coverage](#scenario-coverage) | Pass |
| Golden images exist for each primitive and for a rotated and translated arrangement | `test/golden/cube.ppm`, `box.ppm`, `cylinder.ppm`, and `arrangement.ppm` (64×48, from `test/support/scenes.js`), plus M1's `sphere.ppm` and `sphere-inside.ppm`. Each new image was inspected when created: each solid shows three distinct face shades under the key light, and the cylinder a bright cap with a shaded side | Pass |
| Evidence: a capture showing all four primitives | `primitives.png` above | Pass |
| Full gate from a fresh checkout | `git clone --branch m3-primitives-and-transforms` at `0cbd591`, then `npm ci`, `npx playwright install`, `npm run hooks:install`, and `npm run check < /dev/null` | Pass: exit 0; `node --test` 202/202; Playwright 69/69 |
| Manual Safari smoke check | See below | Pass |
| Separate Critic review returns `[APPROVED]` | Recorded in the merge | Pending at time of writing |

## Scenario coverage

| Capability (delta spec) | Tests |
| --- | --- |
| `primitives` | `test/core/primitives.test.js`: box at the origin with endpoint normals, top-down box, parallel rays, touching an edge misses, a ray in a face plane is a hit (D20), the corner tie takes the lowest axis, non-unit direction; cylinder cap hit and normals, side hit, above the cap, side tangent, parallel to the axis outside the radius, along the side line and in either cap plane is a hit (D20), a slanted ray from side to cap, the side wins an exact rim tie, non-unit direction; the sphere's general quadratic. `test/core/language.test.js`: dimension kinds and positivity for cube, box, and cylinder, missing and extra arguments. `test/core/scene.test.js`: a cube renders exactly as the equal-sided box |
| `transforms` | `test/core/transform.test.js`: exact sine and cosine; the three D4 direction scenarios plus order checks (X before Y, X before Z, Y before Z); exact 90°, 180°, and −90°; composition order; the `toLocal` round trip with an unnormalized direction; normals at unit length. `test/core/scene.test.js`: translated sphere (x = 9), `scale(2) { sphere(3); }` entering at x = −6, nested translate/rotate occupying `[9, 11] × [−2, 2] × [−1, 1]`, and a translate nested inside a rotate (`[109, 111]`) or a scale (`[118, 122]`) applied first. `test/core/language.test.js`: exactly one positional argument (D19), argument kinds, scale > 0, and an invalid transform whose body is still checked |
| `ray-intervals` | `test/core/scene.test.js`: a scaled solid reports world distances `[90, 110]`; a rotated box's world normal `[0, −1, 0]` at y = −1, unit length; a rotated cylinder capped along its new axis |
| `implicit-union` | `test/core/scene.test.js`: several children of a transform are unioned (`[95, 105]`); the transform applies to the whole union (`[115, 130]`) |
| `modeling-language` | `test/core/language.test.js`: the vision example reports only `difference` and `union`; Booleans, `light`, and `material` rejected at the keyword with their contents checked; primitives inside an unsupported Boolean checked; cylinder positional and named equivalence; the DESIGN §8 cylinder argument errors (positional after named, duplicate `radius`, missing `height`). `test/core/parser.test.js`: argument parentheses count as a nesting level (99 pass; 100 fail at column 107) |
| `editor-preview` | `e2e/editor-preview.spec.js`: at a 400 px window the editor keeps 240 px and the preview gets the rest |
| `live-rebuild` | `e2e/live-rebuild.spec.js`: a resize during a render cancels it (`rendersCancelled` +1), one render completes at the new size, and the canvas equals a full render |

## Seen to fail

Each break was made in a scratch worktree of `0cbd591`. Each run used
`transform`, `primitives`, `scene`, `primitives-golden`, and `render-golden`:
a baseline of 33/33 passing, then one mutation at a time.

| Break | Tests that failed |
| --- | --- |
| Rotation order `Rx·Ry·Rz` instead of `Rz·Ry·Rx` (this reverses every pair; round 1 found that the Y-before-Z pair alone was not pinned, see below) | `rotation components apply X first, then Y, then Z` |
| Local direction renormalized in `toLocal` | `a scaled solid still reports world distances`, `toLocal inverts the placement and keeps the direction unnormalized` |
| No exact right-angle values | 9 tests, including `right-angle rotations are exact`, `sine and cosine are exact for multiples of 90°`, `normals of a rotated solid are in world space` |
| Normals not transformed to world space | `scene "arrangement" matches its golden image`, `normals of a rotated solid are in world space`, `a rotated cylinder is capped along its new axis`, `normals come back through the rotation only, at unit length` |
| Cylinder entry cap normal sign flipped | `cylinder is capped and aligned to local Z`, `a rotated cylinder is capped along its new axis` |

My first two attempts at this table were invalid, and I discarded them. I
passed the test files through an unquoted shell variable, and zsh does not
word-split that. Node received one argument that named no file, and exited 1
with "Could not find …" before running any test. The runs above list the
files explicitly and include a passing baseline.

## Critic round 1: `[REJECTED]`, and fixes

The Critic reviewed `a39cbc2` and ran a brute-force check: 8000 rays
through nested placements, with no mismatches. It rejected the milestone
for test gaps only. No `src` file changed in the fix.

| Finding | Fix |
| --- | --- |
| Composing a `translate` as the parent (`compose(translation(value), context.placement)`) survived: no test nested a translate inside a rotate or scale | `a translate nested inside a rotate or scale is applied first` (`scene.test.js`) |
| The rotation `Ry·Rz·Rx` survived: nothing pinned Y before Z | The Y-before-Z assertion in `rotation components apply X first, then Y, then Z`; the table above is corrected |
| tasks.md 3.3 claimed box-face tangent tests that did not exist, and DESIGN did not settle a ray lying in a face | The owner chose closed solids (DESIGN D20, with the §8 wording clarified). New tests cover rays in a box face plane, along the cylinder side line, and in either cap plane. tasks.md 3.3 now describes the real tests |
| The tie-breaks in design D-3 and tasks 3.2 were untested | The box corner tie (lowest axis, in and out), and an exact rim tie (direction `[1, 0, 1]` from `[-10, 0, -10]`, both bounds at t = 5 exactly) that gives the side normal |
| Informational: the DESIGN §8 cylinder argument examples were untested | `cylinder argument errors (DESIGN §8 examples)` (`language.test.js`) |

Seen to fail, in a scratch worktree of `a39cbc2` with the four updated test
files copied in. Each run lists its test files explicitly. The baseline was
56/56 passing across `primitives`, `transform`, `scene`, and `language`.
Each mutation was reverted with `git checkout` before the next.

| Mutant | Files run | Failed |
| --- | --- | --- |
| F: `compose(translation(value), context.placement)` in `evaluate.js` | `scene` | 1/10: `a translate nested inside a rotate or scale is applied first` |
| G: `Ry·Rz·Rx` in `rotation` | `transform` | 1/8: `rotation components apply X first, then Y, then Z` |
| H: box ties go to the highest axis (`>=`, `<=`) | `primitives` | 1/14: `box: a slab tie (a corner hit) takes its normals from the lowest axis` |
| I: the cylinder cap wins a tie (`sideIn > capIn`) | `primitives` | 1/14: `cylinder: the side wins an exact tie with a cap (a rim hit)` |
| J: open box slabs (`o <= -half \|\| o >= half`) | `primitives` | 1/14: `box: a ray lying in a face plane is a hit (closed solids, D20)` |
| K: open cylinder side (`>= radius²` when parallel to the axis) | `primitives` | 1/14: `cylinder: a ray along the side line or in a cap plane is a hit (closed solids, D20)` |
| L: open cylinder caps (`oz <= -half \|\| oz >= half`) | `primitives` | 1/14: the same cylinder D20 test |

Gate after the fixes: `npm run check < /dev/null` in the working tree exits
0, with `node --test` at 208/208 and Playwright at 69/69.

## Implementation notes

- **Scene tests:** they live in a new `test/core/scene.test.js`, and the new
  goldens in `test/core/primitives-golden.test.js`. tasks.md 4.4 and 5.1 were
  updated to name these files.
- **M1 sphere goldens:** they still pass under the general quadratic.

## Manual Safari smoke check

2026-09-10, done by the project owner in desktop Safari at
`http://127.0.0.1:8080/` (served by `npm start`). **Pass:**
- pasting the arrangement source shows all four primitives, placed, rotated,
  scaled, and lit as described;
- no console errors.
