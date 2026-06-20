---
name: quill-implementer
description: "Internal skill: SDD implementer contract implementation for documentation domain types. Verifies that documentation exists and meets structural requirements per .feature scenarios. Invoked by sdd-implementer dispatcher — not triggered by users directly."
metadata:
  internal: true
---

# quill-implementer

Implements the SDD implementer contract for documentation domain types (`documentation`, `guide`, `tutorial`, `article`, `reference`). Reads `.feature` scenarios, verifies or authors documentation to satisfy them, and reports pass/fail per scenario.

## Input

```
DOMAIN                — domain type (documentation | guide | tutorial | article | reference)
DOMAIN_PATH           — project-root-relative path to the spec folder
SPEC_PATH             — project-root-relative path to spec.md
FEATURE_PATH          — project-root-relative path to the .feature file
PLAN_PATH             — project-root-relative path to plan.md (or null)
TASKS_PATH            — project-root-relative path to tasks.md (or null)
IMPLEMENTATION_PATHS  — list of project-root-relative paths from ## Artifacts table where layer=impl
```

## Steps

### 1. Parse scenarios

Read the `.feature` file. Extract each scenario title and its Given/When/Then steps. Build a list of verifiable conditions per scenario.

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

### 4. Author missing documentation (if needed)

If a scenario fails existence or structure checks and `IMPLEMENTATION_PATHS` declares a target path for this domain: create or update the document to satisfy the failing conditions. Apply the spec's What, Why, and command surface as the content source.

After authoring: re-run the verification for the affected scenarios.

### 5. Aggregate results

Collect per-scenario: PASS, FAIL, or SKIP.

`IMPLEMENTATION_PASS` is `true` only when every scenario is PASS or SKIP (no FAILs remain after authoring).

## Output

```
IMPLEMENTATION_PASS   — true | false
SCENARIOS_PASSING     — list of scenario titles with result PASS
SCENARIOS_FAILING     — list of scenario titles with result FAIL (after authoring attempt)
CHANGES_MADE          — summary of documents created or updated (or "none")
BLOCKER               — first unresolved FAIL reason (or null when PASS is true)
```
