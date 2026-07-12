---
name: concept-index
description: "Partial Skill: invoke by name only — project-spec/concept-index's engine that derives the by-concept view of a project spec into spec.md — used to re-unify a cross-cutting concern the capability folder tree scatters, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Concept Index

The concrete engine for the **concept-index** step. It scans
one project-spec for every node's `concept:` frontmatter and renders the **by-concept view** —
`concept → {its nodes across every folder}` — that re-unifies a cross-cutting concern the capability
folder tree scatters (the concept axis: one concern enacted across several capability folders). It
carries a self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention).

## Run it

```bash
node "<skill>/scripts/concept-index.mts" --spec-dir <spec> [--write | --check]
```

- default (no mode) — print the rendered "By concept" section to stdout (dry run).
- `--write` — replace the generated block in `<spec>/spec.md` with the freshly rendered table;
  inserts the block at the `## Invariants` anchor when the markers are absent.
- `--check` — exit non-zero when `spec.md`'s block differs from the freshly rendered table (the
  no-drift guard for CI).

The view is **pure derivation** from the `concept:` tags: rendering twice is byte-identical and a
`--write` over a current block is a no-op. Each node is annotated by **facet kind** — a node under `design/` → rule,
under `acceptance/` → e2e, else `reference` / `behavior` / `index` from its `spec-type`.

## Boundaries

Frontmatter only — no node body reaches the output. The write touches **only** the content between the
generated-block markers; lifecycle frontmatter, prose, and the capability map are left untouched. It
owns no lifecycle state and renders no verdict. When `node` is absent, an agent performs the same
derivation by hand: read each node's `concept:` tag, group by concept, and render the table.
