## 1. Setup

- [x] 1.1 Create and switch to branch `point-lights` from `main` (done when the change was proposed, at `d1b6553`)

## 2. Light validation

- [x] 2.1 `src/core/properties.js`: give `missing()` an either-of form, so the "light block is missing `direction` or `position`" wording stays in one place (design D-3)
- [x] 2.2 `src/core/lighting.js` (design D-1, D-3):
  - `LIGHT_KINDS` gains `position: 'vector'`;
  - neither `direction` nor `position` is reported at the block; both is reported at whichever comes second in the block, and the `direction` checks still run;
  - a valid light returns `{ kind: 'directional', toLight, intensity }` or `{ kind: 'point', position, intensity }`
- [x] 2.3 `src/core/shade.js`: `keyLight` returns a directional light, `{ kind: 'directional', toLight, intensity }`

## 3. Shading at a point

- [x] 3.1 `src/core/shade.js`: add `lightsAt(lights, point)` (design D-2). Directional lights pass through. A point light is dropped when its distance is not finite or is `≤ ε` (`EPSILON` from `constants.js`), and otherwise gives `toLight = d / r`. `shade` is unchanged
- [x] 3.2 `src/core/render.js`: when the scene has a point light, compute the hit point `ray.origin + hit.t · ray.direction`, and shade with `lightsAt(lights, point)`. Otherwise shade with the lights as today
- [x] 3.3 Every existing golden still matches byte for byte (`npm test` with no golden update), so directional-only renders are unchanged
- [x] 3.4 Measure the scaled-render check with a point light (design D-4, risks) before writing it as a test. If any render differs by more than 1 per channel, stop and take the measurement to the owner

## 4. Scenario tests

- [x] 4.1 `test/core/lighting.test.js`, for "Declared lights": a point light's direction depends on the shaded point; no falloff; a light inside a solid does not light its outside; solids do not block a light; a point at the light receives nothing from it; point and directional lights together. The existing scenarios keep passing unchanged
- [x] 4.2 The same file, for "Light validation": neither property (the new message, replacing the M5 missing-direction expectation); both, in each order, reported at the second, with the `direction` checks still reported; `position: 5` must be a vector; `position: [0, 0, 0]` inside a solid is valid; three directional and two point lights report the fifth; duplicate and unknown properties on a point light
- [x] 4.3 `test/core/shade.test.js`: `lightsAt` at a distance of exactly `ε`, just over `ε`, and 0; a non-finite distance (`[1e308, 0, 0]` shaded at `[-1e308, 0, 0]`); directional lights passing through unchanged
- [x] 4.4 `test/core/scaled-render.test.js`: "A scaled scene with a point light renders the same", with `scaledBoredCube(k)` and `light { position: [40, -50, 50] * k; }` at `×1e-3` and `×1e5`, within 1 per channel of `k = 1`
- [x] 4.5 `test/ui/help-content.test.js`: the `light` section describes `position`

## 5. Golden, help, and capture

- [x] 5.1 Add the `lit-point` scene to `test/support/scenes.js` and to `test/core/lighting-golden.test.js`: `VISION_EXAMPLE` (the same camera as the other `lit-` scenes), with one point light at `[40, -50, 50]`, outside the three visible faces (design D-4). Create the golden with `npm run golden:update -- test/core/lighting-golden.test.js`, and review the image
- [x] 5.2 `src/ui/help-content.js`: the `light` section describes `position`, the rule that a block has exactly one of `direction` and `position`, no falloff, and no shadows
- [x] 5.3 `tools/capture.mjs`: a `lit-point` shot of the `lit-point` scene

## 6. Documentation

- [x] 6.1 DESIGN (design D-5):
  - §4: directional or point white lights;
  - §5: both kinds count toward the 4 light blocks;
  - §8 Modeling language: the `light` line gains `position`;
  - §8 Lighting and shading: `Lᵢ` for point lights, and scenarios for a point light, no falloff, no occlusion, and point-light validation;
  - Optional features: remove point lights;
  - §12: D25
- [x] 6.2 CONSTRAINTS §2: `scene.lights` holds directional `{ kind, toLight, intensity }` and point `{ kind, position, intensity }` lights
- [x] 6.3 ROADMAP: strike the point-lights backlog line as delivered, and change "point/colored lights" to "colored lights" in the parked-features line

## 7. Verification, review, and merge

- [x] 7.1 Seen to fail, in an isolated copy, with the test files listed explicitly and a passing baseline. Each mutant must fail the named tests:
  - M1: `lightsAt` drops every point light;
  - M2: a point light's contribution falls off as `1/r²`;
  - M3: the `ε` rule becomes `r === 0`;
  - M4: `L` points from the light to the point, not from the point to the light;
  - M5: the hit point uses `t` without the ray direction (for example `origin + t`);
  - M6: the both-properties rule is removed;
  - M7: the both-properties rule reports at the first property;
  - M8: the neither-property rule keeps the old message
- [x] 7.2 `npm run check < /dev/null` green, then a fresh clone at the branch head (`npm ci`, `npx playwright install`, `npm run hooks:install`, `npm run check < /dev/null`) green
- [x] 7.3 `npm run capture -- point-lights`, then write `docs/progress/point-lights/README.md`: the criteria checked, the gates, test coverage per scenario, the seen-to-fail records, and the `lit-point` capture
- [x] 7.4 The owner's manual Safari smoke check of a point-lit scene, recorded in the README
- [ ] 7.5 A separate Critic review (`project-critic`) of `main..point-lights`. Fix findings and re-review until `[APPROVED]`
- [ ] 7.6 Merge into `main`, and archive with `/opsx:archive`: sync the specs, and refresh the stale Purpose line of the main `lighting-and-shading` spec
