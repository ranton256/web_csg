## Context

See proposal.md (Why). After M2:
- the parser accepts the whole grammar;
- the evaluator binds only `sphere`, and rejects the other primitives and
  the transforms as "not supported yet" while still checking their contents;
- the renderer intersects spheres at the world origin, with a
  unit-direction quadratic.

DESIGN fixes the primitive table and dimension rule (§5), the D4 rotation
convention, exact right-angle rotations (D7, §5), uniform positive scale,
inside-out nesting, and ray transformation "without renormalizing". The
owner chose single positional transform arguments (D19) and folded in the
three M2 backlog items.

## Goals / Non-Goals

**Goals:**
- A scene representation that M4's Booleans can wrap without rework.
- Intersection math a student can check by hand: slabs for boxes, one
  quadratic for spheres and cylinder sides, and planes for caps.
- Every endpoint `t` stays a world distance, and every normal is a unit
  world vector.

**Non-Goals:**
- Boolean nodes, and the difference ε rules (M4).
- Non-uniform scale. The math relies on the linear part being `s·R`, so
  normals need only the rotation.
- Acceleration structures (bounding volumes). Scenes are small, and clarity
  beats speed (DESIGN §3).

## Decisions

### D-1: Transforms fold into each primitive at evaluation time
A placement is `{ s, R, t }`, meaning `world = s·R·local + t`, where `R` is
orthonormal and `s > 0`.
- **Composition:** a transform node is composed onto its parent's placement
  (`s = sP·sC`, `R = RP·RC`, `t = sP·RP·tC + tP`), and each primitive inside
  it receives the composed placement.
- **Scene shape:** the scene stays a list of placed primitives
  `{ type, params, placement, loc }`, and implicit union remains a union over
  that list. For M3 this is exact, because a union of unions is one union.
- **M4:** Boolean nodes will hold child lists of placed primitives, or
  nested Boolean nodes, the same way.

*Alternative:* keep transform nodes in the scene and apply them per ray.
Rejected: it composes the same matrices for every pixel, and it adds
nothing M4 needs.

`src/core/transform.js` holds:
- `IDENTITY`, `translation(v)`, `rotation(degrees)`, `scaling(k)`, and
  `compose(parent, child)`;
- `toLocal(placement, origin, direction)`, which returns
  `(1/s)·Rᵀ·(o − t)` and `(1/s)·Rᵀ·d`, so `t` is preserved;
- `normalToWorld(placement, n)`, which returns `R·n`. That is already unit
  length, because `R` is orthonormal.

### D-2: Rotation matrices with exact right angles
`rotation([rx, ry, rz]) = Rz·Ry·Rx`, using `sinDeg` and `cosDeg`. For an
angle that is an exact multiple of 90, these return values from the table
`[0, 1, 0, −1]` indexed by `((angle / 90) mod 4 + 4) mod 4`. Otherwise they
use `Math.sin` and `Math.cos` of the angle in radians. Right-angle rotations
therefore map axis vectors to exact axis vectors, which D7 relies on for
flush cuts in M4.

### D-3: Intersection routines (local space; the direction is not unit length)
Each routine returns `[]` or `[{ in, out }]`. Each endpoint is
`{ t, normal, primitive }` with a local normal, and intervals of length
≤ ε are dropped.
- **Sphere:** the general quadratic, with `a = d·d`, `b = o·d`, and
  `c = o·o − r²`, giving `t = (−b ± √(b² − a·c)) / a`. For unit `d` this is
  exactly M1's formula, so the sphere goldens stay valid.
- **Box and cube (slabs):**
  - For each axis with half-size `h`: if `d_i = 0`, the ray misses unless
    `|o_i| ≤ h`, and that slab spans all `t`. Otherwise the slab spans
    `[(−h − o_i)/d_i, (h − o_i)/d_i]`, ordered.
  - The entry is the largest slab start and the exit the smallest slab end.
    Ties go to the lowest axis, so edge hits are deterministic.
  - The normal is `±` that axis, the sign taken against the ray.
  - A cube calls the box routine with `[s, s, s]`.
- **Cylinder:**
  - **Side:** the quadratic in x and y, with `a = dx² + dy²`. If `a = 0`, the
    ray is parallel to the axis and is inside the side iff `ox² + oy² ≤ r²`.
  - **Caps:** a z slab, `[(−h/2 − oz)/dz, (h/2 − oz)/dz]`.
  - **Interval:** the intersection of the two intervals. The normal at each
    end comes from whichever bound determined it: the side `(x, y, 0)/r`, or
    a cap `(0, 0, ±1)`. On an exact tie at the rim, the side wins.
- **Closed solids (DESIGN D20):** the parallel-ray checks allow `ε` in world
  units, which is `ε·|d|` in local units since `|d| = 1/s`. A ray lying in a
  box face plane, along the cylinder side line, or in a cap plane is
  therefore a hit, even when a placement's rounding moves the face by a
  last-place error. Only an interval of length ≤ `ε` is dropped. The
  guarantee covers `translate`, `scale`, and right-angle rotations. Under
  other rotations, a component that should be 0 carries a rounding residue,
  so the exactly-in-face case is decided by rounding (D20, narrowed by the
  owner after Critic round 3; revisit with `ε` in M4).

### D-4: Rendering
For each placed primitive, `render.js` transforms the ray into local space
(D-1), intersects, and maps the endpoint normals back with `normalToWorld`.
The unions are unchanged. Shading and the visible hit are unchanged, since
`t` and the normals are already in world terms.

### D-5: Evaluator binding
A parameter table, taken from DESIGN §5, drives all four primitives:
- `sphere`: `[radius: number > 0]`;
- `cube`: `[size: number > 0]`;
- `box`: `[size: vector, every component > 0]`;
- `cylinder`: `[radius: number > 0, height: number > 0]`.

M1's argument binding is reused. Kind and positivity messages name the
parameter: "the radius must be greater than 0", "the size must be a vector",
"each size component must be greater than 0".

Transforms (D19):
- An argument list that is not exactly one positional argument reports
  "`kw` takes exactly one positional argument" at the keyword.
- A wrong kind reports "`translate` needs a vector" / "`rotate` needs a
  vector of angles in degrees" / "the scale factor must be a number".
- A non-positive factor reports "the scale factor must be greater than 0".
- A valid transform evaluates its body with the composed placement. An
  invalid one still walks its body for errors, with the parent placement.
- Only Booleans, `light`, and `material` remain "not supported yet".
  Primitives inside an unsupported Boolean are still bound and checked, but
  not added to the scene.

### D-6: Backlog items
- **Nesting:** `argumentList()` in the parser calls `enter`/`leave` around
  its parentheses, so D18's "each parenthesis" holds literally.
- **Spec wording:** the narrow-window wording is added to the editor-preview
  spec (no code change); a new e2e test checks the layout at 400 px.
- **Resize mid-render:** a new e2e test resizes during a heavy render and
  asserts `rendersCancelled` +1, one completion, and equality with a full
  render.

### D-7: Tests and evidence
- **Unit, analytic:** a `test/core/primitives.test.js` covers the
  box, cube, and cylinder endpoint and normal scenarios, the side tangent and
  edge graze (misses), in-face rays (hits, D20), and the tie-breaks. `test/core/transform.test.js` covers:
  - the D4 direction scenarios;
  - exactness for 90° and 180°;
  - composition order;
  - the round trip `toLocal` / world.

  World-distance `t` for scaled solids, world normals for rotated boxes, and
  nested placements are checked at scene level in `test/core/scene.test.js`.
- **Language tests:** the not-supported lists shrink. The vision example now
  expects only `difference` and `union`. There are binding tests for the new
  primitives and transforms.
- **Goldens** (64×48): `cube`, `box`, `cylinder`, and `arrangement` (all four
  primitives placed with translate, rotate, and scale). They live in
  `test/support/scenes.js`, and `tools/capture.mjs` reuses the arrangement
  as its new `primitives` shot.
- **e2e:** the narrow window (400 px); a resize mid-render.

## Risks / Trade-offs

- [Edge and corner hits pick an arbitrary face normal] → Deterministic ties
  (lowest axis). The visual effect is limited to single pixels exactly on
  edges.
- [Near-parallel rays make `d_i` tiny but nonzero, giving huge slab bounds]
  → The arithmetic is still finite, and the slab rule handles it. An exact 0
  takes the parallel branch.
- [Per-pixel cost grows with the number of solids (the union sorts each
  time)] → Acceptable for course scenes. It is recorded, and optimisation
  stays parked.
- [The sphere switching to the general quadratic changes floating-point
  results] → For unit `d`, `a = 1`, and the formula reduces exactly to the
  old one. The existing goldens are the check.

## Migration Plan

Additive within the core. The scene's solids gain a `placement`: top-level
primitives get the identity, so M1 and M2 scenes render identically. The
`modeling-language` requirement "Constructs not yet supported" is replaced by
the Booleans/lights/materials requirement.

## Open Questions

None. D19 settled the only open point.
