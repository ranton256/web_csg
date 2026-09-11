# implicit-union Specification

## Purpose

Makes solids that appear side by side form their union without a `group`
keyword, both at the top level (M1) and in transform bodies (M3).

## Requirements

### Requirement: Top-level solids are unioned
Source: DESIGN §8 Implicit union (grouping), Ray–solid intervals and
tolerance (union merge rule).

When the top level contains several solids, the model SHALL be their union.
Along each ray, their intervals SHALL be merged: intervals that overlap, or
whose gap is ≤ `ε`, become one interval. The merged interval keeps the
boundary normals of the endpoints it retains.

#### Scenario: Overlapping spheres form one interval
- **WHEN** the top level contains `sphere(5);` and `sphere(10);`, and a ray travels along the X axis from x = -100 toward +X
- **THEN** the ray has exactly one interval, `[90, 110]`

#### Scenario: Order of top-level solids does not matter
- **WHEN** the default example's sphere is preceded by `sphere(5);`, which lies entirely inside it
- **THEN** the rendered image is byte-identical to the example without `sphere(5);`

#### Scenario: Camera inside nested spheres sees the outer exit
- **WHEN** the camera is at the origin inside both `sphere(5)` and `sphere(10)`, looking at `[1, 0, 0]`
- **THEN** the center pixel's visible hit is at t = 10, the radius-10 sphere's exit

### Requirement: Solids in a transform body are unioned
Source: DESIGN §8 Implicit union (grouping).

When a transform body contains several solids, the transform SHALL apply to
their union. Their intervals are merged by the same rule as at the top level.

#### Scenario: Several children of a transform block are unioned
- **WHEN** the scene is `translate([0, 0, 0]) { sphere(5); cube(8); }`
- **THEN** the model is the union of the sphere and the cube: a ray along the X axis from x = -100 has exactly one interval, `[95, 105]`

#### Scenario: The transform applies to the whole union
- **WHEN** the scene is `translate([20, 0, 0]) { sphere(5); translate([5, 0, 0]) { sphere(5); } }`
- **THEN** a ray along the X axis from x = -100 has exactly one interval, `[115, 130]`
