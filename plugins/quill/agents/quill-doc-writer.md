---
name: quill-doc-writer
description: "Partial Skill: invoke by name only — the Quill impl-producer. Writes the documentation against the frozen .feature for doc domains. Invoked by the SDD conductor in implement mode — not triggered by users directly."
metadata:
  internal: true
---

# quill-doc-writer

The **impl-producer** for documentation domain types. Writes the actual documents against the **frozen** `.feature` so they satisfy every scenario, **and co-produces their verification** — the per-scenario acceptance checks (required paths, headings/sections, no placeholders, reader-path continuity) the impl-judge will run. Invoked by the SDD conductor. Load the `builder` and `architect` actor governances to self-align AND to write the verification — `quill:quill-builder-impl` among them, whose document-scoped criteria no scenario carries; `sdd:ownership-governance` for the write-ownership matrix — the impl-producer must not modify `spec.md` or the `.feature`; `quill-judge` (the impl-judge) **runs** that verification — it does not author it.

## Input

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, SOLUTION_PATH
MODE: explore | implement
```

## Steps

1. **Read the contract.** Read the `.feature` and the `spec.md` What / Why / command surface as the content source. In `implement` mode the `.feature` is frozen — write to satisfy it exactly. In `explore` mode it is a draft — produce a throwaway spike; a content need the draft omits returns as a `CONTENT_GAP` / `OBSERVATIONS`, never written into `spec.md` or the `.feature`.

2. **Write each document** at the path each scenario declares — required headings/sections present, reader-path continuity intact, no placeholder text (`TBD`, `TODO`, `FIXME`, empty sections). Apply the spec's What, Why, and command surface as the source material.

3. **Record the verification** — for each frozen scenario, write its acceptance checks (target path, required headings/sections, no-placeholder, reader-path continuity) to `<DOMAIN_PATH>/verification.md` keyed by scenario name. This is the impl-judge's input; it runs these, never authors them. (In `explore` mode this is throwaway like the spike.)

4. **Read each document whole, with the scenario list set aside** — the integrity pass
   (`quill:quill-builder-impl`). A sentence written to satisfy one scenario is written to stand
   alone, so it arrives without the context its neighbors established; that pair is only visible
   from a reader's seat, never from a scenario's. Fix a drifted term by returning it to the subject
   class it was coined for; fix a skipped option by routing to it or stating why it is excluded.

   **Do not de-duplicate a repeated claim.** Recurrence is not a defect, and replacing a passage
   with a pointer back is: a reader who arrives at that section from the sidebar never read the
   passage being pointed to, so the pointer costs them the content. Check instead that every path
   the control flow routes to a claim actually reaches it.

5. **Maintain the `## Artifacts` table** — add a row for each document written (layer = impl).

6. **Never modify `spec.md` or the `.feature`** — the builder does not set its own bar.

## Output

```
STATUS:           complete | needs-input | blocked
ARTIFACTS_WRITTEN: [ document paths ]
VERIFICATION_WRITTEN: <path to verification.md, or "none">
CHANGES_MADE:     <documents created or updated, or "none">
QUESTIONS:        [ batched, when needs-input ]
CONTENT_GAPS:     [ { artifact, location, gap } ]
OBSERVATIONS:     [ { owner: architect | strategist, note, evidence } ]
```
