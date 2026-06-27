---
name: spec-producer-governance
description: "Internal skill: the SDD default spec-producer procedure — how to author spec.md + a boolean Gherkin .feature for a domain no plugin covers. Loaded in-session by sdd-operator when it runs the spec-producer role inline (produced-by sdd:sdd-operator); not triggered by users directly."
user-invocable: false
---

# Spec-Producer Governance — the default authoring procedure

The procedure the **Operator** follows when it runs the **spec-producer** role from the SDD default — i.e. no plugin covers the domain and no model-tuned producer agent is named for the slot, so the Operator **loads this governance and authors inline** in its own warm context (recorded `produced-by.spec-producer: sdd:sdd-operator`). This is the producer-side relocation of the former `sdd-scenario-writer` agent: same procedure, run inline by the conductor rather than spawned. The grader is separate — a **cold spec-judge** (`sdd:sdd-spec-judge` or the plugin's judge) always reviews the output; this governance never judges its own work.

Load alongside this governance: `sdd:spec-governance` (the `.feature` format bar, scenario-ordering convention, and the `spec.md` enrichment / human-readability rule) and the resolved **director** + **builder** actor bars (scope and testability/coverage) to self-align before writing. Load `sdd:ownership-governance` for the write-ownership matrix — which fields the spec-producer may write and which belong to the Operator or the gate skill.

## Inputs (folded in by the Operator)

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

1. **Gather intent.** First pass: for `BACKFILL`, read source, tests, and history and infer What / Why / decisions / command surface; otherwise use `USER_INPUT`. If a required input is missing and cannot be inferred, return it as a `CONTENT_GAP` (becomes an `<!-- open: -->` marker) rather than inventing it. Revision pass (`JUDGE_FEEDBACK` non-null): fix only the failing scenarios / sections; fold in `USER_ANSWERS`.

2. **Write the `spec.md` body.** Fill What, Why, Design decisions, Command surface / API, and the required `## Use Cases` section. Enrich for human consumption per `sdd:spec-governance` — headings, tables, short paragraphs, and a diagram where it carries the idea better than prose. Never leave placeholders (`TBD`, `TODO`, empty sections). Maintain the `## Artifacts` table. **Do not** write the control frontmatter (`status`, `aligned`, `approval`, `produced-by`) — those belong to the Operator and the gate skill.

3. **Write `<DOMAIN_PATH>/<DOMAIN>.feature`** — pure boolean Gherkin. Each `Then` is a boolean assertion of observable behavior (the subject *does* X), never internal state, function names, or "sometimes". Cover at least one happy path and one error case per operation; add `--json` scenarios where the command supports it. Order scenarios top-to-bottom by lifecycle stage, grouped under a section comment per stage (the step-down convention). Keep the `.feature` plain — enrichment is for `spec.md` only.

## Output (the Operator collects)

```
STATUS:            complete | needs-input | blocked
SCENARIOS_WRITTEN: <count>
NOTES:             <what was written / revised>
QUESTIONS:         [ batched, when needs-input ]
CONTENT_GAPS:      [ { artifact, location, gap } ]   # become <!-- open: --> markers
OBSERVATIONS:      [ { owner: architect | strategist, note, evidence } ]
```
