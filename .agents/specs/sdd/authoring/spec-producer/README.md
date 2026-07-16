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

The procedure runs in one of **three modes** — the distinct ways it is invoked:

| Trigger | Inputs | Outcome |
|---|---|---|
| **create** — a CR for capability content that does not exist yet | the CR + answers to the up-front grill: the core problem and who experiences it, observable behavior from the user's view, the public interface (commands, signatures, events), known edge cases or explicit non-goals, and which reviewers must be heard | scaffolded spec prose + an initial set of boolean scenarios |
| **revise** — a CR touching a capability whose prose + scenarios already exist | the CR + the existing spec | tightened prose and scenarios; **no** new skeleton scaffolded |
| **backfill** — a CR whose behavior already exists in code | source, tests, and history | inferred *what* / *why* / decisions; the up-front grill is **skipped** |

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
- **Use cases / entry points** — is each trigger, input, and outcome still accurate? Did the
  change add, remove, or alter an entry point?
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
- **Apply the miss test to every scenario and every `@rubric` dimension you author**
  (`../suite-format/README.md`). Name a **plausible wrong subject** — a memorizer, a copier, a
  procedure-follower, a single-brancher — and check that it *loses*. A scenario every plausible
  subject passes measures nothing and is dead weight, whatever its form. The wrong subject must be
  plausible: an empty artifact fails everything, and its failure clears nothing. For a `@rubric`,
  sum what each named wrong subject **banks** — never zero a dimension to make a point — and that
  sum sits **strictly under** the threshold (a tie passes). Rewrite a dimension that grades
  **presence** (a line is emitted), **restatement** (the doctrine's own words), or **procedure**
  (the steps, not the judgment). Like probe independence, this is **not** settled by the mechanical
  form check — a green form check never clears an unloseable dimension.
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

**Producer/judge separation.** The producer authors the diff; a **distinct judge** actor
verifies it (`../spec-gate/`). The producer self-aligns against the same governances the
judge checks against — it never collapses producing and judging into one voice.
