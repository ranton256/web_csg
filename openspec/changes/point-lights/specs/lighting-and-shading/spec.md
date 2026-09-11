## MODIFIED Requirements

### Requirement: Declared lights
Source: DESIGN §8 Lighting and shading, §5 (light `intensity` default, max `light` blocks, `ε`), §12 D8 and D25.

Each valid top-level `light` block SHALL add one white light, directional or
point:
- **Directional** (the block has `direction`): its unit vector toward the
  light `L` SHALL be the negated, normalized `direction`. The `direction` is
  the direction the light travels.
- **Point** (the block has `position`): at a shaded point `P`, its unit
  vector toward the light SHALL be `L = normalize(position − P)`. When the
  distance `‖position − P‖` is at most `ε`, or is too large to compute as a
  finite number, the light SHALL contribute nothing at `P`.
- Its intensity `I` SHALL be `intensity`, or `1` when omitted. A point
  light's contribution SHALL NOT depend on its distance from `P` (no
  falloff).

Lights SHALL NOT be occluded: each light contributes wherever the shading
normal `N` has `N·L > 0`, whether or not a solid lies between `P` and the
light, and whether or not the light is inside a solid.

When at least one `light` block exists, shading SHALL use exactly the
declared lights, of both kinds, in the Blinn-Phong model above, and SHALL
NOT use the default key light.

#### Scenario: Declared lights replace the default
- **WHEN** the camera is at `[0, -100, 0]` looking at the origin, the scene is `sphere(10);`, and the only light is `light { direction: [0, 0, -1]; }`
- **THEN** the center pixel, where `N` is perpendicular to that light, is exactly the ambient `0.15 × 0.8`, encoded as `[31, 31, 31, 255]`. The default key light would have lit it.

#### Scenario: Light direction is the direction light travels
- **WHEN** a single light has `direction: [0, 0, -1]`, the scene is a sphere at the origin, and the camera looks at it from the side
- **THEN** the top of the sphere is lit, and the bottom receives only ambient light

#### Scenario: Intensity scales the direct contribution
- **WHEN** the only light has `intensity: 0`
- **THEN** every solid pixel equals `0.15 ×` the model color

#### Scenario: Several lights add their contributions
- **WHEN** two identical lights each have `intensity: 0.5`
- **THEN** every pixel equals the render with one such light at `intensity: 1`

#### Scenario: A point light's direction depends on the shaded point
- **WHEN** a point light at `[0, 0, 10]` shades the point `[0, 0, 0]` and the point `[10, 0, 0]`, both with `N = [0, 0, 1]`
- **THEN** `L` is `[0, 0, 1]` at the first point and `normalize([-10, 0, 10])` at the second, so the diffuse term is `0.75 · C` at the first and `0.75 · C / √2` at the second

#### Scenario: A point light has no falloff
- **WHEN** a point light at `[0, 0, 10]`, and then the same light at `[0, 0, 1000]`, shades the point `[0, 0, 0]` with `N = [0, 0, 1]`
- **THEN** both give the same color

#### Scenario: A light inside a solid does not light its outside
- **WHEN** the camera is at `[0, -100, 0]` looking at the origin, the scene is `sphere(10);`, and the only light is `light { position: [0, 0, 0]; }`
- **THEN** every solid pixel is the ambient `0.15 × 0.8`, encoded as `[31, 31, 31, 255]`

#### Scenario: Solids do not block a light
- **WHEN** the only light is `light { position: [0, 0, 50]; }`, and the scene is a sphere at the origin with a cube between the sphere and the light
- **THEN** every pixel where the sphere is visible equals the same pixel in the render without the cube

#### Scenario: A point at the light receives nothing from it
- **WHEN** a point light's position is within `ε` of the shaded point, and it is the only light
- **THEN** the color there is exactly `0.15 · C`

#### Scenario: Point and directional lights together
- **WHEN** the source has one directional and one point light
- **THEN** shading uses both, adding their contributions, and does not use the default key light

#### Scenario: A scaled scene with a point light renders the same
- **WHEN** the bored cube and a point light's position are scaled together by `×1e-3` and by `×1e5`, and each is rendered at 64×48
- **THEN** each render is within 1 per channel of the unscaled render

### Requirement: Light validation
Source: DESIGN §8 Lighting and shading ("Light validation"), §8 Modeling language (property blocks; light placement), §5 (max `light` blocks), §12 D16, D22, and D25.

A `light` block SHALL appear only at the top level, and there SHALL be at
most 4, of either kind together. Its properties are:
- `direction`: a vector, which must be nonzero. It makes the light
  directional.
- `position`: a vector. Any finite position is valid. It makes the light a
  point light.
- `intensity`: a number ≥ 0. It defaults to `1`.

A block SHALL have exactly one of `direction` and `position`. Each property
MAY appear at most once, and an unknown property is an error. Every violation
SHALL be a diagnostic, and all violations SHALL be reported. The contents of
a misplaced or extra block SHALL still be checked, and so SHALL both
properties of a block that has both. The messages are:

| Violation | Reported at | Message |
| --- | --- | --- |
| Neither `direction` nor `position` | the block | "light block is missing `direction` or `position`" |
| Both `direction` and `position` | whichever of the two comes second | "light block cannot have both `direction` and `position`" |
| Zero direction | `direction` | "direction must be nonzero" |
| Direction too large to measure | `direction` | "direction is too large" |
| Nonzero direction whose length underflows | `direction` | "direction is too small" |
| Negative intensity | `intensity` | "intensity must be at least 0" |
| The fifth or any later light block | its keyword | "at most 4 light blocks are allowed" |
| A light inside a body | its keyword | "the light block must be at the top level" |
| Unknown, duplicate, or mistyped property | the property | the shared property-block messages (for example "unknown light property `color`", or "light property `position` must be a vector") |

#### Scenario: Light validation
- **WHEN** a light has `direction: [0, 0, 0]`, or `intensity: -1`, or the source has five light blocks, or a light is inside a `union` block
- **THEN** a diagnostic reports the violated rule, at the property or keyword given in the table

#### Scenario: Four lights are allowed
- **WHEN** the source has four valid light blocks
- **THEN** there are no diagnostics, and shading uses all four

#### Scenario: Both kinds share the limit
- **WHEN** the source has three directional and two point light blocks, all valid
- **THEN** one diagnostic, at the fifth block's keyword, says at most 4 light blocks are allowed

#### Scenario: A missing direction is reported
- **WHEN** the source contains `light { intensity: 1; }`
- **THEN** a diagnostic at the block says it is missing `direction` or `position`

#### Scenario: Direction and position together are reported
- **WHEN** the source contains `light { position: [0, 0, 5]; direction: [0, 0, 0]; }`
- **THEN** a diagnostic at `direction` says the block cannot have both, and another at `direction` says the direction must be nonzero

#### Scenario: A point light accepts any position
- **WHEN** the source contains `light { position: [0, 0, 0]; }`, with a solid whose inside contains the origin
- **THEN** there are no diagnostics

#### Scenario: Position must be a vector
- **WHEN** the source contains `light { position: 5; }`
- **THEN** a diagnostic at `position` says the light property `position` must be a vector

#### Scenario: Extreme directions are reported clearly
- **WHEN** a light has `direction: [0, p, p]` with `p` a `1` followed by 200 zeros, or `direction: [0, t, t]` with `t` a `0.` followed by 199 zeros and a `1`
- **THEN** the diagnostic says the direction is too large, or too small, respectively. It never says the direction must be nonzero.
