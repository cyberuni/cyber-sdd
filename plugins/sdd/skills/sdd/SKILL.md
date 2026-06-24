---
name: sdd
description: Use this skill when the user explicitly invokes SDD or wants to work on a creation artifact with Spec-Driven Development.
model: haiku
effort: low
---

# SDD

Gateway skill for Spec-Driven Development. Activates SDD, gathers missing intent, reads the minimum context to classify the requested action, and hands the resolved work to the **Operator** (`sdd-orchestrator`). This skill is a **thin relay**: it holds **no production logic**, spawns only the Operator, and carries the Council's answers down and the Operator's escalations up. It does not edit project files, register hooks, install packages, or require a CLI command.

## Gateway Intake

Treat `$sdd`, "use SDD", and "use Spec-Driven Development" as explicit activation.

### Surface pending strategy

When the Council re-enters through the gateway, **surface the count of pending (unratified) strategy** as an entry point — the doctrine loop's keep-or-cut. Count the unratified `strategy` log entries (`ratified: false`) across the specs' combat logs and state "N pending strategy" alongside the intake; if the Council picks it, route them to review those entries. The gateway is a **thin relay**: it only *surfaces* the count — it never drafts strategy (that is the Scanner's, `sdd-scanner`) nor ratifies it (that is the Council's positional act). A zero count is not surfaced.

### Fast path — skip the menu

When the invocation already names **both** an artifact and an action — "implement the auth spec", "review X again", "deprecate the auth spec", "refresh the SDD graph" — skip the menu entirely and route directly through the Routing Table. A partially-specified request (artifact named but action ambiguous, or vice versa) resolves what it can and asks only for the missing piece, still within the four-option rule below.

### Two-level menu — bare invocation

When `$sdd` is invoked with no work item, artifact, or action, do not guess. Conduct intake as a **two-level menu**, never a flat list. The top-level question presents **exactly four** options:

| # | Top-level option | Covers |
|---|---|---|
| 1 | **Create or backfill a spec** | Start a new spec; detect new-vs-backfill by whether an implementation already exists for the named work |
| 2 | **Work on an existing spec** | List specs (folder slug + status); user picks one; route by that spec's status via the Routing Table. Single-spec deprecation lives here |
| 3 | **Manage specs & graph** | Cross-spec operations: dedupe overlapping specs, split a large spec, cross-spec deprecate, refresh the graph |
| 4 | **Help me choose** | Scan specs and statuses, suggest the most-actionable few, then let the user pick |

Resolve the second level by branch:

- **Option 1** — collect the target work, detect mode, route to **Draft spec** (no implementation) or **Backfill spec** (implementation exists).
- **Option 2** — enumerate specs with folder slug + status; the user picks one; route by its status via the Routing Table. A deprecation request routes to spec management.
- **Option 3** — present the cross-spec operation set; route per Manage specs & graph below.
- **Option 4** — present the suggested specs (≤ 4), let the user pick one, then route by its status.

Do not begin implementation until the route is known.

### Never ask more than four options (hard rule)

A single `AskUserQuestion` carries **at most four** options — the intake tool rejects more than four (`too_big, maximum 4`). The top-level menu is fixed at exactly four. When a derived list exceeds four — the spec list under option 2, or the suggestions under option 4 — apply the **list-overflow fallback**: present only the most-actionable few (≤ 4) **or** ask the user to name the domain directly. Never enumerate every spec into an over-four question, and never truncate silently.

## Reading Files

Read files in this order — stop as soon as you have enough to route:

1. Read spec.md frontmatter only to get `status`.
2. If status is `draft`, read tasks.md to check for unchecked items.
3. If all tasks are checked, scan spec.md and the `.feature` for `<!-- open: ... -->` markers.

Do not read plan.md or the `.feature` body for routing.

To locate an existing spec for a named domain, glob `**/spec.md`, keep those with a lifecycle `status` field, and match the domain to the spec folder slug.

When no spec exists, inspect local project structure to determine if implementation already exists (backfill vs. new). If inconclusive, ask.

## Routing Table

Route by status read from spec.md frontmatter:

| Status | Workflow action |
|---|---|
| no spec, no implementation | **Draft spec** |
| no spec, implementation exists | **Backfill spec** |
| `draft` | Apply draft tiebreaker below |
| `approved` | **Review at the impl gate** (implement against frozen `.feature` first) |
| `implemented` | Behavior changes require **Revise spec** via the draft re-open path |
| `deprecated` | Not implementable — route to spec management |

If lifecycle frontmatter is missing or malformed, route to **Review at the spec gate** for state validation before implementation.

If a nonempty request names neither a routable artifact nor a known SDD action, report that the request is unroutable and invoke no SDD action.

**Override — Re-review at the spec gate:** When the user explicitly asks to re-review (e.g. "review the spec again", "force spec gate", "redo the spec review"), route to **Re-review at the spec gate** regardless of current status. State: "Forcing spec gate review — current status is `<status>`."

### Draft tiebreaker

| Signals | Route |
|---|---|
| All tasks checked and no open markers | **Review at the spec gate** — do not offer revise as an alternative |
| Any unchecked task or open marker | **Revise spec** — name the open items |
| No tasks.md and no markers (inconclusive) | Present both **Revise spec** and **Review at the spec gate** |

## Manage Specs & Graph (option 3)

Route each cross-spec operation to the workflow action the Operator carries out. The named skills (`render-spec-graph`, `create-spec`) are **stations the Operator runs in-session** — never agent types the gateway spawns:

| Operation | Routing |
|---|---|
| Refresh graph | **Refresh spec graph** — the Operator runs the `render-spec-graph` station |
| Split a spec | Authoring half → **Draft spec** + deprecate/revise the old (the Operator runs the `create-spec` station) |
| Dedupe specs | Authoring half → **Draft spec** (the Operator runs the `create-spec` station to collapse overlap into the surviving spec + deprecate the rest) |
| Cross-spec deprecate | Spec management / deprecation path |

The cross-spec **analysis** — finding which specs overlap, choosing split boundaries — has no station yet. Until the `split-spec` and `dedupe-specs` stations exist, the Operator carries out the authoring half via the `create-spec` station and **surfaces to the user (through the relay) that the analysis step is manual**. When those stations exist, route the analysis to them instead and do not surface it as manual.

## Hand the Work to the Operator

When the route is resolved, **spawn the Operator** (`subagent_type: sdd-orchestrator`) once for this segment to carry out the downstream work. The Operator is the **only** agent this gateway ever spawns.

The downstream workflow skills — `create-spec`, `validate-spec`, `render-spec-graph` — are **stations the Operator runs in-session**, not agent types. **Never** spawn one as a `subagent_type` (e.g. `subagent_type: validate-spec` is illegal and fails with "Agent type not found"). The resolved workflow action tells the Operator which station to run:

| Workflow action | Station the Operator runs |
|---|---|
| **Draft spec** / **Backfill spec** / **Revise spec** | `create-spec` |
| **Review at the spec gate** / **Re-review at the spec gate** | `validate-spec` (spec gate) |
| **Review at the impl gate** | `validate-spec` (impl gate) |
| **Refresh spec graph** | `render-spec-graph` |

Pass to the Operator: the resolved workflow action, the artifact domain or spec folder path, and any relevant file paths identified during routing.

### The relay carries the user channel

The Operator has **no user channel**. The user channel lives at the **relay ↔ Operator** boundary — this gateway *is* the relay:

1. Spawn the Operator for the segment.
2. When the Operator returns `STATUS: needs-input` with batched `QUESTIONS`, **ask the Council** (the human) those questions.
3. **Resume the Operator** by re-spawning it with the Council's answers, so it continues the mission loop.
4. Repeat across segments until `STATUS: complete` or `blocked`.

The Operator drives **every segment** of the mission loop; the gateway holds **no production logic** of its own — it only routes, relays answers down, and carries escalations up.

### Escalation boundary

The Operator escalates to the Council **only at gates** (a go/no-go verdict to advance status) and at **scrub** (a kill decision). Outside a gate or scrub it does **not** escalate — it runs autonomously to the next checkpoint. The Operator **never asks the Council directly**; every escalation is carried to the Council by this relay.

### Write-ownership is preserved

This relay model changes *who is invoked how*, not *who writes what*. The **gate station** (`validate-spec`) still owns the `status` write and the human ratification of `approval`. The **Operator** still owns `aligned` and any provisional agent self-assertion of `approval`. The relay writes neither.

## Freeze Handling

When spec.md is `approved` and the user asks to change a scenario or edit the `.feature`:

1. Recognize the frozen contract.
2. Do not invoke a direct edit of the `.feature`.
3. Route through the draft re-open path — **Revise spec**.

Only after the spec returns to `draft` may scenarios be revised.

## Report

State the resolved route by its workflow-action name before spawning the Operator:

- **Draft spec** / **Backfill spec** / **Revise spec** — contract authoring
- **Review at the spec gate** — draft approval
- **Review at the impl gate** — implementation approval
- **Refresh spec graph** — dependency graph refresh

Name active constraints when relevant:

- `.feature` is frozen for approved specs
- implementation cannot start until lifecycle state is legal
- graph output is derived and must be regenerated, not hand-edited
