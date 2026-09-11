## Why

This change delivers no ROADMAP milestone. It is a backlog item between
**M5** (complete) and **M6** (Persistence & examples). The owner asked for
point lights on 2026-09-11, and has now asked for this proposal. That
un-parks the feature: DESIGN's "Optional features" lists point lights,
parked in D8.

Today every light is directional, so a scene cannot be lit from a place
inside it, such as a lamp beside one part of the model. A point light has a
position, and the direction toward it changes across the model.

## What Changes

- **Syntax** (the owner's choice): `light { position: p; intensity: i; }`
  declares a white point light at the world position `p`.
  - A `light` block takes exactly one of `direction` (a directional light,
    as today) or `position` (a point light).
  - `intensity` keeps its meaning and its default of 1.
  - Both kinds count toward the same limit of 4 light blocks.
  - There is no new reserved word.
- **No falloff** (the owner's choice): a point light contributes its
  `intensity` at any distance, as a directional light does.
  - `intensity` means the same thing for both kinds of light.
  - A scene scaled together with its lights renders the same, so the D7
    scaled-render check extends to point lights.
- **Shading:** for a point light, `L` is the unit vector from the shaded
  point toward the light's position. The Blinn-Phong formula, the specular
  gate, and the clamp are unchanged.
- **No occlusion:** shadows stay parked, so nothing blocks a point light.
  - It lights every visible point that faces it, even when a solid lies
    between them.
  - A light inside a closed solid leaves that solid's outer surface with
    ambient light only, because the surface faces away from the light.
- **A point at the light:** at a shaded point within `ε` of the light's
  position, the direction to the light is undefined, so that light
  contributes nothing there. A distance too large to compute also
  contributes nothing (best effort outside the supported scale, D16).
- **Validation:**
  - A block with both `direction` and `position` is an error at the second
    of the two.
  - A block with neither is reported as "light block is missing `direction`
    or `position`". **BREAKING (message text only):** this was "light block
    is missing `direction`".
  - `position` must be a vector. Any finite position is valid, including
    the origin and points inside solids.
- **Help:** the dialog's `light` section describes `position`.
- **Documents:**
  - DESIGN: point lights leave the parked list, and colored lights and
    shadows stay parked. §4, §5, and §8 describe both kinds of light, and
    §12 gains D25, the owner's decisions.
  - ROADMAP: the point-lights backlog line is struck as delivered, and the
    parked-features line drops "point".

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `lighting-and-shading`:
  - "Declared lights" gains point lights: `L` toward the position, no
    falloff, no occlusion, and the `ε` rule at the light.
  - "Light validation" gains `position`, the rule that a block has exactly
    one of `direction` and `position`, and the new missing-property message.

## Impact

- **Code:**
  - `src/core/lighting.js`: validate `position`, and the rule that a block
    has exactly one of `direction` and `position`;
  - `src/core/shade.js` and `src/core/render.js`: compute `L` for each point
    light at each shaded point;
  - `src/ui/help-content.js`: the `light` section.
  - No new constants: the `ε` rule uses DESIGN §5's existing `ε`.
- **Tests:**
  - unit tests for every new scenario and validation row;
  - a scaled-render check with a point light;
  - a new golden, `lit-point`, the bored cube lit by a point light;
  - the help-content test checks that `position` is described.
- **Evidence:** `docs/progress/point-lights/README.md` with a capture of a
  point-lit scene and the owner's Safari smoke check.
- **Dependencies:** none added.
- **Out of scope:**
  - any falloff law;
  - colored lights and shadows (still parked);
  - showing lights in the preview;
  - M6 persistence and examples.
