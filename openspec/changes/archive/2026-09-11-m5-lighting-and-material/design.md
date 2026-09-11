## Context

See proposal.md for why. The current state that shapes the approach:

- **`evaluate.js`:** `evaluatePropertyBlock` validates `camera` through
  `validateCamera`, and rejects `light` and `material` as "not supported
  yet" after checking their property expressions. Blocks inside bodies are
  detected with `context.topLevel`, and a misplaced `camera` is still fully
  validated.
- **`camera.js`:** it has its own loop for the property-block rules (unknown,
  duplicate, and mistyped properties; required properties). The message
  forms are pinned by the camera tests: "unknown camera property `x`",
  "camera property `x` is given more than once", "camera property `x` must
  be a vector", and "camera block is missing `x`".
- **`render.js`:** it shades every hit with `[keyLight(basis)]` and
  `DEFAULT_COLOR`.
- **`shade.js`:** it already takes a list of `{ toLight, intensity }` and a
  color. The specular term is already white.
- **The scene:** `{ camera, root }`, and `null` whenever any diagnostic
  exists.

## Goals / Non-Goals

**Goals:**
- One implementation of the property-block rules, shared by `camera`,
  `light`, and `material`, so the three blocks behave and report alike.
- Lighting validation that reports every violation, including in misplaced
  and extra blocks, the way the camera rules already do.
- Visual evidence of declared lights and a material color.

**Non-Goals:**
- Point lights, colored lights, shadows, or per-solid materials (parked).
- Any change to the Blinn-Phong constants or to `shade.js`'s formula.

## Decisions

### D-1: The scene carries lights and color
`scene = { camera, root, lights, color }`:
- `lights` is the list of valid declared lights, each
  `{ toLight, intensity }` in world space, where `toLight` is
  `normalize(−direction)`. The list is empty when there is no `light` block.
- `color` is the material color, or `DEFAULT_COLOR` when there is no
  `material` block.

In `renderRows`, the lights are `scene.lights` if it is non-empty, and
otherwise `[keyLight(basis)]`. The color is `scene.color`.

*Alternative:* resolve the key light in `evaluate`. Rejected, because the key
light depends on the camera basis, which `render.js` already computes, and
the scene would then duplicate camera-derived data.

### D-2: A shared property-block reader, `src/core/properties.js`
`readProperties(block, kinds, evaluate, report)` walks `block.properties`
once. It reports unknown, duplicate, and mistyped properties, with messages
built from `block.keyword`, which keeps today's camera wording. It returns
`{ given, usable, locs, valid }`. A `missing(block, name)` helper reports
"`<keyword>` block is missing `<name>`".

`camera.js` is refactored onto it. The camera tests pin every camera message,
so any drift fails them.

*Alternative:* copy the loop into `lighting.js`. Rejected, because two copies
of the same rules would drift, and a course exemplar should show the rule
once.

### D-3: `src/core/lighting.js` validates a light or a material
`validateLight(block, evaluate, report)` returns `{ toLight, intensity }` or
`null`, and `validateMaterial(block, evaluate, report)` returns `color` or
`null`. Each reports every violation it can see, independently, with the
messages in the `lighting-and-shading` spec tables.

**Vector-length checks.** A single helper serves light `direction` and
camera `up`:
- length 0 with every component 0 → "must be nonzero";
- length 0 with a nonzero component → "is too small" (the squares underflowed);
- a non-finite length → "is too large";
- otherwise the vector is valid.

The camera's existing `up` checks use the same helper, which adds the
underflow case (the folded-in backlog item). The limits come from DESIGN §5:
at most 4 lights, an intensity default of 1, an intensity ≥ 0, and color
components in `[0, 1]`. `constants.js` gains `MAX_LIGHTS` and
`LIGHT_DEFAULTS`.

### D-4: Placement and count rules in the evaluator
`evaluatePropertyBlock` dispatches by keyword. For `light` and `material`,
it always validates the block first, so its contents are checked even when
the block is misplaced or extra. It then applies the placement and count
rules, in this order:
1. Not at the top level: "the `<keyword>` block must be at the top level".
2. The fifth or any later top-level `light`: "at most 4 light blocks are
   allowed", at its keyword.
3. A second or later top-level `material`: "at most one material block is
   allowed", at its keyword.

A misplaced block does not count toward the limits. Only valid, correctly
placed blocks contribute to `scene.lights` or `scene.color`. Any diagnostic
still makes the scene `null`, so partial contributions never render.

### D-5: Recording the writer's defaults (DESIGN §12 D22)
DESIGN gives the light syntax and a default for `intensity`, but not these
details:
- `direction` is required;
- `color` is required;
- where the fifth light and the second material are reported;
- the too-small and too-large messages.

The spec states them, and a new §12 row, D22, records them as the writer's
defaults, consistent with D8, D14, and D16, so a reviewer or the owner can
revisit them. They follow the camera's precedent: required properties with
no default are reported as missing, and each extra block is reported at its
keyword.

### D-6: Goldens, capture, and tests
- **Goldens (64×48)**, from new `test/support/scenes.js` entries built on the
  bored cube, so every golden shows the same CSG model:
  - `lit-one`: one light from the upper left;
  - `lit-two`: two lights, one warm-side and one from below at lower
    intensity, so both contributions show;
  - `lit-material`: a non-default color, `[0.9, 0.35, 0.2]`, under the key
    light.

  The default-light goldens `bored-cube` and `sphere` already exist.
- **Capture:** `lit-custom`, the bored cube with the two lights and the
  material color. It sits beside the existing `bored-cube` shot, which is the
  same model under the default key light. Together they are the ROADMAP's
  "same model under two lighting setups".
- **Unit tests:**
  - a new `test/core/lighting.test.js` for every Lighting and shading
    scenario, analytic where possible and through rendered pixels where the
    scenario is about the image;
  - validation tests for each row of the two message tables;
  - the camera underflow test;
  - `language.test.js`, updated so no "not supported yet" test remains;
  - `properties.js` is exercised through the camera and lighting tests.

### D-7: Documentation
- **DESIGN §12:** D22 (D-5), and a D16 note for the too-small and too-large
  direction and `up` messages.
- **CONSTRAINTS §2:** the scene gains `lights` and `color`; the module list
  gains `properties.js` and `lighting.js`.
- **CLAUDE.md:** the layout line becomes `e2e/**/*.spec.js` (backlog item).
- **ROADMAP:** the M5 status; strike the two folded-in backlog lines.
- **At archive:** refresh the Purpose lines of the main `lighting-and-shading`
  spec ("The `light` and `material` blocks arrive in M5") and the main
  `modeling-language` spec ("…reported as not supported yet").

## Risks / Trade-offs

- **[Refactoring `camera.js` onto the shared reader changes a camera message
  or its column]** → The camera tests assert exact messages and columns; run
  them first, and treat any change as a regression.
- **[A misplaced or extra light is silently counted or used]** → The
  evaluator validates first and adds a block only if it is correctly placed
  and within the limit. Tests cover a light inside a union, a fifth light,
  and a second material, and assert both the diagnostic and that a count of
  four still renders.
- **[Intensities above 1, or several lights, wash out to white]** → This is
  expected: DESIGN clamps each channel. The `lit-two` golden uses modest
  intensities so the image stays informative.
- **[The too-small check misfires for tiny but measurable vectors]** → It
  triggers only when the computed length is exactly 0 and some component is
  nonzero. A vector like `[0, 1e-150, 0]` has a length of 1e-150 and stays
  valid (best effort, D16).

## Migration Plan

Nothing is persisted and nothing is deployed. The scene gains fields, and
`renderRows` is the only consumer. Rollback is reverting the branch.
