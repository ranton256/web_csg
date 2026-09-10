# TODO: project name

> **TODO: one paragraph describing the project** — what it is, who it serves,
> and its target platform. The technology stack is TBD until selected and
> recorded in `CONSTRAINTS.md`. Fill in the TODOs and resolve the relevant
> TBDs before starting work that depends on them; then delete this note.

**Specifications are the source of truth for behavior. Code implements them
and is expected to be rewritten when a better implementation appears.** When
code and spec disagree, the spec wins or the spec gets changed — never a
silent divergence. Spec gaps go to `AMBIGUITIES.md`, never resolved silently.

## Read these before doing anything

| File | What it governs |
| --- | --- |
| `DESIGN.md` | What the project is: objectives, design principles, constants/configuration, and features. **Wins over every other project design or planning document.** |
| `ROADMAP.md` | Milestones, "done when", and the cross-change backlog |
| `CONSTRAINTS.md` | Stack, architecture boundaries, reproducibility requirements, testing, and review. §5 is the definition of done; §6 is how it is judged. |
| `AMBIGUITIES.md` | The spec-gap register |
| `GOTCHAS.md` | Symptom-first debugging notes. Read before debugging anything. |
| `openspec/config.yaml` | Standing constraints injected into every planning artifact |

### Document layout

```text
DESIGN.md
ROADMAP.md
AMBIGUITIES.md
GOTCHAS.md
CONSTRAINTS.md
docs/
  progress/                 # Milestone verification evidence
openspec/
  config.yaml
  specs/                    # Current behavior specifications
  changes/
    <change>/
      tasks.md              # Current implementation checklist
      specs/                # This change's specification deltas
    archive/                # Completed, verified, approved changes
```

Keep detailed behavior in its authoritative specification; use links from
planning documents rather than maintaining conflicting copies.

## Toolchain

| Area | Requirement |
| --- | --- |
| Platform / runtime | **TBD** — record supported targets, versions, and how they are selected in `CONSTRAINTS.md` |
| Languages / frameworks | **TBD** — record the chosen stack and version constraints before implementation depends on it |
| Environment / dependencies | **TBD** — document reproducible setup and dependency installation; Python work uses a virtual environment |
| Gate | **TBD command** — runs all unit tests and required checks; must be green before work is done |
| Gate enforcement | **TBD** — document hook and/or CI enforcement and its setup |
| Focused tests | **TBD command** — runs one test or suite during development; does not replace the full gate |
| Verification evidence | **TBD commands** — produce the outputs needed to verify milestone acceptance criteria |
| Critic | **Required:** `project-critic` skill, in a separate review pass. **TBD:** installation location and invocation for the chosen agent environment; record in `CONSTRAINTS.md` §6. |
| Planning | `openspec` — explore → propose → apply → archive; record the commands supported by the installed version |

Record exact setup, build/run, test, and verification commands in
`CONSTRAINTS.md`. Checks intended for unattended execution must run
without interactive input. Document any required services or graphical test
environment. An unresolved gate or Critic setup is not a waiver of verification
or review.

## Rules that erode first under pressure

1. **Keep `tasks.md` current.** Check off each task as it completes; work that
   appears nowhere is untracked scope. Deferred work becomes a `ROADMAP.md`
   backlog line before the change archives.
2. **Writer and Critic are never the same pass.** Require a separate
   adversarial review against the spec before every archive and milestone,
   with an explicit **[APPROVED]** / **[REJECTED]** verdict. The Critic obtains
   the diff and runs the required checks independently. Fix rejected work and
   obtain a new review before proceeding. Silence is not approval.
3. **Show the work.** Milestones require committed verification evidence in
   `docs/progress/`, matched to their acceptance criteria. For visible output,
   include a representative capture or rendered artifact; a green suite does
   not establish visual correctness. For other work, retain reproducible
   commands and relevant outputs or reports.
4. **Check the docs for drift before marking anything done.** Behavior changed
   → the change's `specs/` change in the same commit. Ambiguity resolved →
   `AMBIGUITIES.md`. Milestone moved → `ROADMAP.md`. Stack or constraints
   changed → `CONSTRAINTS.md` and any affected standing constraints in
   `openspec/config.yaml`.
5. **A green suite is not evidence on its own.** When a gate or suite changes,
   deliberately break what it guards in an isolated copy and watch the right
   failure once. Preserve the working tree and report what was verified.

## Non-negotiables

- Run all unit tests and required project gates, inspect the results, and fix
  failures before committing or declaring work complete. A check that could
  not run has not passed.
- Critic findings must include a failing test verified against the reviewed
  code where feasible, or concrete reproduction evidence. The review pass
  evaluates the implementation; it does not repair it.
- **TBD: architecture boundaries** — identify the core logic, permitted
  dependencies, and ownership of state in `CONSTRAINTS.md` before
  implementing those boundaries.
- **TBD: reproducibility requirements** — specify control of time, randomness,
  and external inputs where relevant to project behavior and verification.
- Build and test from a fresh checkout using the documented setup; do not rely
  on undeclared local files, caches, or editor state.
- When working on Python code, use `.venv` or `venv`; create a virtual
  environment if neither exists before installing packages.
- Never `git add -A` or `git add .`. Stage files explicitly.

> **TODO: this project's own non-negotiables and Git workflow.** Resolve the
> applicable TBDs in the authoritative documents and keep this entrypoint
> consistent with them.
