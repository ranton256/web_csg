## ADDED Requirements

### Requirement: Boolean tolerance rules
Source: DESIGN §8 Ray–solid intervals and tolerance, §5 (`ε`).

After every Boolean operation:
- intervals of length ≤ `ε` SHALL be dropped, so tangent grazes and slivers
  count as misses;
- in a union, intervals whose gap is ≤ `ε` SHALL be merged, so flush faces
  leave no seam;
- in a difference, a cutter boundary within `ε` of a base boundary SHALL
  remove that base boundary, so a flush cut opens the face.

#### Scenario: Flush union faces leave no seam
- **WHEN** the scene is `union { box([10, 10, 10]); translate([10, 0, 0]) { box([10, 10, 10]); } }` and a ray travels along +X from x = -100
- **THEN** the ray has exactly one interval, `[95, 115]`: the entry of the first box to the exit of the second

#### Scenario: Flush difference opens the face
- **WHEN** the scene is `difference { cube(10); cylinder(radius: 2, height: 10); }` and a ray travels along −Z from `[0, 0, 100]`, through the cylinder's center
- **THEN** the ray passes through with no hit from this solid

#### Scenario: A near-flush difference leaves no sliver
- **WHEN** the scene is `difference { cube(10); translate([0, 0, 0.0000005]) { cube(10); } }` and a ray travels along −Z from `[0, 0, 100]`
- **THEN** the ray has no interval, because the remainder at the bottom face is 5·10⁻⁷ long (≤ `ε`)

### Requirement: Scaled scenes render identically
Source: DESIGN §8 Ray–solid intervals and tolerance ("Scaled scenes render identically"), §5 (`ε`, supported scene scale), §12 D7 and D16.

Scaling every coordinate and dimension of a scene by the same factor,
including the camera position and `lookAt`, SHALL NOT change the rendered
image by more than 1 per channel, for any scene within the supported scene
scale (DESIGN §5). Outside that scale, rendering is best effort (D16).
Values that are not finite are errors.

#### Scenario: Scaled scenes render identically
- **WHEN** the bored-cube example is rendered at 64 × 48, and again with every coordinate and dimension (including the camera position) scaled by 1e-3, and separately by 1e5
- **THEN** each scaled render matches the unscaled render within 1 per channel

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
