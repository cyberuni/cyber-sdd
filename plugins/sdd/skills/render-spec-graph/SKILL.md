---
name: render-spec-graph
description: "Use this skill when create-spec or the orchestrator needs to regenerate the SDD spec-DAG view from blocked-by frontmatter edges, or check graph staleness. Internal skill: not triggered by users directly."
metadata:
  user-invocable: false
---

# Render Spec Graph

Render the spec DAG to `graph.md` — a derived Mermaid view + node table built from the `blocked-by` frontmatter edges across every `spec.md` under the specs root. `blocked-by` is the source of truth; `graph.md` is never hand-edited.

## Deterministic path (preferred)

Run the script with plain `node` (v23.6+ strips the TypeScript types — no `tsx`, no `npx`, no install):

```bash
node "<skill>/scripts/render-spec-graph.mts" [--root <dir>] [--out <file>] [--check]
```

| Flag | Default | Meaning |
|---|---|---|
| `--root <dir>` | `artifacts/specs` | directory whose descendant folders may contain specs |
| `--out <file>` | `<root>/graph.md` | output path |
| `--check` | off | render and compare only; exit 1 if `--out` is stale or missing; write nothing |

Exit `0` on success (or fresh under `--check`); exit `1` on a `blocked-by` cycle, an unreadable spec, or a stale/missing file under `--check`.

Regenerate after any `blocked-by` change; run `--check` at the gate / in CI to guarantee the committed graph is current.

## Agent fallback (when node cannot run)

If `node` is unavailable, render the same output by hand:

1. For each `<root>/**/spec.md`, read frontmatter `status` and `blocked-by`.
2. Skip folders with no `spec.md`.
3. If any `blocked-by` chain forms a cycle, stop and report it — do not write.
4. Use each spec folder's root-relative path as its slug, such as `sdd/sdd-skill`.
5. Write `<root>/graph.md` in this exact shape: the `# Spec DAG` heading, the two-paragraph derived-view note, a `mermaid` `graph TD` block (bare nodes sorted alphabetically, then `parent --> child` edges sorted alphabetically — one edge per `blocked-by` entry), then a `## Nodes` table (`Spec | blocked-by | status`, rows sorted by slug, `—` for an empty cell).

The script is the source of truth for the format; match its output byte-for-byte.

## Tests

```bash
node --test "<skill>/scripts/render-spec-graph.test.mts"
```
