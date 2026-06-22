---
name: spec-digest
description: "Internal skill: read-only digest of one spec for gate review. Reads spec.md and the sibling .feature and returns a fixed-section summary. Invoked by validate-spec at the spec gate — not triggered by users directly."
metadata:
  user-invocable: false
  internal: true
---

# Spec Digest

Summarize one spec so a human can review it at the gate. Read `spec.md` and the sibling `.feature` in the target spec folder and return the digest below. Write nothing, advance no status, render no verdict — `validate-spec` owns the gate decision.

## Read

Read only two files from the target spec folder:

- `spec.md`
- the sibling `.feature` (any `*.feature` in the same folder)

Read nothing else. A missing `.feature` is not an error — report zero scenarios.

## Emit

Return these sections, in this order:

| Section | Source |
|---|---|
| **What** | the first paragraph under `## What` in `spec.md` |
| **Status** | the `status` frontmatter field |
| **Scenarios** | the count of `Scenario:` lines and each scenario name from the `.feature` |
| **Key decisions** | the `### ` headings under `## Design decisions` in `spec.md` |
| **Open items** | every `<!-- open: ... -->` marker found in `spec.md` or the `.feature` |

Example shape:

```text
Spec digest — specs/<domain>
  What:    <one-line summary>
  Status:  draft
  Scenarios (5): <name>, <name>, <name>, <name>, <name>
  Key decisions: <heading>, <heading>, <heading>
  Open items: none
```

## Boundaries

- **Read-only** — do not edit `spec.md`, the `.feature`, or any other file.
- **No status write** — never set `status`, `aligned`, or `approved-by`.
- **No verdict** — the digest states facts only; it contains no approval decision and no advance-or-block recommendation. `validate-spec` decides at the gate.
- **No domain interpretation** — emit the structural sections above; do not add domain-specific analysis.
