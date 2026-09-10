# [PROJECT NAME] — Project Design Document and Feature Specification

<!--
COURSE TEMPLATE — how to use this file:
Replace every [BRACKETED] item and delete the guidance comments as you go.
This template merges a product-style one-pager with a buildable BDD
specification. The goal: one document a human OR an AI coding agent can
build the project from — and verify it against — without seeing reference code.
Sections marked (REQUIRED) must be filled in; others may be trimmed for
small projects, but say so rather than deleting silently.
-->

## How to read this document (REQUIRED)

<!-- Keep this section nearly verbatim — it is the contract for the reader. -->

This document is a product overview followed by asset requirements, hard
technical constraints, exact configuration values, and functional requirements as
BDD (behavior-driven development) scenarios in Gherkin format. The Gherkin
features are the required functionality. The final "Optional features" section is
parked: **do not implement anything in it unless it is specifically
requested.** Where this spec deliberately differs from a reference
implementation, the "Reference notes" section says so — match this spec, not
the reference.

## 1. High level (REQUIRED)

<!-- 1–3 sentences: elevator pitch plus the fundamental product decisions. -->

[Pitch.]

- **Platform:** [target platforms and operating systems]
- **Stack:** [language + frameworks/libraries — this is a constraint, not a suggestion]
- **Scope:** [boundaries of the project]

## 2. Product objectives

<!-- 2–5 measurable outcomes. Why does this project exist? -->

- **[Objective]:** [measurable outcome]

## 3. Design principles

<!-- 2–4 declarative statements that resolve design arguments later.
     If a proposed feature conflicts with a principle, the principle wins. -->

- **[Principle]:** [one sentence]

## 4. Visual design and assets

<!-- 1–3 bullets on look/feel, then the asset inventory. -->

### Asset inventory (REQUIRED)

<!-- Every asset the project needs: exact dimensions where applicable,
     format, and role.
     Mark each as PROVIDED (in the repo), GENERATE (AI tools), or CREATE.
     An agent building the project reads requirements from here — be exact. -->

| Asset  | Dimensions | Format   | Status                    | Role            |
| ------ | ---------- | -------- | ------------------------- | --------------- |
| [name] | [size/N/A] | [format] | [PROVIDED/GENERATE/CREATE] | [what it's for] |

## 5. Constants and configuration (REQUIRED)

<!-- The single source of truth for every tunable number.
     If a scenario below references a number, it must appear here.
     Lessons from the course trial runs: agents implement tables like this
     exactly — ambiguity here becomes a bug later. Include units and
     conventions. -->

| Constant / setting | Value           | Notes |
| ------------------ | --------------- | ----- |
| [name]             | [value + units] |       |

## 6. Technical constraints (REQUIRED)

<!-- Hard requirements on HOW the project is built: framework versions,
     language, architecture rules, file layout rules, portability requirements.
     Trial-run lessons to apply here:
     - Pin versions — version drift between spec and reality was a
       clean-room surprise.
     - State units and inclusive/exclusive conventions explicitly.
     - Where randomness is used, say where it comes from and require it
       to be seedable. -->

1. **Frameworks / libraries:** [versions; what must/must not be used directly]
2. **Language:** [language/tooling versions]
3. **Architecture:** [structure the implementation must follow]
4. **Conventions:** [units, inclusive/exclusive bounds, other applicable conventions]
5. **Randomness & determinism:** [requirements for reproducibility, where applicable]
6. **Portability:** [deployment targets, path rules]

## 7. Diagnostics and test tooling (REQUIRED)

<!-- An agent can't debug what it can't see or reproduce. These are real
     features with scenarios in §8 — spec them like everything else. -->

The project SHALL include:

- **Scripted test support** — the project must be drivable programmatically with controlled inputs and conditions so scripted runs are reproducible. [Describe the mechanism for your stack.]

## 8. Feature specification — BDD (REQUIRED)

<!-- The heart of the document. One "### Feature:" per capability — these
     map 1:1 to OpenSpec capabilities during the build. Every externally
     observable behavior belongs here as a scenario; each scenario should
     be verifiable by a person or a test script. Use concrete numbers from
     §5 — repeat them, don't just point at the table.

     Format per feature:

     ### Feature: [Capability name]

     ```gherkin
     Scenario: [Short name]
       Given [precondition]
       When [action/event]
       Then [observable outcome]
       And [additional outcome]
     ```

     Checklist of commonly-missed features:
     input edge cases (inputs that must do NOTHING), output ordering,
     exact reset/restart semantics (what is and is NOT restored),
     success/failure states and how input handling changes in them,
     and shutting down cleanly. -->

### Feature: [First capability]

```gherkin
Scenario: [name]
  Given [ ... ]
  When [ ... ]
  Then [ ... ]
```

## 9. Build, test, and verify (REQUIRED)

<!-- How to build and run; what automated tests must exist (pure logic gets
     unit tests); the manual test checklist derived from §8 scenarios;
     what the scripted tests must prove before a change is "done". -->

```
[build/run commands]
[test commands]
```

## 10. Reference notes (match-or-fix)

<!-- If a reference implementation exists, list every known quirk or bug in
     it and DECIDE: match it or fix it. Each entry: what the reference does,
     what this spec requires, and why. A rewrite is the moment to fix bugs —
     but only deliberately and on the record. Delete this section only if
     there is no reference implementation. -->

| # | Reference behavior | This spec                | Why         |
| - | ------------------ | ------------------------ | ----------- |
| 1 | [quirk]            | [match/fix + requirement] | [rationale] |

## 11. Roadmap (phased delivery)

<!-- Break the build into phases (P1, P2, ...), each small enough to be one
     OpenSpec change: propose → implement → verify → archive. Ship a working
     slice early, with test gates between phases. -->

| Phase | Delivers                 | Verified by |
| ----- | ------------------------ | ----------- |
| P1    | [smallest working slice] | [gate]      |
| P2    | [ ... ]                  | [ ... ]     |

## Optional features (parked)

<!-- Ideas that are explicitly OUT of scope until requested. Being listed
     here is a fence, not a plan. Students: your extension assignments will
     often come from this section — spec the change first, then build. -->

- **[Feature]:** [1–3 requirement-style bullets so it can be spec'd quickly later]
