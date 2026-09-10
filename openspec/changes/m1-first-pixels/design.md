## Context

See proposal.md (Why). M0 left a verified harness:
- `node:test` unit and golden tests, with PPM goldens compared within 1 per
  channel
- Playwright e2e on three engines
- `npm run capture`
- the pre-commit hook

There is no `src/` yet. CONSTRAINTS §2 requires a DOM-free `src/core/` and a
thin `src/ui/` shell, and deferred the module layout and interfaces to this
proposal. Scope decisions for this change, made with the owner on 2026-09-10:
- Each construct arrives with its full validation.
- Unary minus is supported; binary arithmetic waits for M2.
- The page re-renders synchronously on every edit into a fixed 640×480 canvas.

## Goals / Non-Goals

**Goals:**
- An architecture that M2–M6 extend without restructuring:
  - lexer → parser → evaluator → scene → intervals → shading → pixels
  - band rendering available for M2
- Math a student can follow: small modules with one responsibility each, and
  plain functions on plain objects.
- Correctness established by analytic tests, with goldens as regression
  guards.

**Non-Goals:**
- Performance work beyond "synchronous 640×480 is usable". Progressive
  rendering is M2.
- Any construct beyond the M1 subset, except a clear "not supported yet"
  diagnostic.
- Transform-local rays. In M1 every sphere is at the world origin; the local
  transform machinery arrives in M3.

## Decisions

### D-1: Module layout and interfaces
```text
src/core/
  constants.js   # Every DESIGN §5 number (ε, D14 tolerance, camera defaults, shading, colors, key light)
  vec3.js        # Immutable 3-vector helpers: add, sub, scale, dot, cross, length, normalize
  lexer.js       # tokenize(source) → tokens with {type, value, line, column}; throws a positioned error
  parser.js      # parse(tokens) → AST with node locations; throws a positioned error at the first syntax error
  evaluate.js    # evaluate(ast) → { diagnostics, scene }; environment chain for let
  camera.js      # validateCamera, cameraBasis(camera), primaryRay(basis, width, height, x, y)
  sphere.js      # intersectSphere(radius, ray) → interval list
  intervals.js   # union(a, b), visibleHit(intervals), EPSILON
  shade.js       # keyLight(basis), shade(hit, V, lights, color) → [r, g, b], encode
  render.js      # compile(source), renderRows(scene, w, h, y0, y1, rgba), renderSource(source, w, h)
src/ui/
  default-source.js  # The page's example source (no browser APIs, so Node tests can render it)
  main.js            # Page wiring: textarea → renderSource → canvas ImageData; diagnostics list
```
- `compile(source)` returns `{ diagnostics, scene }`. `scene` is `null` when
  there are any diagnostics.
- `renderSource(source, w, h)` returns `{ diagnostics, rgba }`. `rgba` is a
  `Uint8ClampedArray(w*h*4)`, or `null` when there are any diagnostics.
- `renderRows` fills rows `[y0, y1)` of a caller-provided buffer, so M2 can
  render in bands and `renderSource` can simply call it once for all rows.
  `Uint8ClampedArray` is used because the shell can wrap it directly in
  `new ImageData(rgba, w, h)`, and Node supports it without browser APIs.
- Diagnostics are `{ line, column, message }`, with 1-based line and column.

*Alternative:* one `renderer.js` module. Rejected because separate modules map
onto DESIGN features, and each is testable alone.

### D-2: Scene representation
The evaluator produces plain data:
```js
{
  camera: { position, lookAt, up, fov },
  solids: [{ type: 'sphere', radius, loc }],
}
```
In M1, a top-level solid list means implicit union (D-5). M3 will wrap solids
in transform nodes and M4 in Boolean nodes. Both are tree nodes with the same
`intersect(ray) → intervals` contract, so nothing here is thrown away.

### D-3: Syntax errors versus semantic errors
- **Syntax errors:** the lexer and parser throw a single positioned error,
  which `compile` catches and returns as the one diagnostic. This is the
  "stop at the first syntax error" rule from DESIGN.
- **Semantic errors:** the evaluator never throws for bad input. It records
  each diagnostic and keeps walking (for example, it binds a name to an error
  marker, so one bad `let` doesn't cascade into bogus "undeclared" errors),
  then sorts the diagnostics by position.
- **Unsupported syntax:** binary operators and parentheses are recognized by
  the parser specifically, so it can say "not supported yet" rather than give
  a generic syntax error. The same goes for reserved words for later
  constructs.

### D-4: Camera basis and projection
```text
forward = normalize(lookAt − position)
right   = normalize(forward × up)
up′     = right × forward
```
For pixel `(x, y)`, with `h = tan(fov/2)`:
```text
sx = (2·(x + 0.5)/width − 1) · h · (width/height)
sy = (1 − 2·(y + 0.5)/height) · h
direction = normalize(forward + sx·right + sy·up′)
```
This gives a vertical fov across the height, square pixels, top row first,
and `+right` to the right. In Z-up right-handed coordinates, looking along
+Y gives right = +X, which matches the spec's orientation scenario.

### D-5: Intervals, union, and the visible hit
- **Sphere:** solve `|o + t·d|² = r²` with a unit `d`. Real roots `t0 < t1`
  give `[t0, t1]`, with outward normals `(o + t·d)/r` at each end. If the
  discriminant is negative, or `t1 − t0 ≤ ε`, there is no interval, so
  tangents miss.
- **`union(a, b)`:** sort both lists by `t_in` and sweep. Merge when
  `next.t_in ≤ current.t_out + ε`, keeping the endpoint objects (t, normal,
  primitive) of the surviving boundaries. Drop any result of length ≤ ε.
- **`visibleHit`:** the first endpoint with `t > ε`, scanning each interval's
  `t_in`, then `t_out`.
- **Shading normal:** `N` is flipped if `N·V < 0`.

M4 adds `intersect` and `difference` to `intervals.js`, alongside `union`.

### D-6: Camera degeneracy tolerances (DESIGN gap → D14, proposed)
DESIGN requires position ≠ lookAt and up not parallel to the view direction,
without numeric tests. Proposed:
- **Equal points:** `‖lookAt − position‖ ≤ ε`, using DESIGN's existing
  `ε = 1e-6` world units, the same tolerance as geometry.
- **Parallel:** `‖f̂ × û‖ ≤ 1e-6`. This is the sine of the angle between
  them, a dimensionless value, so it is independent of scene scale.

Both are recorded in DESIGN §12 as D14 for the owner to accept or amend. Once
accepted, they move into DESIGN §5 in this change.

### D-7: Shading
`shade.js` implements the DESIGN formula literally, with the specular gate.
The constants come from `constants.js`, which mirrors DESIGN §5: ambient
0.15, kd 0.75, ks 0.3, shininess 32, default color `[0.8, 0.8, 0.8]`, and
background `[0.12, 0.12, 0.14]`. The key light comes
from D-4's basis:
`normalize(up′ − 0.5·right + back)`, where `back = −forward`.

### D-8: Browser shell
- `index.html` lays out a `<textarea id="source">`, a `<canvas id="preview"
  width="640" height="480">`, and a `<ul id="diagnostics">`. It loads
  `src/ui/main.js` as a module.
- On load and on each `input` event, `main.js` calls
  `renderSource(text, 640, 480)`:
  - with a buffer: `putImageData(new ImageData(rgba, 640, 480), 0, 0)`, and
    the list is cleared;
  - otherwise: one `<li>` per diagnostic (`line:column message`), and the
    canvas is untouched.
- It keeps setting `document.body.dataset.moduleLoaded = 'true'`, so M0's
  e2e test still holds.
- The canvas CSS size equals its pixel size (640×480); `devicePixelRatio` is
  ignored, per DESIGN §5.

### D-9: Core-purity check
`test/core-purity.test.js` walks `src/core/**/*.js`.
- **Comments and strings:** a small scanner blanks them out first (`//`,
  `/* */`, and `'…'`, `"…"`, `` `…` `` literals), keeping line breaks so line
  numbers stay right.
- **Browser identifiers:** it then matches the forbidden identifiers as whole
  words, and property accesses like `globalThis.document`.
- **Imports:** it checks every `import … from '…'` and `import('…')`
  specifier. It must be relative, and it must resolve under `src/core/`.

A regex scanner is enough for our own small, plain modules. A full JS parser
would be a dependency, which CONSTRAINTS §1 forbids.

### D-10: Test strategy and goldens
- `test/core/*.test.js` has one file per module. Expected values are computed
  by hand from DESIGN formulas: interval endpoints, specific shaded pixel
  values, and ray directions. That establishes correctness independently of
  the implementation.
- **Goldens** (regression guards, reviewed visually when created):
  - `sphere`: the page's default example at 64×48;
  - `sphere-inside`: the camera inside `sphere(50)`, at 64×48.
- The aspect-ratio scenario is tested by counting sphere rows and columns at
  64×48 and 96×48, not by a golden.
- **e2e:** `e2e/editor-preview.spec.js` reads canvas pixels with
  `getImageData` to check the center and corner pixels, and a larger sphere
  after an edit. It checks the diagnostics list text, and that the pixels are
  unchanged after an invalid edit. It runs in all three engines.

## Risks / Trade-offs

- [Synchronous 640×480 per keystroke may lag on slow machines] → A sphere is
  about 307k cheap ray tests. Measure the render time in the e2e run and
  record it in the evidence. M2 replaces this trigger with a debounced,
  progressive render.
- [Canvas readback could differ from the written bytes (color management)]
  → With alpha 255 and an sRGB canvas, `getImageData` returns the bytes
  written. The e2e compares against the core's own buffer values; if an
  engine differs, it is a finding to record, not to paper over.
- [Floating-point differences across engines make browser pixels differ from
  Node goldens by 1] → Goldens are compared only in Node. e2e checks
  structural facts (background vs. not), not exact shaded values.
- [The regex purity scanner can be fooled by exotic syntax] → Core code is
  written in plain style. The scanner has its own tests for comments,
  strings, and templates, and its seen-to-fail run is recorded.
- [D14 tolerances might not match the owner's intent] → They are flagged in
  DESIGN §12 as proposed, and are easy to change: they are single constants.

## Migration Plan

Additive. `index.html` changes from the placeholder to the M1 page; M0's
e2e still passes because the title, no-errors check, and module attribute are
preserved. Roll back by reverting the change branch.

## Open Questions

- Whether D14's tolerances are accepted as written. This does not change the
  approach or the tasks, only two constants and DESIGN §5 wording.
