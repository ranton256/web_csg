## Purpose

Defines how camera rays meet solids: rays measured in world distance, closed
hit intervals carrying surface normals, the tolerance rules that make
tangencies and slivers behave deliberately, and which boundary is visible.

## ADDED Requirements

### Requirement: Rays measured in world distance
Source: DESIGN §8 Ray–solid intervals and tolerance.

Each camera ray SHALL start at the camera position with a unit direction in
world space. Its parameter `t` SHALL be the world distance along the ray.

#### Scenario: Interval endpoints are world distances
- **WHEN** the camera is at `[-100, 0, 0]`, looking at the origin, and the scene is `sphere(5);`
- **THEN** the center ray's interval is `[95, 105]`

### Requirement: Closed intervals with normals and the ε length rule
Source: DESIGN §8 Ray–solid intervals and tolerance, §5 (`ε`).

A solid's intersection with a ray SHALL be a list of closed intervals
`[t_in, t_out]`, each endpoint carrying its outward surface normal and its
originating primitive. An interval of length ≤ `ε` SHALL be dropped, so a
tangent graze counts as a miss.

#### Scenario: Tangent ray misses
- **WHEN** a ray travels along the line y = 5, z = 0 in the +X direction past `sphere(5)`
- **THEN** it has no interval, and its pixel shows the background

### Requirement: Visible hit and two-sided normals
Source: DESIGN §8 Ray–solid intervals and tolerance.

The visible hit SHALL be the first interval endpoint with `t > ε`. When the
camera is inside a solid, this is an exit boundary. The shading normal SHALL
be flipped to face the viewer whenever `N·V < 0`, where `V` is the unit vector
toward the viewer.

#### Scenario: Camera inside a solid sees the exit boundary
- **WHEN** the camera is at the origin inside `sphere(50)`, looking at `[1, 0, 0]`
- **THEN** every pixel shows the inside of the sphere, and every shading normal faces the camera
