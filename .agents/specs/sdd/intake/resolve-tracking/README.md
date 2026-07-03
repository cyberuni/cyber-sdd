---
spec-type: behavioral
concept: intake
---

# resolve-tracking — resolve an artifact's tracking signal

The **resolve-tracking** procedure: given a touched artifact (its path and, when known, its
**artifact-type**), decide whether SDD **tracks** it (it enters the lifecycle — spec + gates) or
**ignores** it (it still gets built, SDD just does not govern it) — the second, independent
escape-hatch trigger `../README.md` defines. The split mirrors git's own **tracked vs ignored**
files: an ignored artifact still exists and still gets edited; SDD simply does not version its
behavior. It implements a four-step resolution order: **explicit request override**, then a
**project-declared** `.agents/sdd/.sddignore` rule (the universal override valve, gitignore
syntax), then an **artifact-type kind default** (a fixed location convention for agent-config
types; none for code), then **fail-closed to tracked**. The location is a **fixed convention**
plus an **optional ignore file**, never a hardcoded per-project registry. The concrete engine is
the [`resolve-tracking`](../../../../plugins/sdd/skills/resolve-tracking/) skill, which the
conductor runs at intake, before a task becomes a CR.

## Use Cases

**Subject** — deciding one artifact's tracking signal at intake, and reporting which step decided
it. **Non-goals** — it does not decide artifact-type (`resolve-governances`' job), does not
scaffold or gate anything, and does not write `.sddignore` — that file is curated by
`manage-ignore`, edited like a `.gitignore`.

| Trigger | Inputs | Outcome |
|---|---|---|
| **resolve one artifact** — intake needs a tracked/ignored verdict for a touched file | a repo root, the file's repo-relative path, its artifact-type (optional), an explicit tracking declaration (optional) | `tracked` or `ignored`, plus which step decided it |
| **validate the ignore file** — a caller wants to check `.agents/sdd/.sddignore` is well-formed with no `--path` given | a repo root | `.sddignore OK`, or a per-line parse note; a missing file is legal |

Every scenario in [`resolve-tracking.feature`](./resolve-tracking.feature) maps to one of these
two entry points.

## Resolution order

1. **Explicit override** — the caller states `tracked` or `ignored` directly; nothing else is
   consulted.
2. **`.agents/sdd/.sddignore`** — an optional, curated **gitignore-syntax** file. A matching
   pattern marks the path **ignored**; a `!pattern` marks it **tracked** (the re-include /
   override). **Last matching rule wins** (gitignore ordering), so a later `!` line re-tracks a
   path an earlier pattern ignored. A path no rule matches **falls through** to the next step.
   Applies to **any** artifact-type — a project can ignore a shipped path, or re-track a
   private one, over the kind default below.
3. **Kind default** — only agent-config artifact-types `skill`, `subagent`, `command` carry one:
   a fixed location convention (project-private `.agents/skills|agents|commands/**` = ignored;
   project-public `skills/**`, `plugins/*/skills/**`, `packages/*/skills/**` and the `agents`/
   `commands` equivalents = tracked). `agents-section` has **no** kind default — a single
   AGENTS.md has no location-varying convention the way a multi-instance artifact-type does; it
   always falls through to step 4 absent an override. Code artifact-types likewise have no kind
   default (no universal `tools/`-vs-`src/` split holds across projects).
4. **Fail closed to tracked** — no override, no matching `.sddignore` rule, no kind default: the
   artifact resolves **tracked**. Govern by default; a false ignore (dropping a real record) is
   the one failure mode this hatch must never produce.

## The git model — govern by default, ignore by exception

`.sddignore` uses gitignore syntax because SDD's model *is* gitignore's: everything is a
tracking candidate **except** what the ignore file excludes, and `!` re-includes the exceptions.
Unlike git's staging (nothing is tracked until `add`), SDD **fails closed to tracked** — the
ignore file is a pure opt-out list, so the polarity matches gitignore's exclusion semantics
exactly. One deliberate simplification: matching is **pattern-level and last-match-wins**; the
resolver does **not** replicate git's directory-pruning quirk (a `!` under an excluded parent
still re-tracks). `.sddignore` is the **only** per-project state, and it is optional, mutable,
last-write-wins — absent is fine; only a project's known exceptions need a rule.
