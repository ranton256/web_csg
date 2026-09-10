## MODIFIED Requirements

### Requirement: Exactly one top-level camera block
Source: DESIGN §8 Camera definition.

A source SHALL contain exactly one `camera { … }` block at the top level.
A missing block SHALL be an error reported at line 1, column 1. A second block
SHALL be an error reported at that block. A camera block inside a transform or
Boolean body SHALL be an error at that block, saying the camera block must be
at the top level; it does not count as the scene's camera. Its properties are
still checked.

#### Scenario: Missing camera block is an error
- **WHEN** a source has no camera block
- **THEN** a diagnostic says exactly one camera block is required

#### Scenario: More than one camera block is an error
- **WHEN** a source has two camera blocks
- **THEN** a diagnostic at the second block says exactly one camera block is required

#### Scenario: The second block's contents are still checked
- **WHEN** a second camera block contains an undeclared name and `fov: 200;`
- **THEN** both are reported, in addition to the extra-block diagnostic

#### Scenario: A camera block inside a body is an error
- **WHEN** a valid top-level camera exists and the source also contains `union { camera { position: [0, -100, 0]; lookAt: [0, 0, 0]; } sphere(1); }`
- **THEN** a diagnostic at the inner `camera` says the camera block must be at the top level

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

#### Scenario: The parallel test uses unit vectors
- **WHEN** a camera at `[0, 0, 10]` looking at the origin has `up: [0.0005, 0, 1000];` (sine 5e-7), or `up: [0.01, 0, 1000];` (sine 1e-5)
- **THEN** the first is rejected as parallel and the second is accepted, regardless of the vectors' length
