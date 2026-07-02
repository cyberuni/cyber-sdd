---
spec-type: behavioral
concept: intake
---

# resolve-durability — resolve an artifact's durability signal

The **resolve-durability** procedure: given a touched artifact (its path and, when known, its
**artifact-type**), decide whether it is **durable** or **non-durable** — the second, independent
escape-hatch trigger `../README.md` defines. It implements the four-step resolution order the
parent spec states in prose: **explicit request override**, then a **project-declared**
`.agents/sdd/durability.toml` entry (the universal override valve), then an **artifact-type kind
default** (a fixed location convention for agent-config types; none for code), then **fail-closed
to durable**. The location is a **fixed convention** plus an **optional lookup table**, never a
hardcoded per-project registry — mirrors how `resolve-governances`' artifact-type tiebreaker map
works, same flat-TOML/most-specific-glob-wins shape. The concrete engine is the
[`resolve-durability`](../../../../plugins/sdd/skills/resolve-durability/) skill, which the
conductor runs at intake, before a task becomes a CR.

## Use Cases

**Subject** — deciding one artifact's durability at intake, and reporting which step decided it.
**Non-goals** — it does not decide artifact-type (`resolve-governances`' job), does not scaffold or
gate anything, and does not write `durability.toml` — that file is agent-maintained, edited in
place like the artifact-type tiebreaker map.

| Trigger | Inputs | Outcome |
|---|---|---|
| **resolve one artifact** — intake needs a durable/non-durable verdict for a touched file | a repo root, the file's repo-relative path, its artifact-type (optional), an explicit durability declaration (optional) | `durable` or `non-durable`, plus which step decided it |
| **validate the override table** — a caller wants to check `.agents/sdd/durability.toml` is well-formed with no `--path` given | a repo root | `durability.toml OK`, or a per-line parse note; a missing file is legal |

Every scenario in [`resolve-durability.feature`](./resolve-durability.feature) maps to one of
these two entry points.

## Resolution order

1. **Explicit override** — the caller states durability directly; nothing else is consulted.
2. **`.agents/sdd/durability.toml`** — an optional, agent-maintained flat TOML map
   `"<path-or-glob>" = "durable" | "non-durable"`; most-specific glob wins (same matcher as the
   artifact-type tiebreaker: literal-character count, then pattern length). Applies to **any**
   artifact-type, not code-only — a project can override the agent-config kind default below.
3. **Kind default** — only agent-config artifact-types `skill`, `subagent`, `command` carry one: a
   fixed location convention (project-private `.agents/skills|agents|commands/**` = non-durable;
   project-public `skills/**`, `plugins/*/skills/**`, `packages/*/skills/**` and the `agents`/
   `commands` equivalents = durable). `agents-section` has **no** kind default — a single AGENTS.md
   has no location-varying convention the way a multi-instance artifact-type does; it always falls
   through to step 4 absent an override. Code artifact-types likewise have no kind default (no
   universal `tools/`-vs-`src/` split holds across projects).
4. **Fail closed to durable** — no override, no matching table entry, no kind default: the artifact
   resolves durable.

## No path registry — the location conventions are fixed, the table is optional

Kind defaults are fixed glob patterns baked into the resolver, not a hardcoded project registry;
`durability.toml` is the **only** per-project state, and it is optional, mutable, last-write-wins —
absent is fine, only a project's known exceptions need an entry.
