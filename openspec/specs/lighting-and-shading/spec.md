# lighting-and-shading Specification

## Purpose

Defines how a visible hit becomes a pixel color: the Blinn-Phong model, its
lights and model color (declared `light` and `material` blocks, or the default
key light and grey), the background, and 8-bit output encoding.

## Requirements

### Requirement: Blinn-Phong shading with the specular gate
Source: DESIGN §8 Lighting and shading, §5 (coefficients).

Given:
- a visible hit with unit shading normal `N`
- unit vector toward the viewer `V`
- model color `C`
- lights `i` with unit vector toward the light `Lᵢ` and intensity `Iᵢ`

The color SHALL be
`c = 0.15·C + Σᵢ Iᵢ · (0.75 · max(0, N·Lᵢ) · C + sᵢ)`,
where `sᵢ = 0.3 · max(0, N·Hᵢ)^32` when `N·Lᵢ > 0`, and `0` otherwise, and
`Hᵢ = normalize(Lᵢ + V)`. Each channel is then clamped to `[0, 1]`.

#### Scenario: Full highlight saturates
- **WHEN** `N`, `V`, and the single light's `L` are the same unit vector, intensity is 1, and `C` is `[0.8, 0.8, 0.8]`
- **THEN** each channel is `min(1, 0.12 + 0.6 + 0.3) = 1`

#### Scenario: Unlit side gets only ambient
- **WHEN** `N·L ≤ 0` for the only light
- **THEN** the color is exactly `0.15·C`, with no specular term even where `N·H > 0`

### Requirement: Default key light
Source: DESIGN §8 Lighting and shading, §5 (default key light).

When no `light` block exists, shading SHALL use exactly one light, with
intensity `1`. Its unit vector toward the light is
`normalize(1·up − 0.5·right + 1·back)`, where:
- `back` is the unit vector from `lookAt` toward `position`;
- `right` is `normalize(forward × up)`;
- `up` is the camera up re-orthogonalized against `forward`.

#### Scenario: Key light direction
- **WHEN** the camera is at `[0, -10, 0]` looking at the origin with the default up
- **THEN** the unit vector toward the key light is `normalize([-0.5, -1, 1])`

#### Scenario: Default key light when no light is declared
- **WHEN** a source has no light block and is rendered
- **THEN** shading uses exactly one light, the camera-relative default key light, at intensity 1

### Requirement: Default model color
Source: DESIGN §8 Lighting and shading, §5 (default model color).

When no `material` block exists, the model color SHALL be `[0.8, 0.8, 0.8]`.

#### Scenario: Default color on an unlit point
- **WHEN** a visible hit is unlit by the key light
- **THEN** each channel is `0.15 × 0.8 = 0.12`, encoded as `31`

### Requirement: Background and output encoding
Source: DESIGN §8 Lighting and shading, §5 (background, output encoding).

A ray with no visible hit SHALL produce the background color
`[0.12, 0.12, 0.14]`. Every pixel SHALL be encoded as
`round(255 · clamp(c, 0, 1))` per channel, with alpha `255` and no gamma step.

#### Scenario: Missing rays show the background
- **WHEN** a ray hits no solid
- **THEN** its pixel is `[31, 31, 36, 255]`

### Requirement: Declared lights
Source: DESIGN §8 Lighting and shading, §5 (light `intensity` default, max `light` blocks), §12 D8.

Each valid top-level `light` block SHALL add one directional white light:
- Its unit vector toward the light `L` SHALL be the negated, normalized
  `direction`. The `direction` is the direction the light travels.
- Its intensity `I` SHALL be `intensity`, or `1` when omitted.

When at least one `light` block exists, shading SHALL use exactly the
declared lights, in the Blinn-Phong model above, and SHALL NOT use the
default key light.

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

### Requirement: Light validation
Source: DESIGN §8 Lighting and shading ("Light validation"), §8 Modeling language (property blocks; light placement), §5 (max `light` blocks), §12 D16 and D22.

A `light` block SHALL appear only at the top level, and there SHALL be at
most 4. Its properties are:
- `direction`: a vector. It is required, and it must be nonzero.
- `intensity`: a number ≥ 0. It defaults to `1`.

Each property MAY appear at most once, and an unknown property is an error.
Every violation SHALL be a diagnostic, and all violations SHALL be reported.
The contents of a misplaced or extra block SHALL still be checked. The
messages are:

| Violation | Reported at | Message |
| --- | --- | --- |
| Missing `direction` | the block | "light block is missing `direction`" |
| Zero direction | `direction` | "direction must be nonzero" |
| Direction too large to measure | `direction` | "direction is too large" |
| Nonzero direction whose length underflows | `direction` | "direction is too small" |
| Negative intensity | `intensity` | "intensity must be at least 0" |
| The fifth or any later light block | its keyword | "at most 4 light blocks are allowed" |
| A light inside a body | its keyword | "the light block must be at the top level" |
| Unknown, duplicate, or mistyped property | the property | the shared property-block messages (for example "unknown light property `color`") |

#### Scenario: Light validation
- **WHEN** a light has `direction: [0, 0, 0]`, or `intensity: -1`, or the source has five light blocks, or a light is inside a `union` block
- **THEN** a diagnostic reports the violated rule, at the property or keyword given in the table

#### Scenario: Four lights are allowed
- **WHEN** the source has four valid light blocks
- **THEN** there are no diagnostics, and shading uses all four

#### Scenario: A missing direction is reported
- **WHEN** the source contains `light { intensity: 1; }`
- **THEN** a diagnostic at the block says it is missing `direction`

#### Scenario: Extreme directions are reported clearly
- **WHEN** a light has `direction: [0, p, p]` with `p` a `1` followed by 200 zeros, or `direction: [0, t, t]` with `t` a `0.` followed by 199 zeros and a `1`
- **THEN** the diagnostic says the direction is too large, or too small, respectively. It never says the direction must be nonzero.

### Requirement: Material color
Source: DESIGN §8 Lighting and shading ("Material color"), §5 (default model color), §12 D8.

A valid top-level `material { color: e; }` block SHALL set the model color
`C` for every solid. The specular term SHALL stay white, independent of
`C`.

#### Scenario: Material color
- **WHEN** the source contains `material { color: [1, 0, 0]; }`
- **THEN** solid pixels have no green or blue diffuse or ambient contribution: their green and blue channels are equal, and come only from the white specular term
- **AND** where `N`, `V`, and `L` coincide at intensity 1, the color is `[1, 0.3, 0.3]`: white specular highlights

### Requirement: Material validation
Source: DESIGN §8 Lighting and shading ("Material validation"), §8 Modeling language (property blocks; material placement), §5 (color components in `[0, 1]`), §12 D22.

There SHALL be at most one `material` block, and only at the top level. Its
only property is `color`: a required vector, with each component in
`[0, 1]`. Each property MAY appear at most once, and an unknown property is
an error. Every violation SHALL be a diagnostic, and all violations SHALL be
reported. The contents of a misplaced or extra block SHALL still be checked.
The messages are:

| Violation | Reported at | Message |
| --- | --- | --- |
| Missing `color` | the block | "material block is missing `color`" |
| A component outside `[0, 1]` | `color` | "each color component must be between 0 and 1" |
| A second material block | its keyword | "at most one material block is allowed" |
| A material inside a body | its keyword | "the material block must be at the top level" |
| Unknown, duplicate, or mistyped property | the property | the shared property-block messages |

#### Scenario: Material validation
- **WHEN** the source has two material blocks, or a color component outside `[0, 1]`
- **THEN** a diagnostic reports the violated rule, at the keyword or property given in the table
