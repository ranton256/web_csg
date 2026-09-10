# Roadmap

Milestones for TODO: project name.

Each milestone is a **demonstrable state of the product** — you can sit down at
the build and see what changed. If a milestone cannot be demonstrated, it is a
task list wearing a milestone's clothes. The GDD's roadmap section sets the
initial shape; copy it here and keep this file current as reality diverges.

**Every milestone requires committed visual proof** — a capture in
[`docs/progress/`](docs/progress/README.md) produced by `tools/capture.sh`.
See [CONSTRAINTS §6 Review](docs/CONSTRAINTS.md).

---

## The shape

| | Milestone | Goal | Size |
|---|---|---|---|
| **M0** | Foundations | The project can verify itself | S |
| **M1** | TODO | TODO — the thinnest end-to-end slice you can demonstrate | |
| **M2** | TODO | TODO | |

---

## M0 — Foundations

**Goal.** The project can verify itself before there is much to verify.

Mostly ships with the skeleton. **Done when**

- `tools/test.sh` is green
- The pre-commit hook is installed (`tools/install_hooks.sh`) and has been
  seen to fail once (break an assertion, watch the commit bounce, restore it)
- The TODOs in `project.godot`, `openspec/config.yaml`, `CLAUDE.md`, this
  file, and `docs/CONSTRAINTS.md` §1 are filled in
- The GDD is in the repo (or linked) and named in `openspec/config.yaml`
- The first capture is committed to `docs/progress/` — an empty scene proves
  the path works while nothing is at stake

## M1 — TODO

> The first milestone after foundations should be the **thinnest end-to-end
> slice you can demonstrate** — input reaching the simulation, the simulation
> reaching the view, one gate proving it. Not a subsystem. A slice.

**Done when**
- TODO: demonstrable criteria, not task completion
- **Visual proof:** a capture of the slice actually running

---

## Backlog

Work discovered but not yet proposed, and scope deliberately deferred out of
changes. A line here costs nothing; an untracked idea costs the next person a
rediscovery. Promote a line by proposing a change; never silently delete one —
strike it through with a reason.

| | Item | From |
|---|---|---|
| ☐ | *(example)* core-purity grep gate for `scripts/core/` | CONSTRAINTS V3 |

---

## How this connects to the other layers

Milestones group **changes**; a change carries its own `tasks.md`; everything
else lives in the backlog table above. Change names in a roadmap are
indicative, not committed — each still needs its own `/opsx:propose`.
