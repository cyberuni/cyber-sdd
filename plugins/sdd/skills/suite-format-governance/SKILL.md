---
name: suite-format-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
---

# Suite-Format Governance — the acceptance behavior-suite bar

Form authority for a `.feature` behavior suite: how it is written and judged. Fixed-universal SDD
governance — the spec-producer self-aligns to it, and each actor bar (`oracle` / `architect` /
`builder`) judges its slice of it backward at the gates. Governs the `.feature` of a **behavioral**
spec only; descriptive and reference nodes carry no suite. Every scenario collapses to **one
pass/fail** at the verification point — never a score.

## The suite specifies acceptance only — strict

A `.feature` specifies **acceptance** — the observable **decisions** the node owns — and nothing else.

- **Decisions only.** A scenario tests a **decision** — a branch the capability takes. A non-branch
  **invariant** that always holds ("output is valid JSON", "idempotent") is **not acceptance** and is
  not specified here — it is covered by the implementation's own tests.
- **The node's own decisions.** A property **co-owned** across a seam — activation/routing (does this
  config fire?), a sibling's behavior, harness wiring — is not this node's to freeze; it is **out of
  scope** (Oracle relocates or kills it).
- The only escape from strict is a user **pin** (below).

## The suite is the capability's decision graph

The suite **is** the node's decision graph at acceptance level. Author it as one:

- **One scenario = one edge** — a single decision taking a single branch.
- **Cover every branch.** A decision whose only covered edges are its "no" branches is incomplete: a
  **kill / reject / guard edge is paired with a positive companion** driving the same path in its
  firing direction. A lone negative is passed by a do-nothing subject (the sorted list that "stays
  sorted" under `sort = identity`).
- **Each edge isolates a specific condition** — the `Given` sets up the exact state forcing *this*
  branch and not its sibling, and hands over **no** part of the verdict. A scenario asserting a finding
  asserts its **binding consequence** (withholds the pass, blocks the gate), never just its emission.

A **dead edge** — one no plausible wrong subject takes the wrong way — measures nothing: a missing
guard, an orphaned negative, or a `Given` that states its own answer. The **miss test** settles it:
*name a plausible wrong subject and check it takes the wrong branch; if none can, the edge is
inert.* Plausible, not strawman — a memorizer, a copier, a single-brancher, never an empty artifact.
Discrimination is **judged, not linted**; a **measured ceiling is a tell an edge cannot be lost**,
not evidence it works. Rubric-dimension discrimination detail: `references/rubric.md`.

## Sections mirror the spec's use-case groups; every scenario binds to a map edge

`spec.md` sections the node by **use-case group**, each carrying a drawn **logic graph** and an
explicit **scenario-map** table (`sdd:spec-format-governance`). The `.feature` **mirrors** it:

- Group scenarios under `# ── <use-case group> ──` comments — same groups, same order — screaming
  the intents; never sectioned by layer, output format, or "misc rules".
- **The map is 1:1** — every scenario binds to exactly one graph edge, and every edge to exactly one
  scenario. A scenario off the map is an orphan; an edge with none is a coverage hole; two scenarios
  on one edge is a duplicate (split the edge, or push the variance down to units). `check-suite` lints
  all three.

## `@pinned` — user-owned seed scenarios

A **user** may mark a scenario `@pinned`. It is **user-owned** (`sdd:ownership-governance`) — the one
scenario class the agent does not own:

- **Agent proposes, user disposes.** The agent may propose changing or removing a `@pinned` scenario;
  it may **not execute** the change without in-session user authorization — the authority of a human
  ratification (positional, not relayable, not self-assertable within leash). Ownership is
  lifecycle-independent: the pin holds in `draft` and survives a re-open; freeze does not enter.
- **Only the user pins.** The agent never applies `@pinned`.
- **A pin is a seed.** It marks a behavior the decision graph did not reach; the agent **grows the
  graph around it** — proposing the sibling branches, guards, and companions the pinned behavior
  implies (agent-owned; only the seed stays pinned).
- It is the **override to strict** — kept whatever strict would prune.

## One behavior per scenario — SRP and dedup

One edge per scenario; one canonical scenario per edge. A scenario with several unrelated `Then`s
churns and its name lies — split it. Two scenarios sharing a `When`+`Then` core are a duplicate —
dedup to the canonical (never dedup away a `@pinned` scenario without consent).

## Form 1 — pure-boolean Gherkin (default)

`Given / When / Then` whose every `Then` is an **observable, deterministic boolean** — outputs, exit
codes, side effects, emitted events; never internal state, function names, or the authoring process
("co-developed", "written test-first" are unobservable — assert the end-state instead). Use whenever
the branch is directly checkable.

## Form 2 — rubric Gherkin (`@rubric`, judged by hand)

For a branch whose correctness is a **gradient judgment** across dimensions no single boolean
captures. Structure: a rubric block with named dimensions, per-dimension `max`, exactly one
`threshold`, a collapsing `Then`, **no double-barreled dimension**. Selection (is a dimension
substitutable), threshold policy, and cSEM: load `references/rubric.md` before authoring or judging
one. Collapses to one boolean per scenario at the verification point, like every other scenario.

## A `Given` is a test vector, not specification

The implementation owes conformance to the `Then`, nothing to the `Given`'s apparatus. A `Given`
carries a **precondition** (the state the `Then` is asserted under — contract, the impl handles it)
and **apparatus** (domain, names, framing — a test vector, binds nothing). **Swap test:** substitute
the domain for an unrelated one; if the `Then` still holds, what was swapped is apparatus. **No
absorption** — no producer lifts a `Given`'s apparatus into the artifact as a worked example, and no
artifact illustration is lifted into a `Given`; each draws from a domain the other does not probe.
Judged semantically, not lexically.

## Pairwise consistency — no two scenarios contradict on one snapshot

Within one suite, no two scenarios may demand **opposite verdicts** on a single constructible state.
A contradiction needs a shared `When` **and** an overlapping `Given`; different `When`s over one
state do not contradict. **Specialization is not contradiction** — a specific scenario whose narrower
`Given` carves an exception wins on it; read a pair as generic/specific before reading it as a
conflict. The remedy is a `Given` narrowing. Judged, not linted; the `Conflict` hard floor is the
post-freeze backstop.

## Optional conventions — layer tags and enumerated cases

Additive and plugin-facing (e.g. ACED); untagged plain suites are unaffected and the structural
check ignores unrecognized tags.

- **Layer tags** route a scenario to a resolved judge's evaluation layer (`@behavior`, `@quality`,
  and — where the node genuinely owns the routing decision — `@trigger`). Orthogonal to `@rubric`.
- **`Scenario Outline` is a rare exception, not a default** (DAMP over DRY) — legitimate only for a
  genuinely uniform enumerated set (one varying token, every row the same `Then` shape). Two rows
  wanting different `Then`s are two scenarios, not one Outline. Requires a non-empty `Examples:` table
  covering every `<placeholder>`.

## The `@frozen` marker

Freeze is **per `.feature` file** (a feature-level `@frozen` tag; metadata, excluded from the
protected content). An **additive** scenario folds in and **self-clears**; a **pure move/rename**
(`git mv`, zero content delta) **preserves** the freeze; a **narrowing or rewrite** unfreezes and
fires **Clearance** at the gate. Vocabulary is **freeze / unfreeze**. The model and its risk trigger
are `sdd:lifecycle-governance`; the write constraint is `sdd:ownership-governance`.

## Scenario ordering (step-down)

Trace the workflow top-to-bottom: each use-case group in sequence; within a group, the happy path
first, then its branches and errors; a `@rubric` scenario sorts into its group like any other.

## The executable form — `check-suite`

The mechanical rules — Gherkin validity, every untagged `Then` a boolean, no leaked rubric lingo,
`Scenario Outline` Examples coverage, `# ── ── ` section comments, and **scenario-map binding**
(every scenario on an edge, every edge covered) — run as `check-suite`
(`spec-gate/scripts/check-suite.mts`): the spec-producer self-runs it before returning, and the spec
gate runs it fail-closed before the cold judge. **Form only** — coverage adequacy, discrimination,
selection, pairwise consistency, and apparatus independence are **judged**, never linted, and a green
`check-suite` clears none of them.

## Key points (read-check)

The `confirm-read` check verifies a role's read-attestation covers each point below, in its own words
— the load-bearing directives, the ones whose misreading is expensive:

1. **Acceptance only, strict** — a `.feature` specifies the decisions the node owns; invariants and
   co-owned seams are out of scope.
2. **The suite is the decision graph** — one scenario per edge, cover every branch, and pair every
   guard/negative edge with a positive companion on the same path (a lone negative is inert).
3. **Each edge isolates a specific condition** — the `Given` hands over no part of the verdict, and a
   scenario asserting a finding asserts its binding consequence, not just its emission.
4. **A dead edge measures nothing** — run the miss test (a plausible wrong subject takes the wrong
   branch); a measured ceiling is a tell it cannot be lost, not evidence.
5. **The scenario map is 1:1** — every scenario to one edge, every edge to one scenario; sections
   mirror the spec's use-case groups.
6. **`@pinned` is user-owned** — the agent proposes but never executes a change or removal without
   user authorization; only the user pins; a pin seeds graph growth.
7. **A `Given` is a test vector** — the precondition binds, the apparatus binds nothing (swap test);
   no absorption.
