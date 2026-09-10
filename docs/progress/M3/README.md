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
| `primitives` | `test/core/primitives.test.js`: box at the origin with endpoint normals, top-down box, parallel rays, touching an edge misses, non-unit direction; cylinder cap hit and normals, side hit, above the cap, side tangent, parallel to the axis outside the radius, a slanted ray from side to cap, non-unit direction; the sphere's general quadratic. `test/core/language.test.js`: dimension kinds and positivity for cube, box, and cylinder, missing and extra arguments. `test/core/scene.test.js`: a cube renders exactly as the equal-sided box |
| `transforms` | `test/core/transform.test.js`: exact sine and cosine; the three D4 direction scenarios plus an order check; exact 90°, 180°, and −90°; composition order; the `toLocal` round trip with an unnormalized direction; normals at unit length. `test/core/scene.test.js`: translated sphere (x = 9), `scale(2) { sphere(3); }` entering at x = −6, and nested translate/rotate occupying `[9, 11] × [−2, 2] × [−1, 1]`. `test/core/language.test.js`: exactly one positional argument (D19), argument kinds, scale > 0, and an invalid transform whose body is still checked |
| `ray-intervals` | `test/core/scene.test.js`: a scaled solid reports world distances `[90, 110]`; a rotated box's world normal `[0, −1, 0]` at y = −1, unit length; a rotated cylinder capped along its new axis |
| `implicit-union` | `test/core/scene.test.js`: several children of a transform are unioned (`[95, 105]`); the transform applies to the whole union (`[115, 130]`) |
| `modeling-language` | `test/core/language.test.js`: the vision example reports only `difference` and `union`; Booleans, `light`, and `material` rejected at the keyword with their contents checked; primitives inside an unsupported Boolean checked; cylinder positional and named equivalence. `test/core/parser.test.js`: argument parentheses count as a nesting level (99 pass; 100 fail at column 107) |
| `editor-preview` | `e2e/editor-preview.spec.js`: at a 400 px window the editor keeps 240 px and the preview gets the rest |
| `live-rebuild` | `e2e/live-rebuild.spec.js`: a resize during a render cancels it (`rendersCancelled` +1), one render completes at the new size, and the canvas equals a full render |

## Seen to fail

Each break was made in a scratch worktree of `0cbd591`. Each run used
`transform`, `primitives`, `scene`, `primitives-golden`, and `render-golden`:
a baseline of 33/33 passing, then one mutation at a time.

| Break | Tests that failed |
| --- | --- |
| Rotation order `Rx·Ry·Rz` instead of `Rz·Ry·Rx` | `rotation components apply X first, then Y, then Z` |
| Local direction renormalized in `toLocal` | `a scaled solid still reports world distances`, `toLocal inverts the placement and keeps the direction unnormalized` |
| No exact right-angle values | 9 tests, including `right-angle rotations are exact`, `sine and cosine are exact for multiples of 90°`, `normals of a rotated solid are in world space` |
| Normals not transformed to world space | `scene "arrangement" matches its golden image`, `normals of a rotated solid are in world space`, `a rotated cylinder is capped along its new axis`, `normals come back through the rotation only, at unit length` |
| Cylinder entry cap normal sign flipped | `cylinder is capped and aligned to local Z`, `a rotated cylinder is capped along its new axis` |

My first two attempts at this table were invalid, and I discarded them. I
passed the test files through an unquoted shell variable, and zsh does not
word-split that. Node received one argument that named no file, and exited 1
with "Could not find …" before running any test. The runs above list the
files explicitly and include a passing baseline.

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
