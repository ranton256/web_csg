# Roadmap

Milestones for Web CSG.

Each milestone is a **demonstrable state of the product** — you can sit down at
the build and see what changed. If a milestone cannot be demonstrated, it is a
task list wearing a milestone's clothes. Behavior is specified in
[DESIGN.md](DESIGN.md) §8; the definition of done and review are in
[CONSTRAINTS §5–§6](CONSTRAINTS.md#5-definition-of-done). Milestone order and
scope were agreed in the planning interview (readback confirmed 2026-09-10).
No dates have been set.

**Every milestone requires committed verification evidence** in
`docs/progress/<milestone>/`: `npm run capture` screenshots plus a `README.md`
recording the acceptance criteria checked, the full-gate result, and the manual
Safari smoke check ([CONSTRAINTS §5](CONSTRAINTS.md#5-definition-of-done)).

Every milestone's "Done when" implicitly includes: `npm run check` green, its
DESIGN §8 scenarios covered by tests (or listed manual checks), docs updated,
deferrals in the backlog below, and a separate Critic `[APPROVED]`.

---

## The shape

| | Milestone | Goal | Status |
|---|---|---|---|
| **M0** | Foundations | The project can verify itself | Complete (2026-09-10; `m0-foundations`, Critic round 6 `[APPROVED]`; evidence in `docs/progress/M0/`) |
| **M1** | First pixels | A sphere from source text reaches the canvas through the real pipeline | Complete (2026-09-10; `m1-first-pixels`, Critic round 2 `[APPROVED]`; evidence in `docs/progress/M1/`) |
| **M2** | Language & feedback | Editing feels live: diagnostics, stale preview, responsive rendering | Complete (2026-09-10; `m2-language-and-feedback`, Critic round 2 `[APPROVED]`; evidence in `docs/progress/M2/`) |
| **M3** | Primitives & transforms | All four primitives, placed and oriented | Complete (2026-09-10; `m3-primitives-and-transforms`, Critic round 6 `[APPROVED]`; evidence in `docs/progress/M3/`) |
| **M4** | CSG | Boolean operations; the bored cube renders | Complete (2026-09-10; `m4-csg`, Critic round 3 `[APPROVED]`; evidence in `docs/progress/M4/`) |
| **M5** | Lighting & material | Lights and model color come from the source | Planned |
| **M6** | Persistence & examples | Work survives reloads and moves as files — **first release** | Planned |

---

## M0 — Foundations

**Goal.** The project can verify itself before there is much to verify.

**Scope.** `package.json` (scripts from CONSTRAINTS §4, `engines`, exact-pinned
`@playwright/test`); `tools/serve.mjs`; Playwright config for Chromium,
Firefox, WebKit; `tools/hooks/pre-commit` and `npm run hooks:install`; PPM
golden read/write helpers and `npm run golden:update`; `npm run capture`;
`openspec/config.yaml` context and standing constraints; rename the `master`
branch to `main` (D13). `CLAUDE.md` was created from
`templates/CLAUDE.general-template.md` ahead of M0 (2026-09-10); M0 updates
it once the toolchain exists (drop the "not verified" and "planned" notes, fix
the branch name, add the source layout).

**Dependencies.** None.

**Done when**

- `npm run check` is green from a fresh checkout following the CONSTRAINTS §4
  setup, with at least one unit test, one golden-image test (a trivial fixed
  buffer is acceptable), and one e2e test that loads the page in all three
  engines.
- Each gate has been seen to fail once: break an assertion, watch
  `npm test`, the golden comparison, the e2e run, and the pre-commit hook
  each fail, then restore.
- `openspec/config.yaml` names DESIGN.md, CONSTRAINTS.md, and ROADMAP.md and
  carries the standing constraints (pure-JS CPU renderer, no build step,
  DOM-free core, full gate).
- `CLAUDE.md` describes the toolchain as verified, matches the actual
  commands and layout, and is consistent with these documents.
- The default branch is `main`.
- **Evidence:** a first `npm run capture` of the (empty) page committed to
  `docs/progress/M0/`.

## M1 — First pixels

**Goal.** The thinnest end-to-end slice: source text → parser → evaluator →
tracer → canvas, proven by one golden image.

**Scope.** Each construct arrives with its full validation (agreed
2026-09-10 in the `m1-first-pixels` proposal):
- **Language subset:** a real lexer and parser for comments, numbers, unary
  minus, vectors, `let`, a top-level `camera` block, and `sphere`.
- **Validation:** every DESIGN §8 Modeling language and Camera definition rule
  that applies to those constructs — the first syntax error at line:col;
  positional and named arguments; radius > 0; undeclared names; no shadowing;
  all semantic errors reported; camera rules and defaults.
- **Rendering:** camera construction and vertical-fov projection. Ray–sphere
  hits shaded with Blinn-Phong using the default key light and default color
  (DESIGN §5).
- **Core:** the core render function from DESIGN §7, and the core-purity check
  from the backlog.
- **Page:** a `<textarea>` prefilled with a sphere example re-renders
  synchronously on every edit into a fixed 640×480 canvas. Diagnostics appear
  as a plain list, and the last image stays on error. M2 replaces this trigger.

**Dependencies.** M0.

**Done when**

- A source with a camera and `sphere(…)` renders a shaded sphere in the
  browser on all three engines.
- The core render function returns a buffer that matches a committed sphere
  golden image within 1 per channel.
- Rendering the same source at the same size twice gives identical pixels.
- Every DESIGN §8 Modeling language and Camera definition scenario that
  applies to M1's constructs passes as a unit test.
- `src/core/` passes the core-purity check.
- **Evidence:** a capture of the rendered sphere in `docs/progress/M1/`.

## M2 — Language & feedback

**Goal.** Editing feels live, and errors never cost the picture.

**Scope.** The parser is extended from M1's subset to the whole grammar:
binary arithmetic, and the transform, Boolean, `light`, and `material` syntax.
The evaluator adds the arithmetic rules (operand types, division by zero) and
the empty-body rule. Name, scoping, argument, and camera rules already arrive
in M1. Constructs whose semantics arrive in M3–M5 parse in M2 but are rejected
by the evaluator with a diagnostic until their milestone. The preview fills the rest of the window, and a draggable divider sets the
split (agreed 2026-09-10). The two small M1 backlog items (the purity scanner
without spaces, and the D14 non-unit test) are folded in. Editor features: `<textarea>` with a
line-number gutter, diagnostics list, clicking a diagnostic moves the caret,
300 ms debounced rebuild, stale indicator, progressive cancelable rendering,
150 ms resize re-render, and "Rendering…" status (DESIGN §8 Invalid edits keep
the last valid preview; Live rebuild and progressive rendering).

**Dependencies.** M1.

**Done when**

- Every Modeling language and Camera definition scenario that applies to the
  constructs supported so far passes as a unit test.
- The stale-preview, debounce, cancel, responsiveness, resize, and
  diagnostic-click scenarios pass as e2e tests on all three engines.
- **Evidence:** captures of a valid render and of the stale state with a
  visible diagnostic.

## M3 — Primitives & transforms

**Goal.** Every primitive can be sized, placed, and oriented.

**Scope.** `cube`, `box`, `cylinder` (DESIGN §5, §8 Primitives);
`translate`, `rotate`, `scale` with the D4 rotation convention and inside-out
nesting (DESIGN §8 Transforms); implicit union of multiple solids at top level
and in transform bodies (DESIGN §8 Implicit union). Transforms take exactly one
positional argument (D19). The three M2 backlog items are folded in (agreed
2026-09-10): the narrow-window divider wording, call-argument parentheses in
the nesting cap, and an e2e test of a resize mid-render.

**Dependencies.** M2.

**Done when**

- All Primitives, Transforms, and Implicit union scenarios pass.
- Golden images exist for each primitive and for a rotated and translated
  arrangement.
- **Evidence:** a capture showing all four primitives.

## M4 — CSG

**Goal.** Boolean modeling works; the headline bored-cube example renders
correctly.

**Scope.** Interval lists with per-endpoint normals and primitives;
`union`, `intersection`, and `difference`, including multi-child difference;
cutter-normal reversal; the ε rules, rays starting inside solids, and
two-sided shading (DESIGN §8 Boolean operations; Ray–solid intervals and
tolerance).

**Dependencies.** M3.

**Done when**

- All Boolean operations and Ray–solid intervals and tolerance scenarios pass,
  including `difference { A; A; }` being empty.
- The scaled-render scenario passes at ×1e-3 and ×1e5. `ε = 1e-6` and the
  `[1e-3, 1e5]` scale range are then marked final in DESIGN §5, or revised
  there with the measured reason.
- The bored-cube golden image (DESIGN §7 scenario) is committed and passing.
- **Evidence:** a capture of the bored cube.

## M5 — Lighting & material

**Goal.** Lights and model color are authored in the source.

**Scope.** `light` blocks (0–4, directional, intensity) replacing the default
key light; `material { color; }`; their validation (DESIGN §8 Lighting and
shading).

**Dependencies.** M2 (grammar); M4 recommended so lighting is judged on real
CSG models.

**Done when**

- All Lighting and shading scenarios pass.
- Golden images cover the default light, a declared light, two lights, and a
  non-default material color.
- **Evidence:** captures of the same model under two lighting setups.

## M6 — Persistence & examples (first release)

**Goal.** Work survives reloads and can be handed in and shared as files.

**Scope.** localStorage autosave and restore; Save (download `.csg`) and Open;
the three built-in examples and picker; bored cube on first launch; the
confirmation before replacing edited text (DESIGN §8 Save, load, and
examples; DESIGN §4 asset inventory).

**Dependencies.** M5 (examples should use lights/material where helpful), M4
(bored-cube and Boolean examples).

**Done when**

- All Save, load, and examples scenarios pass as e2e tests on all three
  engines.
- Every built-in example evaluates with no diagnostics and has a golden image.
- A full manual pass of DESIGN §8 in Safari is recorded.
- **Evidence:** captures of each built-in example.

---

## Backlog

Work discovered but not yet proposed, and scope deliberately deferred out of
changes. Promote a line by proposing a change; never silently delete one —
strike it through with a reason.

| | Item | From |
|---|---|---|
| ☐ | Add CI (full gate on push) once a git remote exists | CONSTRAINTS §4, D13 |
| ☐ | Dev server serves dotfiles (e.g. `/.git/config`) from the repo root. Loopback-only and within spec, but consider a 404 for dot-paths | `m0-foundations` Critic round 2 (informational) |
| ☐ | `serve.mjs` entry-point check: under the opt-in Node flag `--preserve-symlinks-main`, starting through a symlinked path exits 0 silently. Compare `realpath(fileURLToPath(import.meta.url))` as well | `m0-foundations` Critic round 6 (informational) |
| ☐ | CLAUDE.md layout says `e2e/*.spec.js`; align it with CONSTRAINTS/D-1 (`e2e/**/*.spec.js`) | `m0-foundations` Critic round 6 (informational) |
| ☑ | ~~Core-purity scanner: also catch imports and re-exports written without spaces (`import{x}from'node:fs'`, `export*from'node:fs'`)~~ Delivered in `m2-language-and-feedback` | `m1-first-pixels` Critic round 2 (low) |
| ☑ | ~~Add a D14 parallel-check test with a non-unit `up` vector~~ Delivered in `m2-language-and-feedback` (`test/core/camera.test.js`) | `m1-first-pixels` Critic round 2 (informational) |
| ☑ | ~~Editor-preview spec: say what happens when the window is too narrow for both 240 px minimums (`clampEditorWidth` keeps the editor's minimum, per design D-8)~~ Delivered in `m3-primitives-and-transforms` (spec wording; e2e at 400 px in `e2e/editor-preview.spec.js`) | `m2-language-and-feedback` Critic round 2 (low) |
| ☑ | ~~Nesting cap wording: DESIGN §5 says "each parenthesis", but call-argument parentheses are not counted (recursion stays bounded). Either count them or reword §5~~ Delivered in `m3-primitives-and-transforms` (counted; `test/core/parser.test.js`) | `m2-language-and-feedback` Critic round 2 (low) |
| ☑ | ~~Add an e2e test for a resize that arrives while a render is in progress (same cancel path as the tested newer-model case)~~ Delivered in `m3-primitives-and-transforms` (`e2e/live-rebuild.spec.js`) | `m2-language-and-feedback` Critic round 2 (informational) |
| ☑ | ~~Add a scene test for a top-level union of mixed primitive types (DESIGN §8 "Several top-level solids are unioned" names a sphere and a cube). The union code is already covered by transform-body tests and the `arrangement` golden~~ Delivered in `m4-csg` (`test/core/scene.test.js`) | `m3-primitives-and-transforms` Critic round 6 (informational) |
| ☑ | ~~Core-purity check: `src/core/` must not reference browser APIs — add with the first core code (M1)~~ Delivered in `m1-first-pixels` as `test/core-purity.test.js` | `m0-foundations` design, CONSTRAINTS §2 |
| ☐ | An `up` vector whose components underflow (for example `[0, t, t]` with `t` a `0.` followed by 199 zeros and a `1`) is nonzero, but reports "up must be nonzero". This mirrors the D16 overflow messages. It is best effort under D16; consider a clearer message | `m4-csg` Critic round 2 (informational) |
| ☑ | ~~Finalize `ε` and supported scene scale~~ Delivered in `m4-csg`. The scaled-render check passed with byte-identical renders, so `ε = 1e-6` is final and the scale is `[1e-3, 3e7]` | DESIGN §5, D7 |
| ☑ | ~~D20 in-face rays under rotations that are not multiples of 90°: the local direction carries a rounding residue of about `1e-16`, so a ray lying exactly in a face is decided by rounding. Revisit with `ε`, for example with a "within `ε` over the shared length" check for near-parallel slabs and the cylinder side~~ Closed in `m4-csg` by the owner: the narrowed D20 rule stays, because the effect is below what a render shows | `m3-primitives-and-transforms` Critic round 3 (medium; D20 narrowed by the owner) |
| ☐ | Parked optional features (non-uniform scale, GPU, cone/torus, 3D viewport, picking, orthographic camera, richer materials, point/colored lights, shadows, anti-aliasing/HiDPI, Web Worker rendering, syntax highlighting, mobile) | [DESIGN — Optional features](DESIGN.md#optional-features-parked) — not planned until requested |

---

## How this connects to the other layers

Milestones group **OpenSpec changes**; a change carries its own `tasks.md`;
everything else lives in the backlog table above. Change names are indicative,
not committed — each still needs its own `/opsx:propose`.
