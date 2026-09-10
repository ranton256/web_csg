# M1 — First pixels: verification evidence

Change: `openspec/changes/m1-first-pixels` on branch `m1-first-pixels`.
Recorded 2026-09-10. Machine: macOS, Node v22.20.0, npm 10.9.3,
`@playwright/test` 1.63.0.

## Capture

![M1 page in Chromium, 1280×800](app.png)

`npm run capture -- M1` → `docs/progress/M1/app.png` (1280×800, Chromium,
device scale factor 1): the page with the example source beside the
640×480 preview of the shaded sphere.

## ROADMAP "done when" criteria

| Criterion | Evidence | Result |
| --- | --- | --- |
| A source with a camera and `sphere(…)` renders a shaded sphere in the browser on all three engines | `e2e/editor-preview.spec.js` › "the example renders on load": the center pixel is not the background, the corner is the background, there are no diagnostics, and no console errors. Run in Chromium, Firefox, and WebKit | Pass, 3/3 engines. Manual Safari check passed (below) |
| The core render function matches a committed sphere golden within 1 per channel | `test/core/render-golden.test.js` against `test/golden/sphere.ppm` (the default example at 64×48) and `sphere-inside.ppm` (the camera inside `sphere(50)`). Both images were inspected when created: the highlight is upper-left, as the key light's direction predicts, and the inside view is brightest toward the lower right, where the flipped normals face the key light | Pass |
| Rendering the same source at the same size twice gives identical pixels | `test/core/render.test.js` › "rendering is deterministic"; "rendering in bands equals one full render" | Pass |
| Every DESIGN §8 Modeling language and Camera definition scenario that applies to M1's constructs passes as a unit test | [Scenario coverage](#scenario-coverage) below | Pass |
| `src/core/` passes the core-purity check | `test/core-purity.test.js` (scanner fixtures plus the real `src/core/`); [seen to fail](#seen-to-fail) | Pass |
| Evidence: a capture of the rendered sphere | `app.png` above | Pass |
| Full gate from a fresh checkout | `git clone --branch m1-first-pixels`, then `npm ci`, `npx playwright install`, `npm run hooks:install`, and `npm run check < /dev/null`. Run at `4ba73c7`, and again at `76edd44` after the Critic round 1 fixes | Pass at both: exit 0. At `76edd44`: `node --test` 122/122; Playwright 12/12 |
| Separate Critic review returns `[APPROVED]` | Round 1 at `71a1e28`: `[REJECTED]` ([details](#critic-round-1)). Round 2 at `bf12596`: **`[APPROVED]`** ([details](#critic-round-2-approved)) | Pass |

## Scenario coverage

| Capability (delta spec) | Tests |
| --- | --- |
| `modeling-language` | `test/core/lexer.test.js` (comments, `1e3`, bare `.`, oversized literals, unterminated comment, `\r\n`/tab positions, emoji as one column); `test/core/parser.test.js` (missing `;`, vector arity, binary arithmetic and parentheses not supported, later reserved words, reserved word as a name, positional after named, first syntax error only, 100-level nesting limit, no crash on pathological depth); `test/core/evaluate.test.js` (unary minus, vector element types, visibility, redeclaration, no cascade, argument binding, all semantic errors ordered, empty scene, comments) |
| `camera-definition` | `test/core/camera.test.js` (defaults, exactly one block, second block still checked, required, unknown, duplicate, and mistyped properties, independent errors all reported, earlier bindings, D14 equality and parallel tolerances, zero up, fov range, 3×3 center ray, orientation, vertical fov, unit directions); `test/core/render.test.js` (the width scenario) |
| `primitives` | `test/core/evaluate.test.js` (radius > 0, radius must be a number); `test/core/intervals.test.js` (centered at the origin) |
| `ray-intervals` | `test/core/intervals.test.js` (`[95, 105]`, tangent miss, exit from inside, normal flip); `test/core/render.test.js` (every pixel from inside `sphere(50)`) |
| `implicit-union` | `test/core/intervals.test.js` (`[90, 110]`, visible hit at t = 10); `test/core/render.test.js` (from outside, with the solids out of order, the render equals the union, and it fails if the union is replaced by concatenation; nested spheres equal the outer sphere) |
| `lighting-and-shading` | `test/core/shade.test.js` (constants equal DESIGN §5, saturation, unlit ambient with the specular gate using grazing geometry where the ungated term is about 0.29, so it fails if the gate is removed, the formula for a lit point, key light direction, encoding and background) |
| `core-render` | `test/core/render.test.js`, `test/core/render-golden.test.js` |
| `editor-preview` | `e2e/editor-preview.spec.js` (renders on load; a valid edit grows the sphere; an invalid edit lists `8:8 the radius must be greater than 0` with the image checksum unchanged; the fix clears the list) |
| `verification-tooling` (core purity) | `test/core-purity.test.js` (browser identifiers, imports and re-exports including `export * as`, literal bracket access, comments and strings ignored, template expressions scanned) |

## Render time (synchronous, 640×480, measured by the e2e test after an edit)

| Engine | ms |
| --- | --- |
| Chromium | 34–36 |
| Firefox | 41–43 |
| WebKit | 74–77 |

Typing stays usable at this scene size. M2 replaces this trigger with
debounced, progressive rendering.

## Seen to fail

**Core-purity check.** In a scratch worktree of `4ba73c7`, I appended
`document.title = 'x';` to `src/core/vec3.js`, which became line 18. Then
`npm test` exited 1 with
`not ok … src/core/ uses no browser APIs and imports only core modules` and
the violation `…/src/core/vec3.js:18 document`. The core test files also
failed, because Node cannot import a module that touches `document`.
Afterwards the worktree was removed.

The scanner's own fixture tests cover the other failure modes: `document` on
line 3; imports from `../ui/main.js`, `node:fs`, a package, and a URL; a
`window` reference inside a template expression; and a non-literal dynamic
`import()`. They also cover the passing cases: comments, strings, and
relative imports inside the core.

## Implementation notes

The first run of the new suite had three failing tests, and each was a
mistake in the test, not the code:
- **D14 test:** the "not equal" example offset `lookAt` along Z, parallel to
  the default up, so the code correctly reported a parallel up.
- **Argument test:** `sphere(r: 5)` correctly yields both "missing `radius`"
  and "unknown `r`".
- **Normal-flip test:** a negated normal contains `-0`, which strict
  deep-equality distinguishes from `0`.

All three tests were corrected before the first commit.

## Critic round 1

A separate `project-critic` review of `main..m1-first-pixels` at `71a1e28`
confirmed the gate green and the math exact. An independent renderer written
from DESIGN §5 and §8 matched both goldens with 0 differing channels. It
returned **`[REJECTED]`** for the findings below, all fixed in `76edd44`.

| # | Finding | Fix | Evidence of the new test going red |
| --- | --- | --- | --- |
| 1 | The specular-gate test could not fail: in its geometry the gated term was about 2e-16, below the test tolerance. The earlier coverage claim for "Unlit side gets only ambient" was untrue | Grazing geometry (N·L = −0.01, ungated specular ≈ 0.29), with an assertion that the geometry matters | With the gate removed from the fixed code: `not ok … an unlit side gets only ambient` |
| 2 | The core-purity scanner missed `export * as ns from '…'` | Re-export pattern extended; literal bracket access (`globalThis['document']`) also detected | Against `71a1e28`: `not ok … namespace re-exports and bracket access are reported` |
| 3 | Not every semantic error was reported: a second camera block was never evaluated, and one invalid camera property hid the fov range check | Every camera block is validated; each camera rule is checked whenever its inputs are valid | Against `71a1e28`: `not ok … independent camera errors are all reported`, `not ok … a second camera block is still checked` |
| 4 | Deeply nested input (10,000 minus signs, 5,000 `[`) crashed with a stack overflow | Nesting is capped at 100 levels (the owner chose D15, now in DESIGN §5); deeper input is a syntax error | Against `71a1e28`: `not ok … expressions may nest up to 100 levels`, `not ok … pathologically deep input yields a diagnostic, not a crash` |
| 5 | Implicit union was not really tested: replacing it with concatenation stayed green. The earlier coverage claim was overstated | A render test with the camera outside and `sphere(5)` listed first | With the union replaced by concatenation in the fixed code: `not ok … from outside, overlapping spheres render as their union regardless of order` |
| 6 | Literals that overflow to Infinity rendered impossible `[0,0,0,255]` pixels | Such literals are a syntax error ("number is too large"). The wider question of values beyond the supported scale is DESIGN §12 D16 (decide in M4) | Against `71a1e28`: `not ok … numbers too large to represent are rejected` |
| — | Columns counted UTF-16 code units, not characters as the spec says; an emoji produced a lone-surrogate message | Columns count code points; the message shows the whole character | Against `71a1e28`: `not ok … columns count characters: an emoji is one column` |
| — | Doc drift: design D-1 signatures, and the spec punctuation list omitted `+ * /` | Both corrected; the scanner's known regex-literal limit is noted in design risks | Documentation only |

## Critic round 2 (approved)

A fresh `project-critic` review of all four commits at `bf12596` returned
**`[APPROVED]`**. Its checks:
- `npm run check` exited 0 (122/122 unit tests, 12/12 e2e), and strict
  OpenSpec validation passed.
- 30 mutants were applied one at a time; 29 were caught, including every
  round 1 fix mutated back.
- Making the page clear the canvas on error turned the e2e red.
- An independent renderer written from DESIGN §5 and §8 matched both goldens
  exactly (0 of 9216 channels differ).
- Every delta-spec scenario has a matching test.

Its non-blocking notes were recorded without changing the approved code:
1. The purity scanner misses imports and re-exports written without spaces
   (`import{x}from'node:fs'`, `export*from'node:fs'`). This is now a ROADMAP
   backlog line.
2. The D14 parallel check is tested only with unit-length `up` vectors. The
   code is correct for non-unit vectors, as the Critic verified; a test is a
   ROADMAP backlog line.
3. DESIGN's status line still said "Nothing is implemented yet". Corrected.
4. Identifier letters are ASCII only (`é`, NBSP, and BOM are "unexpected
   character"). This is consistent with the spec, and recorded as DESIGN §12
   D17 for a decision before M6 adds opening files.

## Manual Safari smoke check

2026-09-10, done by the project owner in desktop Safari at
`http://127.0.0.1:8080/` (served by `npm start`). **Pass:**
- a shaded grey sphere appears with its highlight upper-left;
- `let r = 60;` enlarges it immediately;
- `sphere(0);` lists `9:8 the radius must be greater than 0` while the
  picture stays;
- the console shows no errors.
