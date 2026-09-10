## 1. Setup

- [x] 1.1 Create and switch to branch `m1-first-pixels` from `main`
- [x] 1.2 Confirm with the owner whether DESIGN §12 D14 (camera tolerances) is accepted; if amended, update the camera-definition spec and design D-6 first

## 2. Core math and lexer

- [x] 2.1 Implement `src/core/vec3.js`, with unit tests for each operation, including cross-product handedness (`[1,0,0] × [0,1,0] = [0,0,1]`)
- [x] 2.2 Implement `src/core/lexer.js`: numbers (no exponent, no bare `.`), identifiers, the 14 reserved words, punctuation, `//` and `/* */` comments, and line and column counting (`\r\n` counts as one break, a tab as one column)
- [x] 2.3 Add `test/core/lexer.test.js` for the Lexical structure scenarios: comments ignored, `1e3` rejected at its start, the unterminated block comment position, and `\r\n`/tab positions

## 3. Parser

- [x] 3.1 Implement `src/core/parser.js` for the M1 statements (`let`, `camera`, `sphere`) and expressions (number, name, vector, unary minus). Every node carries its location, and the parser throws at the first syntax error. Binary operators and parentheses get a "not supported yet" error, reserved words for later constructs a "`<word>` is not supported yet" error, and a reserved word used as a name a syntax error. Positional arguments after named ones are rejected at the argument
- [x] 3.2 Add `test/core/parser.test.js` covering:
  - missing semicolon, reported at `sphere`
  - `[1, 2]`
  - `1 + 2` not supported yet
  - `cube(10)` at line 5, column 1
  - `let camera = 1`
  - `sphere(radius: 12, 5)`
  - first syntax error only (lines 3 and 7 → one error, on line 3)

## 4. Evaluator and camera validation

- [x] 4.1 Implement `src/core/evaluate.js`:
  - let environment: visible after declaration, undeclared and already-declared errors
  - unary minus on numbers and vectors; vector elements must be numbers
  - sphere argument binding (missing, duplicate, unknown) and radius rules
  - collecting and sorting all semantic errors; no scene when there are any
- [x] 4.2 Implement camera validation in `src/core/camera.js`:
  - exactly one block
  - required, duplicate, unknown, and mistyped properties
  - defaults `up [0,0,1]` and `fov 45`
  - position/lookAt within ε, zero up, parallel up (D14), `0 < fov < 180`
- [x] 4.3 Add `test/core/evaluate.test.js` and `test/core/camera.test.js` covering:
  - the Expressions, let, Primitive call arguments, Diagnostics, and Empty scene scenarios (modeling-language)
  - every camera-definition validity and property scenario, including "Camera expressions may use earlier bindings"
  - the sphere radius scenarios (primitives)

## 5. Projection, intervals, and shading

- [x] 5.1 Implement `cameraBasis` and `primaryRay` (design D-4). Test the center ray of a 3×3 image, the image orientation scenario, and unit-length directions
- [x] 5.2 Implement `src/core/sphere.js` and `src/core/intervals.js` (design D-5): the sphere interval with normals, the ε length drop, `union` with gap ≤ ε merging, `visibleHit`, and the normal flip
- [x] 5.3 Add `test/core/intervals.test.js` for:
  - the ray-intervals scenarios: `[95, 105]`, the tangent miss, the camera inside `sphere(50)` with the normal facing the viewer
  - the implicit-union scenarios: `[90, 110]`, and the camera inside nested spheres with the visible hit at t = 10
  - "Sphere is centered at the origin"
- [x] 5.4 Implement `src/core/shade.js` (design D-7): `SHADING` constants equal to DESIGN §5, the key light, the gated Blinn-Phong formula, and `encode`
- [x] 5.5 Add `test/core/shade.test.js`:
  - full highlight saturates to 1
  - unlit side is exactly `0.15·C`, with no specular even when `N·H > 0`
  - key light `normalize([-0.5, -1, 1])` for the camera at `[0, -10, 0]`
  - default-color unlit pixel `31`
  - background `[31, 31, 36, 255]`

## 6. Core render

- [x] 6.1 Implement `src/core/render.js`: `compile`, `renderRows`, `renderSource` (design D-1)
- [x] 6.2 Add `test/core/render.test.js` covering:
  - buffer size and layout
  - a syntax error at line 2, column 5 → one diagnostic, no buffer
  - camera-only → all background
  - two renders byte-identical
  - bands 0–16, 17–30, 31–47 equal a full render
  - the width scenario (same sphere rows and columns at 64×48 and 96×48)
- [x] 6.3 Add goldens `sphere` (the default example at 64×48) and `sphere-inside` (camera inside `sphere(50)`) via `npm run golden:update -- test/core/render-golden.test.js`. Inspect both images, then confirm `npm test` passes without update mode

## 7. Core-purity check

- [x] 7.1 Implement `test/core-purity.test.js` (design D-9): blank out comments and strings, forbid the listed browser identifiers, and allow only relative imports that resolve inside `src/core/`
- [x] 7.2 Test the scanner itself against fixtures in a temporary directory: a `document.title` violation names the file, line 3, and `document`; `../ui/main.js` and `node:fs` imports are named; `window` in a comment or string passes
- [x] 7.3 Seen to fail: in an isolated worktree, add `document.title = 'x';` to a real core file and observe `npm test` fail with the file, line, and identifier; record the output

## 8. Browser shell

- [x] 8.1 Rewrite `index.html` (design D-8), and implement `src/ui/main.js` with the default sphere example, render on load and on every `input`, the diagnostics list, and the canvas kept on error; keep `data-module-loaded`
- [x] 8.2 Add `e2e/editor-preview.spec.js` for the three editor-preview scenarios, in all three engines, reading pixels with `getImageData`. Record the measured render time per edit
- [x] 8.3 Confirm that M0's `e2e/app.spec.js` still passes unchanged, or update it with a recorded reason

## 9. Documentation

- [x] 9.1 CONSTRAINTS §2: replace the "Deferred to the M1 proposal" note with the `src/core/` and `src/ui/` module layout and the interfaces from design D-1
- [x] 9.2 DESIGN: apply the owner's D14 decision (move the tolerances into §5 and mark D14 resolved, or amend them)
- [x] 9.3 ROADMAP: strike the core-purity backlog line as delivered, and set M1's status; CLAUDE.md layout, if it changed

## 10. Verification, review, and merge

- [x] 10.1 `npm run check < /dev/null` green, then a fresh clone at the branch head (`npm ci`, `npx playwright install`, `npm run hooks:install`, `npm run check`) green
- [x] 10.2 `npm run capture -- M1`, then write `docs/progress/M1/README.md`: each M1 "done when" criterion with its evidence, the gate summary, the core-purity seen-to-fail record, the render time, and the manual Safari smoke check (performed by the owner)
- [ ] 10.3 A separate Critic review (`project-critic`) of `main..m1-first-pixels`. Fix findings and re-review until `[APPROVED]`
- [ ] 10.4 Merge into `main`, mark M1 complete in ROADMAP, and archive the change with `/opsx:archive` (syncing the specs)
