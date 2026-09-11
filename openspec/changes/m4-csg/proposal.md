## Why

This change delivers ROADMAP **M4 — CSG**. After M3, every primitive can be
placed, but `union`, `intersection`, and `difference` are still rejected, so
the headline bored-cube example from `vision.md` cannot render. M4 makes
Boolean modeling work and settles the tolerance rules it depends on. That
includes finalizing `ε` and the supported scene scale, which have been
provisional since D7.

## What Changes

- **Boolean blocks:** `union { … }`, `intersection { … }`, and
  `difference { … }` now evaluate and render.
  - A union joins its children.
  - An intersection keeps what all of its children share.
  - A difference is its first child minus the union of the rest, so
    `difference { A; A; }` is empty.
  - Booleans nest with transforms and with each other, and the top level
    stays an implicit union.
- **Interval rules (DESIGN §8 Ray–solid intervals and tolerance):**
  - Each ray-solid intersection is a list of intervals, and each endpoint
    carries its normal and its primitive.
  - After every operation, intervals of length ≤ `ε` are dropped.
  - Unions merge gaps ≤ `ε`, so flush faces leave no seam.
  - In a difference, a cutter boundary within `ε` of a base boundary removes
    that boundary, so flush cuts open the face.
  - Where a cutter's surface becomes part of the result, its normal is
    reversed to point into the cut, before two-sided shading.
- **`ε` and the scene scale (owner decisions):**
  - The bored cube is rendered scaled by ×1e-3 and ×1e5, and each render
    must match the unscaled one within 1 per channel.
  - If both pass, `ε = 1e-6` is marked final in DESIGN §5. The supported
    scale is revised to `[1e-3, 2e7]`, the magnitudes the ×1e5 render
    actually exercises.
  - If either fails, `ε` or the range is revised with the measured reason.
- **D16 (owner decision): best effort outside the supported scale.**
  - There is no range check on inputs. The range states where accuracy is
    promised.
  - Non-finite values stay errors.
  - A camera whose vector math overflows now gets a clear diagnostic,
    instead of the misleading "up must not be parallel".
- **Still rejected until M5:** `light` and `material`.
- **Backlog, per the owner:**
  - The D20 revisit line is closed: the narrowed rule stays, because its
    effect is below what a render shows.
  - A scene test for a top-level union of mixed primitive types is added.
- **Evidence:** a `bored-cube` golden (64×48, DESIGN §7) and a `bored-cube`
  capture.

## Capabilities

### New Capabilities
- `boolean-operations`: the `union`, `intersection`, and `difference` blocks,
  multi-child difference, self-difference, interval combination, and reversed
  cutter normals (DESIGN §8 Boolean operations).

### Modified Capabilities
- `ray-intervals`:
  - adds the union gap-merge rule and the difference boundary rule, with the
    flush-union and flush-difference scenarios;
  - the shading-normal flip now follows any cutter-normal reversal;
  - adds the scaled-render scenario;
  - `ε` is final.
- `modeling-language`:
  - "Booleans, lights, and materials are not supported yet" becomes "Lights
    and materials are not supported yet";
  - the vision-example scenario evaluates with no diagnostics.
- `implicit-union`: the top-level union gains a scenario that mixes primitive
  types.
- `core-render`: the "callable without a browser" scenario renders the bored
  cube and matches its golden (DESIGN §7).
- `camera-definition`: a camera whose vectors overflow to non-finite values is
  a diagnostic (D16).

## Impact

- **Code:**
  - `src/core/evaluate.js`: Boolean nodes. The scene becomes a tree of
    placed primitives and Boolean nodes.
  - `src/core/intervals.js`: intersection, difference with the `ε` boundary
    rule, and cutter-normal reversal.
  - `src/core/render.js`: evaluates the tree along each ray.
  - `src/core/camera.js`: the finite check (D16).
- **Tests:**
  - analytic interval-combination tests;
  - Boolean scene tests (flush union, flush difference, self-difference,
    multi-child difference, reversed normals);
  - the scaled-render test;
  - updated language tests;
  - the mixed-type top-level union test;
  - the bored-cube golden.
- **Capture:** the shot list gains `bored-cube`.
- **Documents:**
  - DESIGN §5 (`ε` and the scale range final), §12 (D16 resolved);
  - CONSTRAINTS §2 (the scene is a tree);
  - the ROADMAP backlog (the `ε`, D20, and mixed-type union lines).
- **Dependencies:** none added.
- **Out of scope:**
  - lights and materials (M5);
  - built-in examples, the bored cube on first launch, save and load (M6);
  - non-uniform scaling, cones, and tori (parked).
