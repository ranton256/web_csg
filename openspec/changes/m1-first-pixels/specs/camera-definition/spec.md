## Purpose

Defines the scene's single perspective camera in source: its block syntax,
defaults, and validity rules, and how it maps each pixel of an image to a ray
using a vertical field of view.

## ADDED Requirements

### Requirement: Exactly one top-level camera block
Source: DESIGN §8 Camera definition.

A source SHALL contain exactly one `camera { … }` block at the top level.
A missing block SHALL be an error reported at line 1, column 1. A second block
SHALL be an error reported at that block.

#### Scenario: Missing camera block is an error
- **WHEN** a source has no camera block
- **THEN** a diagnostic says exactly one camera block is required

#### Scenario: More than one camera block is an error
- **WHEN** a source has two camera blocks
- **THEN** a diagnostic at the second block says exactly one camera block is required

#### Scenario: The second block's contents are still checked
- **WHEN** a second camera block contains an undeclared name and `fov: 200;`
- **THEN** both are reported, in addition to the extra-block diagnostic

### Requirement: Camera properties and defaults
Source: DESIGN §8 Camera definition, §5 (camera defaults).

The camera block SHALL contain `name: expression;` entries:
- `position`: a vector; required.
- `lookAt`: a vector; required.
- `up`: a vector; defaults to `[0, 0, 1]`.
- `fov`: a number, in degrees, the vertical field of view; defaults to `45`.

A missing required property, a property given more than once, an unknown
property, or a value of the wrong kind (number or vector) SHALL be an error
naming the property. Camera expressions MAY use names declared earlier.

#### Scenario: Camera defaults are applied
- **WHEN** a camera block gives only `position` and `lookAt`
- **THEN** the camera's `up` is `[0, 0, 1]` and its `fov` is `45`

#### Scenario: position and lookAt are required
- **WHEN** a camera block is missing `position` or `lookAt`
- **THEN** a diagnostic names the missing property

#### Scenario: Unknown, duplicate, and mistyped properties
- **WHEN** a camera block contains `zoom: 2;`, or `fov` twice, or `fov: [1, 2, 3];`
- **THEN** a diagnostic names, respectively, the unknown property `zoom`, the duplicated property `fov`, or `fov` as needing a number

#### Scenario: Camera expressions may use earlier bindings
- **WHEN** `let d = 100;` precedes a camera with `position: [d, -d, d];`
- **THEN** the camera position is `[100, -100, 100]`

### Requirement: Camera validity
Source: DESIGN §8 Camera definition, §5 (`fov` range; camera tolerances,
decision D14).

The camera SHALL be rejected when:
- `position` and `lookAt` are within `ε` (`1e-6`) of each other;
- `up` is the zero vector, or parallel to the viewing direction (the length of
  the cross product of their unit vectors is ≤ `1e-6`);
- `fov` is not strictly between `0` and `180`.

Each case SHALL be an error naming the rule. Each rule SHALL be checked
whenever the values it needs are valid, so independent problems are all
reported. For example, a mistyped `position` does not hide an out-of-range
`fov`.

#### Scenario: position equal to lookAt is an error
- **WHEN** a camera has position `[1, 2, 3]` and lookAt `[1, 2, 3]`
- **THEN** a diagnostic says position and lookAt must differ

#### Scenario: up parallel to the view direction is an error
- **WHEN** a camera has position `[0, 0, 10]`, lookAt `[0, 0, 0]`, and the default up
- **THEN** a diagnostic says up must not be parallel to the viewing direction

#### Scenario: Zero up is an error
- **WHEN** a camera has `up: [0, 0, 0];`
- **THEN** a diagnostic says up must be nonzero

#### Scenario: fov outside (0, 180) is an error
- **WHEN** a camera has `fov: 0;`, or `fov: 180;`
- **THEN** a diagnostic says fov must be strictly between 0 and 180 degrees

#### Scenario: Independent errors are all reported
- **WHEN** a camera has `position: 5;` and `fov: 0;`
- **THEN** both the `position` type error and the fov range error are reported

### Requirement: Perspective projection
Source: DESIGN §8 Camera definition, §5 (render resolution).

For an image `width` × `height` pixels, each pixel SHALL be sampled by one ray
from the camera position through the pixel's center.
- **Vertical field of view:** the image's vertical extent SHALL span `fov`
  degrees.
- **Horizontal extent:** SHALL follow the aspect ratio `width / height`.
- **Orientation:** the camera's `up` (re-orthogonalized against the viewing
  direction) SHALL point toward the top of the image, and `forward × up`
  toward the right.

#### Scenario: The image center looks along the viewing direction
- **WHEN** a 3 × 3 image is sampled
- **THEN** the center pixel's ray points exactly from position toward lookAt

#### Scenario: Image orientation
- **WHEN** the camera is at `[0, -100, 0]` looking at the origin with the default up
- **THEN** rays in the top row have a positive z component, and rays in the rightmost column a positive x component

#### Scenario: Width does not change the vertical field of view
- **WHEN** the same scene is rendered at 64 × 48 and at 96 × 48
- **THEN** a sphere centered in view covers the same number of rows in both images
- **AND** it covers the same number of columns in both images, and the wider image shows more background on each side
