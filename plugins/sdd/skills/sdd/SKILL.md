---
name: sdd
description: Use this skill when the user explicitly invokes SDD or wants to work on a creation artifact with Spec-Driven Development.
model: haiku
effort: low
---

# SDD

Gateway skill for Spec-Driven Development. Activates SDD, gathers missing intent, reads the minimum context to classify the requested action, and delegates downstream work to a subagent. Does not edit project files, register hooks, install packages, or require a CLI command.

## Gateway Intake

Treat `$sdd`, "use SDD", and "use Spec-Driven Development" as explicit activation.

If invoked without a work item, artifact, or action, ask what SDD work the user wants to do:

- Create a new artifact spec
- Backfill a spec for an existing artifact
- Revise or validate an existing spec
- Implement an approved spec
- Re-review a spec at the spec gate (regardless of current status)
- Manage or deprecate existing specs
- Refresh the spec graph

Do not begin implementation until the route is known.

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

**Override — Re-review at the spec gate:** When the user explicitly asks to re-review (e.g. "review the spec again", "force spec gate", "redo the spec review"), route to **Re-review at the spec gate** regardless of current status. State: "Forcing spec gate review — current status is `<status>`."

### Draft tiebreaker

| Signals | Route |
|---|---|
| All tasks checked and no open markers | **Review at the spec gate** — do not offer revise as an alternative |
| Any unchecked task or open marker | **Revise spec** — name the open items |
| No tasks.md and no markers (inconclusive) | Present both **Revise spec** and **Review at the spec gate** |

## Delegate Downstream Work

When the route is resolved, spawn a subagent to carry out the downstream work. Do not load `create-spec`, `validate-spec`, or `render-spec-graph` into the current session.

Pass to the subagent: the resolved workflow action, the artifact domain or spec folder path, and any relevant file paths identified during routing.

| Workflow action | Subagent skill |
|---|---|
| **Draft spec** / **Backfill spec** / **Revise spec** | `create-spec` |
| **Review at the spec gate** / **Re-review at the spec gate** | `validate-spec` (spec gate) |
| **Review at the impl gate** | `validate-spec` (impl gate) |
| **Refresh spec graph** | `render-spec-graph` |

`sdd-orchestrator` has no user channel — user questions belong to this skill's intake or the downstream skill, not the orchestrator.

## Freeze Handling

When spec.md is `approved` and the user asks to change a scenario or edit the `.feature`:

1. Recognize the frozen contract.
2. Do not invoke a direct edit of the `.feature`.
3. Route through the draft re-open path — **Revise spec**.

Only after the spec returns to `draft` may scenarios be revised.

## Report

State the resolved route by its workflow-action name before spawning the subagent:

- **Draft spec** / **Backfill spec** / **Revise spec** — contract authoring
- **Review at the spec gate** — draft approval
- **Review at the impl gate** — implementation approval
- **Refresh spec graph** — dependency graph refresh

Name active constraints when relevant:

- `.feature` is frozen for approved specs
- implementation cannot start until lifecycle state is legal
- graph output is derived and must be regenerated, not hand-edited
