# Audit checklist

Failure modes in priority order. Not exhaustive — the diff decides what matters.

## 1. Tests that cannot fail

A green suite that proves nothing hides defects. For every new or changed
assertion, ask what value would make it fail and whether that value is reachable.

- A helper that compensates for the behavior its test claims to assert, such as
  retrying or changing state before the assertion observes the original result.
- A tolerance wide enough to swallow the effect being measured.
- A fixture whose expected value was copied out of a run rather than derived
  from the requirements.
- A test asserting a state the code reaches by some other route anyway, so the
  mechanism it names is never exercised.
- A comment claiming a property the fixture does not have.

**Break it to check.** In an isolated copy, revert the relevant change or mutate
what the assertion depends on, and confirm the test goes red for the stated
reason. Do not revert the user's work in place.

## 2. Logic and state integrity

- Framework, infrastructure, or platform dependencies leaking into a layer
  required to remain independent of them.
- Time-dependent logic reading wall time where the project requires a
  controlled clock or an explicit time model.
- Randomness bypassing the project's controlled source where reproducibility
  is required — and whether the determinism test would notice if it did.
  Repeating one seed proves repeatability, not independence from other sources.
- Presentation code changing domain state outside the declared update boundary.
- Presentation-only settings influencing results they must not affect.
- Sampling or batching that skips events or boundaries the specification
  requires detecting. Compute the maximum step or batch against the smallest
  relevant interval or limit.
- Order-dependent resolution: a tie broken by collection order; a float epsilon
  comparison folded across a running best (epsilon equality is not transitive);
  a lookup returning `-1` for an unlisted key and sorting ahead of everything.
- State reset on one path but not another — compare every reset site against
  the fields the type declares, not against the other reset site.
- Fields excluded from snapshots or traces, leaving relevant state invisible
  to reproducibility tests or scripted verification.
- Off-by-one at state entry, counters, or interval boundaries: check the
  implementation consistently follows the specified counting convention.

## 3. Configuration and packaging

- Settings named by the design actually present in configuration and verified.
  An unset option may silently fall back to an incompatible default.
- Required runtime, framework, and dependency versions pinned as the project
  requires, and the work built against those versions.
- Resource metadata and generated companion files consistent with their sources:
  no stale references to deleted files or missing required companions.
- Imports and resource paths that work on a fresh checkout, without relying on
  a developer's cache, editor session, or local environment.
- Generated files hand-edited in ways the generating tool will overwrite.
- Third-party resources: required license, attribution, and modification notices
  present and shipped; source resources preserved where required; derived
  copies reproducible from a committed tool.
- Packaging rules include required resources and exclude directories that must
  not ship.

## 4. Specification drift, both directions

Code that no longer matches the design document, **and** design language that no
longer matches the code. A silent divergence is a defect even when the code is
the better behavior: the spec wins, or the spec changes in the reviewed change.

- Every scenario in the change's specs has a test or scripted verification.
- That test exercises the scenario **as written**, rather than sharing its name.
- Specs internally consistent: two requirements that cannot both hold are a
  defect in the spec even if the code satisfies one of them.

## 5. Unsupported quantitative claims

Every number in a comment, commit message, design document, or test name is a
claim. Re-derive the ones that carry weight. Report any that do not reproduce,
with the value you got instead. Check the derivation too, not only the
arithmetic — a parameter space computed over the wrong inputs gives a confident
wrong answer.

## 6. Drift and scope

- Documentation across the design document, roadmap, ambiguity register, and
  debugging notes, where maintained.
- Ambiguities resolved silently instead of recorded.
- Work in the diff outside the requested scope or recorded task.
- Verification used to sign off that cannot be reproduced from retained
  commands, tools, and inputs. A number produced once in a terminal is not
  repeatable evidence.

## 7. What a green suite cannot tell you

Behavior passing its tests says nothing about whether the presentation looks
right. If the work changes visible output, inspect representative rendered
output or captures against the requirements. Check that completion claims have
reviewable visual evidence where relevant, retained according to project rules.
Do not impose screenshot requirements on projects without visual output.
