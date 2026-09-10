## Purpose

Defines the solid primitives, their parameters, size rules, and extents in
local coordinates. This change delivers the sphere; cube, box, and cylinder
arrive in M3.

## ADDED Requirements

### Requirement: Sphere primitive
Source: DESIGN §8 Primitives, §5 (primitive table and dimension rule).

`sphere(radius)` SHALL denote the solid of all points within distance
`radius` of its local origin; in M1, that is the world origin. `radius`
SHALL be a number strictly greater than `0`. A non-positive radius, or a
vector radius, SHALL be an error at the argument.

#### Scenario: Sphere is centered at the origin
- **WHEN** a scene contains only `sphere(5);` and a ray travels along the X axis from x = -100 toward +X
- **THEN** it enters the solid at x = -5 and exits at x = 5

#### Scenario: Non-positive radius is an error
- **WHEN** the source contains `sphere(0);` or `sphere(-2);`
- **THEN** a diagnostic says the radius must be greater than 0

#### Scenario: Radius must be a number
- **WHEN** the source contains `sphere([1, 2, 3]);`
- **THEN** a diagnostic says the radius must be a number
