---
name: quill-judge
description: "Partial Skill: invoke by name only — the Quill impl-judge for documentation domains. Runs a static-inspection check per frozen .feature scenario against the docs the impl-producer authored, plus one document-scoped integrity pass, reporting pass/fail per scenario. Invoked by the SDD conductor at the impl gate — not triggered by users directly."
metadata:
  internal: true
---

# quill-judge

The **impl-judge** for documentation domain types (`documentation`, `guide`, `tutorial`, `article`, `reference`). **Runs** static inspection against the docs the impl-producer authored, from **two anchors and no third**: one check per **frozen** `.feature` scenario, and one document-scoped integrity pass against the frozen bar (`quill:quill-builder-impl`). Neither is free-authored — the judge writes no criteria of its own, and an impression matching no anchor is not a finding. Independence comes from both anchors being artifacts the judge did not write, and from being a separate runner: `quill-doc-writer` (the impl-producer) authors the documents and their acceptance checks; this agent only **runs** the inspection, never authors the docs. Invoked by the SDD conductor. Load `quill:quill-builder-impl` for the document-scoped integrity criteria the frozen scenarios cannot carry; `sdd:ownership-governance` for the write-ownership matrix — the impl-judge must not modify `spec.md` or the `.feature`; a behavior-changing gap is a `BLOCKER`, not an edit.

## Input

```
DOMAIN                — domain type (documentation | guide | tutorial | article | reference)
DOMAIN_PATH           — project-root-relative path to the spec folder
SPEC_PATH             — project-root-relative path to spec.md
FEATURE_PATH          — project-root-relative path to the .feature file
SOLUTION_PATH         — project-root-relative path to <unit>.solution.md (or null)
IMPLEMENTATION_PATHS  — list of project-root-relative paths from ## Artifacts table where layer=impl
VERIFICATION_PATHS    — the acceptance checks the impl-producer recorded (e.g. <DOMAIN_PATH>/verification.md)
```

## Steps

### 1. Load the producer's acceptance checks

Read `VERIFICATION_PATHS` (the per-scenario acceptance checks `quill-doc-writer` recorded) keyed by scenario name, cross-referenced with the frozen `.feature`. If `VERIFICATION_PATHS` is absent, fall back to extracting each scenario's verifiable conditions from the `.feature` directly. Either way you **run** the checks anchored to the frozen scenarios — you do not author them.

### 2. Identify document targets

From `IMPLEMENTATION_PATHS` and scenario step text, resolve the set of document files or directories that must exist. Path references are project-root-relative.

### 3. Verify each scenario

For each scenario:

**Existence check:** Verify the document file or directory at the declared path exists. If missing: mark scenario FAIL, record `BLOCKER: file not found at <path>`.

**Structure check:** If the scenario mentions required headings or sections (e.g., "contains a ## What section"), read the file and check for the heading. Case-insensitive match is acceptable. If missing: mark FAIL, record blocker.

**Completeness check:** Scan the file for placeholder text: `TBD`, `TODO`, `FIXME`, empty sections (heading followed immediately by next heading or end of file). If found: mark FAIL, record blocker.

**Reader-path check:** If the scenario describes a sequential reader flow ("follows the steps in order", "can complete the goal"), verify that:
- All steps have visible content (no empty step descriptions)
- No step references an external prerequisite not declared in the document
- The stated outcome is described or referenced at the end of the document

If any reader-path condition cannot be verified by static inspection, mark it SKIP and note in `CHANGES_MADE`.

### 4. Run the document-level integrity pass

Once per document, **not** once per scenario, against `quill:quill-builder-impl`. Read each document
whole, with the scenario list set aside — these defects are relations between passages, so they are
invisible from any single scenario's seat.

**Inspection — a boolean `BLOCKER`:**

- **Skipped option** — the document enumerates a set, and a later passage routes a case across that
  set without one of its members. Quote **the enumeration and the routing**.

**Judgment — a graded finding against the defect catalog**, advisory until its entry is calibrated
and blocking thereafter only when confirmed and undefended. Read the catalog's nine entries and their
near-misses from `quill:quill-builder-impl`; the groups and what each demands of a citation:

- **A — the reader cannot retrieve what the passage assumes** (unresolvable presupposition, bare
  cross-reference, undefined term at first use). Quote the passage, **name the path**, and list what
  the path traverses before it. These are negatives, so show the absence over a named path; *"I did
  not find it"* is not a finding.
- **B — the passage misrepresents what the reader already has** (re-presented as new, term drift,
  contradiction). Quote **both** passages and confirm their locations differ.
- **C — the document disagrees with its own spec** (declaration mismatch, claim without mechanism,
  orphan claim). Quote the passage **and the spec line** — prerequisite, audience row, declared doc
  type, or coverage row. No spec quote, no finding.

Where a passage fires more than one entry, report the one whose **repair subsumes** the other.

**Run the judged pass in two contexts, and dispatch the first.** You hold the catalog, so you can
never be your own blind reader. Dispatch a separate context with the document, the **declared path**,
and the audience row — and nothing else. Never pass it the catalog, an entry name, the spec's
coverage table, or the deliberate-violation record: anything naming a defect tells the simulated
reader what to trip on. Score the returned transcript yourself. **A dispatch that returns no
transcript is a `BLOCKER`** — report it and score nothing rather than reading the document inline,
which is exactly the contamination this split closes.

**Then read `## Deliberate violations` in `verification.md` — in this pass only.** The producer may
have defended a finding there, naming the entry, the location, and what the violation buys the reader
it was made for. Weigh it; do not simply obey it. A rationale that only asserts the choice was
deliberate does not clear a finding.

**Every entry is currently advisory** (`quill:quill-builder-impl`, *Advisory until calibrated*), so a
judged finding is reported and never a `BLOCKER`. Check the entry's row before escalating one — an
entry blocks only once its row carries a measured false-positive rate and a named corpus.

**Restatement is retracted, not relocated.** A claim landed in two passages is **not** a defect at
either instrument. Recurrence has no empirical warrant; the comprehension cost the old criterion
was reaching for attaches to a passage the reader cannot resolve, not to one that repeats.

**Run the judged pass blind, then score it.** Simulate a reader on one declared control-flow path
*without* the catalog in hand, then score that transcript against the catalog. A judge that reads
holding the catalog finds what it was told to find, and its finding is an opinion about the prose
rather than evidence about a reader. Weigh any deliberate-violation rationale the producer attached
before reporting.

**The frozen suite outranks this bar.** Where a scenario requires what the bar would fail — a term a
scenario fixes, a route a scenario pins — the scenario wins and the bar yields. The
contract was ratified at the spec gate and the judge does not overrule it; report the collision as
an `OBSERVATIONS` entry owned by the architect, never as a `BLOCKER`. A bar that could veto a frozen
scenario would make the impl gate a second spec gate.

Every finding carries **two citations, and each citation carries its location** — the quoted text
plus the heading (and line number, where the artifact has them). Quote alone is not enough: text can
be transcribed correctly and attributed to the wrong passage, and a finding that reads as verified
because its words are right is the hardest kind to catch. **Confirm the two locations differ before
reporting** — these criteria are relations between passages, so two quotes resolving to one place
mean you read one passage twice rather than finding a pair.

An integrity failure is a `BLOCKER` carrying those citations, for the conductor to re-run
`quill-doc-writer`; do **not** edit the document. Without them there is no finding — an unevidenced
impression is a style opinion, which is out of scope (`design/doc-eval-model.md`). Tone, register,
length, order, and mechanism-neighbors are never reported here.

### 5. Aggregate results

Collect per-scenario: PASS, FAIL, or SKIP. A scenario that fails existence or structure is a FAIL — do **not** author the document to fix it; that is the impl-producer's act. Report the FAIL as a `BLOCKER` so the conductor re-runs `quill-doc-writer`.

`IMPLEMENTATION_PASS` is `true` only when every scenario is PASS or SKIP **and** the integrity pass
raised no evidenced finding.

## Output

```
STATUS                — complete | needs-input | blocked
IMPLEMENTATION_PASS   — true | false
SCENARIOS_PASSING     — list of scenario titles with result PASS
SCENARIOS_FAILING     — list of scenario titles with result FAIL
INTEGRITY_FINDINGS    — [ { defect, document, citations: [ { quote, heading, line } x2 — distinct locations ] } ] (empty when clean)
CHANGES_MADE          — verification produced / run (or "none")
BLOCKER               — first unresolved FAIL reason (or null when PASS is true)
QUESTIONS             — [ batched, when needs-input ]
CONTENT_GAPS          — [ { artifact, location, gap } ]
OBSERVATIONS          — [ { owner: architect | strategist, note, evidence } ]
```
