---
spec-type: behavioral
concept: spec-authoring
---

# spec-producer — grill a CR into spec prose + a boolean suite

The authoring **procedure**: pressure-test a CR's intent into `spec.md` prose plus boolean
scenarios. This is the default `spec-producer-governance` the **conductor** runs **in-session** for
the producer role; a plugin may resolve a more capable producer for its domain
(`../../design/governance-resolution.md`). Run in-session (the default), it **grills the human
live**; run **headless** (the spawned-automaton fallback, `../../design/harness-spawning.md`) it has
no user channel, so it grills up front and records an `<!-- open: -->` marker for anything it
cannot resolve rather than prompting mid-run.

`.feature` is **part of the behavior suite, never part of the CR** — the producer *writes* the
suite delta, it does not receive it.

## Use Cases

**Subject** — the spec-producer procedure: turning one CR into a spec + suite diff.
**Non-goals** — it renders no gate verdict, freezes nothing, and emits no digest (those are
`../spec-gate/`); it does not write the control frontmatter (`status` / `project-path` /
`approval` / `produced-by`).

The procedure runs in one of **three modes** — the distinct ways it is invoked. The **actor** is the
same in all three: the **conductor**, running the spec-producer role inline (or a plugin producer
resolved for the domain). What differs is the goal it arrives with.

| Use case | Goal (what the conductor wants) | Trigger | Inputs | Outcome |
|---|---|---|---|---|
| **create** | a contract for a capability that does not exist yet, written from nothing | a CR for capability content that does not exist yet | the CR + answers to the up-front grill: the core problem and who experiences it, observable behavior from the user's view, the public interface (commands, signatures, events), known edge cases or explicit non-goals, and which reviewers must be heard | scaffolded spec prose + an initial set of boolean scenarios |
| **revise** | an existing contract brought back in line with a change | a CR touching a capability whose prose + scenarios already exist | the CR + the existing spec | tightened prose and scenarios; **no** new skeleton scaffolded |
| **backfill** | a contract for behavior that already shipped without one | a CR whose behavior already exists in code | source, tests, and history | inferred *what* / *why* / decisions; the up-front grill is **skipped** |

**Extensions** — the paths that do not reach those outcomes:

| Use case | Cause | Outcome |
|---|---|---|
| create | a required input is missing and cannot be inferred | a `CONTENT_GAP` (an `<!-- open: -->` marker), never an invention |
| create | grilling shows the CR bundles several capabilities | recommends a split (a `../../project-spec/` operation) rather than growing a monolith |
| create, revise | the goal for a use case only restates the mechanism | a `CONTENT_GAP` against that use case; no actor is invented to fill the field |
| revise | prose and suite contradict each other | reconciles toward the correct answer, editing the side that is wrong |
| revise | the correct answer cannot be established | a `CONTENT_GAP`, not a guessed direction |
| backfill | source and the standing suite disagree | re-derives from the CFG; the standing suite is reference only, a claim to verify |
| backfill | an act in code leaves no observable trace | adds the record rather than dropping the act from the suite |
| any | a judge verdict arrives (`JUDGE_FEEDBACK`) | a revision pass — fixes only the failing scenarios and sections |

**Surface trace** — every input this procedure exposes, against the use case needing it:

| Element | Needed by | May not combine with |
|---|---|---|
| `USER_INPUT` | create | — |
| `BACKFILL` | backfill | — |
| `COMMAND_SURFACE`, `DESIGN_DECISIONS` | create, revise | — |
| `JUDGE_FEEDBACK` | any, on a revision pass | — |
| `USER_ANSWERS` | any, paired with a prior `needs-input` | — |
| `DOMAIN`, `DOMAIN_PATH`, `SPEC_PATH` | all three | — |

No pair on this surface is forbidden. `BACKFILL` and `USER_INPUT` look like a contradictory pair —
both describe where intent comes from — but the procedure **prefers** `BACKFILL` rather than
refusing the combination, so naming it forbidden would assert a guard nothing enforces. Narrowing a
frozen scenario is likewise **not** an extension here: that stop is the **Clearance** floor, the
conductor's decision on its autonomy bar, and a property co-owned across that seam belongs to the
node that owns it.

Each use case is exercised under the grilling discipline below, and the producer always writes
within the output boundary that closes this spec. Every scenario in
[`spec-producer.feature`](./spec-producer.feature) maps to one of these three modes or to a cross-cutting guarantee (the grilling discipline, the output boundary).

## The grilling workflow

**Breadth-first, depth one-at-a-time.** First scan the CR holistically and summarize every
issue found; then grill the single most important issue to resolution before the next — one
deep thread, not many shallow. Restate the summary plus the current focused issue at each step.

Two phases, in order: **grill the prose first** to settle the contract's intent, **then** bring
the `.feature` into line. Editing scenarios before the prose is settled wastes work — the
scenarios chase a moving target.

Phase 1 — the prose:

- **Scope** — is the touched behavior still *one* coherent thing? Grilling that reveals a
  bundle of several is the moment to recommend a split (a `../../project-spec/` operation), not to
  grow a monolith.
- **Use cases** — is each trigger, input, and outcome still accurate? Did the change add, remove,
  or alter an entry point? Beyond the surface, a use case carries an **actor and goal** and its
  **extensions** (`../spec-format/README.md`):
  - **Find the use case, do not derive it from the interface.** Deriving it from the surface
    reproduces the surface and calls it a requirement. Ask who invokes it, what they were doing
    beforehand, and what outcome they wanted. Where the answer restates the mechanism ("the caller
    wants to call it"), the function has been renamed, not a use case found — raise a
    `CONTENT_GAP`. **Never invent a plausible actor to fill the field**: a fabricated actor reads
    as grounding and is unfalsifiable, which is strictly worse than an honest gap.
  - **Enumerate the extensions.** Walk each use case for what can diverge — the refusal, the error,
    the boundary, the partial result, the contended or absent input. Where nothing can, write
    `extensions: none` with the reason so the claim is contestable rather than absent.
  - **Trace the surface.** Each exposed element (flag, option, parameter, prop, event) names the use
    case that needs it and the elements it may not be combined with. An element you cannot attribute
    is **the finding, not an oversight to fill in** — raise it; the Oracle bar's verdict is
    cut-or-justify. A capability with one entry point and no optional elements records this in a
    line, not a table.
  - **Check the extensions against the CFG** — the producer-side mirror of the Architect bar
    (`../../common-governances/architect/README.md`). Where the node carries a `## Control Flow`
    graph, each enumerated extension is a path that graph must contain and each forbidden
    combination a decision it must refuse. Walk it **both ways**: an edge with no extension is the
    ordinary uncovered-edge case; an **extension with no edge** is a divergence the prose claims and
    the graph cannot take. Fix whichever side is wrong before returning — settling it here spends no
    cold round on a contradiction the Architect lens finds every time. On a node with no CFG the
    check is vacuous.
  - Each stated extension and each forbidden combination is a stated outcome, so each takes its own
    scenario in Phase 2 — a divergence named only in prose is the coverage hole the extensions field
    exists to expose.
- **Design decisions** — does any decision now contradict the change, a sibling capability, or
  a governance? Reconcile stale terms and claims **toward the correct answer, not the popular
  one**: when two statements conflict, zoom out and reason about which is actually right given
  the design's intent and the whole model. Corroboration count, what the implementation does,
  and which decision is most recent and authoritative are *evidence* to weigh — not a vote to
  tally. Fix the side that is wrong; never reword a rule merely because more files echo it. If
  the right answer is genuinely unclear, raise it as a `CONTENT_GAP` rather than guessing a
  reconciliation direction.
- **Open items** — resolve every `<!-- open: -->` marker the diff touches; leave none dangling.

Phase 2 — the suite:

- **For a fold node, state its rule in closed form before you derive any scenarios**
  (`../suite-format/README.md`). This bullet comes first because the **order is load-bearing** — the
  rule is what the scenarios are drawn *from*, so deriving them first is the retrofit-after-the-fact
  shape that diverges (`github-192`). When the node's fold combines **two or more interacting**
  sub-conditions, write the rule in closed form and re-derive its soundness against the real data
  model **before** the scenarios below — a single-condition fold may be specified by example, and
  demanding a closed form of it is over-firing. Closed form buys iteration convergence, not coverage:
  pair the rule with a **mutation sweep** (each interacting condition's mutation breaks a distinct
  scenario) and a **safety dual** (a liveness scenario passes an over-permissive fold green — assert
  the case it cannot observe). A **matrix / per-cell** claim is the same rule applied — draw every
  independent cell as its own scenario, exclude the degenerate cells, and confirm the cells distinct
  by the mutation sweep.
- Every use case maps to one-or-more scenarios; add scenarios for new behavior, retire
  scenarios for removed behavior.
- Each scenario stays a pure boolean `Given`/`When`/`Then` (or the rubric form per
  `../suite-format/README.md`); tighten any that drifted.
- **Author each `Given`'s apparatus independent of the artifact** (`../suite-format/README.md`). A
  `Given` is a **test vector**: its apparatus (domain, entities, names, framing) is a probe, not an
  illustration. On **revise** and **backfill** the artifact already exists and its worked examples
  sit in your context — **never lift them into a `Given`.** A probe that echoes the artifact's own
  example cannot discriminate a reasoner from a copier, so the scenario grades nothing and is dead
  weight. Read the artifact freely (backfill *requires* it — the examples are evidence of the
  behavior); the rule excludes them only from the apparatus you author. This is **not** settled by
  the mechanical form check below — probe independence has no deterministic form, so a green form
  check never clears an entangled `Given`.
- **Route every criterion through the substitutability test before you write it as a dimension**
  (`../suite-format/README.md`). A criterion belongs in a `@rubric` **only if** you accept that
  strength elsewhere may pay for weakness here — say the trade out loud (*"great scope makes up for
  shipping an npx dependency"* — nobody accepts that). If you do not accept it, the criterion is
  **not in the sum**: write it as a boolean `Then`. A rule graded as a dimension becomes
  **tradeable**, and no threshold repairs that. Split a **double-barreled** dimension (two criteria
  joined by *and*) before selecting — the halves routinely land in different forms. **Write the trade
  down** in the same record that carries the cut's reason, naming it and **what pays for it** — an unrecorded trade is an unowned selection nobody can disagree with. Record it for
  each dimension you author or revise. The duty is **yours alone**: no judge reports a missing record,
  so nothing catches you skipping it.
- **Ground a dimension or its cut on non-author evidence** (`../../doctrine/scanner/README.md`).
  When you justify a `@rubric` dimension or its cut with a **measurement** — an ablation Δ, a
  discrimination count over N runs — that measurement is admissible only if it is **not solely your
  own**: it meets the **non-author evidence standard** the doctrine Strategist states canonically
  (`../../doctrine/scanner/README.md`) — that standard is stated **once** there and referenced here,
  never re-listed. Your own instrument silently assumes the property under test, so a cut grounded on
  your own measurement alone is not grounded — record that it needs non-author or fresh-adversarial
  evidence. This is the spec-producer's slice of the wider **cold-instrument doctrine** (its
  verification-method sibling lives on `../../mission/impl-producer/README.md`). A measurement
  grounding **no** dimension or cut is unconstrained; choosing the cut *value* is still the miss-test
  arithmetic below — this rule governs the *evidence*, not the value.
- **Apply the miss test to every scenario and every `@rubric` dimension you author**
  (`../suite-format/README.md`). Name a **plausible wrong subject** — a memorizer, a copier, a
  procedure-follower, a single-brancher — and check that it *loses*. A scenario every plausible
  subject passes measures nothing and is dead weight, whatever its form. The wrong subject must be
  plausible: an empty artifact fails everything, and its failure clears nothing. For a `@rubric`,
  sum what each named wrong subject **banks** — never zero a dimension to make a point — and that
  sum sits **strictly under** the threshold (a tie passes). Rewrite a dimension that grades
  **presence** (a line is emitted), **restatement** (the doctrine's own words), or **procedure**
  (the steps, not the judgment). Like probe independence, this is **not** settled by the mechanical
  form check — a green form check never clears an unloseable dimension. Two further shapes fail the
  miss test and are rewritten on sight: a **toothless finding** (a `Then` asserting a signal is
  *raised* but not its binding consequence — the wrong subject raises it and acts on nothing) and a
  **process `Then`** (asserting how the artifact was produced — "co-developed", "written test-first",
  "refactored before completing" — which is unobservable and belongs in prose, not a scenario).
- **Check coverage before returning** (`../suite-format/README.md`). Every outcome and every
  **carve-out** the node's `## Use Cases` / README states has at least one scenario; a claim named
  only in prose is unspecified. A **mirrored duty** (a producer/judge, sender/receiver pair) is
  specified on **both** sides — a behavior on one node implies its mirror on the counterpart.
- **Read your authored scenarios against each other** (`../suite-format/README.md`). No two
  scenarios sharing a `When` may demand opposite verdicts on one constructible snapshot; narrow one
  `Given` to exclude the overlap. Overlapping `Given`s whose `Then`s agree, and scenarios whose
  `When`s name different operations, are not contradictions — the bar is the contradiction, never
  the overlap.
- Step-down ordering and stage grouping still hold after the edits.
- **Self-check the form before returning** — run the deterministic `.feature`-form check (the
  executable form of `../suite-format/README.md`) over the authored suite and fix any violation (a
  non-boolean `Then`, a hedge adverb, leaked rubric lingo) before reporting complete. Settling this
  mechanical bar here spends no cold-judge round on a defect a linter catches every time.

## The output boundary

The producer writes the **spec body and the `.feature`**, nothing else:

- It writes `spec.md` prose and the `.feature` scenarios.
- It does **not** write the `status`, `project-path`, `approval`, or `produced-by` frontmatter —
  those are the conductor's and the gate's (`../../design/provenance-model.md`).
- Scoring lingo appears **only** inside a `@rubric`-tagged scenario; every untagged scenario
  stays a pure boolean assertion (`../suite-format/README.md`).
- It declares `governances_loaded` — every governance it loaded before writing — as a **required**
  field in its structured output, listing an empty set rather than omitting the field when it loaded
  none. This is provenance for the spec-judge's pre-flight check (`../spec-gate/README.md`), carried
  through the dispatch channel — it is never written into `spec.md` or the `.feature`.

**Producer/judge separation.** The producer authors the diff; a **distinct judge** actor
verifies it (`../spec-gate/`). The producer self-aligns against the same governances the
judge checks against — it never collapses producing and judging into one voice.
