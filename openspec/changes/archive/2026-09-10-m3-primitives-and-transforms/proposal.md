## Why

This change delivers ROADMAP **M3 — Primitives & transforms**. After M2, the
language parses everything, but only a sphere at the world origin can be
rendered. M3 makes every primitive sizable, placeable, and orientable. It is
also the first milestone where rays leave world space: they are transformed
into each primitive's local frame, which the M4 Boolean math depends on.

## What Changes

- **Primitives:** `cube(size)`, `box(size)` (a 3-vector), and
  `cylinder(radius, height)` (capped, along local Z), with the DESIGN §5
  parameter order, positional or named arguments, and the rule that every
  dimension is greater than 0.
- **Transforms:** `translate(vector)`, `rotate(vector)`, and `scale(number)`.
  Each takes exactly one positional argument (D19, the owner's decision).
  - Rotation uses the D4 convention: degrees, X then Y then Z about fixed
    parent axes, right-handed, with exact values for multiples of 90°.
  - Scaling is uniform and must be greater than 0.
  - Nested transforms compose from the inside outward.
- **Implicit union inside transform bodies:** several solids in a body form
  one union, which the transform then applies to.
- **Rendering:** each primitive carries its composed world-from-local
  transform. Rays enter local space without renormalizing, so every interval
  is still measured in world distance, and normals return through the
  rotation. The sphere intersection moves to the general quadratic, since the
  local direction is no longer unit length.
- **Still rejected until later milestones:** `union`, `intersection`,
  `difference` (M4), and `light` and `material` (M5).
- **M2 backlog items folded in (agreed with the owner):**
  - the parentheses around call and transform arguments count toward the
    nesting cap, as DESIGN §5 already says;
  - the editor spec states what happens when the window is too narrow for
    both 240 px minimums;
  - an e2e test covers a resize that arrives while a render is in progress.
- **Evidence:**
  - goldens for the cube, the box, the cylinder, and a rotated and translated
    arrangement;
  - a `primitives` capture showing all four primitives.

## Capabilities

### New Capabilities
- `transforms`: the transform blocks, their arguments, the rotation
  convention, uniform scale, and inside-out composition (DESIGN §8
  Transforms; §5 rotation rows; D19).

### Modified Capabilities
- `primitives`: adds the cube, box, and cylinder requirements. The sphere
  requirement now refers to its local origin rather than the world origin.
- `ray-intervals`: rays are transformed into local space without
  renormalizing, and normals are transformed back to world space.
- `implicit-union`: adds a requirement that solids in a transform body are
  unioned.
- `modeling-language`:
  - the vision-example scenario now expects only `difference` and `union` to
    be unsupported;
  - call and transform argument parentheses count toward the nesting cap;
  - the cylinder argument scenario from DESIGN is added;
  - "Constructs not yet supported" is replaced by "Booleans, lights, and
    materials are not supported yet".
- `editor-preview`: the divider requirement covers windows too narrow for
  both minimums.
- `live-rebuild`: the resize requirement gains a mid-render scenario.

## Impact

- **Code:**
  - `src/core/evaluate.js`: primitive and transform binding, transform
    composition, unions in bodies
  - `src/core/transform.js` (new): affine transforms
  - `src/core/box.js`, `src/core/cylinder.js` (new)
  - `src/core/sphere.js`: general quadratic
  - `src/core/render.js`: rays into local space, normals out
  - `src/core/parser.js`: argument parentheses count as a nesting level
- **Tests:**
  - analytic unit tests for each primitive, transform, and composition, and
    exact right-angle rotations
  - updated language tests (fewer unsupported constructs)
  - goldens for the new primitives and an arrangement
  - e2e tests for a narrow window and a resize mid-render
- **Capture:** the shot list gains `primitives`.
- **Dependencies:** none added.
- **Out of scope:** Booleans and the ε rules for difference (M4); lights and
  materials (M5); non-uniform scaling, cones, and tori (parked).
