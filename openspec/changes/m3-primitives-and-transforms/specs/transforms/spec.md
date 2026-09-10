## Purpose

Places, orients, and sizes solids: the `translate`, `rotate`, and `scale`
blocks, their single argument, the rotation convention, and how nested
transforms compose.

## ADDED Requirements

### Requirement: Transform blocks and their argument
Source: DESIGN §8 Modeling language (transforms), §8 Transforms; DESIGN §12
D19.

`translate`, `rotate`, and `scale` SHALL each take exactly one positional
argument:
- `translate(vector)`: an offset, in world units;
- `rotate(vector)`: angles about X, Y, and Z, in degrees;
- `scale(number)`: a uniform factor strictly greater than `0`.

A named argument, a missing argument, an extra argument, or a value of the
wrong kind SHALL be an error naming the transform. The transform SHALL apply
to its whole body.

#### Scenario: Exactly one positional argument
- **WHEN** the source contains `translate() { sphere(1); }`, `translate([1, 0, 0], [0, 1, 0]) { sphere(1); }`, or `translate(by: [1, 0, 0]) { sphere(1); }`
- **THEN** a diagnostic says `translate` takes exactly one positional argument

#### Scenario: Argument kinds
- **WHEN** the source contains `translate(5) { sphere(1); }`, `rotate(90) { sphere(1); }`, or `scale([1, 1, 1]) { sphere(1); }`
- **THEN** a diagnostic says, respectively, that `translate` and `rotate` need a vector and `scale` needs a number

#### Scenario: Non-positive scale is an error
- **WHEN** the source contains `scale(0) { sphere(1); }` or `scale(-1) { sphere(1); }`
- **THEN** a diagnostic says the scale factor must be greater than 0

### Requirement: Translation
Source: DESIGN §8 Transforms.

`translate(v)` SHALL move its body by `v`.

#### Scenario: A translated sphere
- **WHEN** the scene is `translate([10, 0, 0]) { sphere(1); }` and a ray travels along the X axis from x = -100 toward +X
- **THEN** it enters the solid at x = 9 and exits at x = 11

### Requirement: Rotation convention
Source: DESIGN §8 Transforms, §5 (rotation units, order, right-angle
rotations; decisions D4 and D7).

`rotate([rx, ry, rz])` SHALL rotate its body about the parent's X axis by
`rx`, then about Y by `ry`, then about Z by `rz`, all in degrees; the matrix is
`R = Rz·Ry·Rx`. Positive angles SHALL be right-handed: counter-clockwise when
looking down the axis toward the origin. An angle that is an exact multiple
of 90° SHALL use exact sine and cosine values (`0`, `±1`).

#### Scenario: Rotation about X turns +Z toward -Y
- **WHEN** `rotate([90, 0, 0])` is applied to the local direction `[0, 0, 1]`
- **THEN** the parent-frame direction is `[0, -1, 0]`

#### Scenario: Rotation about Y turns +Z toward +X
- **WHEN** `rotate([0, 90, 0])` is applied to the local direction `[0, 0, 1]`
- **THEN** the parent-frame direction is `[1, 0, 0]`

#### Scenario: Rotation components apply X first, then Y, then Z
- **WHEN** `rotate([90, 90, 0])` is applied to the local direction `[0, 1, 0]`
- **THEN** the parent-frame direction is `[1, 0, 0]`

#### Scenario: Right-angle rotations are exact
- **WHEN** `rotate([0, 0, 90])` is applied to `[1, 0, 0]`, and `rotate([0, 0, 180])` to `[0, 1, 0]`
- **THEN** the results are exactly `[0, 1, 0]` and `[0, -1, 0]`, with no rounding residue

### Requirement: Uniform scale
Source: DESIGN §8 Transforms, §5 (scale factor).

`scale(k)` SHALL multiply every extent of its body by `k`, about the local
origin.

#### Scenario: Uniform scale multiplies all extents
- **WHEN** the scene is `scale(2) { sphere(3); }` and a ray travels along the X axis from x = -100 toward the origin
- **THEN** it enters the solid at x = -6

### Requirement: Nested transforms compose from the inside outward
Source: DESIGN §8 Transforms; §5 (transform nesting).

Nested transform blocks SHALL apply innermost first. For a primitive inside
nested blocks, the world placement is the outermost transform applied to the
next one in, and so on down to the primitive.

#### Scenario: Nested transforms compose from the inside outward
- **WHEN** the scene is `translate([10, 0, 0]) { rotate([0, 0, 90]) { box([4, 2, 2]); } }`
- **THEN** the solid occupies x in `[9, 11]`, y in `[-2, 2]`, and z in `[-1, 1]`
