# Web CSG — Project Design Document and Feature Specification

> **Status: Agreed** in the planning interview (readback confirmed
> 2026-09-10), derived from [`vision.md`](vision.md). Implementation progress
> is tracked in [ROADMAP.md](ROADMAP.md). `ε` and the supported scene scale in
> §5 were finalized in M4 (D7).
> Record new spec gaps in [§12](#12-open-decisions).

## How to read this document

This document is a product overview followed by asset requirements, hard
technical constraints, exact configuration values, and functional requirements as
BDD (behavior-driven development) scenarios in Gherkin format. The Gherkin
features are the required functionality. The final "Optional features" section is
parked: **do not implement anything in it unless it is specifically
requested.** Where this spec deliberately differs from a reference
implementation, the "Reference notes" section says so — match this spec, not
the reference.

This document governs *what* the project does. Delivery order lives in
[ROADMAP.md](ROADMAP.md); stack, architecture, process, definition of done, and
review live in [CONSTRAINTS.md](CONSTRAINTS.md).

## 1. High level

Web CSG is a small constructive solid geometry (CSG) modeler that runs in the
browser. The user describes a scene — primitives, transforms, Boolean
operations, and a camera — in a small modeling language, and the app renders it
by analytic ray tracing.

- **Platform:** Current stable desktop Chrome, Firefox, and Safari. Mobile
  layouts and touch input are out of scope (D11).
- **Stack:** Pure JavaScript CPU ray tracer drawing to an HTML 2D `<canvas>`;
  no ThreeJS, WebGL, or rendering framework; plain JavaScript ES modules with
  no build step. See [CONSTRAINTS §1](CONSTRAINTS.md#1-platform-and-toolchain).
- **Scope:** A source editor, a parser/evaluator for the modeling language, a
  CSG tree, and a ray-traced preview. The camera is set only by the source
  `camera` block — the UI has no interactive camera controls (D5). Interactive
  viewport controls, extra primitives, and GPU acceleration are parked (see
  [Optional features](#optional-features-parked)).

## 2. Product objectives

Web CSG is a **course exemplar** (agreed in interview): a worked example of
spec-driven development that students read, rebuild, and extend.

- **Rebuildable from the spec:** an implementer (human or AI agent) who has not
  seen reference code can build the project from this document and verify it
  against the §8 scenarios.
- **Readable implementation:** the ray–solid and CSG math is visible in plain
  code a student can follow (source: `vision.md` "keep the math and code
  simple").
- **Extensible:** each parked optional feature can be specified and delivered
  as a separate change without restructuring the core.

## 3. Design principles

- **Simplicity over speed:** when clarity of the math/code conflicts with
  rendering performance, clarity wins. *(Source: `vision.md` §Overview.)*
- **The language mirrors the scene tree:** nesting in source is nesting in the
  CSG hierarchy; the language stays concise. *(Source: `vision.md` §Modeling Language.)*
- **Declarative and safe:** no loops, user-defined functions, imports, or
  arbitrary JavaScript execution. *(Source: `vision.md` §Modeling Language.)*
- **Never lose the picture:** an invalid edit never blanks the preview; the last
  valid model stays visible and is clearly marked stale. *(Source: `vision.md`.)*

## 4. Visual design and assets

- Layout: a source editor (with a line-number gutter) plus a resizable
  preview panel. The preview fills the rest of the window, and a draggable
  divider sets the split between editor and preview (agreed 2026-09-10).
- Perspective camera; surfaces shaded with a Blinn-Phong model from
  directional white lights declared in the source (or a default camera key
  light); one model color set by an optional `material` block; solid dark
  neutral background; no shadows (D8). Constants in §5.
- A visible indicator when the preview shows the last valid model rather than
  the current source.

### Asset inventory

| Asset | Dimensions | Format | Status | Role |
| ----- | ---------- | ------ | ------ | ---- |
| Example: bored cube | N/A | Modeling-language source | CREATE | The `vision.md` example: a cube minus three orthogonal cylinders (D6) |
| Example: primitives | N/A | Modeling-language source | CREATE | Shows `sphere`, `cube`, `box`, and `cylinder` side by side (D6) |
| Example: Boolean operations | N/A | Modeling-language source | CREATE | Shows `union`, `intersection`, and `difference` of the same two solids (D6) |

No image, font, or audio assets are currently required.

## 5. Constants and configuration

Units and conventions: Z is up. All primitives are centered at their local
origin. Cube/box dimensions are full sizes; sphere and cylinder use radius;
cylinder axis is local Z and its height is the full height.

Primitives (D3, agreed 2026-09-10; parameter order as listed, argument syntax
in [§8 Modeling language](#feature-modeling-language)):

| Primitive | Parameters | Local extent |
| --------- | ---------- | ------------ |
| `sphere` | `radius` (number) | all points with distance ≤ `radius` from origin |
| `cube` | `size` (number, edge length) | `[-size/2, size/2]` on each axis |
| `box` | `size` (vector `[x, y, z]`) | `[-x/2, x/2] × [-y/2, y/2] × [-z/2, z/2]` |
| `cylinder` | `radius` (number), `height` (number) | capped; `x² + y² ≤ radius²`, `z ∈ [-height/2, height/2]` |

Every dimension (radius, size, each `box` component, height) SHALL be
strictly greater than 0.

| Constant / setting | Value | Notes |
| ------------------ | ----- | ----- |
| Camera `up` default | `[0, 0, 1]` | Must be nonzero and not parallel to the viewing direction |
| Camera `fov` default | `45` degrees | Vertical field of view |
| Camera `fov` valid range | `0 < fov < 180` degrees | Both bounds exclusive |
| Scale factor | `> 0`, uniform | Non-uniform scaling is parked |
| Rotation units | degrees | Applies to `rotate` and camera `fov` |
| Rotation order | `rotate([rx, ry, rz])` = about X by `rx`, then Y by `ry`, then Z by `rz`, about fixed parent axes; matrix `R = Rz·Ry·Rx` | Right-handed: positive angle is counter-clockwise looking down the axis toward the origin. Matches OpenSCAD (D4). |
| Transform nesting | Inner blocks apply first; composition proceeds outward | Source: `vision.md` |
| Max `light` blocks | 4 | 0–4 allowed, top level only (D8) |
| Light `intensity` default | `1` | Must be ≥ 0 |
| Default key light | direction toward light = `normalize(1·up − 0.5·right + 1·back)`, intensity `1` | Used only when no `light` block exists. `back` = unit vector from `lookAt` toward `position`; `right` = `normalize(forward × up)`; `up` here is the camera up re-orthogonalized against `forward` (D8) |
| Default model color | `[0.8, 0.8, 0.8]` | `material` color components each in `[0, 1]` |
| Ambient coefficient | `0.15` | Multiplies model color; independent of lights |
| Diffuse coefficient `kd` | `0.75` | |
| Specular coefficient `ks` | `0.3` | White highlight |
| Shininess exponent | `32` | Blinn-Phong half-vector exponent |
| Background color | `[0.12, 0.12, 0.14]` | Pixels whose ray hits no solid |
| Output encoding | Channel = `round(255 · clamp(c, 0, 1))`; no gamma step | Opaque alpha (255) |
| Render resolution | 1 ray per CSS pixel, through the pixel center; `devicePixelRatio` ignored; no anti-aliasing | (D10) |
| Rebuild debounce | `300` ms after the last edit | (D10) |
| Resize debounce | `150` ms after the last resize | (D10) |
| Render time slice | A slice starts no new row once `12` ms have elapsed, then yields to the browser; it therefore runs at most one row past 12 ms | (D18, wording amended after Critic review) |
| Divider | The editor starts `420` px wide; the editor and preview are each at least `240` px wide; the arrow keys move the focused divider `16` px | (D18) |
| Numeric type | IEEE-754 double (JS `number`) throughout | (D7) |
| Tolerance `ε` | `1e-6` world units | **Final** (M4): the scaled-render check passed at ×1e-3 and ×1e5 (D7) |
| Camera point equality | `position` and `lookAt` are equal when their distance is ≤ `ε` | (D14) |
| Camera up parallel tolerance | `up` is parallel to the view direction when `‖f̂ × û‖ ≤ 1e-6` (f̂, û unit vectors) | Dimensionless, independent of scene scale (D14) |
| Maximum nesting depth | `100` levels (each unary minus, vector bracket, parenthesis, and transform or Boolean body is a level) | Deeper input is a syntax error at the token that exceeds it (D15; parentheses and bodies added by D18) |
| Supported scene scale | Nonzero coordinates, dimensions, and distances from the camera to the model with magnitude in `[1e-3, 3e7]` world units; zero components are exact and always supported | **Final** (M4). This is the range the scaled-render check exercises: its smallest feature is the 0.001 overhang at ×1e-3 (the smallest listed magnitude it exercises is the 0.012 bore radius), and its largest the 2.75e7 distance from the camera to the farthest model point at ×1e5 (D7). It is where results were measured, not a scale-invariance promise: `ε` is absolute, so near-`ε` crossings (silhouette edges, thin features) can change with scale. Outside it, rendering is best effort (D16) |
| Right-angle rotations | Angles that are exact multiples of 90° use exact sin/cos values (`0`, `±1`) | Keeps flush cuts exact (D7) |

## 6. Technical constraints

Authoritative technical constraints live in [CONSTRAINTS.md](CONSTRAINTS.md).
Summary of agreed items:

1. **Rendering:** every pixel is traced on the CPU in plain JavaScript and
   written to a 2D `<canvas>`. ThreeJS, WebGL, and GPU shaders SHALL NOT be used
   (D1, resolved).
2. **Language/tooling:** plain JavaScript ES modules with no build step; unit
   tests on Node's built-in `node:test`; no runtime dependencies (D2, resolved).
3. **DOM-free core:** parsing, evaluation, CSG, and ray tracing run under Node
   without browser APIs; the browser UI is a thin shell over them (D2, resolved).

## 7. Diagnostics and test tooling

The project SHALL include:

- **Scripted test support** — the project must be drivable programmatically with
  controlled inputs so scripted runs are reproducible (D12):
  - The DOM-free core exposes a function that takes source text and a pixel
    width and height, and returns the diagnostics plus an RGBA pixel buffer.
    Node tests call it directly.
  - Golden-image tests render fixed scenes at small sizes (e.g. 64×48) and
    compare them to committed PPM files; every channel must be within 1 of
    the golden value.
  - Browser tests drive the real app with Playwright (Chromium, Firefox,
    WebKit): typing source, waiting for the debounce, reading diagnostics and
    the stale indicator, and saving/opening files.
  - `npm run capture` produces screenshots of the app showing each built-in
    example, used as milestone evidence.

```gherkin
Scenario: Core render is callable without a browser
  Given the bored-cube source and a size of 64 × 48
  When the core render function is called from a Node test
  Then it returns no diagnostics and a 64 × 48 RGBA buffer
  And the buffer matches test/golden's bored-cube image within 1 per channel

Scenario: Invalid source returns diagnostics and no image
  Given a source with a syntax error on line 2, column 5
  When the core render function is called
  Then it returns one diagnostic at line 2, column 5
  And no pixel buffer
```

## 8. Feature specification — BDD

> Scenarios come from `vision.md` and resolved interview decisions (cited by
> D-number). [ROADMAP.md](ROADMAP.md) assigns each feature to a milestone.

### Feature: Modeling language

Agreed in D9 (2026-09-10). Rules:

- **Comments:** `// to end of line` and `/* block */` (block comments do not nest).
- **Statements** end with `;`, except block statements, which end with `}`.
- **Reserved words:** `let`, `camera`, `light`, `material`, `sphere`, `cube`,
  `box`, `cylinder`, `translate`, `rotate`, `scale`, `union`, `intersection`,
  `difference`.
- **Numbers:** decimal literals with an optional fraction (`12`, `1.5`, `0.5`);
  no exponent form. Negative values use unary minus.
- **Vectors:** `[a, b, c]` with exactly three numeric expressions.
- **Arithmetic:** `+ - * /`, unary `-`, and parentheses, with the usual
  precedence (unary minus > `* /` > `+ -`; left-associative). Allowed:
  number∘number; vector ± vector; vector × number; number × vector;
  vector ÷ number. Any other combination (e.g. vector × vector,
  number + vector) is an error. Division by zero is an error.
- **`let`:** `let name = expr;` binds an immutable number or vector. A name is
  visible from after its declaration to the end of the enclosing block (the
  whole remaining file at top level). Declaring a name that is already
  visible is an error (no shadowing). Using an undeclared name is an error.
- **Primitive calls:** arguments may be positional (in the §5 parameter order)
  or named (`name: expr`); positional arguments come before named ones; each
  parameter is given exactly once; all are required; unknown names are errors.
- **Transforms:** `translate(vector) { … }`, `rotate(vector) { … }`,
  `scale(number) { … }`. The braced body is required; transforms are not
  chained (nest blocks instead). Each transform takes exactly one positional
  argument; a named argument or a different argument count is an error (D19).
- **Booleans:** `union { … }`, `intersection { … }`, `difference { … }`.
- **Bodies:** every Boolean or transform body contains at least one solid;
  an empty body is an error. Bodies may also contain `let` statements.
- **Camera:** `camera { position: e; lookAt: e; up: e; fov: e; }` — top level
  only, exactly one (see Camera definition below).
- **Light:** `light { direction: e; intensity: e; }` — top level only, 0 to 4
  blocks; see Lighting and shading below (D8).
- **Material:** `material { color: e; }` — top level only, at most one (D8).
- **Property blocks** (`camera`, `light`, `material`) use `name: expr;`
  entries; each property at most once; unknown properties are errors.
- **Empty scene:** a source with a valid camera and no solids is valid and
  renders only the background.
- **Diagnostics:** each has a 1-based line, 1-based column (of the start of the
  offending token), and a message. Parsing stops at the first syntax error;
  when parsing succeeds, the evaluator reports every semantic error it finds.

```gherkin
Scenario: The vision example is valid
  Given the bored-cube source from vision.md
  When it is evaluated
  Then there are no diagnostics
  And the model is a cube of size 60 minus the union of three cylinders of radius 12 and height 62

Scenario: Positional and named arguments are equivalent
  Given one source containing cylinder(12, 62)
  And another containing cylinder(height: 62, radius: 12)
  When both are evaluated
  Then they produce the same model

Scenario: Positional argument after a named one is an error
  Given the statement "cylinder(radius: 12, 62);"
  When the source is parsed or evaluated
  Then a diagnostic reports the positional argument at its line and column

Scenario: Missing, duplicate, and unknown arguments are errors
  Given "cylinder(12);" or "cylinder(12, radius: 5);" or "sphere(r: 5);"
  When the source is evaluated
  Then a diagnostic identifies the missing, duplicated, or unknown parameter

Scenario: Non-positive dimension is an error
  Given "sphere(0);" or "box([10, -1, 10]);"
  When the source is evaluated
  Then a diagnostic reports that the dimension must be greater than 0

Scenario: let is visible only after its declaration
  Given "sphere(r); let r = 5;" at top level
  When the source is evaluated
  Then a diagnostic reports that r is undeclared at its use

Scenario: let is scoped to its block
  Given "union { let r = 5; sphere(r); } sphere(r);"
  When the source is evaluated
  Then a diagnostic reports that r is undeclared at the second use

Scenario: Shadowing is an error
  Given "let r = 5; union { let r = 6; sphere(r); }"
  When the source is evaluated
  Then a diagnostic reports that r is already declared

Scenario: Vector arithmetic
  Given "let v = [1, 2, 3] * 2 + [1, 1, 1];"
  When the source is evaluated
  Then v is [3, 5, 7]

Scenario: Invalid vector arithmetic is an error
  Given "let v = [1, 2, 3] * [1, 2, 3];" or "let w = 1 + [1, 2, 3];"
  When the source is evaluated
  Then a diagnostic reports the invalid operand types at the operator

Scenario: Division by zero is an error
  Given "let a = 1 / (2 - 2);"
  When the source is evaluated
  Then a diagnostic reports division by zero

Scenario: Empty body is an error
  Given "union { }" or "translate([1, 0, 0]) { let a = 1; }"
  When the source is evaluated
  Then a diagnostic reports that the block contains no solids

Scenario: Camera-only source renders the background
  Given a source containing only a valid camera block
  When it is rendered
  Then there are no diagnostics
  And every pixel is the background color

Scenario: Parsing stops at the first syntax error
  Given a source with syntax errors on lines 3 and 7
  When the source is parsed
  Then exactly one diagnostic is reported, on line 3

Scenario: All semantic errors are reported
  Given a syntactically valid source using undeclared names on lines 4 and 9
  When the source is evaluated
  Then diagnostics are reported for both line 4 and line 9

Scenario: Comments are ignored
  Given a valid source with "// note" and "/* multi
  line */" comments added between statements
  When it is evaluated
  Then it produces the same model as without the comments
```

### Feature: Camera definition

```gherkin
Scenario: Camera defaults are applied
  Given a source with a top-level camera block giving only position and lookAt
  When the source is evaluated
  Then the camera up vector is [0, 0, 1]
  And the camera fov is 45 degrees

Scenario: Missing camera block is an error
  Given a source with no top-level camera block
  When the source is evaluated
  Then a diagnostic reports that exactly one camera block is required

Scenario: More than one camera block is an error
  Given a source with two top-level camera blocks
  When the source is evaluated
  Then a diagnostic reports that exactly one camera block is required

Scenario: position and lookAt are required
  Given a camera block missing position or lookAt
  When the source is evaluated
  Then a diagnostic names the missing property

Scenario: position equal to lookAt is an error
  Given a camera block with position [1, 2, 3] and lookAt [1, 2, 3]
  When the source is evaluated
  Then a diagnostic reports that position and lookAt must differ

Scenario: up parallel to the view direction is an error
  Given a camera with position [0, 0, 10], lookAt [0, 0, 0], and up [0, 0, 1]
  When the source is evaluated
  Then a diagnostic reports that up must not be parallel to the viewing direction

Scenario: fov outside (0, 180) is an error
  Given a camera with fov 0, or fov 180
  When the source is evaluated
  Then a diagnostic reports that fov must be strictly between 0 and 180 degrees

Scenario: Camera expressions may use earlier numeric bindings
  Given "let d = 100;" declared before the camera block
  And the camera position is [d, -d, d]
  When the source is evaluated
  Then the camera position is [100, -100, 100]

Scenario: The rendered view depends only on the source and canvas size
  Given the same source text and the same canvas size
  When it is rendered twice, including after reloading the app
  Then the two images are identical
  And no UI control other than editing the source changes the camera

Scenario: Resizing preserves vertical field of view
  Given a rendered scene with fov 45
  When the preview panel is resized to a different aspect ratio
  Then the vertical field of view remains 45 degrees
  And the horizontal extent follows the new aspect ratio
```

### Feature: Lighting and shading

Agreed in D8 (2026-09-10). Constants in §5. For a hit with unit surface normal
`N` (after any difference-boundary reversal), unit vector toward the viewer
`V`, model color `C`, and lights `i` with unit vector toward the light `Lᵢ`
(the negated, normalized `direction`) and intensity `Iᵢ`:

`c = 0.15·C + Σᵢ Iᵢ · (0.75 · max(0, N·Lᵢ) · C + sᵢ)`, where
`sᵢ = 0.3 · max(0, N·Hᵢ)^32` if `N·Lᵢ > 0` and `sᵢ = 0` otherwise, and
`Hᵢ = normalize(Lᵢ + V)`; each channel of `c` is then clamped to `[0, 1]`.
(The specular gate was added at readback confirmation, 2026-09-10, so unlit
sides get no highlight.)

```gherkin
Scenario: Default key light when no light is declared
  Given a source with no light block
  When it is rendered
  Then shading uses exactly one light: the camera-relative default key light at intensity 1

Scenario: Declared lights replace the default
  Given a source with one light block
  When it is rendered
  Then the default key light is not used

Scenario: Light direction is the direction light travels
  Given a single light with direction [0, 0, -1] and a sphere at the origin
  When the camera looks at the sphere from the side
  Then the top of the sphere is lit and the bottom receives only ambient light

Scenario: Intensity scales the direct contribution
  Given a light with intensity 0
  When the scene is rendered
  Then every solid pixel equals 0.15 × the model color

Scenario: Light validation
  Given a light with direction [0, 0, 0], or a negative intensity, or five light blocks, or a light inside a union block
  When the source is evaluated
  Then a diagnostic reports the violated rule

Scenario: Material color
  Given "material { color: [1, 0, 0]; }"
  When the scene is rendered
  Then solid pixels have zero green and blue diffuse contribution
  And specular highlights are white

Scenario: Material validation
  Given two material blocks, or a color component outside [0, 1]
  When the source is evaluated
  Then a diagnostic reports the violated rule

Scenario: Missing rays show the background
  When a ray hits no solid
  Then its pixel is [0.12, 0.12, 0.14] encoded as round(255 × value) per channel
```

### Feature: Primitives

```gherkin
Scenario: Cube is a box with equal sides
  Given a scene containing cube(10)
  And an otherwise identical scene containing box([10, 10, 10])
  When both are rendered with the same camera
  Then the images are identical

Scenario: Primitives are centered at the origin
  Given a scene containing only box([4, 6, 8])
  When a ray travels along the X axis from x = -100 toward +X
  Then it enters the solid at x = -2 and exits at x = 2

Scenario: Cylinder is capped and aligned to local Z
  Given a scene containing only cylinder with radius 5 and height 10
  When a ray travels down the Z axis from z = 100 toward -Z
  Then it hits the top cap at z = 5 with normal [0, 0, 1]
  And it exits through the bottom cap at z = -5
```

### Feature: Transforms

Rotation convention agreed in D4 (2026-09-10); see §5.

```gherkin
Scenario: Rotation about X turns +Z toward -Y
  Given rotate([90, 0, 0]) applied to the local direction [0, 0, 1]
  Then the parent-frame direction is [0, -1, 0]

Scenario: Rotation about Y turns +Z toward +X
  Given rotate([0, 90, 0]) applied to the local direction [0, 0, 1]
  Then the parent-frame direction is [1, 0, 0]

Scenario: Rotation components apply X first, then Y, then Z
  Given rotate([90, 90, 0]) applied to the local direction [0, 1, 0]
  Then the parent-frame direction is [1, 0, 0]

Scenario: Nested transforms compose from the inside outward
  Given translate([10, 0, 0]) containing rotate([0, 0, 90]) containing box([4, 2, 2])
  When it is evaluated
  Then the solid occupies x in [9, 11], y in [-2, 2], z in [-1, 1]

Scenario: Uniform scale multiplies all extents
  Given scale(2) containing sphere with radius 3
  When a ray travels along the X axis toward the origin
  Then it enters the solid at x = -6

Scenario: Non-positive scale is an error
  Given scale(0) or scale(-1) containing any solid
  When the source is evaluated
  Then a diagnostic reports that the scale factor must be greater than 0
```

### Feature: Implicit union (grouping)

There is no `group` keyword. Where several solids appear together, they are
unioned (D3, agreed 2026-09-10).

```gherkin
Scenario: Several top-level solids are unioned
  Given a source whose top level contains a sphere and a cube
  When it is evaluated
  Then the model is the union of the sphere and the cube

Scenario: Several children of a transform block are unioned
  Given a transform block containing a sphere and a cube
  When it is evaluated
  Then the transform applies to the union of the sphere and the cube
```

### Feature: Ray–solid intervals and tolerance

Agreed in D7 (2026-09-10). Constants in §5.

- Each camera ray has origin = camera position and a unit world-space
  direction; the ray parameter `t` is world distance. The ray is transformed
  into each primitive's local space **without renormalizing**, so every
  primitive reports intervals in the same `t`.
- A solid's intersection with a ray is a list of closed intervals
  `[t_in, t_out]`, each endpoint carrying its surface normal and originating
  primitive.
- After every Boolean operation: intervals of length ≤ `ε` are dropped
  (tangent grazes and slivers count as misses; a ray lying in a face or along
  a side line, within `ε`, has real length and is a hit when the solid's
  rotations are multiples of 90°, per D20); in a union, intervals whose gap
  is ≤ `ε` are merged (flush faces leave no seam); in a difference, a cutter
  boundary within `ε` of a base boundary removes that base boundary where the
  cutter overlaps the base, while a cutter that only touches the base, or
  stops short of it by a gap ≤ `ε`, leaves the base boundary (D21).
- The visible hit is the first interval endpoint with `t > ε`. When the camera
  is inside a solid, this is an exit boundary.
- The shading normal is flipped to face the viewer when `N·V < 0`, after any
  difference-boundary reversal (two-sided shading).

```gherkin
Scenario: Tangent ray misses
  Given a sphere of radius 5 at the origin
  When a ray travels along the line y = 5, z = 0 in the +X direction
  Then the pixel shows the background

Scenario: Flush union faces leave no seam
  Given box([10, 10, 10]) unioned with translate([10, 0, 0]) { box([10, 10, 10]) }
  When a ray travels along the X axis through both boxes
  Then the result is a single interval [entry of the first box, exit of the second box]

Scenario: Flush difference opens the face
  Given difference { cube(10); cylinder(radius: 2, height: 10); }
  When a ray travels down the Z axis through the cylinder's center
  Then the ray passes through with no hit from this solid

Scenario: Camera inside a solid sees the exit boundary
  Given a camera positioned at the center of sphere(radius: 50) looking at [1, 0, 0]
  When the scene is rendered
  Then every pixel shows the inside of the sphere
  And the shading normal at each hit faces the camera

Scenario: Scaled scenes render identically
  Given the bored-cube example
  When every coordinate and dimension (including the camera position) is scaled by 1e-3, and separately by 1e5
  Then each scaled render matches the unscaled render within 1 per channel (the §7 golden rule)
```

### Feature: Boolean operations

```gherkin
Scenario: Multi-child difference
  Given a difference block with children A, B, and C
  When it is evaluated
  Then the result is A minus the union of B and C

Scenario: Self-difference is empty
  Given difference { A; A; } for any solid A
  When a ray crosses where A would be
  Then the ray hits nothing from that difference

Scenario: Interval combination along a ray
  Given a ray inside a box on [2, 8] and inside a cylinder on [4, 6]
  Then the union covers [2, 8]
  And the intersection covers [4, 6]
  And box minus cylinder covers [2, 4] and [6, 8]

Scenario: Difference boundaries shade with reversed cutter normals
  Given a cube minus a cylinder bored through it
  When a ray hits the wall of the bore
  Then the shading normal is the cylinder's normal reversed (pointing into the bore)
```

### Feature: Save, load, and examples

Agreed in D6 and D10 (2026-09-10). No server or accounts.

```gherkin
Scenario: Current source is autosaved and restored on reload
  Given the user has edited the source
  When the page is reloaded in the same browser
  Then the editor contains the edited source
  And the preview is rendered from it

Scenario: Save downloads the source as a .csg file
  Given any editor content, valid or not
  When the user chooses Save
  Then the browser downloads a .csg text file containing exactly the editor text

Scenario: Open loads a .csg file
  Given a .csg text file on disk
  When the user chooses Open and selects it
  Then the editor contains exactly the file's text
  And the source is evaluated and rendered as if it had been typed

Scenario: Built-in examples
  When the user opens the examples picker
  Then it lists exactly three examples: bored cube, primitives, and Boolean operations
  And choosing one loads its source into the editor
  And every built-in example evaluates with no diagnostics

Scenario: First launch shows the bored cube
  Given no autosaved source exists in this browser
  When the app is opened
  Then the editor contains the bored-cube example and it is rendered

Scenario: Replacing edited text asks for confirmation
  Given the editor text differs from the text of the last Open, Save, or example load
  When the user chooses Open or an example
  Then the app asks for confirmation before replacing the text
  And declining leaves the editor text unchanged

Scenario: Replacing unedited text does not ask
  Given the editor text equals the text of the last Open, Save, or example load
  When the user chooses an example
  Then the example replaces the text without a confirmation prompt
```

### Feature: Live rebuild and progressive rendering

Agreed in D10 (2026-09-10). Constants in §5.

- The editor is a plain `<textarea>` with a line-number gutter.
- The source is re-parsed and re-evaluated 300 ms after the last edit.
- Rendering is progressive in horizontal row bands on the main thread,
  yielding to the browser between bands so typing stays responsive. A
  "Rendering…" status shows while a render is in progress.

```gherkin
Scenario: Edits rebuild after the debounce
  Given a valid model is displayed
  When the user types a valid change and then pauses
  Then the model is re-evaluated 300 ms after the last keystroke
  And not before

Scenario: A newer model cancels an in-progress render
  Given a render is in progress
  When a newer valid model is produced
  Then the in-progress render stops
  And rendering restarts from the first band with the newer model

Scenario: Typing stays responsive while rendering
  Given a render of a large preview is in progress
  When the user types
  Then each keystroke appears in the editor without waiting for the render to finish

Scenario: Resize re-renders after the debounce
  When the preview panel is resized
  Then a new render starts 150 ms after the last resize event

Scenario: Clicking a diagnostic moves the caret
  Given a diagnostic at line 4, column 7
  When the user clicks it
  Then the editor caret is placed at line 4, column 7
```

### Feature: Invalid edits keep the last valid preview

```gherkin
Scenario: Error keeps the last valid model, marked stale
  Given a valid model is displayed
  When the source is edited to contain an error
  Then the preview continues to show the last valid model
  And a visible indicator says the preview is stale
  And the error is reported with its line and column

Scenario: Fixing the error clears the stale indicator
  Given the preview is marked stale
  When the source is edited to be valid again
  Then the preview shows the new model
  And the stale indicator is removed
```

## 9. Build, test, and verify

See [CONSTRAINTS §4–§5](CONSTRAINTS.md#4-development-and-planning-workflow).
Commands (agreed in D12, verified in M0):

```
npm install && npx playwright install && npm run hooks:install
npm start            # serve the app locally
npm test             # unit + golden-image tests (node --test "test/**/*.test.js")
npm run test:e2e     # Playwright: Chromium, Firefox, WebKit
npm run check        # FULL GATE: both of the above
npm run capture -- <milestone>   # screenshots into docs/progress/<milestone>/
```

Pure logic (parser, evaluator, intervals, shading) gets unit tests; every
§8 scenario maps to a unit, golden, or e2e test, or, where automation is
impractical, to a manual check listed in the milestone's evidence README.
Safari gets a manual smoke check at each milestone.

## 10. Reference notes (match-or-fix)

Not applicable: there is no reference implementation.

## 11. Roadmap

See [ROADMAP.md](ROADMAP.md).

## 12. Open decisions

| ID | Decision needed | Blocks | Next step |
| -- | --------------- | ------ | --------- |
| ~~D1~~ | **Resolved 2026-09-10:** pure JS CPU ray tracer on a 2D `<canvas>`; ThreeJS/WebGL parked. Resolves the `vision.md` line 3 vs. line 55 contradiction in favor of line 55 (line 3 corrected). | — | — |
| ~~D2~~ | **Resolved 2026-09-10:** plain JS ES modules, no build step, `node:test`, DOM-free core. Static dev server choice folded into D12. | — | — |
| ~~D3~~ | **Resolved 2026-09-10:** primitives are `sphere`, `cube`, `box`, `cylinder`; no `group` keyword — multiple solids in a transform block or at top level are implicitly unioned. | — | — |
| ~~D4~~ | **Resolved 2026-09-10:** degrees; X, then Y, then Z about fixed parent axes (`R = Rz·Ry·Rx`); right-handed (OpenSCAD convention). | — | — |
| ~~D5~~ | **Resolved 2026-09-10:** camera comes only from the source `camera` block; no interactive camera controls in the first release (Live 3D viewport stays parked). | — | — |
| ~~D6~~ | **Resolved 2026-09-10:** localStorage autosave of the current source; Save downloads / Open loads a `.csg` text file; three built-in examples (bored cube, primitives, Boolean operations). | — | — |
| ~~D7~~ | **Resolved 2026-09-10:** interval and tolerance rules in [Ray–solid intervals and tolerance](#feature-raysolid-intervals-and-tolerance). `ε = 1e-6` and scale range `[1e-3, 1e5]` stay **provisional** until the scaled-render scenario passes; "marching limits" dropped (analytic tracing does not march). **Finalized 2026-09-10 in M4 (owner decision on the range):** the scaled-render scenario passed. At 64×48, the bored cube scaled ×1e-3 and ×1e5 renders byte-identical to the unscaled image (0 of 12,288 channels differ). `ε = 1e-6` is final. The supported scale is revised to `[1e-3, 3e7]` for nonzero magnitudes, with zero components exact. That covers every magnitude the ×1e5 check exercises: coordinates up to 1.6e7, and distances from the camera to the model up to 2.75e7. This is the owner's decision after M4 Critic round 2; round 1 had set 2e7 from the camera coordinate alone. **Scope (owner, after M4 Critic rounds 1 and 2):** the scaled-render guarantee is the measured 64×48 scenario, not a general invariance claim. `ε` is absolute, so a ray that crosses a solid over a length near `ε` can change with scale. For example, a wall 5e-7 thick is dropped at ×1 but kept at ×1e5, and at 640×480 two silhouette pixels of the bored cube change at ×1e-3. | — | — |
| ~~D8~~ | **Resolved 2026-09-10:** 0–4 top-level directional white `light` blocks (default camera key light when none), optional `material { color; }`, fixed Blinn-Phong constants and background; no shadows. See §5 and [Lighting and shading](#feature-lighting-and-shading). | — | — |
| ~~D9~~ | **Resolved 2026-09-10:** language rules as written in [§8 Modeling language](#feature-modeling-language). Model color syntax is part of D8. | — | — |
| ~~D10~~ | **Resolved 2026-09-10:** 300 ms debounced rebuild; progressive, cancelable main-thread rendering; 1 ray per CSS pixel; bored cube on first launch; confirm before replacing edited text; `<textarea>` editor. | — | — |
| ~~D11~~ | **Resolved 2026-09-10:** current stable desktop Chrome, Firefox, Safari; no mobile/touch. | — | — |
| ~~D12~~ | **Resolved 2026-09-10:** `node:test` unit + golden-PPM render tests; Playwright e2e on Chromium/Firefox/WebKit; `npm run capture` evidence; manual Safari check; `tools/serve.mjs`. See §7, §9, CONSTRAINTS §4–§5. | — | — |
| ~~D13~~ | **Resolved 2026-09-10:** rename `master` → `main`; branch per OpenSpec change; pre-commit hook runs `npm test`; full gate + Critic before merge. See CONSTRAINTS §4. | — | — |
| ~~D14~~ | **Resolved 2026-09-10 (accepted by the owner):** position and lookAt are equal when their distance is ≤ `ε`; up is parallel when `‖f̂ × û‖ ≤ 1e-6`. Recorded in §5. | — | — |
| ~~D15~~ | **Resolved 2026-09-10 (chosen by the owner):** expressions nest at most 100 levels; deeper input is a syntax error rather than a stack overflow. Recorded in §5. | — | — |
| ~~D16~~ | **Resolved 2026-09-10 (owner, M4): best effort outside the supported scene scale.** There is no range check on inputs: the range states where results were measured (§5), and zero coordinates or small offsets are legitimate. Non-finite values stay errors. A `position`–`lookAt` distance that overflows to a non-finite value is reported as "position and lookAt are too far apart", instead of the misleading "up must not be parallel". After M4 Critic round 1, the owner added the same treatment for `up`: an `up` whose length overflows is reported as "up is too large". M5 extends the same treatment to light `direction` and to underflow: a nonzero `up` or `direction` whose length underflows to 0 is reported as "too small", and one whose length overflows as "too large". Recorded in the `camera-definition`, `ray-intervals`, and `lighting-and-shading` specs. | — | — |
| ~~D18~~ | **Resolved 2026-09-10 (accepted by the owner; may be tuned later):** recorded in §5 (render time slice, divider, nesting depth). The slice rule was amended the same day, with the owner's agreement, after Critic review: a slice starts no new row once 12 ms have elapsed (at most one row past 12 ms), because a loop that checks the clock after each row cannot promise a strict maximum. Original proposal: (a) progressive rendering yields after at most **12 ms** of rendering per slice; (b) the divider keeps the editor and the preview each at least **240 px** wide, the editor starts **420 px** wide, and the arrow keys move the focused divider **16 px**; (c) the D15 cap of 100 levels also counts **parentheses and block bodies** (`{ … }` of transforms and Booleans), so the new grammar cannot overflow the stack. | — | — |
| ~~D19~~ | **Resolved 2026-09-10 (owner):** transforms take exactly one positional argument (`translate(vector)`, `rotate(vector)`, `scale(number)`). Named arguments on transforms, or a different argument count, are errors. DESIGN had defined named arguments only for primitives. Recorded in §8. | — | — |
| ~~D20~~ | **Resolved 2026-09-10 (chosen by the owner, after the M3 Critic review):** solids are closed, so their surfaces belong to them. A ray lying in a box face plane, along a cylinder side line, or in a cylinder cap plane is a hit over the length it shares with the solid. Only a zero-length touch (an interval of length ≤ `ε`, such as a sphere tangent or an edge graze) is a miss. **Amended the same day (owner, after M3 Critic round 2):** the in-face check allows `ε` in world units (`ε·|d|` in a primitive's local space), because the rounding of a placement can move a face by a last-place error and would otherwise turn an in-face ray into a miss. **Narrowed the same day (owner, after M3 Critic round 3):** the guarantee covers placements built from `translate`, `scale`, and rotations by multiples of 90°, which are exact (D4, D7), so an in-face ray stays exactly parallel to the face in local space. Under other rotations, a local direction component that should be 0 carries a rounding residue of about `1e-16`. A ray lying exactly in such a face is then a boundary case decided by rounding, like a ray through an exact edge, and the effect is below what a render shows. Rays clearly inside or outside a face behave normally at any rotation. Revisit when `ε` is finalized in M4 (ROADMAP backlog). Flush cuts in M4 are governed by the separate difference rule in §8 Ray–solid intervals, not by this one. | — | — |
| ~~D21~~ | **Resolved 2026-09-10 (owner, after M4 Critic round 1):** the difference boundary rule applies where a cutter overlaps the base. A cutter that only touches the base (a gap of 0), or stops short of it by a gap ≤ `ε`, removes none of it, so the base boundary stays. Wording corrected after M4 Critic round 2: "overlaps or meets" contradicted the tested behavior for a touching cutter. Recorded in §8 Ray–solid intervals and the `ray-intervals` spec. | — | — |
| ~~D22~~ | **Resolved 2026-09-11 (the writer's defaults in M5, consistent with D8, D14, and D16; open to the owner's review):** DESIGN gives a default only for `intensity`, so a `light` requires `direction` and a `material` requires `color`. The fifth or later `light` block, and the second or later `material` block, are reported at their keyword. A `light` or `material` inside a body is reported at its keyword, as `camera` is, and a misplaced block does not count toward the limits. Every block's contents are still checked. Recorded in the `lighting-and-shading` spec. | — | — |
| D17 | Which characters count as identifier letters. M1 accepts ASCII letters, digits, and `_` only, so `é`, a non-breaking space, or a byte-order mark is an "unexpected character". This is consistent with §8, but files opened from disk (M6) may carry a BOM or non-ASCII names. | Open files (M6) | Decide before M6: keep ASCII-only, skip a leading BOM, and/or allow Unicode letters |
## Optional features (parked)

Out of scope until specifically requested (source: `vision.md` "Later,
optional improvements").

- **Non-uniform scaling:** per-axis scale factors (ellipsoids from spheres,
  rectangular prisms from cubes).
- **GPU acceleration:** WebGL or ThreeJS rendering.
- **Cone and torus primitives.**
- **Live 3D viewport:** orbit, zoom, grid, axes, and standard views.
- **Mouse picking:** click a part to select it, show its dimensions, and
  highlight its source.
- **Orthographic camera** option.
- **Richer materials:** surface material control beyond a single color.
- **Point lights:** `light { position: …; }` with defined falloff (or none)
  and defined behavior for lights inside solids. *(Parked in D8.)*
- **Colored lights:** optional `color: [r, g, b]` on `light`, multiplied per
  channel. *(Parked in D8.)*
- **Shadows:** secondary rays toward each light; requires a self-intersection
  offset rule. *(Parked in D8.)*
- **Anti-aliasing and HiDPI rendering:** multiple rays per pixel and/or
  rendering at `devicePixelRatio`. *(Parked in D10.)*
- **Web Worker rendering:** trace off the main thread, possibly in parallel.
  *(Parked in D10.)*
- **Syntax highlighting** in the editor. *(Parked in D10.)*
- **Mobile and touch support.** *(Parked in D11.)*
