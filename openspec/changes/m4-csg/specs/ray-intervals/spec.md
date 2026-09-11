## ADDED Requirements

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

## MODIFIED Requirements

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
