## ADDED Requirements

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
