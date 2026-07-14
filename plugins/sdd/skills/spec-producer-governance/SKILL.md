---
name: spec-producer-governance
description: "Partial Skill: invoke by name only — the SDD default spec-producer procedure. Loaded in-session by the conductor when it runs the spec-producer role inline, not user-triggered."
user-invocable: false
---

# Spec-Producer Governance — the default authoring procedure

The procedure the **conductor** follows when it runs the **spec-producer** role from the SDD default — i.e. no plugin covers the domain and no model-tuned producer agent is named for the slot, so the conductor **loads this governance and authors inline** in its own warm context (recorded `produced-by.spec-producer: sdd:automaton`). The grader is separate — a **cold spec-judge** (`sdd:sdd-spec-judge` or the plugin's judge) always reviews the output; this governance never judges its own work.

Load alongside this governance: `sdd:spec-format-governance` (the required `## Use Cases` section and the `spec.md` enrichment / human-readability rule), `sdd:suite-format-governance` (the `.feature` format bar and scenario-ordering convention), and the resolved **oracle**, **builder**, and **architect** actor bars — **forward** face — to self-align before writing (scope and kill-or-ship, testability/coverage, structural fit). These are exactly the bars the spec-judge grades **backward** at the spec gate, so the producer self-aligns to the same lens set it will be graded against. Load `sdd:ownership-governance` for the write-ownership matrix — which fields the spec-producer may write and which belong to the conductor or the gate skill.

## Inputs (folded in by the conductor)

```
DOMAIN, DOMAIN_PATH, SPEC_PATH
COMMAND_SURFACE:  <command syntax / signatures / events — or null>
DESIGN_DECISIONS: <known choices — or null>
USER_INPUT:       <What / Why / command surface for a new feature — or null>
BACKFILL:         <true if implementation already exists>
JUDGE_FEEDBACK:   <spec-judge SCENARIOS_FAILING / BLOCKER from a prior pass — or null>
USER_ANSWERS:     <answers to previously returned QUESTIONS — or null>
```

## Procedure

1. **Gather intent, grilling breadth-first and depth one-at-a-time.** First scan the request holistically and summarize every issue; then drive the single most important to resolution before the next — one deep thread, not many shallow. For `BACKFILL`, read source, tests, and history and infer What / Why / decisions / surface; otherwise use `USER_INPUT`. A required input that is missing and cannot be inferred becomes a `CONTENT_GAP` (an `<!-- open: -->` marker), never an invention. Revision pass (`JUDGE_FEEDBACK` non-null): fix only the failing scenarios / sections; fold in `USER_ANSWERS`. **Settle the prose before touching the suite** — scenarios authored against unsettled prose chase a moving target.

2. **Reconcile contradictions toward the correct answer, not the popular one.** When grilling surfaces a conflict — between the `spec.md` body and the `.feature`, between either and the design rules or the implementation, or between two rules — do not guess, and do not just count which reading more files repeat. Zoom out and reason about which is actually right given the design's intent and the whole model; weigh the evidence (the canonical definition, what the implementation does, which decision is most recent and authoritative) to find the coherent answer. Edit the side that is wrong; never reword a rule merely because more files echo it. If the correct answer cannot be established, return a `CONTENT_GAP` rather than picking a direction.

3. **Write the `spec.md` body per `sdd:spec-format-governance`.** That bar owns the required structure — the `## Use Cases` section (subject, non-goals, and the entry-point table of trigger / inputs / outcome) and the enrichment rules; follow it rather than re-listing sections here (a hardcoded list drifts from the bar). Author the body content — What, Why, design decisions, and the command / API surface where one exists — and enrich for human review (headings, tables, short paragraphs, a diagram where it carries the idea). Never leave placeholders (`TBD`, `TODO`, empty sections). **Do not** write the control frontmatter (`status`, `project-path`, `approval`, `produced-by`) — those belong to the conductor and the gate skill. Every referenced engine, skill, or artifact path you name must be real — a reference that resolves to nothing is caught mechanically at step 5 below, but naming a real path the first time spends no round on it.

4. **Write `<DOMAIN_PATH>/<DOMAIN>.feature`** — pure boolean Gherkin per `sdd:suite-format-governance`. **Cover every use case from the `## Use Cases` section with one-or-more scenarios** (happy path, negative mirror, boundary) — a use case with no scenario is unverified intent; a scenario with no use case is an orphan. Each `Then` is an observable boolean (the subject *does* X), never internal state, function names, or "sometimes". Order scenarios by lifecycle stage (the step-down convention). Keep the `.feature` plain; rubric form is legal only inside an `@rubric`-tagged scenario.

   **A `Given` is a test vector, not specification** (`sdd:suite-format-governance` carries the canonical bar and the swap test). Author each `Given`'s apparatus — its domain, entities, names, framing — from a domain **the artifact does not illustrate**. On a revise CR the apparatus never reuses the artifact's existing worked examples; on `BACKFILL` it never reuses the illustrations you read out of source. Read those examples in full at step 1 — they are evidence of the behavior you are specifying; exclude them only from the apparatus you author into a `Given`.

5. **Self-check the `.feature` form before returning.** Run the deterministic form check — the `check-suite` engine (`scripts/check-suite.mts` in the `spec-gate` skill), the executable form of `sdd:suite-format-governance` — scoped to what you just authored:

   ```bash
   node "<spec-gate skill>/scripts/check-suite.mts" --files <the authored .feature path(s)>
   ```

   Exit `0` = form clean; exit `1` prints each `✗ <file>: <reason>`. **Fix every violation** (a non-boolean/hedged `Then`, leaked rubric lingo in an untagged scenario, a missing `Feature`/`Then`, or missing section comments over the sectioning threshold) and re-run until clean **before reporting `STATUS: complete`**. Settling this mechanical bar here spends no cold-judge round on a defect a linter catches every time; the same engine runs fail-closed at the gate (`../spec-gate/`), so an unfixed violation would block there anyway. If `node` is unavailable, self-review against the suite-format bar by hand.

   **A clean form check does not clear an entangled `Given`.** The engine reads form, not apparatus — it reports no violation on a `Given` whose apparatus reuses the artifact's worked examples. Re-read each authored `Given` against the test-vector bar by hand and rewrite the apparatus before returning `STATUS: complete`.

   Also self-run **referenced-artifact-exists** — `check-spec-state.mts` in `scripts/`, scoped to
   the `spec.md`/`README.md` you just authored or touched:

   ```bash
   node "<spec-gate skill>/scripts/check-spec-state.mts" --files <the authored spec.md/README.md path(s)>
   ```

   Exit `0` = every referenced path resolves; exit `1` prints each `✗ <file>: references nonexistent
   artifact ...`. Fix every violation the same way — a broken reference to a skill/engine/artifact
   that never existed is a content gap, not a typo to shrug at.

## Output (the conductor collects)

```
STATUS:            complete | needs-input | blocked
SCENARIOS_WRITTEN: <count>
NOTES:             <what was written / revised>
QUESTIONS:         [ batched, when needs-input ]
CONTENT_GAPS:      [ { artifact, location, gap } ]   # become <!-- open: --> markers
OBSERVATIONS:      [ { owner: architect | strategist, note, evidence } ]
```
