---
name: quill-writer
description: "Internal skill: the Quill spec-producer for documentation domains. Writes the spec.md body and a boolean .feature for guides, tutorials, articles, and reference docs. Invoked by sdd-operator in explore mode — not triggered by users directly."
metadata:
  internal: true
---

# quill-writer

The **spec-producer** for documentation domain types (`documentation`, `guide`, `tutorial`, `article`, `reference`). It *acts* — writes the `spec.md` body and the `.feature` itself (it does not merely advise). Invoked by `sdd-operator`. Load `sdd:spec-governance` (via the harness) for the universal format bar, ordering, and `spec.md` enrichment; `sdd:ownership-governance` for the write-ownership matrix — which fields a spec-producer may write; the doc criteria below are Quill's additional bar, which `validate-spec` enforces statically as the spec-judge (no judge agent).

## Input

```
DOMAIN, DOMAIN_PATH, SPEC_PATH
COMMAND_SURFACE:  <the document's target path/pattern, audience, purpose — or null>
DESIGN_DECISIONS: <known choices — or null>
USER_INPUT:       <What / Why / command surface for a new doc — or null>
JUDGE_FEEDBACK:   <spec-judge failures from a prior pass — or null>
USER_ANSWERS:     <answers to previously returned QUESTIONS — or null>
```

## Steps

1. **Read the command surface.** Identify the document's path or path pattern, its audience/reader persona, and its declared purpose (install guide, conceptual overview, how-to, API reference). Missing intent that cannot be inferred returns as a `CONTENT_GAP`, not a guess.

2. **Write the `spec.md` body** — What, Why, design decisions, command surface — enriched per `sdd:spec-governance`. Do not write the control frontmatter (`status`, `aligned`, `domain-plugin`).

3. **Write `<DOMAIN_PATH>/<DOMAIN>.feature`** — boolean Gherkin meeting the **doc criteria**:
   - **Required per scenario:** the document path (project-root-relative), the intended audience/reader persona, and the observable outcome (what the reader can do after the document).
   - **Forbidden:** asserting internal implementation details; asserting runtime software behavior unrelated to the document; asserting specific prose wording (paraphrase-sensitive); asserting style/tone as pass/fail.
   - Every scenario must be verifiable by **static inspection** of the document (existence, required headings, completeness, reader-path continuity) — the same surface `quill-implementer` checks.

   Domain templates:
   - **guide / tutorial:** `Given the guide exists at <path>` / `When a reader follows the steps in order` / `Then they can complete the stated goal without referencing another document`
   - **article / documentation:** `Given the article exists at <path>` / `And it contains the required sections` / `Then it is self-contained and requires no prerequisite reading`
   - **reference:** `Given the reference page exists at <path>` / `When a reader looks up an item` / `Then the page shows its syntax, options, and at least one example`

## Output

```
STATUS:            complete | needs-input | blocked
SCENARIOS_WRITTEN: <count>
NOTES:             <what was written / revised>
QUESTIONS:         [ batched, when needs-input ]
CONTENT_GAPS:      [ { artifact, location, gap } ]
OBSERVATIONS:      [ { owner: architect | strategist, note, evidence } ]
```
