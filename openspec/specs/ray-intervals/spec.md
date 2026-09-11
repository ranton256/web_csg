# ray-intervals Specification

## Purpose

Defines how camera rays meet solids: rays measured in world distance, closed
hit intervals carrying surface normals, the tolerance rules that make
tangencies and slivers behave deliberately, and which boundary is visible.

## Requirements

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
for any placement built from `translate`, `scale`, and rotations by multiples
of 90°. Under other rotations, a ray lying exactly in a face is a boundary
case decided by rounding, like a ray through an exact edge (DESIGN D20).

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

#### Scenario: In-face rays of a right-angle rotated solid are hits
- **WHEN** a ray travels along +Y from `[0.4, -100, 0]`, in a face plane of `translate([0.3, 0, 0]) { rotate([0, 0, 90]) { box([2, 0.2, 2]); } }`
- **THEN** its interval is `[99, 101]`

#### Scenario: Under other rotations, rays clearly inside or outside a face behave normally
- **WHEN** a ray runs parallel to the local x = 1 face of `rotate([0, 0, 45]) { box([2, 2, 2]); }`, 10⁻⁵ inside it, or 10⁻⁵ outside it
- **THEN** the ray inside is a hit, and the ray outside has no interval

#### Scenario: A ray beyond ε of a face misses, at any scale
- **WHEN** a ray travels along +X at y = 1000 + 2·10⁻⁶ past `scale(1000) { box([2, 2, 2]); }`, or at y = 0.4 + 10⁻⁵ past the translated box above
- **THEN** it has no interval, while a ray at y = 1000 + 5·10⁻⁷ past the scaled box is a hit

### Requirement: Visible hit and two-sided normals
Source: DESIGN §8 Ray–solid intervals and tolerance, §8 Boolean operations.

The visible hit SHALL be the first interval endpoint with `t > ε`. When the
camera is inside a solid, this is an exit boundary. The shading normal SHALL
be flipped to face the viewer whenever `N·V < 0`, where `V` is the unit vector
toward the viewer. The flip SHALL apply after any cutter-normal reversal from
a difference.

#### Scenario: Camera inside a solid sees the exit boundary
- **WHEN** the camera is at the origin inside `sphere(50)`, looking at `[1, 0, 0]`
- **THEN** every pixel shows the inside of the sphere, and every shading normal faces the camera

#### Scenario: A bore wall seen from inside the bore
- **WHEN** the camera is at the origin, inside the bore of `difference { cube(20); cylinder(3, 22); }`, looking at `[1, 0, 0]`
- **THEN** the center pixel's visible hit is at t = 3, on the bore wall, and its shading normal is `[-1, 0, 0]`: the cylinder's outward normal reversed, which already faces the camera

### Requirement: Boolean tolerance rules
Source: DESIGN §8 Ray–solid intervals and tolerance, §5 (`ε`), §12 D21.

After every Boolean operation:
- intervals of length ≤ `ε` SHALL be dropped, so tangent grazes and slivers
  count as misses;
- in a union, intervals whose gap is ≤ `ε` SHALL be merged, so flush faces
  leave no seam;
- in a difference, a cutter boundary within `ε` of a base boundary SHALL
  remove that base boundary, so a flush cut opens the face. This applies
  where the cutter overlaps the base. A cutter that only touches the base,
  or stops short of it by a gap ≤ `ε`, SHALL leave the base boundary
  (DESIGN D21).

#### Scenario: Flush union faces leave no seam
- **WHEN** the scene is `union { box([10, 10, 10]); translate([10, 0, 0]) { box([10, 10, 10]); } }` and a ray travels along +X from x = -100
- **THEN** the ray has exactly one interval, `[95, 115]`: the entry of the first box to the exit of the second

#### Scenario: Flush difference opens the face
- **WHEN** the scene is `difference { cube(10); cylinder(radius: 2, height: 10); }` and a ray travels along −Z from `[0, 0, 100]`, through the cylinder's center
- **THEN** the ray passes through with no hit from this solid

#### Scenario: A near-flush difference leaves no sliver
- **WHEN** the scene is `difference { cube(10); translate([0, 0, 0.0000005]) { cube(10); } }` and a ray travels along −Z from `[0, 0, 100]`
- **THEN** the ray has no interval, because the remainder at the bottom face is 5·10⁻⁷ long (≤ `ε`)

#### Scenario: A cutter that stops just short leaves the face
- **WHEN** the scene is `difference { cube(10); translate([0, 0, 10.0000005]) { cube(10); } }` and a ray travels along −Z from `[0, 0, 100]`
- **THEN** the ray has exactly one interval, `[95, 105]`, entering through the base cube's own top face

#### Scenario: A cutter that only touches the base leaves the face
- **WHEN** the scene is `difference { cube(10); translate([0, 0, 10]) { cube(10); } }` and a ray travels along −Z from `[0, 0, 100]`
- **THEN** the ray has exactly one interval, `[95, 105]`, entering through the base cube's own top face

### Requirement: Scaled scenes render identically
Source: DESIGN §8 Ray–solid intervals and tolerance ("Scaled scenes render identically"), §5 (`ε`, supported scene scale), §12 D7 and D16.

The bored-cube example rendered at 64 × 48 SHALL match, within 1 per
channel, its renders with every coordinate and dimension (including the
camera position) scaled by 1e-3 and by 1e5. This is the measurement that
finalizes `ε` and the supported scene scale (DESIGN §5, D7).

There is no broader scale-invariance guarantee. `ε` is absolute, so a pixel
whose ray crosses a solid over a length near `ε` at either scale can change
when a scene is scaled. That happens at a silhouette edge, or through a
feature thinner than the supported scale. Outside the supported scale,
rendering is best effort (D16). Values that are not finite are errors.

#### Scenario: Scaled scenes render identically
- **WHEN** the bored-cube example is rendered at 64 × 48, and again with every coordinate and dimension (including the camera position) scaled by 1e-3, and separately by 1e5
- **THEN** each scaled render matches the unscaled render within 1 per channel

#### Scenario: A thin feature can change with scale
- **WHEN** the scene is `difference { cube(2 * k); translate([0, 0, 1.0000005 * k]) { box([4, 4, 4] * k); } }`, which leaves a floor plate 5·10⁻⁷·k thick, and a ray travels down the Z axis through it
- **THEN** at k = 1 the plate is dropped as a sliver (no interval), and at k = 100000 it is kept (one interval), because at k = 1 the plate is thinner than `ε`
