---
name: interview-me
description: Interview the user to turn vision.md, a high-level plan, and existing project evidence into coherent DESIGN.md, ROADMAP.md, and CONSTRAINTS.md. Use when the user asks to be interviewed, flesh out a project vision, or resolve planning decisions collaboratively. Investigate discoverable facts, recommend an answer to each question, and persist agreed decisions into the project documents.
---

# Interview Me

Reach a shared understanding of what to build, in what order, and under which
technical and process constraints. Be persistent about consequential gaps,
precise about tradeoffs, and respectful of the user's attention. This is an
interactive planning and document-authoring task, not permission to implement
the product.

## 1. Establish the evidence and document map

Read the user's request and supplied plans, then inspect the project before
asking questions. Find `vision.md` case-insensitively, or the named high-level
input. Also read existing design, roadmap, constraints, project instructions,
README, ambiguity/decision records, and relevant specifications. Read linked
sources when accessible; report inaccessible inputs without inventing content.
If no vision file exists, use the supplied plan or conversation. If neither
states a goal, the first interview question should establish it.

Identify the actual project root and authoritative file paths. Default new
outputs to `DESIGN.md`, `ROADMAP.md`, and `CONSTRAINTS.md` at the project root.
Preserve existing names and locations, including `docs/CONSTRAINTS.md`, unless
the user requests migration. If multiple files compete as the authority, inspect
references and project instructions; ask only when that does not resolve it.
Do not create a parallel source of truth or rename files as incidental cleanup.

Inspect manifests, lockfiles, source entrypoints, tests, CI, and build scripts
as needed to answer factual questions. Determine what exists, what is proposed,
and what is unknown. A dependency in a manifest establishes current use, not a
user decision to retain it forever. Tests passing establish observed behavior,
not permission to override a conflicting specification.

Give a short initial synthesis: intended outcome, existing decisions, document
paths, and the most consequential gap. Cite concrete local evidence for facts.
Use [document-guide.md](references/document-guide.md) when mapping decisions to
sections and checking coverage. Preserve supplied templates and document
structure rather than replacing them with the fallback outline.

## 2. Build and traverse the decision tree

Track unresolved decisions with their prerequisites, affected documents, and
status: open, proposed, agreed, or explicitly deferred. Keep this lightweight
in conversation while actively interviewing; persist unresolved items in the
project's ambiguity register, or a concise open-decisions section in the
relevant document if no register exists. Do not add a second tracking system.

Start with intended users and outcomes, scope, and observable behavior. Resolve
constraints that can invalidate downstream choices before choosing a stack or
scheduling delivery. Follow each relevant branch until its decisions are
settled or explicitly deferred. Revisit dependent decisions when an upstream
answer changes; explain what is invalidated instead of retaining contradictions.

Do not ask the user to supply facts obtainable from the codebase or accessible
project materials. Investigate those first. Ask about intent, priorities,
tradeoffs, and conflicts evidence cannot settle. Do not ask a question whose
answer depends on another unanswered question. While awaiting an answer, only
continue independent investigation or document work based on established facts
and accepted decisions.

Use the coverage guide to find omissions, not as a questionnaire to recite.
Skip irrelevant branches and already answered questions. Do not reopen an
accepted decision without new evidence, a conflict, or a request to reconsider.

## 3. Ask a question the user can decide

Ask one focused question at a time by default, then wait for the answer. If the
user asks for batches, group only independent questions whose prerequisites are
settled. Every question includes:

- The decision and why it matters now, with enough context to answer it.
- Your recommended answer and a brief reason tied to this project's goals and
  evidence, including its material tradeoff.
- Alternatives when comparison helps; permit a free-form answer.

For example:

> Should the first release support shared workspaces?
> I recommend personal workspaces first because your stated first milestone is
> solo use; that postpones invitations and permission rules. Shared workspaces
> would support the team use case immediately but expand the first release.

Use an available question tool if appropriate; otherwise ask in plain text.
Keep wording accessible and explain technical choices through their effect on
the project. Research time-sensitive compatibility or product claims from
primary sources before recommending them; label any limits on verification.
Do not invent budgets, deadlines, performance targets, or user preferences.
Where a number needs evidence, recommend a way to measure it before freezing it.

Recommendations are proposals until accepted. Silence, elapsed time, tool
preselection, and an unanswered question do not constitute acceptance. If the
user explicitly delegates a choice, make it and record the rationale and that
it was delegated. If they do not know, propose a concrete default, investigation,
or deferral with its consequences. Do not keep repeating an unanswerable question.

## 4. Write the documents as understanding develops

Creating or filling these documents is part of this skill's task. Persist
established requirements and accepted answers incrementally without asking
permission after each edit. Respect an explicit interview-only or no-edit
request by keeping drafts in conversation instead.

Preserve existing content, user edits, and settled decisions. Before updating a
file, check its current contents. Make focused changes, not wholesale rewrites.
Treat high-level aspirations as inputs to refine, not as complete acceptance
criteria. If a new answer contradicts an existing requirement, establish that
the user intends to supersede it before changing the affected documents.

Keep responsibilities distinct:

- `DESIGN.md`: intended behavior, scope, outcomes, and acceptance scenarios.
- `ROADMAP.md`: delivery order, dependencies, milestone acceptance, and backlog.
- `CONSTRAINTS.md`: stack, architecture, environments, quality gates, and process.

Link between them instead of duplicating detailed rules. Preserve an existing
authority hierarchy and cross-reference conventions. Record the rationale for
consequential decisions and their source, such as an existing requirement or
an accepted interview answer. Clearly distinguish proposals and unresolved TBDs
from requirements; do not write a recommendation as a binding SHALL.

Every unresolved item must say what is missing, what it blocks, and the next
decision or investigation needed. A consciously deferred future choice is not
an implementation blocker today unless a current decision depends on it.
Record resolved ambiguities using the project's existing convention.

## 5. Check coherence and close deliberately

After a meaningful set of decisions, summarize only the changes and remaining
blockers; continue with the next unresolved prerequisite. When the user asks to
pause or time-box the interview, save accepted decisions, outstanding questions,
and the next branch to resume. Mark the result partial; do not call it complete.

Before the final readback, check that:

- In-scope capabilities have observable acceptance criteria. Roadmap milestones
  point to them and do not introduce unagreed features.
- Dependencies permit the stated order and the first milestone is feasible
  under the selected constraints. Dates are commitments only when agreed.
- Stack/process decisions are recorded consistently; relevant TBDs are either
  resolved or explicitly blocking. Proposed commands are not claimed as tested.
- Required tests, evidence, and independent Critic review are represented in
  the completion criteria. Writing these documents does not grant approval or
  establish that the product is implemented or tested.
- References resolve, existing instructions are consistent with the documents,
  and no recommendation has silently become a requirement.

Present a concise readback of scope, first deliverable, key stack/process
choices, and deliberate deferrals. Ask whether this captures the user's intent,
including your recommended answer and the reason. Resolve corrections rather
than asking for repeated approval of unchanged decisions. If the user has
already explicitly confirmed that same readback, do not ask again.

Call the interview complete only when the agreed interview scope has been
covered and shared understanding confirmed. Describe implementation readiness
separately: unresolved near-term blockers mean the plan is not ready to build.
Finish with links to the documents and any remaining deferred decisions. Do not
start implementation, install tools, commit, publish, or archive merely because
the interview concluded; those actions need authorization in the task context.
