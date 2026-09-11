## Why

This change delivers ROADMAP **M5 — Lighting & material**. After M4, Boolean
models render, but every scene is lit by the camera-relative default key
light in the default grey. The `light` and `material` blocks parse, but are
rejected as "not supported yet". M5 lets the source author the lighting and
the model color that DESIGN §8 (D8) specifies. It is the last language
feature before the M6 release work.

## What Changes

- **`light { direction; intensity; }`** blocks (DESIGN §8 Lighting and
  shading, D8):
  - **Placement:** 0 to 4 blocks, at the top level only.
  - **Light:** each is a directional white light. `direction` is the
    direction the light travels (a nonzero vector, required). `intensity`
    is a number ≥ 0, default `1`.
  - **Default key light:** declared lights replace it. With no `light`
    block, the default key light is used as before.
- **`material { color; }`:** at most one block, at the top level. `color` is
  required, with each component in `[0, 1]`. It sets the model color for
  every solid, replacing the default `[0.8, 0.8, 0.8]`. Specular highlights
  stay white.
- **Validation:**
  - Both blocks follow the shared property-block rules: each property at most
    once, unknown properties are errors, and values must be the right kind.
  - Light rules: a zero direction; a negative intensity; a fifth light block
    and any after it; a light inside a body.
  - Material rules: a second material block; a component outside `[0, 1]`; a
    material inside a body.
  - Every violation is a diagnostic at its line and column, and all of them
    are reported.
- **Best effort at extreme values (D16):**
  - A light `direction` whose length overflows reports "direction is too
    large". One whose components underflow reports "direction is too
    small".
  - Backlog item, folded in per the owner: an `up` vector whose components
    underflow reports "up is too small", instead of the misleading "up must
    be nonzero".
- **No constructs remain "not supported yet".** The M4 requirement for them
  is removed.
- **Backlog, per the owner:** the CLAUDE.md e2e path is corrected to
  `e2e/**/*.spec.js`.
- **Evidence:**
  - goldens for a declared light, two lights, and a non-default material
    color, alongside the existing default-light goldens;
  - captures of the bored cube under the default key light and under two
    declared lights with a material color.

## Capabilities

### New Capabilities
<!-- None: lighting and model color extend the existing lighting-and-shading capability. -->

### Modified Capabilities
- `lighting-and-shading`:
  - declared lights replace the default key light;
  - the light direction and intensity semantics;
  - light validation;
  - the material color and its validation;
  - the default key light and default color apply only when no block
    declares otherwise.
- `modeling-language`: "Lights and materials are not supported yet" is
  removed.
- `camera-definition`: "Camera math stays finite" gains the underflowing-`up`
  case.

## Impact

- **Code:**
  - `src/core/evaluate.js`: evaluates `light` and `material` blocks, and
    passes their values into the scene.
  - A new `src/core/lighting.js`: validates light and material blocks with
    the shared property-block rules.
  - `src/core/camera.js`: the underflow check.
  - `src/core/render.js`: uses the scene's lights (or the key light) and its
    color.
  - `src/core/shade.js`: unchanged, since it already takes lights and a
    color.
- **Tests:**
  - analytic shading and validation tests for every Lighting and shading
    scenario;
  - updated language tests;
  - the camera underflow test;
  - new goldens.
- **Capture:** the shot list gains `lit-custom`. The existing `bored-cube`
  shot is the same model under the default key light.
- **Documents:**
  - DESIGN §12 (a D16 note);
  - CONSTRAINTS §2 (the scene gains `lights` and `color`);
  - CLAUDE.md (the e2e path);
  - the ROADMAP status and backlog lines.
- **Dependencies:** none added.
- **Out of scope:**
  - built-in examples, save and load (M6);
  - point or colored lights, shadows, and richer materials (parked).
