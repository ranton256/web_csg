## MODIFIED Requirements

### Requirement: Rays measured in world distance
Source: DESIGN §8 Ray–solid intervals and tolerance.

Each camera ray SHALL start at the camera position with a unit direction in
world space. Its parameter `t` SHALL be the world distance along the ray. To
intersect a transformed primitive, the ray SHALL be transformed into the
primitive's local space **without renormalizing** its direction, so every
primitive reports intervals in the same world `t`. Surface normals SHALL be
transformed back to world space and have unit length.

#### Scenario: Interval endpoints are world distances
- **WHEN** the camera is at `[-100, 0, 0]`, looking at the origin, and the scene is `sphere(5);`
- **THEN** the center ray's interval is `[95, 105]`

#### Scenario: A scaled solid still reports world distances
- **WHEN** the same ray meets `scale(2) { sphere(5); }`
- **THEN** its interval is `[90, 110]`

#### Scenario: Normals of a rotated solid are in world space
- **WHEN** a ray travels along the Y axis from y = -100 toward +Y through `rotate([0, 0, 90]) { box([2, 4, 6]); }`
- **THEN** it enters at y = -1 with world normal `[0, -1, 0]`, and has unit-length normals at both ends

### Requirement: Closed intervals with normals and the ε length rule
Source: DESIGN §8 Ray–solid intervals and tolerance, §5 (`ε`), §12 D20.

A solid's intersection with a ray SHALL be a list of closed intervals
`[t_in, t_out]`, each endpoint carrying its outward surface normal and its
originating primitive. An interval of length ≤ `ε` SHALL be dropped, so a
tangent graze counts as a miss. Solids SHALL be closed: a ray lying in a box
face plane, along a cylinder side line, or in a cylinder cap plane, to within
`ε` in world units, SHALL be a hit over the length it shares with the solid,
wherever the solid is placed.

#### Scenario: Tangent ray misses
- **WHEN** a ray travels along the line y = 5, z = 0 in the +X direction past `sphere(5)`
- **THEN** it has no interval, and its pixel shows the background

#### Scenario: A ray lying in a box face is a hit
- **WHEN** a ray travels along +X from `[-100, 3, 0]`, in the y = 3 face plane of `box([4, 6, 8])`
- **THEN** its interval is `[98, 102]`

#### Scenario: A ray along a cylinder side line or in a cap plane is a hit
- **WHEN** a ray travels along −Z from `[5, 0, 100]`, or along +X from `[-100, 0, 5]`, past `cylinder(5, 10)`
- **THEN** its interval is `[95, 105]`

#### Scenario: In-face rays of a translated solid are hits
- **WHEN** a ray travels along +X from `[-100, 0.4, 0]`, in the top face plane of `translate([0, 0.3, 0]) { box([2, 0.2, 2]); }`
- **THEN** its interval is `[99, 101]`, although the face's local coordinate is not exactly representable

#### Scenario: A ray beyond ε of a face misses, at any scale
- **WHEN** a ray travels along +X at y = 1000 + 2·10⁻⁶ past `scale(1000) { box([2, 2, 2]); }`, or at y = 0.4 + 10⁻⁵ past the translated box above
- **THEN** it has no interval, while a ray at y = 1000 + 5·10⁻⁷ past the scaled box is a hit
