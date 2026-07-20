# suite-format-governance

This is an internal SDD governance about the acceptance behavior suite.

It describes how a capability's `.feature` suite — the executable scenarios that sit beside its
`spec.md` — is written and judged.

Every behavioral spec carries such a suite, and every scenario in it collapses to one pass/fail at
the point of verification — never a score. The core idea: the suite **is** the capability's
**control-flow graph (CFG)**. Each scenario pins one branch the capability takes; the suite as a
whole covers every branch, and nothing that is not a branch.

## What it requires

| Rule | What it means |
| --- | --- |
| **Acceptance only, strict** | A scenario tests a **decision** — a branch you can name. A statement with no nameable branch ("output is valid JSON", "idempotent") is an invariant: not specified here, covered by the implementation's own tests. Properties another capability co-owns are out of scope too. |
| **One scenario per (path class, edge)** | The `Given` is the path taken to a decision, the `When` is the decision under test, the `Then` is the branch taken. Paths that reconverge with the same outcome collapse into one scenario — that is what keeps the suite finite. An over-specific `Given` is a defect: it manufactures a false permutation. |
| **Every guard gets a positive companion** | A reject/kill/guard scenario is paired with a scenario driving the same path in its firing direction. A lone negative is inert — a do-nothing subject passes it. |
| **Scenario map, 1:1** | The spec's `## Scenario map` table and the suite bind one-to-one: every scenario has a row, every row names a real scenario, each row names both the edge and the path class. An unmapped scenario is an orphan; an unmapped edge is a coverage hole. |
| **Boolean Gherkin by default** | Every `Then` is an observable, deterministic boolean. The test is the **trace, not the verb**: name the artifact a verifier would read to settle it — an output, an exit code, a written file, a returned field. Asserting an *act* is fine when the act leaves a trace; if nothing records it, either add the record or do not assert it. Never assert how the artifact was authored, nor internal state. |
| **`@rubric` for graded judgment** | When a branch's correctness is a gradient no single boolean captures: named dimensions, a threshold, and a collapsing `Then` — still one boolean per scenario at the verification point. |
| **A `Given` is a test vector** | The implementation owes conformance to the `Then` only. A `Given`'s domain and framing are apparatus (the swap test tells them apart from the binding precondition), and neither side may absorb the other's examples. |
| **A `Given` is a scaffoldable state** | Declarative, observable, present-tense, one condition per step. The build test: could two people, given only this line, construct the same fixture? |
| **Pairwise consistency** | No two scenarios demand opposite verdicts on one constructible state. A narrower `Given` that carves an exception is specialization, not contradiction. |
| **Dead edges measure nothing** | The miss test: name a plausible wrong subject and check it takes the wrong branch. If none can, the edge is inert. |

Scenarios are grouped under section comments mirroring the spec's use-case groups, in the same
order, stepping down from the happy path to its branches and errors.

## Two special markers

- **`@pinned`** — a **user-owned** seed scenario. Only the user applies it; the agent may propose a
  change or removal but never executes one without in-session user authorization. A pin marks a
  behavior the CFG did not reach, and the agent grows the CFG around it. It is the one
  override to strict.
- **`@frozen`** — freeze is per `.feature` file. Adding a scenario folds in and self-clears; a pure
  move preserves the freeze; a narrowing or rewrite unfreezes and fires Clearance at the gate.

## The executable check — `check-suite`

The mechanical rules — Gherkin validity, boolean `Then`s, section comments, Outline coverage, and
the scenario-map binding — are linted by `check-suite` (`spec-gate/scripts/check-suite.mts`). The
spec-producer self-runs it before returning, and the spec gate runs it fail-closed before the cold
judge. It checks **form only**: whether the map's rows actually cover the drawn CFG — coverage,
discrimination, consistency — is judged, never linted, so a green check clears no coverage
question.

## Usage

- **spec-producer:** self-aligns to this bar before writing the suite, and self-runs `check-suite`
  before returning.
- **spec-judge** and the actor bars (**oracle** / **architect** / **builder**): judge their slices
  of it backward at the **spec-gate**.
- **spec-gate:** runs `check-suite` fail-closed before spawning the cold judge.

## Related governances

This bar owns how the **`.feature` suite** is written. Its neighbors own everything around that:

- **`spec-format-governance`** — how the `spec.md` is written: the use-case groups, the drawn
  CFG, and the `## Scenario map` table this suite binds to. Spec-format owns the `spec.md`;
  suite-format owns the `.feature` that mirrors it.
- **`lifecycle-governance`** — the freeze/unfreeze *model* and its risk trigger; this bar carries
  only the `@frozen` marker's mechanics.
- **`ownership-governance`** — who may write a frozen `.feature` (no one), and the user's ownership
  of `@pinned` scenarios.
- **The impl actor bars** (`builder-impl-governance`, `architect-impl-governance`) — the
  **verification level**. This bar is deliberately **silent** on it, and that silence is the point:
  what a suite specifies (acceptance) and how high a test runs to verify it (e2e down to unit) are
  two independent axes. A suite that names a level has leaked the second axis into the first —
  "boundary" is a level, not a category of scenario. The level is chosen per scenario by whoever
  implements the test.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
