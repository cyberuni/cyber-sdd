---
name: resolve-tracking
description: "Partial Skill: invoke by name only — intake/resolve-tracking's engine that resolves an artifact's tracked-or-ignored signal — run by the conductor at intake, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Resolve Tracking

The concrete engine for **tracking resolution** — the second escape-hatch trigger
(`.agents/specs/sdd/intake/README.md`). For one touched artifact it decides **tracked** (SDD
governs it — spec + gates) or **ignored** (SDD does not govern it; it still gets built) and
reports which step decided it, so the conductor can skip a task outright (no CR, no draft, no
gate, no record) when it resolves ignored. The split mirrors git's **tracked vs ignored** files.
It carries a self-contained `.mts` script (the repo's node-≥23.6 / no-deps convention).

## Run the resolution

```bash
node "<skill>/scripts/resolve-tracking.mts" --root . --path <repo-relative-path> [--artifact-type <type>] [--explicit tracked|ignored]
```

- `--root` is the repo root (default `.`) — where `.agents/sdd/.sddignore` is read from.
- `--path <path>` is the artifact's repo-relative path. Required unless validating the file.
- `--artifact-type <type>` enables the kind-default step for `skill` / `subagent` / `command`
  (a fixed location convention). Omit it (or pass `agents-section` or any code artifact-type) to
  skip straight from `.sddignore` to fail-closed — there is no kind default for those.
- `--explicit tracked|ignored` short-circuits resolution — nothing else is consulted.
- No `--path` → **validates** `.agents/sdd/.sddignore` is well-formed (`.sddignore OK`, or
  per-line parse notes); a missing file is legal and also reports OK.

Output is two lines: the verdict (`tracked` | `ignored`) and a `reason:` line naming the
deciding step, so the caller can log or surface why.

## Resolution order

1. **Explicit override** (`--explicit`) — wins outright.
2. **`.agents/sdd/.sddignore`** — optional, curated **gitignore-syntax** file. Blank lines and
   `#` comments are skipped. A leading `!` marks the path **tracked** (re-include); any other
   pattern marks it **ignored**. Matching is **last-match-wins**: the last rule whose pattern
   matches the path decides, so a later `!` line re-tracks a path an earlier pattern ignored.
   Supports `**` (spans path separators), `*` (within a segment), a leading `/` (anchor to root),
   and a trailing `/` (match a directory and its contents). A path no rule matches **falls
   through**. Universal — applies to any artifact-type.
3. **Kind default** — `skill` / `subagent` / `command` only: project-private paths
   (`.agents/skills|agents|commands/**`) are **ignored**; project-public / shipped paths
   (`skills/**`, `plugins/*/skills/**`, `packages/*/skills/**`, and the `agents`/`commands`
   equivalents) are **tracked**. No default for `agents-section` or any code artifact-type.
4. **Fail closed** — no signal resolves **tracked**. Govern by default; a false ignore (dropping
   a real record) is the one failure mode this hatch must never produce.

## Notes

- This is a **pure derivation** over fixed conventions plus the optional `.sddignore` — it
  consults no per-project registry of paths and writes nothing. `.sddignore` is the only
  per-project state: optional, mutable, edited in place like a `.gitignore` (curated by
  `manage-ignore`), never an append-only log.
- One deliberate simplification vs git: matching is **pattern-level and last-match-wins**; the
  resolver does **not** replicate git's directory-pruning quirk (a `!` under an excluded parent
  still re-tracks).
- The kind-default location globs are fixed in this script, not configurable — a project that
  disagrees with a specific binding uses `.sddignore` to override it (keep the low-friction
  default, add the override valve).
