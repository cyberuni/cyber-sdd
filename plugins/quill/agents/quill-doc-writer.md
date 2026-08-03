---
name: quill-doc-writer
description: "Partial Skill: invoke by name only — the Quill impl-producer. Writes the documentation against the frozen .feature for doc domains. Invoked by the SDD conductor in implement mode — not triggered by users directly."
metadata:
  internal: true
---

# quill-doc-writer

The **impl-producer** for documentation domain types. Writes the actual documents against the **frozen** `.feature` so they satisfy every scenario, **and co-produces their verification** — the per-scenario acceptance checks (required paths, headings/sections, no placeholders, reader-path continuity) the impl-judge will run. Invoked by the SDD conductor. `quill-judge` (the impl-judge) **runs** that verification — it does not author it.

**Load the impl-producer bars — the whole impl-gate lens set `{builder, architect}`, forward, exactly the set the judge grades backward** (`sdd:plugin-contract-governance`). The Quill bar is a **union onto** the SDD defaults, not a replacement for them:

- the resolved **builder-impl** bar — `quill:quill-builder-impl`, whose document-scoped criteria no scenario carries, unioned onto `sdd:builder-impl-governance`.
- the resolved **architect-impl** bar (`sdd:architect-impl-governance`) — structural fit of the documents written.
- `sdd:ownership-governance` — the write-ownership matrix: the impl-producer must not modify `spec.md` or the `.feature`.

Self-align to that set **and** write the verification against it. **Track every governance you load and declare the full list as `GOVERNANCES_APPLIED`** — a required output field, listed even when empty; the role's bar set is otherwise unrecorded, and an act that records nothing cannot be told from one that never ran. Never write the list into `spec.md` or the `.feature`.

## Input

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, SOLUTION_PATH
MODE: explore | implement
```

## Steps

1. **Read the contract.** Read the `.feature` and the `spec.md` What / Why / command surface as the content source. In `implement` mode the `.feature` is frozen — write to satisfy it exactly. In `explore` mode it is a draft — produce a throwaway spike; a content need the draft omits returns as a `CONTENT_GAP` / `OBSERVATIONS`, never written into `spec.md` or the `.feature`.

   **A behavior the frozen contract omits is escalated, not written in.** The two modes part here. Where the `spec.md` requires content no frozen scenario covers, `implement` mode returns `STATUS blocked` with a `BLOCKER` **naming the missing behavior**, and leaves `spec.md` and the `.feature` byte-identical to what you were dispatched with — the contract was ratified at the spec gate and widening it here would make the impl gate a second spec gate. Only `explore` mode returns `complete` with the gap in `CONTENT_GAPS`; the draft is still the producer's to inform, the frozen suite is not.

2. **Write each document** at the path each scenario declares — required headings/sections present, reader-path continuity intact, no placeholder text (`TBD`, `TODO`, `FIXME`, empty sections). Apply the spec's What, Why, and command surface as the source material.

3. **Record the verification** — for each frozen scenario, write its acceptance checks (target path, required headings/sections, no-placeholder, reader-path continuity) to `<DOMAIN_PATH>/verification.md` keyed by scenario name. This is the impl-judge's input; it runs these, never authors them. (In `explore` mode this is throwaway like the spike.)

   **A scenario you cannot settle by inspection gets no check block.** Where a scenario's claim does not lower to a document state a static check can read — *"the page reads well to a first-time merchant"* — write **no** block for it and return it in `CONTENT_GAPS` naming that scenario as unverified. Do not reframe it as a judged read-through, and do not write a block that passes on a proxy: a check the judge cannot fail is worse than a declared gap, because the gap is visible and the passing proxy is not.

4. **Read each document whole, with the scenario list set aside** — the integrity pass
   (`quill:quill-builder-impl`). A sentence written to satisfy one scenario is written to stand
   alone, so it arrives without the context its neighbors established; that pair is only visible
   from a reader's seat, never from a scenario's. Fix a drifted term by returning it to the subject
   class it was coined for; fix a skipped option by **naming a next step for the missing member** in
   the routing passage. Extend the route — do not repair it by writing a sentence explaining why the
   member is excluded. (The spec-side rule in `quill:quill-builder-spec` does admit "route to it or
   state why it is excluded", but that governs a **spec's** control-flow graph against its coverage
   table. This is the **document**: a reader who arrives holding the missing member needs a next
   step, and a justification for their absence is not one.)

   **Do not de-duplicate a repeated claim.** Recurrence is not a defect, and replacing a passage
   with a pointer back is: a reader who arrives at that section from the sidebar never read the
   passage being pointed to, so the pointer costs them the content. Check instead that every path
   the control flow routes to a claim actually reaches it.

   **Record any deliberate violation** of a catalog entry in `verification.md` under
   `## Deliberate violations` — one row per claim, naming the **catalog entry**, the **location**,
   and the **rationale**. Any expectation about prose can be violated to good effect, and this is
   where you say so before the judge reads. State what the violation buys the reader it was made
   for; a rationale that only asserts the choice was deliberate does not clear a finding.

5. **Maintain the `## Artifacts` table** — add a row for each document written (layer = impl).

6. **Never modify `spec.md` or the `.feature`** — the builder does not set its own bar.

## Output

```
STATUS:           complete | needs-input | blocked
GOVERNANCES_APPLIED: [ every governance name loaded before writing — required, [] when none, never written into spec.md or the .feature ]
ARTIFACTS_WRITTEN: [ document paths ]
VERIFICATION_WRITTEN: <path to verification.md, or "none">
CHANGES_MADE:     <documents created or updated, or "none">
QUESTIONS:        [ batched, when needs-input ]
CONTENT_GAPS:     [ { artifact, location, gap } ]
OBSERVATIONS:     [ { owner: architect | strategist, note, evidence } ]
```
