# render-spec-graph

Non-user-invocable SDD skill that renders the **spec DAG** to `artifacts/specs/graph.md`.

The set of specs under `artifacts/specs/` forms a directed acyclic graph: each folder is a node (the slug is its ID) and each `blocked-by` frontmatter entry is a dependency edge. `graph.md` is a **derived view** of that graph (a Mermaid diagram + a node table). `blocked-by` is the source of truth — never hand-edit `graph.md`.

## Run

```bash
# regenerate graph.md
node plugins/sdd/skills/render-spec-graph/scripts/render-spec-graph.mts

# fail if graph.md is stale (CI / gate)
node plugins/sdd/skills/render-spec-graph/scripts/render-spec-graph.mts --check

# unit tests
node --test plugins/sdd/skills/render-spec-graph/scripts/render-spec-graph.test.mts
```

Runs on plain `node` (v23.6+ native TypeScript type-stripping) — no `tsx`, no `npx`, no dependencies. When `node` is unavailable, the SKILL.md documents an agent fallback that produces the same format.

## Spec

`artifacts/specs/sdd-spec-graph/` — full spec, scenarios, plan, and tasks.
