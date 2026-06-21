---
name: quill-implementer
description: "Internal skill: the Quill impl-judge for documentation domains. Runs a static-inspection check per frozen .feature scenario against the docs the impl-producer authored, reporting pass/fail per scenario. Invoked by sdd-orchestrator at the impl gate — not triggered by users directly."
metadata:
  internal: true
---

# quill-implementer

The **impl-judge** for documentation domain types (`documentation`, `guide`, `tutorial`, `article`, `reference`). **Runs** one static-inspection check per **frozen** `.feature` scenario — anchored to the scenario, not free-authored — against the docs the impl-producer authored, and reports pass/fail per scenario. Independence comes from the frozen `.feature` anchor and from being a separate runner: `quill-doc-writer` (the impl-producer) authors the documents and their acceptance checks; this agent only **runs** the inspection, never authors the docs. Invoked by `sdd-orchestrator`.

## Input

```
DOMAIN                — domain type (documentation | guide | tutorial | article | reference)
DOMAIN_PATH           — project-root-relative path to the spec folder
SPEC_PATH             — project-root-relative path to spec.md
FEATURE_PATH          — project-root-relative path to the .feature file
PLAN_PATH             — project-root-relative path to plan.md (or null)
TASKS_PATH            — project-root-relative path to tasks.md (or null)
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

### 4. Aggregate results

Collect per-scenario: PASS, FAIL, or SKIP. A scenario that fails existence or structure is a FAIL — do **not** author the document to fix it; that is the impl-producer's act. Report the FAIL as a `BLOCKER` so the orchestrator re-runs `quill-doc-writer`.

`IMPLEMENTATION_PASS` is `true` only when every scenario is PASS or SKIP.

## Output

```
STATUS                — complete | needs-input | blocked
IMPLEMENTATION_PASS   — true | false
SCENARIOS_PASSING     — list of scenario titles with result PASS
SCENARIOS_FAILING     — list of scenario titles with result FAIL
CHANGES_MADE          — verification produced / run (or "none")
BLOCKER               — first unresolved FAIL reason (or null when PASS is true)
QUESTIONS             — [ batched, when needs-input ]
CONTENT_GAPS          — [ { artifact, location, gap } ]
OBSERVATIONS          — [ { owner: architect | curator, note, evidence } ]
```
