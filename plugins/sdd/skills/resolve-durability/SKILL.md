---
name: resolve-durability
description: "Internal skill: intake/resolve-durability's concrete engine. A self-contained .mts script that resolves one artifact's durability signal (durable or non-durable) — explicit override, then the optional .agents/sdd/durability.toml universal override table, then a fixed agent-config location convention, then fail-closed to durable. Run by the conductor at intake, before a task becomes a CR. Not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Resolve Durability

The concrete engine for **durability resolution** — the second escape-hatch trigger
(`.agents/specs/sdd/intake/README.md`). For one touched artifact it decides **durable** or
**non-durable** and reports which step decided it, so the conductor can escape a task outright
(no CR, no draft, no gate, no record) when it resolves non-durable. It carries a self-contained
`.mts` script (the repo's node-≥23.6 / no-deps convention), reusing the same flat-TOML /
most-specific-glob-wins matcher `resolve-governances` uses for the artifact-type tiebreaker map.

## Run the resolution

```bash
node "<skill>/scripts/resolve-durability.mts" --root . --path <repo-relative-path> [--artifact-type <type>] [--explicit durable|non-durable]
```

- `--root` is the repo root (default `.`) — where `.agents/sdd/durability.toml` is read from.
- `--path <path>` is the artifact's repo-relative path. Required unless validating the table.
- `--artifact-type <type>` enables the kind-default step for `skill` / `subagent` / `command`
  (a fixed location convention). Omit it (or pass `agents-section` or any code artifact-type) to
  skip straight from the table to fail-closed — there is no kind default for those.
- `--explicit durable|non-durable` short-circuits resolution — nothing else is consulted.
- No `--path` → **validates** `.agents/sdd/durability.toml` is well-formed (`durability.toml OK`,
  or per-line parse notes); a missing file is legal and also reports OK.

Output is two lines: the verdict (`durable` | `non-durable`) and a `reason:` line naming the
deciding step, so the caller can log or surface why.

## Resolution order

1. **Explicit override** (`--explicit`) — wins outright.
2. **`.agents/sdd/durability.toml`** — optional, mutable, last-write-wins flat TOML map
   `"<path-or-glob>" = "durable" | "non-durable"`. Universal — applies to any artifact-type.
3. **Kind default** — `skill` / `subagent` / `command` only: project-private paths
   (`.agents/skills|agents|commands/**`) are non-durable; project-public/shipped paths
   (`skills/**`, `plugins/*/skills/**`, `packages/*/skills/**`, and the `agents`/`commands`
   equivalents) are durable. No default for `agents-section` or any code artifact-type.
4. **Fail closed** — no signal resolves **durable**.

## Notes

- This is a **pure derivation** over fixed conventions plus the optional table — it consults no
  per-project registry of paths and writes nothing. `durability.toml` is agent-maintained, edited
  in place (correct a binding by overwriting its key), never an append-only log.
- The kind-default location globs are fixed in this script, not configurable — a project that
  disagrees with a specific binding uses `durability.toml` to override it (the design this skill
  and its parent spec settled on: keep the low-friction default, add the override valve).
