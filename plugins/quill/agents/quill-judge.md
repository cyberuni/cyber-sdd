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
invisible from any single scenario's seat:

- **Restatement** — one claim landed in two passages. Report only with **both locations quoted**.
- **Term drift** — one term predicated of two different classes of subject (a container in one use,
  an act in another). Report only with **both uses quoted**.
- **Skipped option** — the document enumerates a set, and a later passage routes a case across that
  set without one of its members. Quote **the enumeration and the routing**.
- **Contradiction** — two passages whose claims cannot both hold. Quote **both**, and name which one
  the rest of the document depends on.

**The frozen suite outranks this bar.** Where a scenario requires what the bar would fail — a claim
the suite asserts in two places, a term a scenario fixes — the scenario wins and the bar yields. The
contract was ratified at the spec gate and the judge does not overrule it; report the collision as
an `OBSERVATIONS` entry owned by the architect, never as a `BLOCKER`. A bar that could veto a frozen
scenario would make the impl gate a second spec gate.

An integrity failure is a `BLOCKER` carrying its citations, for the conductor to re-run
`quill-doc-writer`; do **not** edit the document. Without both citations there is no finding — an
unevidenced impression is a style opinion, which is out of scope (`design/doc-eval-model.md`). Tone,
register, length, order, and mechanism-neighbors are never reported here.

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
INTEGRITY_FINDINGS    — [ { defect, document, citations: [ two quoted locations ] } ] (empty when clean)
CHANGES_MADE          — verification produced / run (or "none")
BLOCKER               — first unresolved FAIL reason (or null when PASS is true)
QUESTIONS             — [ batched, when needs-input ]
CONTENT_GAPS          — [ { artifact, location, gap } ]
OBSERVATIONS          — [ { owner: architect | strategist, note, evidence } ]
```
