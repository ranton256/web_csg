## ADDED Requirements

### Requirement: Cube primitive
Source: DESIGN §8 Primitives, §5 (primitive table and dimension rule).

`cube(size)` SHALL denote the solid `[-size/2, size/2]` on each local axis.
`size` SHALL be a number strictly greater than `0`. A non-positive size, or a
vector size, SHALL be an error at the argument. A cube SHALL render exactly as
the box with three equal sides.

#### Scenario: Cube is a box with equal sides
- **WHEN** one scene contains `cube(10);` and an otherwise identical scene contains `box([10, 10, 10]);`
- **THEN** the two rendered images are identical

#### Scenario: Cube size must be a positive number
- **WHEN** the source contains `cube(0);`, or `cube([1, 2, 3]);`
- **THEN** a diagnostic says, respectively, that the size must be greater than 0, or that it must be a number

### Requirement: Box primitive
Source: DESIGN §8 Primitives, §5 (primitive table and dimension rule).

`box(size)` SHALL denote the solid `[-x/2, x/2] × [-y/2, y/2] × [-z/2, z/2]`
for `size = [x, y, z]`. `size` SHALL be a vector whose components are each
strictly greater than `0`. Otherwise it SHALL be an error at the argument.

#### Scenario: Primitives are centered at the origin
- **WHEN** a scene contains only `box([4, 6, 8]);` and a ray travels along the X axis from x = -100 toward +X
- **THEN** it enters the solid at x = -2 with normal `[-1, 0, 0]`, and exits at x = 2 with normal `[1, 0, 0]`

#### Scenario: Box size must be a vector of positive components
- **WHEN** the source contains `box([10, -1, 10]);`, or `box(10);`
- **THEN** a diagnostic says, respectively, that each size component must be greater than 0, or that the size must be a vector

### Requirement: Cylinder primitive
Source: DESIGN §8 Primitives, §5 (primitive table and dimension rule).

`cylinder(radius, height)` SHALL denote the capped solid
`x² + y² ≤ radius²`, `z ∈ [-height/2, height/2]`, in local coordinates. The
side normal is `(x, y, 0) / radius`, and the cap normals are `[0, 0, ±1]`.
`radius` and `height` SHALL each be numbers strictly greater than `0`.

#### Scenario: Cylinder is capped and aligned to local Z
- **WHEN** a scene contains only `cylinder(radius: 5, height: 10);` and a ray travels down the Z axis from z = 100 toward -Z
- **THEN** it hits the top cap at z = 5 with normal `[0, 0, 1]`, and exits through the bottom cap at z = -5

#### Scenario: Cylinder side
- **WHEN** a ray travels along the X axis from x = -100 toward +X through `cylinder(5, 10)`
- **THEN** it enters at x = -5 with normal `[-1, 0, 0]`, and exits at x = 5

#### Scenario: A ray above the cap misses
- **WHEN** a ray travels along the line z = 6, y = 0 in the +X direction past `cylinder(5, 10)`
- **THEN** it has no interval

#### Scenario: Cylinder dimensions must be positive numbers
- **WHEN** the source contains `cylinder(0, 10);` or `cylinder(5, -1);`
- **THEN** a diagnostic says, respectively, that the radius or the height must be greater than 0

## MODIFIED Requirements

### Requirement: Sphere primitive
Source: DESIGN §8 Primitives, §5 (primitive table and dimension rule).

`sphere(radius)` SHALL denote the solid of all points within distance
`radius` of its local origin. Enclosing transforms place that origin in the
world; at the top level it is the world origin. `radius` SHALL be a number
strictly greater than `0`. A non-positive radius, or a vector radius, SHALL be
an error at the argument.

#### Scenario: Sphere is centered at the origin
- **WHEN** a scene contains only `sphere(5);` and a ray travels along the X axis from x = -100 toward +X
- **THEN** it enters the solid at x = -5 and exits at x = 5

#### Scenario: Non-positive radius is an error
- **WHEN** the source contains `sphere(0);` or `sphere(-2);`
- **THEN** a diagnostic says the radius must be greater than 0

#### Scenario: Radius must be a number
- **WHEN** the source contains `sphere([1, 2, 3]);`
- **THEN** a diagnostic says the radius must be a number
