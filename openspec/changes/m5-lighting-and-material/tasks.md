## 1. Setup

- [x] 1.1 Create and switch to branch `m5-lighting-and-material` from `main`

## 2. Shared property rules and vector checks

- [x] 2.1 Add `src/core/properties.js` (design D-2):
  - `readProperties(block, kinds, evaluate, report)` for the unknown, duplicate, and mistyped property rules, with messages built from the block keyword
  - `missing(block, name)` for required properties
- [x] 2.2 Refactor `src/core/camera.js` onto it. Every existing camera test passes unchanged, with the same messages and columns
- [x] 2.3 Add the vector-length helper (design D-3): zero is "must be nonzero", underflow is "is too small", and overflow is "is too large". The camera `up` check uses it, which adds "up is too small"

## 3. Lights and material

- [x] 3.1 `src/core/constants.js`: `MAX_LIGHTS = 4` and `LIGHT_DEFAULTS` (`intensity: 1`), mirroring DESIGN §5
- [x] 3.2 Add `src/core/lighting.js`:
  - `validateLight` returns `{ toLight, intensity }`, where `toLight = normalize(−direction)`
  - `validateMaterial` returns `color`
  - both use the messages in the `lighting-and-shading` spec tables
- [x] 3.3 `src/core/evaluate.js` (design D-1, D-4):
  - `light` and `material` are validated first, then checked for placement (top level) and count (the fifth light, the second material)
  - only valid, correctly placed blocks contribute
  - the scene gains `lights` and `color`
  - the "not supported yet" path is removed
- [x] 3.4 `src/core/render.js`: shade with `scene.lights`, or `[keyLight(basis)]` when there are none, and with `scene.color`

## 4. Scenario tests

- [x] 4.1 `test/core/lighting.test.js` (new), for "Declared lights":
  - declared lights replace the default (the center pixel is `[31, 31, 31, 255]`)
  - the light direction is the direction light travels (top lit, bottom ambient only)
  - intensity 0 gives `0.15 × C`
  - two lights at 0.5 equal one light at 1
- [x] 4.2 The same file, for "Light validation": each row of its table, including five light blocks (reported at the fifth), a light inside a `union`, a missing direction, the extreme directions (too large and too small), and four lights allowed
- [x] 4.3 The same file, for "Material color": green and blue come only from the specular term, and `[1, 0.3, 0.3]` where `N`, `V`, and `L` coincide. For "Material validation": each row of its table
- [x] 4.4 The same file, for the MODIFIED requirements: the default key light when no light is declared, and the default color on an unlit point
- [x] 4.5 `test/core/camera.test.js`: an underflowing `up` reports only "up is too small" at `up`
- [x] 4.6 `test/core/language.test.js`: remove the "not supported yet" tests, and replace their content-checking cases with light and material validation cases

## 5. Goldens and capture

- [x] 5.1 Goldens `lit-one`, `lit-two`, and `lit-material` (64×48, the bored cube, design D-6):
  - add the sources to `test/support/scenes.js` and a new `test/core/lighting-golden.test.js`
  - generate them with `npm run golden:update -- test/core/lighting-golden.test.js`, inspect each image, then confirm `npm test` passes without update mode
- [x] 5.2 Add a `lit-custom` shot to `tools/capture.mjs`: the bored cube with the `lit-two` lights and the `lit-material` color

## 6. Documentation

- [x] 6.1 DESIGN §12: D22, the writer's defaults from design D-5; a D16 note on the too-small and too-large messages
- [x] 6.2 CONSTRAINTS §2: the scene is `{ camera, root, lights, color }`, and the module list gains `properties.js` and `lighting.js`
- [x] 6.3 CLAUDE.md: the e2e layout line becomes `e2e/**/*.spec.js` (backlog item)
- [x] 6.4 ROADMAP: set M5's status; strike the underflowing-`up` and CLAUDE.md-path backlog lines as delivered

## 7. Verification, review, and merge

- [x] 7.1 Seen to fail, in an isolated copy, with the test files listed explicitly and a passing baseline:
  - declared lights ignored (always the key light)
  - `toLight` not negated
  - intensity ignored
  - material color ignored
  - a fifth light accepted
  - a misplaced light counted
  - the underflow check removed
  - the shared reader using a fixed keyword in its messages

  Watch the relevant tests and goldens fail, and record the output
- [ ] 7.2 `npm run check < /dev/null` green, then a fresh clone at the branch head (`npm ci`, `npx playwright install`, `npm run hooks:install`, `npm run check`) green
- [x] 7.3 `npm run capture -- M5` (`app`, `stale`, `primitives`, `bored-cube`, `lit-custom`), then write `docs/progress/M5/README.md`:
  - each M5 "done when" criterion with its evidence
  - scenario coverage
  - the seen-to-fail records
  - golden inspection
  - the manual Safari smoke check (performed by the owner)
- [ ] 7.4 A separate Critic review (`project-critic`) of `main..m5-lighting-and-material`. Fix findings and re-review until `[APPROVED]`
- [ ] 7.5 Merge into `main`, mark M5 complete in ROADMAP, and archive with `/opsx:archive`: sync the specs, and refresh the stale Purpose lines of the main `lighting-and-shading` and `modeling-language` specs

## 8. Critic round 1 fixes

- [x] 8.1 B1–B4: tests that an invalid light counts toward the limit, that an invalid material takes the slot, that a misplaced material does not, and that all four lights shade. Each was seen to fail under its mutant
- [x] 8.2 I2 (owner: accept D22): DESIGN D22 records the owner's acceptance, and the unrelated D14 reference is removed
- [x] 8.3 I3: the several-lights test compares exactly
- [ ] 8.4 The full gate and a fresh clone at the new head; the README Critic round 1 section
