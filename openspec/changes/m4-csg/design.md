## Context

See proposal.md for why. The current state that shapes the approach:

- **Scene shape:** `evaluate` produces a flat `scene.solids` list of placed
  primitives, each `{ type, <parameters>, placement }`. Transforms are
  already pushed down into each primitive's composed placement.
- **Unsupported constructs:** a Boolean statement reports "not supported
  yet" and evaluates its body with `context.rendered = false`. The M3 Critic
  noted that this flag cannot be observed, because any Boolean produces a
  diagnostic.
- **Intervals:** `intervals.js` has `union` (sort, merge gaps ≤ `ε`, drop
  lengths ≤ `ε`), `visibleHit`, and `facingNormal`. Each endpoint is
  `{ t, normal, primitive }` with a world-space normal.
- **Rendering:** `render.js` folds `union` over all solids in
  `sceneIntervals`, then takes the visible hit and shades it.
- **Camera:** `validateCamera` checks `length(lookAt − position) > ε`, then
  the up vector. A distance that overflows to Infinity passes the first check
  and is then misreported as "up must not be parallel" (D16).

## Goals / Non-Goals

**Goals:**
- A scene representation that expresses nesting of Boolean and transform
  blocks directly, and that students can read.
- Interval algebra that is exact where it can be, applies the DESIGN `ε`
  rules after each operation, and gives deterministic results on ties.
- Measure the scaled-render scenario, and record the result in DESIGN §5.

**Non-Goals:**
- Acceleration structures (bounding volumes, early ray rejection). The
  bored cube has four primitives per ray.
- Caching intervals across pixels or frames.
- Any change to shading constants or lighting (M5).

## Decisions

### D-1: The scene is a tree; placements stay on the leaves
`scene = { camera, root }`. The root is a `union` node of the top-level
solids. A node is either:
- a leaf, `{ kind: 'primitive', type, <parameters>, placement }`; or
- a Boolean node, `{ kind: 'union' | 'intersection' | 'difference', children }`.

**Transform blocks become `union` nodes** of their body. Their placement is
already composed into every leaf beneath them, as in M3. This is sound
because Boolean operations act on intervals in world `t`, which do not
depend on where the transforms were applied.

**A body with one child** still becomes a node. The single-child union is
kept, not collapsed, so the tree mirrors the source; this has no effect on
results.

*Alternatives:*
- Keep `scene.solids` and add a postfix operation list: compact, but harder
  to read and to test.
- Put placements on interior nodes and transform rays at each level:
  matches the source more literally, but repeats transform work on every
  ray, with no behavioral gain.

### D-2: Interval algebra in `intervals.js`
Operands are normalized lists (sorted, disjoint, gaps > `ε`, lengths > `ε`),
as `union` already produces. Two new functions each sweep the boundaries of
two normalized lists:
- `intersect(a, b)`: the common coverage. Each result endpoint is whichever
  operand's boundary bounds it. On an exact tie in `t`, the endpoint of
  the earlier child (`a`) is kept, so the normal choice is deterministic.
- `subtract(a, b)`: coverage of `a` not covered by `b`. An endpoint that
  comes from `b` gets its normal reversed (a new endpoint object; `b` is not
  mutated) and keeps `b`'s primitive. On an exact tie, `b` wins: the
  boundary is removed, so a flush cut opens the face.

**`ε` rules:**
- Both functions compute exact coverage, then drop intervals of length
  ≤ `ε`.
- This implements the difference rule. A cutter boundary within `ε` of a
  base boundary leaves a remainder of length ≤ `ε`, which is dropped,
  removing that base boundary.
- The union gap-merge rule is unchanged.

**The difference node** evaluates as
`subtract(first, children.slice(1).reduce(union, []))`, per the "A minus the
union of B and C" scenario.

*Alternative:* apply the `ε` rule by widening the cutter's intervals by `ε`
before subtracting. That shifts the reversed boundaries by `ε`, changing `t`
values that the tests pin exactly. The exact-then-drop approach avoids this.

### D-3: Per-ray evaluation
`nodeIntervals(node, ray)` recurses:
- a leaf gives the M3 `intersectSolid`;
- `union` folds `union`;
- `intersection` folds `intersect`, and stops early once the result is empty;
- `difference` is described in D-2.

`sceneIntervals(scene, ray)` returns `nodeIntervals(scene.root, ray)`. It
stays exported, so the M3 scene tests keep working. `visibleHit` and
`facingNormal` are unchanged. The flip happens at shading time, after any
reversal, as the spec orders.

### D-4: Evaluator: a sink instead of the `rendered` flag
The evaluation context carries `sink`: the child array of the node being
built.
- A primitive pushes its leaf into `sink`.
- A transform or Boolean block builds its node with a fresh `sink` for its
  body, then pushes the node into the parent's `sink`.
- `light` and `material` are property blocks, and contain no solids. They
  report "not supported yet" and check their expressions, as before.

With no unrendered solid constructs left, `context.rendered` is removed.
The `solids` count per body still drives the empty-body diagnostic. The
scene is still `null` whenever any diagnostic exists.

### D-5: D16 camera finiteness
In `validateCamera`, compute `distance = length(lookAt − position)` once.
- If it is not finite, report "position and lookAt are too far apart" at
  `lookAt`, and skip the up checks, since they depend on the normalized
  view direction.
- Otherwise the existing checks run.

Non-finite arithmetic is already an error ("the result is too large"), and
there is no range check anywhere (D16, best effort).

### D-6: The scaled-render test and `ε` finalization
A test helper builds scaled copies of the bored-cube source. It binds
`let k = <factor>;` and multiplies every literal coordinate and dimension by
`k`: `size`, `bore`, the `+ 2` height margin, and the camera `position`. It
renders each copy at 64×48, and compares it with the unscaled render within
1 per channel. The factors are 1e-3 and 1e5.

**If both pass,** DESIGN §5 marks `ε = 1e-6` final and revises the scale
range to `[1e-3, 2e7]` (owner decision, recorded in §12 D7). The reason:
×1e-3 reaches a smallest magnitude of 0.001 (the overhang), and ×1e5 a
largest of 1.6e7 (the camera).

**If either fails,** the implementation stops and the owner decides the
revision, recording the measured failure. `ε` is not tuned silently.

### D-7: Goldens, capture, and tests
- **Goldens (64×48):**
  - `bored-cube`, the source of the core-render "callable without a browser"
    scenario; its test moves from the sphere golden to this one, and the
    sphere golden's own test stays;
  - `booleans`, a union, an intersection, and a difference side by side,
    added to `test/support/scenes.js`, so every operation has visual
    evidence.
- **Capture:** a `bored-cube` shot (`showSource` with the vision example).
- **Unit tests:**
  - `intervals` tests for `intersect` and `subtract`, analytic, covering
    ties, reversal, and slivers;
  - scene tests for every Boolean and tolerance scenario, through
    `sceneIntervals`;
  - camera tests for D16;
  - updated language tests: the vision example has no diagnostics, and
    `light` and `material` keep their scenarios.
- **Mixed-type union:** the backlog scene test for a top-level union of
  mixed types.

### D-8: Documentation
- **DESIGN:**
  - §5: `ε` and the scale range, per D-6;
  - §12: D16 resolved (best effort, and the camera diagnostic), and a D7 note
    with the measured result.
- **CONSTRAINTS §2:** the scene is `{ camera, root }`, a tree whose leaves
  carry placements.
- **ROADMAP:**
  - M4 status;
  - the backlog: strike the `ε` line (delivered), the D20 line (closed,
    narrowed rule kept, per the owner), and the mixed-type union line
    (delivered).

## Risks / Trade-offs

- **[A tie picks a surprising normal at an exact edge]** → Deterministic
  tie rules (D-2), pinned by tests. Visible only on single pixels exactly
  on edges.
- **[The ×1e5 render differs by more than 1 per channel, from camera-basis
  or quadratic rounding at 1.6e7]** → The measurement decides. Failure
  stops the change and goes to the owner (D-6). The bored cube has no flush
  faces, so the `ε` rules should not be what decides this.
- **[Per-ray allocation in the interval sweeps slows large renders]** →
  The lists are short (at most a few intervals per primitive), and
  rendering is progressive. The M2 heavy-render e2e tests keep guarding
  responsiveness. Optimize only if a test shows a regression.
- **[Removing `context.rendered` and changing the scene shape break M3
  tests that inspect `scene.solids`]** → Those tests are updated in the same
  change to inspect `scene.root`. Behavior-level scene tests go through
  `sceneIntervals` and are unaffected.
- **[A reversed cutter normal is exposed where a later union re-adds
  material]** → Union keeps the endpoint objects of the boundaries that
  survive, so whichever surface is actually outermost supplies the normal.
  This is covered by the bored-cube golden, where cutters form a union.

## Migration Plan

Nothing is deployed and there is no persisted data. The scene shape change
is internal to the core; the UI only passes scenes to `renderRows`.
Rollback is reverting the branch.
