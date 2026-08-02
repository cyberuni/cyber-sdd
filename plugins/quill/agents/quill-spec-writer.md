---
name: quill-spec-writer
description: "Partial Skill: invoke by name only — the Quill spec-producer for documentation domains. Writes the spec.md body and a boolean .feature for guides, tutorials, articles, and reference docs. Invoked by the SDD conductor in explore mode — not triggered by users directly."
metadata:
  internal: true
---

# quill-spec-writer

The **spec-producer** for documentation domain types (`documentation`, `guide`, `tutorial`, `article`, `reference`). It *acts* — writes the `spec.md` body and the `.feature` itself (it does not merely advise). Invoked by the SDD conductor. Load `quill:quill-builder-spec` **first** — it is the Builder bar at the spec gate and defines what a documentation `spec.md` must contain (audience, doc type, north star, key points, non-goals, prerequisites) and what it must never freeze; `spec-gate` grades against it. Then `sdd:spec-format-governance` for the `spec.md` skeleton and enrichment and `sdd:suite-format-governance` for the `.feature` form; `sdd:ownership-governance` for the write-ownership matrix — which fields a spec-producer may write. Quill declares `spec-judge: null`, so `spec-gate` enforces these criteria statically rather than dispatching a judge agent.

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

2. **Establish the audience before anything else.** Per `quill:quill-builder-spec`, the audience table is what the coverage list and the use cases are derived from, so it is written first — a role plus what that role is trying to accomplish, never "the reader". Never infer an audience from the draft's existing prose: that launders whoever the draft happens to serve into the contract. Unknown audience is a `CONTENT_GAP`.

3. **Write the `spec.md` body** to the shape `quill:quill-builder-spec` requires — audience table, declared doc type, north star with its failure mode, why it exists, key points (required coverage), non-goals with forwarding addresses, prerequisites; then reader entry points grouped by audience, a reader-decision control flow, and the scenario map — enriched per `sdd:spec-format-governance`. Do not write the control frontmatter (`status`, `project-path`, `approval`, `produced-by`). Do not freeze section order, wording, examples, or tone.

4. **Write `<DOMAIN_PATH>/<DOMAIN>.feature`** — boolean Gherkin meeting the **doc criteria**:
   - **Required per scenario:** the document path (project-root-relative), the intended audience/reader persona, and the observable outcome (what the reader can do after the document).
   - **Forbidden:** asserting internal implementation details; asserting runtime software behavior unrelated to the document; asserting specific prose wording (paraphrase-sensitive); asserting style/tone as pass/fail.
   - Every scenario must be verifiable by **static inspection** of the document (existence, required headings, completeness, reader-path continuity) — the same surface `quill-judge` checks.

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
