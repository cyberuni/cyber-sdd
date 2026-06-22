---
name: sdd-scenario-writer
description: "Internal skill: the default SDD spec-producer. Writes the spec.md body and a pure boolean Gherkin .feature for a domain with no plugin coverage. Invoked by sdd-orchestrator in explore mode — not triggered by users directly."
metadata:
  internal: true
---

# sdd-scenario-writer

The default **spec-producer**. Writes the `spec.md` body and the `.feature` for a domain that no plugin covers — generic boolean Gherkin from the command surface, **no domain criteria**. Invoked by `sdd-orchestrator`. Load `sdd:spec-governance` (via the harness) for the format bar, scenario-ordering convention, and the spec-enrichment / human-readability rule before writing. Load `sdd:ownership-governance` for the write-ownership matrix — which fields a spec-producer may write and which belong to the orchestrator or gate skill.

## Input

```
DOMAIN, DOMAIN_PATH, SPEC_PATH
COMMAND_SURFACE:  <command syntax / signatures / events — or null>
DESIGN_DECISIONS: <known choices — or null>
USER_INPUT:       <What / Why / command surface for a new feature — or null>
BACKFILL:         <true if implementation already exists>
JUDGE_FEEDBACK:   <spec-judge SCENARIOS_FAILING / BLOCKER from a prior pass — or null>
USER_ANSWERS:     <answers to previously returned QUESTIONS — or null>
```

## Steps

1. **Gather intent.** First pass: for `BACKFILL`, read source, tests, and history and infer What / Why / decisions / command surface; otherwise use `USER_INPUT`. If a required input is missing and cannot be inferred, return it as a `CONTENT_GAP` (becomes an `<!-- open: -->` marker) rather than inventing it. Revision pass (`JUDGE_FEEDBACK` non-null): fix only the failing scenarios / sections; fold in `USER_ANSWERS`.

2. **Write the `spec.md` body.** Fill What, Why, Design decisions, Command surface / API. Enrich for human consumption per `sdd:spec-governance` — headings, tables, short paragraphs, and a diagram where it carries the idea better than prose. Never leave placeholders (`TBD`, `TODO`, empty sections). Maintain the `## Artifacts` table. **Do not** write the control frontmatter (`status`, `aligned`, `domain-plugin`) — those belong to the skill and orchestrator.

3. **Write `<DOMAIN_PATH>/<DOMAIN>.feature`** — pure boolean Gherkin. Each `Then` is a boolean assertion of observable behavior (the agent *does* X), never internal state, function names, or "sometimes". Cover at least one happy path and one error case per operation; add `--json` scenarios where the command supports it. Order scenarios top-to-bottom by lifecycle stage, grouped under a section comment per stage (the step-down convention). Keep the `.feature` plain — enrichment is for `spec.md` only.

## Output

```
STATUS:           complete | needs-input | blocked
SCENARIOS_WRITTEN: <count>
NOTES:            <what was written / revised>
QUESTIONS:        [ batched, when needs-input ]
CONTENT_GAPS:     [ { artifact, location, gap } ]   # become <!-- open: --> markers
OBSERVATIONS:     [ { owner: architect | curator, note, evidence } ]
```
