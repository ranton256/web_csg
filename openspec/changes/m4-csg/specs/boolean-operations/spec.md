## Purpose

Defines the Boolean blocks (`union`, `intersection`, and `difference`): how
each combines its children's intervals along a ray, and how the surfaces it
exposes are oriented for shading.

## ADDED Requirements

### Requirement: Boolean blocks are solids
Source: DESIGN §8 Modeling language (Booleans, bodies), §8 Boolean operations.

`union { … }`, `intersection { … }`, and `difference { … }` SHALL evaluate
and render. Each child is one solid: a primitive, a transform block (the
union of its body), or a nested Boolean block. `let` statements in a body are
scoped to that body. A Boolean block is itself one solid. It MAY appear at
the top level, in a transform body, or in another Boolean body, and
enclosing transforms place it as a whole.

#### Scenario: A union block renders its children as one solid
- **WHEN** the scene is `union { sphere(5); translate([8, 0, 0]) { sphere(5); } }` and a ray travels along +X from x = -100
- **THEN** the ray has exactly one interval, `[95, 113]`

#### Scenario: A transform places a Boolean block as a whole
- **WHEN** the scene is `translate([20, 0, 0]) { intersection { sphere(5); cube(8); } }` and a ray travels along +X from x = -100
- **THEN** the ray has exactly one interval, `[116, 124]`

#### Scenario: A multi-child transform body is one child
- **WHEN** the scene is `difference { translate([0, 0, 0]) { cube(10); sphere(8); } cube(4); }` and a ray travels along +X from x = -100
- **THEN** the ray's intervals are `[92, 98]` and `[102, 108]`: the union of the transform body minus the small cube

### Requirement: Interval combination
Source: DESIGN §8 Boolean operations ("Interval combination along a ray").

Along each ray:
- a union SHALL cover every `t` covered by any child;
- an intersection SHALL cover every `t` covered by all children;
- a difference SHALL cover every `t` covered by its first child and by none
  of the others.

The tolerance rules of the `ray-intervals` capability apply after each
operation.

#### Scenario: Interval combination along a ray
- **WHEN** a ray is inside a box on `[2, 8]` and inside a cylinder on `[4, 6]`
- **THEN** their union covers `[2, 8]`, their intersection covers `[4, 6]`, and box minus cylinder covers `[2, 4]` and `[6, 8]`

#### Scenario: Disjoint children have an empty intersection
- **WHEN** the scene is `intersection { sphere(1); translate([10, 0, 0]) { sphere(1); } }` and a ray travels along +X from x = -100
- **THEN** the ray has no interval

#### Scenario: An intersection keeps what all children share
- **WHEN** the scene is `intersection { sphere(5); cube(8); }` and a ray travels along +X from x = -100
- **THEN** the ray has exactly one interval, `[96, 104]`

#### Scenario: An intersection of three children
- **WHEN** the scene is `intersection { cube(10); sphere(8); translate([3, 0, 0]) { cube(10); } }` and a ray travels along +X from x = -100
- **THEN** the ray has exactly one interval, `[98, 105]`, which all three children share

### Requirement: Difference subtracts the union of the later children
Source: DESIGN §8 Boolean operations ("Multi-child difference", "Self-difference is empty").

A `difference` block SHALL be its first child minus the union of all its
other children. A difference with a single child SHALL be that child.

#### Scenario: Multi-child difference
- **WHEN** the scene is `difference { cube(20); translate([-5, 0, 0]) { cube(4); } translate([5, 0, 0]) { cube(4); } }` and a ray travels along +X from x = -100
- **THEN** the ray's intervals are `[90, 93]`, `[97, 103]`, and `[107, 110]`

#### Scenario: Self-difference is empty
- **WHEN** the scene is `difference { sphere(5); sphere(5); }` or `difference { cube(10); cube(10); }` and a ray crosses where the solid would be
- **THEN** the ray hits nothing from that difference, and its pixel shows the background

#### Scenario: A single-child difference is the child
- **WHEN** the scene is `difference { sphere(5); }` and a ray travels along +X from x = -100
- **THEN** the ray has exactly one interval, `[95, 105]`

### Requirement: Cutter normals are reversed
Source: DESIGN §8 Boolean operations ("Difference boundaries shade with reversed cutter normals").

Where a difference's result is bounded by the surface of a later child (a
cutter), that endpoint's normal SHALL be the cutter's outward normal
reversed, so it points into the cut. Its originating primitive SHALL still
be the cutter's primitive. Endpoints bounded by the first child keep that
child's outward normals.

#### Scenario: Difference boundaries shade with reversed cutter normals
- **WHEN** the scene is `difference { cube(20); rotate([0, 90, 0]) { cylinder(3, 22); } }` and a ray travels along −Z from `[0, 0, 100]`, crossing the bore
- **THEN** the ray's intervals are `[90, 97]` and `[103, 110]`
- **AND** the endpoint at t = 97 has normal `[0, 0, -1]`, and the endpoint at t = 103 has normal `[0, 0, 1]`: the cylinder's outward normals reversed, pointing into the bore
