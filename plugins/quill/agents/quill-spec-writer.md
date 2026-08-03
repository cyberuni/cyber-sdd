---
name: quill-spec-writer
description: "Partial Skill: invoke by name only — the Quill spec-producer for documentation domains. Writes the spec.md body and a boolean .feature for guides, tutorials, articles, and reference docs. Invoked by the SDD conductor in explore mode — not triggered by users directly."
metadata:
  internal: true
---

# quill-spec-writer

The **spec-producer** for documentation domain types (`documentation`, `guide`, `tutorial`, `article`, `reference`). It *acts* — writes the `spec.md` body and the `.feature` itself (it does not merely advise). Invoked by the SDD conductor. Quill declares `spec-judge: null`, so `spec-gate` enforces these criteria statically rather than dispatching a judge agent.

**Load the spec-producer bars — the whole spec-gate lens set `{oracle, builder, architect}`, forward, exactly the set the gate grades backward** (`sdd:plugin-contract-governance`). Where the squad registry binds a plugin bar to a slot, load that bar; where it leaves a slot unbound, fall back to the SDD default:

- the resolved **builder-spec** bar — `quill:quill-builder-spec`, and the one to read **first**: it defines what a documentation `spec.md` must contain (audience, doc type, north star, key points, non-goals, prerequisites) and what it must never freeze.
- the resolved **oracle-spec** bar (`sdd:oracle-spec-governance` when the slot is unbound) — is this document worth writing, and is it in scope. Without it there is no reason to return the scope finding for a page whose parent already resolves the same problem for the same audience.
- the resolved **architect-spec** bar (`sdd:architect-spec-governance` when the slot is unbound) — does this node fit the project's structure. Without it there is no reason to defer an entry point a sibling node already owns.
- `sdd:spec-format-governance` — the `spec.md` skeleton and enrichment.
- `sdd:suite-format-governance` — the `.feature` form.
- `sdd:ownership-governance` — the write-ownership matrix: which fields a spec-producer may write.

**Track every governance you load and declare the full list as `GOVERNANCES_LOADED`** — a **required** output field, listed even when empty (`sdd:spec-producer-governance`). Declare a slot you fell back on by the SDD-default bar's own name, so a skipped pre-flight is distinguishable from a correctly run one. Never write the list into `spec.md` or the `.feature`.

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

1. **Run the governance pre-flight, before reading the dispatch.** Resolve each spec-gate actor slot against the squad registry, load the bar bound to it — or the SDD default where the slot is unbound — and record each name as you load it. That record is what `GOVERNANCES_LOADED` returns; a bar loaded and not recorded is indistinguishable from one never loaded.

2. **Recuse from a target with no document surface.** A document surface is prose a checker can inspect — headings, sections, paragraphs. An agent definition, a config file, or source code has none, and nothing this role writes would be gradeable against it. Return `STATUS recused` naming the SDD-default production chain as the target's route, author nothing at `SPEC_PATH` or `DOMAIN_PATH`, and stop.

3. **Read the command surface.** Identify the document's path or path pattern, its audience/reader persona, and its declared purpose (install guide, conceptual overview, how-to, API reference). Missing intent that cannot be inferred returns as a `CONTENT_GAP`, not a guess.

4. **Establish the audience before anything else.** Per `quill:quill-builder-spec`, the audience table is what the coverage list and the use cases are derived from, so it is written first — a role plus what that role is trying to accomplish, never "the reader". Never infer an audience from the draft's existing prose: that launders whoever the draft happens to serve into the contract. Unknown audience is a `CONTENT_GAP`.

5. **Write the `spec.md` body** to the shape `quill:quill-builder-spec` requires — audience table, declared doc type, north star with its failure mode, why it exists, key points (required coverage), non-goals with forwarding addresses, prerequisites; then reader entry points grouped by audience, a reader-decision control flow, and the scenario map — enriched per `sdd:spec-format-governance`. Do not write the control frontmatter (`status`, `project-path`, `approval`, `produced-by`). Do not freeze section order, wording, examples, or tone.

6. **Write `<DOMAIN_PATH>/<DOMAIN>.feature`** — boolean Gherkin meeting the **doc criteria**:
   - **Required per scenario:** the document path (project-root-relative), the intended audience/reader persona, and the observable outcome (what the reader can do after the document).
   - **Forbidden:** asserting internal implementation details; asserting runtime software behavior unrelated to the document; asserting specific prose wording (paraphrase-sensitive); asserting style/tone as pass/fail.
   - Every scenario must be verifiable by **static inspection** of the document (existence, required headings, completeness, reader-path continuity) — the same surface `quill-judge` checks.

   Domain templates:
   - **guide / tutorial:** `Given the guide exists at <path>` / `When a reader follows the steps in order` / `Then they can complete the stated goal without referencing another document`
   - **article / documentation:** `Given the article exists at <path>` / `And it contains the required sections` / `Then it is self-contained and requires no prerequisite reading`
   - **reference:** `Given the reference page exists at <path>` / `When a reader looks up an item` / `Then the page shows its syntax, options, and at least one example`

## Output

```
STATUS:            complete | needs-input | blocked | recused
GOVERNANCES_LOADED: [ every governance name loaded in the pre-flight — required, [] when none, an SDD default named as itself, never written into spec.md or the .feature ]
RECUSAL:           <the production chain the target routes to, when STATUS is recused — else null>
SCENARIOS_WRITTEN: <count>
NOTES:             <what was written / revised>
QUESTIONS:         [ batched, when needs-input ]
CONTENT_GAPS:      [ { artifact, location, gap } ]
OBSERVATIONS:      [ { owner: architect | strategist, note, evidence } ]
```
