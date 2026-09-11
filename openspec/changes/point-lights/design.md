## Context

See proposal.md for why. The current state that shapes the approach:

- **`src/core/lighting.js`:** `validateLight` reads `direction` and
  `intensity` through the shared `readProperties`, and returns
  `{ toLight, intensity }` or `null`. `missing(block, name, report)` in
  `properties.js` formats "<keyword> block is missing `name`".
- **`src/core/evaluate.js`:** counts light blocks against `MAX_LIGHTS`
  (valid or not, D22) and collects the valid ones in `scene.lights`. This
  does not change.
- **`src/core/render.js`:** `renderRows` resolves the lights once per call
  (`scene.lights`, or `[keyLight(basis)]`). For each pixel, it calls
  `shade(facingNormal(hit.normal, toViewer), toViewer, lights, color)`. The
  hit carries `t` (a world distance along the unit camera ray) and a normal,
  but no position.
- **`src/core/shade.js`:** `shade` applies the Blinn-Phong sum to a list of
  `{ toLight, intensity }`, and knows nothing about points.
- **Tests:**
  - `test/core/lighting.test.js` covers the M5 light and material scenarios;
  - `test/core/scaled-render.test.js` renders the bored cube scaled by `k`,
    and compares within 1 per channel;
  - goldens are 64×48 PPM files;
  - `test/ui/help-content.test.js` checks the help text.

## Goals / Non-Goals

**Goals:**
- Point lights that follow the `lighting-and-shading` delta exactly, with
  each scenario tested.
- `shade` stays the formula alone. The per-point work is one small, pure
  step before it.
- No new constants. The at-the-light rule uses DESIGN §5's `ε`.
- Directional-only scenes render byte-identically: every existing golden is
  unchanged.

**Non-Goals:**
- Falloff, colored lights, shadows, and showing lights in the preview.
- Any change to the default key light, to the light limit's counting rules
  (D22), or to `material`.

## Decisions

### D-1: A scene light has a kind
A valid light becomes one of:
- `{ kind: 'directional', toLight, intensity }`;
- `{ kind: 'point', position, intensity }`.

The default key light is directional. Keeping the position, rather than
precomputing anything, is all a point light needs. The render loop turns it
into a `toLight` at each hit (D-2).

*Alternative:* have `shade` take the point and resolve lights itself.
Rejected: it would mix the per-point geometry into the formula that the M5
tests pin, and every `shade` test would need a point.

### D-2: `lightsAt(lights, point)` resolves lights at a shaded point
A new pure function in `shade.js` returns the `{ toLight, intensity }` list
for one point:
- **Directional lights** pass through unchanged.
- **Point lights:** compute `d = position − point` and its length `r`. If
  `r` is not finite, or `r ≤ ε`, the light is dropped: it contributes
  nothing there. Otherwise `toLight = d / r`.

**In `renderRows`:**
- The hit point is `ray.origin + hit.t · ray.direction`. The camera ray's
  direction is unit length, and `t` is a world distance (`ray-intervals`).
- The point is computed only when the scene has a point light, so
  directional-only renders do the same arithmetic as today, and every
  existing golden stays byte-identical.
- The resolved list goes to the unchanged `shade`.

`N` is the facing normal, as today. The two-sided flip already makes a
light inside a closed solid, seen from outside, give `N·L < 0`, so only
ambient light remains. Nothing special is needed for that scenario.

*Alternative:* compute the hit point inside `intervals.js`. Rejected: only
shading needs it, and the interval code is pinned by the M4 tests.

### D-3: Validation in `validateLight`
- `LIGHT_KINDS` gains `position: 'vector'`. The shared `readProperties`
  already gives the "must be a vector", duplicate, and unknown-property
  messages.
- **Neither present:** report "light block is missing `direction` or
  `position`" at the block. `missing()` gains an optional form for this
  either-of message, so the wording stays in one place.
- **Both present:** report "light block cannot have both `direction` and
  `position`" at whichever property comes second in `block.properties`. The
  `direction` checks still run, so every violation is reported.
- The block is valid only when exactly one of the two is present and
  usable. No check on `position` beyond its kind: every finite vector is
  valid, and evaluation already rejects non-finite values.
- The returned light carries its kind (D-1).

### D-4: Tests
- **`test/core/lighting.test.js`:**
  - one test per new "Declared lights" scenario;
  - the direction and `ε` scenarios call `lightsAt` and `shade` directly;
  - the inside-a-solid and not-blocked scenarios render small images, and
    compare pixels;
  - one test per new validation scenario and table row;
  - the existing missing-direction test now expects the new message.
- **`test/core/shade.test.js`:** `lightsAt` edge cases:
  - a distance exactly `ε`, just over `ε`, and 0;
  - a non-finite distance, for example a position of `[1e308, 0, 0]` shaded
    at `[-1e308, 0, 0]`;
  - directional lights passing through unchanged.
- **`test/core/scaled-render.test.js`:** `scaledBoredCube(k)` plus
  `light { position: [40, -50, 50] * k; }`, scaled by `×1e-3` and `×1e5`,
  within 1 per channel of `k = 1`.
- **Golden `lit-point`** (64×48): `VISION_EXAMPLE` (the bored cube, 60 wide,
  camera at `[120, -160, 100]`), as for the other `lit-` goldens, with one
  point light at `[40, -50, 50]`.
  - The light is outside the three faces the camera sees (`x > 30`,
    `y < -30`, `z > 30`), and close enough that the shading visibly varies
    across each face.
  - It is reviewed as an image in the README.
- **`test/ui/help-content.test.js`:** the `light` section mentions
  `position`.

### D-5: Documentation and evidence
- **DESIGN:**
  - §4: "directional or point white lights";
  - §5: the max-lights note says both kinds count;
  - §8 Modeling language: the `light` line gains `position`;
  - §8 Lighting and shading: `Lᵢ` for point lights, and scenarios for no
    falloff, no occlusion, and point light validation;
  - Optional features: remove point lights (colored lights and shadows
    stay);
  - §12: D25, the owner's decisions (the syntax, no falloff), plus the
    writer's rules (the `ε` rule, no occlusion, and the both-or-neither
    messages), marked for the owner to accept.
- **CONSTRAINTS §2:** the scene's light shape, if it is described there.
- **ROADMAP:**
  - strike the point-lights backlog line;
  - the parked-features line: "point/colored lights" becomes "colored
    lights".
- **Evidence:**
  - `npm run capture -- point-lights`, with a new `lit-point` shot;
  - `docs/progress/point-lights/README.md`, with the criteria, the gates,
    the seen-to-fail records, and the owner's Safari smoke check.

## Risks / Trade-offs

- **[The scaled-render scenario may miss "within 1 per channel"]** Scaling
  changes `P` and `position` by the same factor, so `L` should agree to
  rounding. But a pixel at the specular gate (`N·L` near 0) could flip.
  → Measure it first, in task 3.4. If it fails, pause and take the result to
  the owner. The spec's scenario would then be narrowed as D7 was, not
  loosened silently.
- **[The `ε` rule is absolute]** At ×1e-3 scale, `ε` is 1e-3 of the model
  size, so a light very close to a surface drops over a larger relative
  area. → This is the same scope D7 already records for `ε`. The dropped
  area is a single point in any real scene.
- **[No occlusion looks wrong for a light behind a solid]** → This is the
  owner's parked-shadows decision (D8), stated in the spec and in D25, and
  shown in the README capture notes.
- **[The message change breaks the M5 missing-direction test]** → The test
  is updated in the same change, and the proposal marks it as BREAKING
  (message text only).
- **[Per-hit cost]** At most 4 point lights, each one subtraction, one
  length, and one division per hit. → Negligible next to the interval
  work. Directional-only scenes skip it entirely.
