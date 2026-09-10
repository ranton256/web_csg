## Why

This change delivers ROADMAP **M1 — First pixels**. M0 built a harness that
can verify the project, but there is no product to verify yet. M1 is the
thinnest end-to-end slice: source text goes through a lexer, parser,
evaluator, ray tracer, and shader to the canvas, and a golden image proves it.
Doing this before the harder math (transforms, CSG) settles the core
architecture, the core/shell boundary, and the render interface that every
later milestone builds on.

## What Changes

- **DOM-free core, new under `src/core/`:**
  - lexer
  - parser (syntax tree with source locations)
  - evaluator (scene)
  - camera
  - sphere intersection
  - Blinn-Phong shading
  - band-capable renderer
  - the core render function required by DESIGN §7
- **The M1 language subset:**
  - comments (`//`, `/* */`)
  - decimal numbers and unary minus
  - 3-vectors and names
  - immutable block-scoped `let` without shadowing
  - one top-level `camera` block
  - top-level `sphere(radius)` statements, with positional or named arguments

  Each construct arrives with its full DESIGN §8 validation, as agreed for
  this proposal. Parsing stops at the first syntax error, and the evaluator
  reports every semantic error, each at a 1-based line and column. Reserved
  words for later constructs (`cube`, `union`, `light`, …) produce a
  "not supported yet" diagnostic.
- **Rendering:** a perspective camera with defaults (`up [0, 0, 1]`, `fov` 45)
  and vertical-fov projection, one ray per pixel center. Each sphere yields a
  closed interval along the ray, and several top-level spheres are unioned by
  merging intervals. The visible hit is the first boundary with `t > ε`.
  Tangent grazes miss, and normals are flipped to face the viewer. Shading is Blinn-Phong with the default
  camera key light, the default model color, the specular gate, and the
  background color, all from DESIGN §5.
- **Browser shell, new under `src/ui/`:**
  - `index.html` shows a `<textarea>` prefilled with a sphere example and a
    fixed 640×480 canvas.
  - Every edit re-renders synchronously.
  - Diagnostics appear as a plain `line:column message` list.
  - On error, the last image stays.

  This trigger is temporary: M2 replaces it with the debounced, progressive,
  stale-marked editor.
- **Core-purity check** (ROADMAP backlog): a unit test fails if `src/core/`
  references browser APIs or imports anything outside `src/core/`.
- **Golden images** of the sphere scene. The M0 synthetic smoke golden stays.
- **Documentation:**
  - ROADMAP M1/M2 scope, already updated to this split
  - CONSTRAINTS §2: the `src/` module layout and interfaces
  - DESIGN §12: proposed decision D14, covering two camera tolerances DESIGN
    does not define yet (see design.md D-6); moved into DESIGN §5 once
    accepted

## Capabilities

### New Capabilities
- `modeling-language`: lexing, parsing, name resolution, argument binding, and
  diagnostics for the M1 language subset (DESIGN §8 Modeling language).
- `camera-definition`: the camera block, its defaults and validation, and
  vertical-fov perspective projection (DESIGN §8 Camera definition).
- `primitives`: the sphere primitive, its size validation, and its extent
  (DESIGN §8 Primitives).
- `ray-intervals`: camera rays measured in world distance, closed hit
  intervals with normals, the ε rules, the visible hit, and two-sided shading
  normals (DESIGN §8 Ray–solid intervals and tolerance).
- `implicit-union`: several top-level solids are unioned by merging their
  intervals (DESIGN §8 Implicit union). Transform bodies join in M3.
- `lighting-and-shading`: Blinn-Phong shading with the default key light,
  default model color, background, and output encoding (DESIGN §8 Lighting
  and shading; §5).
- `core-render`: the browser-free render function, taking source and pixel
  size and returning diagnostics plus an RGBA buffer, deterministically
  (DESIGN §7).
- `editor-preview`: the M1 page, with a source text area, canvas preview,
  diagnostics list, and re-render on edit.

### Modified Capabilities
- `verification-tooling`: adds a core-purity check requirement. All existing
  requirements are unchanged.

## Impact

- **New code:** `src/core/*.js`, `src/ui/main.js`; `index.html` is rewritten
  from the M0 placeholder.
- **Tests:**
  - new unit tests under `test/core/`
  - sphere goldens in `test/golden/`
  - an e2e test that the page renders the sphere in all three engines
  - the M0 e2e page test is kept
- **Capture:** `npm run capture -- M1` shows the rendered sphere. The `app`
  shot now shows the real page.
- **Dependencies:** none added.
- **Out of scope:**
  - binary arithmetic and parentheses (M2)
  - debounce, stale indicator, progressive rendering, resize (M2)
  - other primitives, transforms, implicit union inside transform bodies (M3)
  - Booleans (M4)
  - `light` and `material` blocks (M5)
  - save/load and examples (M6)
