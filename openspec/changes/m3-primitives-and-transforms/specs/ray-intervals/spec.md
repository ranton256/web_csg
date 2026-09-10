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
