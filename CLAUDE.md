# Web CSG

Web CSG is a small constructive solid geometry modeler that runs in desktop
browsers (current stable Chrome, Firefox, and Safari). Users describe a scene
in a small declarative modeling language, and a pure-JavaScript CPU ray tracer
renders it to a 2D `<canvas>`. It is a **course exemplar**: a worked example
of spec-driven development that students read, rebuild from the spec, and
extend with the parked optional features.

**Specifications are the source of truth for behavior. Code implements them
and is expected to be rewritten when a better implementation appears.** When
code and spec disagree, the spec wins or the spec gets changed — never a
silent divergence. Spec gaps go to the open-decisions register in
[DESIGN §12](DESIGN.md#12-open-decisions), never resolved silently.

## Read these before doing anything

| File | What it governs |
| --- | --- |
| `DESIGN.md` | What the project is: objectives, principles, constants (§5), BDD features (§8), open decisions (§12), parked features. **Wins over every other project design or planning document.** |
| `ROADMAP.md` | Milestones M0–M6, "done when", and the cross-change backlog |
| `CONSTRAINTS.md` | Stack, architecture boundaries, determinism, workflow, and commands. §5 is the definition of done; §6 is how it is judged. |
| `openspec/config.yaml` | Standing constraints injected into every planning artifact |
| `vision.md` | The original high-level input. Historical; `DESIGN.md` supersedes it. |
| `templates/` | Source templates for the planning documents. Not project requirements. |

### Document layout

```text
CLAUDE.md
DESIGN.md
ROADMAP.md
CONSTRAINTS.md
vision.md
index.html                  # App entry page
package.json                # Scripts; @playwright/test is the only dev dependency
playwright.config.js        # e2e: Chromium, Firefox, WebKit on port 4173
vercel.json                 # Static hosting: no install, no build, root as output
.vercelignore               # What the deployment withholds
src/
  core/                     # DOM-free core (from M1)
  ui/                       # Browser shell (from M1)
test/
  **/*.test.js              # Node unit + golden tests (npm test)
  support/                  # PPM + golden helpers (never run as tests)
  golden/                   # Reference renders (binary PPM)
e2e/
  **/*.spec.js              # Playwright tests (npm run test:e2e)
tools/
  serve.mjs                 # Zero-dependency static dev server
  capture.mjs               # Milestone screenshots
  golden-update.mjs         # Runs the suite in golden-update mode
  hooks/pre-commit          # Runs npm test
docs/
  progress/<milestone>/     # Milestone evidence: captures + README.md
templates/
openspec/
  config.yaml
  specs/                    # Current behavior specifications
  changes/
    <change>/
      tasks.md              # Current implementation checklist
      specs/                # This change's specification deltas
    archive/                # Completed, verified, approved changes
```

The module layout inside `src/` is decided in the M1 proposal and recorded in
CONSTRAINTS §2. Keep detailed behavior in its authoritative specification;
link from planning documents rather than maintaining conflicting copies.

## Toolchain

Verified in M0. Exact rules live in [CONSTRAINTS §1 and §4](CONSTRAINTS.md).

| Area | Requirement |
| --- | --- |
| Platform / runtime | Current stable desktop Chrome, Firefox, Safari. No mobile/touch. |
| Languages / frameworks | Plain JavaScript ES modules, **no build step**. No TypeScript, bundler, UI framework, ThreeJS, or WebGL. No runtime dependencies. |
| Environment / dependencies | Node.js ≥ 22. `npm install && npx playwright install && npm run hooks:install`. Dev dependency: `@playwright/test` only, pinned exactly at `1.63.0`. |
| Run the app | `npm start` (serves the repo over HTTP; ES modules do not load from `file://`) |
| Deploy the app | `npx vercel deploy --prod` — static hosting at <https://csg.ranton.org>; deploy only gate-green work (CONSTRAINTS §1, §4) |
| Gate | `npm run check` — unit + golden-image tests (`npm test`) then Playwright e2e on Chromium, Firefox, WebKit (`npm run test:e2e`). Must be green before work is done. |
| Gate enforcement | Pre-commit hook runs `npm test`. The full gate is run by process before every merge, archive, and milestone (the project has no CI, by the owner's decision D24). |
| Focused tests | `node --test path/to/file.test.js` — does not replace the full gate |
| Verification evidence | `npm run capture -- <milestone>` → `docs/progress/<milestone>/` (add shots to the list in `tools/capture.mjs`), plus a README recording the criteria checked, gate result, and manual Safari smoke check |
| Golden images | `npm run golden:update` — deliberate use only; review the image diff in the same change |
| Critic | **Required:** `project-critic` skill at `.claude/skills/project-critic/`, in a separate review pass with an explicit review target (CONSTRAINTS §6) |
| Planning | OpenSpec 1.9.0 — `/opsx:explore` → `/opsx:propose` → `/opsx:apply` → `/opsx:archive` |

Checks intended for unattended execution must run without interactive input.
An unresolved gate or Critic setup is not a waiver of verification or review.

## Rules that erode first under pressure

1. **Keep `tasks.md` current.** Check off each task as it completes; work that
   appears nowhere is untracked scope. Deferred work becomes a `ROADMAP.md`
   backlog line before the change archives.
2. **Writer and Critic are never the same pass.** Require a separate
   adversarial review against the spec before every archive and milestone,
   with an explicit **[APPROVED]** / **[REJECTED]** verdict. The Critic obtains
   the diff and runs the gates independently. Fix rejected work and obtain a
   new review before proceeding. Silence is not approval.
3. **Show the work.** Milestones require committed evidence in
   `docs/progress/<milestone>/` matched to their acceptance criteria. This is
   a renderer: a green suite does not establish visual correctness, so
   include captures.
4. **Check the docs for drift before marking anything done.** Behavior changed
   → the change's `specs/` (and DESIGN §8 if affected) in the same commit.
   Ambiguity resolved → DESIGN §12. Milestone moved → `ROADMAP.md`. Stack or
   constraints changed → `CONSTRAINTS.md`, `openspec/config.yaml`, and this
   file.
5. **A green suite is not evidence on its own.** When a gate or suite changes,
   deliberately break what it guards in an isolated copy and watch the right
   failure once. Preserve the working tree and report what was verified.
6. **Parked means parked.** Do not implement anything in DESIGN's "Optional
   features (parked)" section unless it is specifically requested.

## Non-negotiables

- Run all unit tests and required project gates, inspect the results, and fix
  failures before committing or declaring work complete. A check that could
  not run has not passed. Never dismiss failures as pre-existing or
  insignificant, and never commit broken or untested code.
- Critic findings must include a failing test verified against the reviewed
  code where feasible, or concrete reproduction evidence. The review pass
  evaluates the implementation; it does not repair it.
- **Architecture boundaries** (CONSTRAINTS §2): the parser, evaluator, CSG
  representation, and ray tracer/shader are a **DOM-free core** — no
  `window`, `document`, canvas, or other browser APIs — so they run unchanged
  under Node. The browser shell depends on the core, never the reverse.
- **Reproducibility** (CONSTRAINTS §3): rendering is deterministic — the same
  source and canvas size produce the same pixels. No randomness. The camera
  comes only from source. All numeric constants come from DESIGN §5; do not
  invent or tune values in code.
- Build and test from a fresh checkout using the documented setup; do not rely
  on undeclared local files, caches, or editor state.
- When working on Python code, use `.venv` or `venv`; create a virtual
  environment if neither exists before installing packages.
- Never `git add -A` or `git add .`. Stage files explicitly.

### Git workflow

- Default branch: `main`, pushed to `git@github.com:ranton256/web_csg.git`.
- One branch per OpenSpec change. Merge into the default branch only after
  `npm run check` passes and the Critic returns `[APPROVED]`.
