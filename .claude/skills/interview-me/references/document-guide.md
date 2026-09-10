# Document coverage and decision placement

Read when mapping the interview into documents or checking for missing branches.
Existing project templates and user instructions take precedence over this
fallback structure. Fill only relevant sections; do not invent requirements to
fill a heading. Mark a required but irrelevant section not applicable with a
brief reason rather than silently removing it.

## DESIGN.md — what and why

Cover these decisions where relevant:

- Purpose, intended users, problem, and measurable outcomes.
- Product boundaries: the first release, exclusions, and parked features.
- Design principles that settle competing feature choices.
- User workflows or programmatic interfaces, inputs, outputs, and state changes.
- Data semantics and ownership, failure behavior, edge cases, and recovery.
- Visual or other presentation requirements and asset inventory if applicable.
- Constants and configurable behavior, with agreed values, units, and bounds.
- Feature-level acceptance scenarios, preferably Given/When/Then when the
  project's template uses BDD. Derive expected results from agreed requirements.
- Reference implementation differences that are deliberately matched or fixed.
- Links to delivery phases in ROADMAP and technical/process rules in CONSTRAINTS.

Distinguish current implementation from intended behavior. When they differ,
record the gap rather than rewriting the design to describe whatever exists.
Keep optional features explicitly out of scope until requested. Do not turn a
vision's broad promise into an unasked-for feature bundle.

## ROADMAP.md — order and completion

For each milestone record:

| Field | Content |
| --- | --- |
| Outcome | A usable or verifiable result, not just a list of files to write |
| Scope | Links to the accepted design capabilities delivered here |
| Dependencies | Earlier milestones, external prerequisites, and unresolved decisions |
| Done when | Observable acceptance conditions, full required gates, review, and evidence |
| Status | Planned, in progress, blocked, or complete, supported by actual evidence |

Start with the smallest useful end-to-end result the user agreed to. Include
setup or investigation work when it is necessary to make that result possible.
Do not schedule dependent work ahead of unresolved architectural constraints.
Use a backlog for explicit deferrals with the reason and a revisit trigger; do
not quietly move a requirement out of scope. Avoid speculative deadlines or
invented staffing. Update existing milestone IDs and status in place.

If OpenSpec is already the planning mechanism, link milestones to changes and
keep change-level tasks in their `tasks.md`. Do not install OpenSpec or introduce
it into another workflow just to fill the document.

## CONSTRAINTS.md — how and under which rules

Preserve existing numbering. For new documents, use this six-section layout so
§5 remains the definition of done and §6 remains the review process:

### 1. Platform and toolchain

Record deployment/runtime targets, languages, frameworks, version constraints,
dependency management, and environment setup. Investigate existing choices
before proposing replacements. An undecided stack remains explicitly TBD until
the user selects or delegates it; do not default every project to a web stack.
If Python is used, include the project's virtual-environment setup.

### 2. Architecture and boundaries

Record module responsibilities, dependency direction, ownership of state and
data, interface contracts, and relevant external services. Let product
requirements determine boundaries instead of imposing a particular architecture.

### 3. Runtime and operational requirements

Record relevant conventions and limits: units, time, ordering, reproducibility,
configuration, storage, failure/recovery, and deployment conditions. Explore
access, privacy, security, availability, and performance constraints when the
actual users, data, or environment make them consequential. Do not invent
compliance obligations or numerical service targets.

### 4. Development and planning workflow

Record setup/build/run commands, planning tools, task tracking, Git workflow,
and document authority/update rules. Distinguish verified commands from
proposed tooling that still needs implementation. Stage specific files. Carry
forward existing project rules; do not quietly loosen them during planning.

### 5. Definition of done

Require the full unit suite and other mandated gates to pass, acceptance
criteria to be verified, documentation to reflect the change, and deferred work
to be recorded. Record exact commands, environment prerequisites, and hook/CI
enforcement once chosen. Keep visual evidence conditional on visible output;
other milestones need suitable reproducible outputs or reports. Missing gates
and a required check that cannot run block completion, not planning discussion.

### 6. Critic review

Require a separate Writer and Critic pass before every archive and milestone.
Use `project-critic` where available; record the actual skill location, review
target, and invocation when established. If review tooling is not selected or
installed, track setup as a blocker before the first required review; do not
make the requirement optional or claim the skill is installed.

Specify independent diff inspection and gate execution, an explicit
`[APPROVED]` or `[REJECTED]` verdict, and failing tests verified against the
reviewed code where feasible (otherwise concrete reproduction evidence).
Required verification that cannot run prevents approval and must be identified
as incomplete verification. Rejected work returns to the Writer for fixes and
then a new review. Silence is not approval. A planning interview does not stand
in for Critic review.

## Source and ambiguity handling

Use existing `AMBIGUITIES.md`, decision records, glossary, and specifications.
When those do not exist, keep necessary unresolved items in the affected output
document rather than creating an entire new documentation system. Explain the
impact of contradictions before asking which requirement should govern.

Preserve existing instructions in AGENTS.md/CLAUDE.md. If the user authorized
updating project process documents, synchronize necessary links and layout
references; otherwise identify needed updates without editing unrelated files.
