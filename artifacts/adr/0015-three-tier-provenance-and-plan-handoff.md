# ADR-0015: Three-tier provenance and the plan as a portable handoff artifact

## Status

Accepted

> **Update note (2026-06-28):** The three-tier model below is current, but two terms drifted.
> The durable ledger is now `ledger.jsonl` — the name `combat-log.jsonl` now refers to the
> per-mission `*.log.jsonl` (mid-flight tier). And the plan is **tracked, not gitignored** —
> committed with the work, distilled then deleted at retro. Current shape:
> `.agents/specs/sdd/design/provenance-model.md`.
>
> **Superseded in part (ADR-0020):** the durable ledger is no longer one `ledger.jsonl` with
> `merge=union`; it is a `ledger/` **directory** of per-CR-per-writer shard files (conflicts
> structurally impossible, no merge driver), and ledger lines drop the wall-clock `ts`.

## Context

SDD's original provenance model was a **two-face combat log**: a current-state face in
`spec.md` frontmatter, and one append-only `combat-log.jsonl` ledger sibling to each spec,
carrying every mission's per-subagent `report` lines, `correction`-with-`cause` lines,
`gate` verdicts, and `strategy` drafts.

Ruling **F** then made concurrency git-native: **one mission = one working tree = one CR**,
parallelism = separate trees. That exposed a defect (open question **M**): the combat log is
**one file per corpus**, but it carries **high-frequency mid-flight appends** from whichever
mission is running. Two trees running concurrently each hold their own copy of
`combat-log.jsonl` and both append; the file also carried a **global monotonically increasing
`seq`**, which two trees would mint independently → duplicate `seq`, broken monotonicity, and
an append-at-EOF merge conflict on every concurrent mission.

The deeper realization: most of what the ledger carried is **mid-flight mission working
state** (the chatty `report`/`correction`/`seq` lines), not durable provenance. Mid-flight
state has a different audience, lifetime, and privacy posture than the durable record. It
also turns out to be useful as a **handoff artifact** — the unit you ship to another agent or
model to continue a mission.

A decision is needed on **what is durable vs ephemeral, where each lives, and what format**.

## Decision Drivers

- M must be resolved without an SDD-specific lock (F's principle: lean on git, stay
  tree-agnostic).
- Mid-flight detail is **private** (must not leak to the CR source), **ephemeral** (useful
  only until the CR completes), and **per-mission**.
- The durable record (gate verdicts + frozen sets + distilled lessons) must outlive the CR
  and survive across installations (Forge).
- A plan should be **portable** — handed to another agent/model to continue the mission.
- Avoid re-deriving the whole project on every outer-loop run (incremental, not cold-start).

## How the field does it (survey)

Full survey with sources: [docs/research/2026-06-agent-plan-persistence.md](../../docs/research/2026-06-agent-plan-persistence.md).
Three lessons drive this decision:

1. **In-repo mid-flight state is the exception; Cursor is the outlier.** Almost every tool
   parks runtime state in the **home dir** (`~/.codex`, `~/.gemini`, `~/.copilot`,
   `~/.claude/tasks`, Cline globalStorage) or **server-side** (Amp, Devin). In-repo files are
   durable **config** (AGENTS.md, rules, Cline's Memory Bank), never mid-flight scratch.
2. **A clean format dichotomy.** The **machine event log is append-only JSONL** (Codex
   `rollout-*.jsonl`, Copilot `events.jsonl`); the **human/portable plan and memory are
   Markdown** (Cursor `*.plan.md`, Cline Memory Bank, GEMINI.md).
3. **Everyone separates durable config from runtime state.** Nobody has a durable *internal
   provenance ledger* (gate verdicts + distilled lessons); that is SDD-specific.

Two properties of the field's approach are actively **bad for SDD**:

- **Home-dir / global storage forces a synthetic unique key.** Because `~/.tool/` is shared
  across every checkout, those tools must synthesize a per-project-and-per-worktree id
  (Gemini's `<project_hash>`, Windsurf's workspace-path hash, Claude Code's
  `CLAUDE_CODE_TASK_LIST_ID`) to keep sessions apart. SDD already has a natural key — the
  worktree — so co-locating the plan **in the tree** makes its path *intrinsically* unique
  with no hashing.
- **Runtime state is private to its own runtime.** A JSONL rollout or a server thread is only
  resumable as *"continue session `<id>`"* inside the **same** tool. There is **no portable,
  cross-model mission artifact** in the field.

## Decision

Split provenance into **three tiers**, by lifetime and audience:

| Tier | Home | Written at | Read by | Lifetime |
|---|---|---|---|---|
| **Private scratch** (the **plan**) | `.agents/plans/<cr-ref>.plan.md` (+ `.log.jsonl`) | mid-flight | doctrine, at retro; a handed-off agent | ephemeral — doctrine discards at retro |
| **Durable internal** (the **ledger**) | `combat-log.jsonl` sibling to the **root** `spec.md` | gate / retro | Forge (distilled corrections), SDD itself | durable |
| **Durable public** (the **trail**) | CR-source conclusion + changesets + git history | handoff (step 4) | campaign, formation | durable, external |

Specifics:

- **The plan is the mid-flight tier _and_ a portable handoff artifact.** It co-locates with
  the mission's worktree at **`.agents/plans/<cr-ref>.plan.md`** — Markdown, self-contained
  (grill analysis + task DAG + progress + the context needed to continue), readable by any
  model. The `*.plan.md` extension matches Cursor's convention for interop. The append-only
  mid-flight telemetry (`report` / `correction` / CR-scoped `seq`) rides a sibling
  **`.agents/plans/<cr-ref>.log.jsonl`**. `<cr-ref>` is the source-qualified CR id
  (`github-34`, `asana-<gid>`, `local-<slug>`).
- **The plan tree is gitignored.** It is scratch; it never merges into the delivery, which
  doubly resolves M (no shared file to conflict). It still survives across sessions on disk,
  and — because it lives **in the tree** — it is shippable when a handoff crosses machines.
- **The durable ledger is slim:** only `gate` (verdict + `frozen[]`) and `strategy`, plus the
  **distilled recurrence** doctrine folds into the `strategy` line's `evidence`. The
  per-corpus ledger therefore receives only a handful of sparse lines per CR, so its rare
  concurrent appends union-merge trivially. `seq` is **CR-scoped** (one CR lives in exactly
  one tree at a time, per the claim-lock), never global.
- **Forge reads the distilled `correction`-with-`cause`,** not `frozen[]`. The previous
  justification ("`frozen[]` matters for Forge across installations") was a mis-attribution:
  `frozen[]` is the local gate's durable freeze record (ruling G); Forge's unit is the
  correction signal, which is now the durable distillate.
- **Doctrine owns the retro distill-and-discard.** At step 5 it reads the concluded plan,
  folds recurring `cause`/token-waste into a durable `strategy` line, then deletes the plan.
  It is the **only** loop that reads the plan.
- **Campaign and formation read the durable public trail, not the plan.** Campaign reads the
  CR-source conclusions + changesets (product altitude); formation reads git churn + the live
  corpus (structure altitude). Each keeps a **read cursor** (`.agents/sdd/loop-cursors.json`)
  of its last-processed CR/commit so it reads forward incrementally instead of cold-starting.
- **On conclusion the mission writes a public-worthy summary back to the CR source** (step-4
  handoff write-back), which is the durable feed campaign consumes.

## Rationale

- **Three tiers map onto observed practice** — the field already splits durable config
  (Markdown, in-repo) from runtime state (JSONL/JSON, out-of-repo). SDD adds the one tier the
  field lacks: a durable internal ledger.
- **Co-locating the plan in the tree** removes the synthetic-id problem the home-dir tools
  carry, and is what makes the plan a **portable handoff artifact** — it travels with the
  work, not with the worker. This is a deliberate, justified divergence from the field norm.
- **`*.plan.md`** buys cross-tool interop for free.
- **Discarding mid-flight detail** honors the privacy and lifetime intent: it is private (never
  posted to the source), ephemeral (useful only until the CR completes), and cheap (git and
  the durable distillate keep everything worth keeping).

## Consequences

### Positive

- M dissolves: mid-flight appends are per-tree gitignored scratch — no shared log to conflict.
- The durable ledger shrinks to sparse, union-mergeable outcome lines.
- A mission becomes resumable/transferable across agents and models via a single Markdown file.
- Outer loops run incrementally from durable, public sources.

### Negative / Risks

- Raw corrections are discarded, so cross-mission recurrence depends on doctrine distilling
  *before* the plan is deleted; a missed retro loses that mission's raw signal (mitigated: the
  durable `strategy` evidence already carries the running count).
- A cross-machine handoff must explicitly ship or commit the gitignored plan.
- Cursor auto-pickup is path-bound to `.cursor/plans/`; our `*.plan.md` gives format interop,
  not automatic discovery.

## Implementation Notes

Sweep targets in the spec tree: `design/provenance-model.md`, `design/unit-and-organization.md`,
`campaign/`, `formation/`, `doctrine/`, `forge/`, `intake/`, `mission/handoff/`. Plus the
pending `plugins/sdd/` sweep (`combat-log-governance`, `ownership-governance`). Add
`.agents/plans/` to `.gitignore`; introduce `.agents/sdd/loop-cursors.json`.

## Related Decisions

- [ADR-0014](0014-sdd-governance-split.md) — SDD governance split
