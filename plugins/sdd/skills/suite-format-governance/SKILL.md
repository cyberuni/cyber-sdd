---
name: suite-format-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
---

# Suite-Format Governance — the acceptance behavior-suite bar

Form authority for a behavior suite: how it is written and judged. Fixed-universal SDD
governance — the spec-producer self-aligns to it, and each actor bar (`oracle` / `architect` /
`builder`) judges its slice of it backward at the gates. Governs the suite of a **behavioral**
spec only; descriptive and reference nodes carry no suite. Every scenario collapses to **one
pass/fail** at the verification point — never a score.

## The suite specifies acceptance only — strict

A suite specifies **acceptance** — the observable **decisions** the node owns — and nothing else.

- **Decisions only — and the map is the test.** A scenario tests a **decision** — a branch the
  capability takes. The mechanical filter is **can you name the edge it sits on?** A scenario with no
  nameable edge is a non-branch **invariant** ("output is valid JSON", "idempotent"): not acceptance,
  not specified here, covered by the implementation's own tests.
  Do **not** cut a scenario merely because it reads like a property. A constraint that holds across
  every path *still sits on an edge* — "the envelope is the same for every strategy" is the
  **convergence** shape at that edge (below), asserting the outcome does not vary, which is a design
  decision. Unmappable is the cut; property-sounding is not.
- **The node's own decisions.** A property **co-owned** across a seam — activation/routing (does this
  config fire?), a sibling's behavior, harness wiring — is not this node's to freeze; it is **out of
  scope** (Oracle relocates or kills it).
- The only escape from strict is a user **pin** (below).

## The suite is the capability's control-flow graph

The suite **is** the node's **control-flow graph (CFG)** at acceptance level. Author it as one:

- **One scenario = one (path class, edge) pair.** The `Given` is the **path** — the decisions already
  made on the way here; the `When` is the **edge under test**; the `Then` is the **branch taken**. The
  unit is not the edge alone: one edge needs several scenarios when its outcome differs by the path
  reaching it.
- **State the least specific `Given` that determines the outcome.** Paths that **reconverge** and leave
  no distinguishing state **collapse into one scenario** — `a→b→d` and `a→c→d` are the same scenario
  when the outcome at `d` does not depend on whether `b` or `c` was taken. Name the reconvergence
  point, never the route. This is what keeps the suite finite: without it, every upstream branch
  multiplies every downstream one.
- **Add a permutation only when the outcome differs.** Same outcome under two prefixes ⇒ one scenario.
- **An over-specific `Given` is a defect.** Naming state the outcome does *not* depend on
  **manufactures a false permutation** — it implies a sibling scenario for the other value and invites
  exactly the explosion the collapse rule prevents.
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

`spec.md` sections the node by **use-case group**, each carrying a drawn **CFG** and an
explicit **scenario-map** table (`sdd:spec-format-governance`). The suite **mirrors** it:

- Group scenarios under `# ── <use-case group> ──` comments — same groups, same order — screaming
  the intents; never sectioned by layer, output format, or "misc rules".
- **The map is 1:1 scenario↔row**, and each row names **both** the edge and the path class
  (`| Edge | Path (Given) | Scenario |`). A scenario off the map is an orphan; an edge with **no** row
  is a coverage hole. An edge with **several** rows is **not** a duplicate — it is permutation
  coverage, and legitimate exactly when each row's path class yields a different outcome. Two rows
  with the same edge *and* the same path class **is** a duplicate. `check-suite` lints orphans,
  uncovered edges, and same-edge-same-path duplicates.

**Three shapes sit on the map**, all of them acceptance:

- **branch** — the `Given` pins one path class; the `Then` names the branch taken.
- **convergence** — the `Given` deliberately **spans** classes ("for every strategy"); the `Then`
  asserts the outcome **does not vary**. One scenario legitimately covers many permutations, and that
  non-variance is a design decision, not an invariant.
- **barred** — the `Then` asserts an edge that must **not** exist (an option never offered).

## The tag set — every tag a `.feature` may carry

This bar defines the tag **vocabulary** — what each tag *means*. It does **not** define how a judge
measures the tagged scenario: run counts, thresholds, corpora and pass bars are the resolved
plugin's (ACED, for agent-config domains). Tag = interface, plugin = implementation. A governance
that mentions a tag is a consumer. The rules live in the sections named below; this table is the index.

| Tag | Names | Scope | Applied by | Means |
| --- | --- | --- | --- | --- |
| `@trigger` | the engage decision | scenario | producer | Does the subject **engage** when it should, and stay out when it should not? |
| `@behavior` | conduct once engaged | scenario | producer | Having engaged, does it take the right steps and honor its rules? |
| `@quality` | the result | scenario | producer | Is what it produced good? |
| `@rubric` | the assertion form | scenario | producer | Graded against an inline rubric (named dimensions + threshold) rather than a boolean `Then` — see *Form 2*. Independent of the tags above; a scenario may carry both. |
| `@pinned` | ownership | scenario | **user only** | A user-owned seed scenario the agent may propose against but never change unilaterally — see *`@pinned`*. |
| `@frozen` | lifecycle state | **file** | the gate | The suite is the agreed contract; narrowing it needs Clearance — see *The `@frozen` marker*. |

**`@trigger` vs `@behavior` is a per-node question, judged — never linted.** `@trigger` is legal
only *where the node genuinely owns the routing decision*, and two different deciders qualify:

- the **harness** — a model matching this config's `description` against a user query. Here the
  decision is **co-owned** (description prose × harness × sibling set) and the node holds one of the
  three, so freezing it on the node is the seam issue #304 raises.
- **an agent applying the node's own doctrine** — e.g. a coordinator reading this doctrine to decide
  whether it governs the situation at hand. No harness is in the loop and the deciding input is the
  node's own content, so **the node owns it outright**.

The two look alike in shape and differ only in who decides, so **step form does not classify them**
and no mechanical check should try (see `.agents/specs/sdd/ssa-lowering/ssa-lowering.feature`, where
a deletion that read the second case as the first was blocked at the gate and reverted). A
deterministic, fully-owned decision table that selects *what an already-invoked subject does* is
conduct, not engagement — it wants `@behavior`.

**`@frozen` is the only file-level tag** — it sits on the `Feature`, not a scenario.

`check-suite` ignores tags it does not recognize, so an unknown tag fails silently rather than
loudly — spell them exactly as written above.

## `@pinned` — user-owned seed scenarios

A **user** may mark a scenario `@pinned`. It is **user-owned** (`sdd:ownership-governance`) — the one
scenario class the agent does not own:

- **Agent proposes, user disposes.** The agent may propose changing or removing a `@pinned` scenario;
  it may **not execute** the change without in-session user authorization — the authority of a human
  ratification (positional, not relayable, not self-assertable within leash). Ownership is
  lifecycle-independent: the pin holds in `draft` and survives a re-open; freeze does not enter.
- **Only the user pins.** The agent never applies `@pinned`.
- **A pin is a seed.** It marks a behavior the CFG did not reach; the agent **grows the
  CFG around it** — proposing the sibling branches, guards, and companions the pinned behavior
  implies (agent-owned; only the seed stays pinned).
- It is the **override to strict** — kept whatever strict would prune.

## One behavior per scenario — SRP and dedup

One (path class, edge) per scenario; one canonical scenario per pair. A scenario with several unrelated `Then`s
churns and its name lies — split it. Two scenarios sharing a `When`+`Then` core are a duplicate —
dedup to the canonical (never dedup away a `@pinned` scenario without consent).

## Form 1 — pure-boolean Gherkin (default)

`Given / When / Then` whose every `Then` is an **observable, deterministic boolean**. Use whenever the
branch is directly checkable.

**The test is the trace, not the verb.** A `Then` is legal when you can name the artifact a verifier
reads to settle it — an output, an exit code, a written file, an emitted event, a returned field.
Asserting an *act* is not the defect; asserting an act that records nothing is. Follow these:

- **Name the artifact before writing the `Then`. If nothing records it, do not assert it.**
- **Assert an act only when the act leaves a trace.** `Then it reads the role-to-agent map from the
  registry` is legal — the resolved squad is checkable against the registry. `Then it sweeps the
  corpus` is not: no artifact records a sweep.
- **When an act matters but records nothing, add the record — do not delete the act.** Give the role
  an `Output` field, a written report, or a ledger line, then assert *that*.
- **Never assert how the artifact came to be authored** — "co-developed", "written test-first",
  "authored in this order". Nothing in the artifact or a run reveals authoring sequence. Assert the
  end state instead, and keep production discipline in governance prose.
- **Never assert internal state or a function name.** Neither is readable at the verification point.

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

### A `Given` must be a **scaffoldable state**

The `Given` is what the impl-producer **builds** and the impl-judge **checks it built**. If the two
can read it and picture different fixtures, the gate churns — the producer writes a defensive step
carrying flags and branches, and the judge disagrees about what was even set up. A step definition
that needs conditionals is the tell that the step is wrong **upstream**, not that the automation is
hard.

- **A state, not a procedure.** Declarative: *what holds*, never the keystrokes that got there.
- **Observable, not evaluative.** Bar judgment words — *discernible, valid, appropriate, clear,
  proper, reasonable*. They read as precision and carry none: each reader supplies their own
  threshold. Name the fact instead.
- **Present, not absent.** A state defined by what is *missing* ("no X and no Y") is unbuildable —
  absence has infinitely many fixtures. Name the concrete shape that *has* the property.
- **One condition per step.** Split a conjunction into `Given` + `And`. Each step then stands alone
  and is reusable across scenarios, which is what makes a step library accumulate instead of
  fragment.
- **The build test:** *could two people, given only this line, construct the same fixture?* If no, it
  is not yet a `Given`.

**Worked correction.** `Given a project with no discernible capability decomposition and no
feature-first source layout` fails three ways at once — *discernible* is evaluative, the state is
doubly absent, and it is a conjunction. It becomes:

```gherkin
Given a project in detection mode
And its src/ is organized by layer rather than by feature
```

Two buildable steps, no judgment words, and the path class is named outright.

## Pairwise consistency — no two scenarios contradict on one snapshot

Within one suite, no two scenarios may demand **opposite verdicts** on a single constructible state.
A contradiction needs a shared `When` **and** an overlapping `Given`; different `When`s over one
state do not contradict. **Specialization is not contradiction** — a specific scenario whose narrower
`Given` carves an exception wins on it; read a pair as generic/specific before reading it as a
conflict. The remedy is a `Given` narrowing. Judged, not linted; the `Conflict` hard floor is the
post-freeze backstop.

## Optional conventions — scenario tagging and enumerated cases

Additive and plugin-facing (e.g. ACED); untagged plain suites are unaffected and the structural
check ignores unrecognized tags.

- **`@trigger`, `@behavior` and `@quality`** are defined in *The tag set* above. There is no
  collective noun for them and none is wanted: they are three separate tags, not a stack or a
  pipeline, and naming them as a group invites generalizations that do not hold. Apply `@trigger`
  only where the node genuinely owns the routing decision, and read that section's two-deciders test
  before choosing between `@trigger` and `@behavior` — the classification is judged per node, never
  linted.
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
`Scenario Outline` Examples coverage, `# ── ── ` section comments, and **scenario-map binding** —
every scenario carries a map row, every row names a real scenario, and no two rows share an edge
*and* a path class. Whether the rows **cover the CFG** is judged, not linted: that needs the drawn
CFG's semantics, so a green check clears no coverage question. A spec with no `## Scenario map`
section is skipped, not failed — run as `check-suite`
(`spec-gate/scripts/check-suite.mts`): the spec-producer self-runs it before returning, and the spec
gate runs it fail-closed before the cold judge.

**Form only** — coverage adequacy, discrimination,
selection, pairwise consistency, and apparatus independence are **judged**, never linted, and a green
`check-suite` clears none of them.

## Key points (read-check)

The load-bearing directives below are the ones whose misreading is expensive — read them as the
compressed form of this bar, not as a summary that replaces it:

1. **Acceptance only, strict** — a suite specifies the decisions the node owns; invariants and
   co-owned seams are out of scope.
2. **The suite is the CFG** — one scenario per **(path class, edge)** pair, cover every
   branch, collapse reconverged paths whose outcome does not differ, and pair every guard/negative
   edge with a positive companion on the same path (a lone negative is inert).
3. **Each edge isolates a specific condition** — the `Given` hands over no part of the verdict, and a
   scenario asserting a finding asserts its binding consequence, not just its emission.
4. **A dead edge measures nothing** — run the miss test (a plausible wrong subject takes the wrong
   branch); a measured ceiling is a tell it cannot be lost, not evidence.
5. **The scenario map is 1:1 scenario<->row**, each row naming both the **edge** and the **path
   class**; an edge may carry several rows (permutation coverage) — a duplicate is same edge *and*
   same path. Sections mirror the spec's use-case groups.
6. **`@pinned` is user-owned** — the agent proposes but never executes a change or removal without
   user authorization; only the user pins; a pin seeds CFG growth.
7. **A `Given` is a test vector** — the precondition binds, the apparatus binds nothing (swap test);
   no absorption.
8. **A `Then` is legal when you can name the artifact that settles it** — the test is the **trace,
   not the verb**. Asserting an *act* is fine when the act leaves a trace; where it records nothing,
   **add the record and assert that**, rather than dropping the act. Never assert how the artifact
   was authored, nor internal state.
