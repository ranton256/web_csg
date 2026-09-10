## Purpose

Defines how a visible hit becomes a pixel color: the Blinn-Phong model, its
lights and model color, the background, and 8-bit output encoding. This change
covers the default key light and default model color. The `light` and
`material` blocks arrive in M5.

## ADDED Requirements

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

When no `light` block exists (always, in this change), shading SHALL use
exactly one light, with intensity `1`. Its unit vector toward the light is
`normalize(1·up − 0.5·right + 1·back)`, where:
- `back` is the unit vector from `lookAt` toward `position`;
- `right` is `normalize(forward × up)`;
- `up` is the camera up re-orthogonalized against `forward`.

#### Scenario: Key light direction
- **WHEN** the camera is at `[0, -10, 0]` looking at the origin with the default up
- **THEN** the unit vector toward the key light is `normalize([-0.5, -1, 1])`

### Requirement: Default model color
Source: DESIGN §8 Lighting and shading, §5 (default model color).

When no `material` block exists (always, in this change), the model color
SHALL be `[0.8, 0.8, 0.8]`.

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
