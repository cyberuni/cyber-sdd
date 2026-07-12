---
name: resolve-governances
description: "Partial Skill: invoke by name only — the SDD governance matcher, resolving which actor-bar governances apply to a touched file — run by the conductor and the cold spec/impl judges, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Resolve Governances

The concrete engine for **SDD governance resolution**. For a
touched file's **artifact-type** it names, per production-chain role, **which agent runs it** and
**which resolved-actor bar candidates it loads** — matching governances across the caller-passed
project anchors, the matched plugin squad (from the project registry
`.agents/universal-plugin.json`), and the sdd defaults. It is a **dumb matcher**: it returns each
bar's candidates **bucketed by tier** and does **not** order by precedence or apply `compose` — the
consuming agent composes. The conductor and the cold judges run it so they **never hand-enumerate**
the bars. It carries a self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention).

## Run the resolution

```bash
node "<skill>/scripts/resolve-governances.mts" --root . --artifact-type <type> --project <path> [--project-root <path>]
```

- `--root` is the **registry** location (default `.`) — `.agents/universal-plugin.json`.
- `--project <path>` is the file's own project anchor (defaults to `--root`); `--project-root <path>`
  is the outer shared layer in a **monorepo** (omit for a single-project repo). Anchors are
  **caller-passed**, never discovered — the conductor knows the project from `discover-specs`'
  `project-path` or context.
- `--artifact-type <type>` emits the per-role plan as JSON: each role carries its resolved `agent`
  and the **resolved-actor `bars`** only. Each bar's `candidates` are **bucketed by tier** —
  `project` / `project-root` (direct-read file paths) and `plugin` / `sdd` (`<plugin>:<bar>` /
  `sdd:<name>` harness-load refs). The **fixed-universal** governances are invariant per role and
  stay declared in the role/agent definition — the matcher does not emit them.
- `--path <file>` (no `--artifact-type`) consults the optional tiebreaker map
  `.agents/sdd/artifact-types.toml`; a no-match prints a classify-by-convention note.
- No `--artifact-type` and no `--path` → validates the registry is well-formed + unambiguous
  (`governance registry OK`, or per-line violations).

When `node` is absent, an agent performs the same matching by hand: read the registry, match each
touched file's artifact-type to a squad, and name each role's agent + bar candidates per tier.

## Boundaries

It owns no lifecycle state and writes nothing — it **names** candidates; the consuming agent loads
each (direct-read for project files, harness-load for plugin/sdd skills), reads each governance's own
`compose`, and composes by precedence `sdd-default < plugin < project-root < project` (most-specific
wins; `replace` supersedes). Registry matching is deterministic; **disambiguating** an artifact-type
claimed by two plugins is the consumer's agentic step (the plan returns `status: needs-input`).
