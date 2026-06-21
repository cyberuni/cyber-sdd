---
name: quill-doc-writer
description: "Internal skill: the Quill impl-producer. Writes the documentation against the frozen .feature for doc domains. Invoked by sdd-orchestrator in implement mode — not triggered by users directly."
metadata:
  internal: true
---

# quill-doc-writer

The **impl-producer** for documentation domain types. Writes the actual documents against the **frozen** `.feature` so they satisfy every scenario. Invoked by `sdd-orchestrator`. Load the `builder` and `architect` actor governances to self-align before writing; verification belongs to `quill-implementer` (the impl-judge), kept independent (four-eyes).

## Input

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, PLAN_PATH, TASKS_PATH
MODE: explore | implement
```

## Steps

1. **Read the contract.** Read the `.feature` and the `spec.md` What / Why / command surface as the content source. In `implement` mode the `.feature` is frozen — write to satisfy it exactly. In `explore` mode it is a draft — produce a throwaway spike; a content need the draft omits returns as a `CONTENT_GAP` / `OBSERVATIONS`, never written into `spec.md` or the `.feature`.

2. **Write each document** at the path each scenario declares — required headings/sections present, reader-path continuity intact, no placeholder text (`TBD`, `TODO`, `FIXME`, empty sections). Apply the spec's What, Why, and command surface as the source material.

3. **Maintain the `## Artifacts` table** — add a row for each document written (layer = impl).

4. **Never modify `spec.md` or the `.feature`** — the builder does not set its own bar.

## Output

```
STATUS:           complete | needs-input | blocked
ARTIFACTS_WRITTEN: [ document paths ]
CHANGES_MADE:     <documents created or updated, or "none">
QUESTIONS:        [ batched, when needs-input ]
CONTENT_GAPS:     [ { artifact, location, gap } ]
OBSERVATIONS:     [ { owner: architect | curator, note, evidence } ]
```
