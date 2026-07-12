---
name: check-plan-safety
description: "Partial Skill: invoke by name only — plan-brief/check-plan-safety's guard engine against machine-local path leaks in tracked plan artifacts — the CI guard, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Check Plan Safety

The concrete engine for the **plan brief's safe-to-publish floor**. The plan brief
(`.agents/plans/<cr-ref>.plan.md`) and its sibling design docs are **tracked, portable** handoff
artifacts — committed at handoff and read by any later session, agent, or checkout. This engine
guards that floor mechanically: it scans those `*.md` files for **machine-local references** that
must never enter git history. It carries a self-contained `.mts` script (the repo's node-≥23.6 /
no-deps convention), and is the plan-brief analog of the combat log's safe-to-publish floor
(`combat-log-governance`) — the same "never committed: absolute paths, OS usernames" rule, extended
from the ledger to the brief.

## What it flags

- **home-abs-path** — a home-directory absolute path: `/home/<user>/…`, `/Users/<user>/…`, or a
  Windows profile `C:\Users\<user>\…`. Leaks the OS username (privacy) **and** resolves on no other
  checkout (portability).
- **env-home** — a shell expansion of the home dir: `$HOME`, `${HOME}`, `%USERPROFILE%`, `%HOMEPATH%`.
- **env-user** — a shell expansion of the identity: `$USER`, `${USER}`, `%USERNAME%`.

Every finding is **blocking** — a leak is a leak. The fix is to bring the referenced content into
the repo and reference it **repo-relative** (e.g. copy a `~/.claude/plans/` design doc to
`.agents/plans/<cr-ref>.design.md`), never to link a machine-local path.

### What it deliberately does NOT flag

A bare `~/` is **not** a leak — it carries no username and legitimately appears in design prose
describing home-rooted feature paths (a tool's own `~/.<tool>/` data root). `$HOMEBREW` / `$USERDATA`
(a different variable that merely starts with `HOME`/`USER`) are not flagged either.

## Run the scan

```bash
node "<skill>/scripts/check-plan-safety.mts" [--root .] [--path <file>]... [--check] [--format toon|json]
```

- Default `--root` is the current directory; default `--format` is **TOON** (the token-efficient
  tabular form). Absent `--path`, it scans every `*.md` under `<root>/.agents/plans`.
- **`--path <file>`** (repeatable) scans an explicit file set instead of the plan dir — used by
  `pause-mission` to check the one brief it is about to commit.
- **Audit mode** (default) emits the finding set (`file, line, kind, token`) and exits **0**.
- **`--check`** (CI guard) exits **non-zero** iff any leak is found and **writes nothing** else.
  Wired into `verify:specs` (`node …/check-plan-safety.mts --root . --check`).

When `node` is absent, an agent performs the same derivation by hand: grep the plan `*.md` files for
`/home/`, `/Users/`, `C:\Users\`, `$HOME`, and `$USER`.

## Boundaries

Read-only — it writes nothing and acts on no finding. It does not fix a leak (the author scrubs it),
does not check gate legality (`spec-gate`), and does not audit node-shape (`check-spec-structure`).
It is loaded by the `manage` gateway (Audit & align) for an on-demand scan and by `pause-mission`
before a checkpoint commit.
