# ADR 0012: Spec Frontmatter Schema for Status, Priority, and Dependencies

**Status:** Accepted  
**Date:** 2026-06-15

---

## Context

Specs need to communicate three pieces of metadata that tools and agents use to sequence work:

- **Status** — where in the lifecycle the spec is (draft, approved, implemented, deprecated)
- **Priority** — relative implementation order across a set of specs
- **Dependencies** — which other specs must be implemented first

Previously, status was recorded as prose in the spec body (`**Status:** Draft`). Priority and dependencies had no standard location — they appeared only in narrative text or not at all. Neither is machine-readable without parsing prose.

## Decision

All `spec.md` files must include YAML frontmatter with three fields:

```yaml
---
status: draft           # draft | approved | implemented | deprecated
priority: 1             # integer; 1 = highest
blocked-by:             # list of spec slugs (directory names); omit or empty if none
  - <spec-slug>
---
```

`status` is the canonical location — the prose `**Status:**` line in the body is removed.

Dependencies use `blocked-by` only (single direction). The inverse "blocks" view is derived by scanning all specs for references to a given slug. There is no `blocks` field.

## Rationale

**Frontmatter over prose:** YAML frontmatter is machine-readable without markdown parsing. It enables future tooling to build dependency graphs, sort by priority, and generate status dashboards without heuristics.

**Single-direction `blocked-by`:** Maintaining both `blocks` and `blocked-by` creates a consistency footgun — adding an edge in one direction and forgetting the other produces a corrupt graph. Single-direction is the standard used by build systems (Makefile, Bazel, Cargo) and package managers: declare what you depend on; the "what depends on me" view is derived. The same principle applies here.

**Integer priority over labels:** An integer is unambiguous for ordering. Labels like `high/medium/low` collapse to three buckets and require a tiebreaker anyway. Priority integers are relative within a set — there is no global meaning.

## Consequences

- All `spec.md` files must have `status`, `priority`, and `blocked-by` frontmatter. Omitting `blocked-by` (or leaving it empty) is valid for specs with no dependencies.
- The body no longer contains a `**Status:**` prose line.
- The `spec-template.md` governance reflects this schema.
- SDD principles rule 9 codifies the single-direction dependency rule.
- Future tooling that reads spec metadata must use frontmatter, not prose parsing.
