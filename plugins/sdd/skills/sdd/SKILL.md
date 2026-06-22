---
name: sdd
description: Use this skill when the user explicitly invokes SDD or wants to work on a creation artifact with Spec-Driven Development.
model: haiku
effort: low
---

# SDD

Activate Spec-Driven Development for the current creation artifact work. This is a gateway skill: it is explicitly invoked by the user, gathers missing workflow intent, loads SDD rules into the active conversation, and routes the request to the right SDD path. It does not edit project files, register hooks, install packages, or require a CLI command.

## Gateway Intake

Treat `$sdd`, "use SDD", and "use Spec-Driven Development" as explicit activation for the current workflow.

If the user invokes SDD without a work item, artifact, or action, ask what SDD work they want to do. Offer these routes:

- Create a new artifact spec
- Backfill a spec for an existing artifact
- Revise or validate an existing spec
- Implement an approved spec
- Re-review a spec at the spec gate (regardless of current status)
- Manage or deprecate existing specs
- Refresh the spec graph

Do not begin implementation until the route is known.

## Load Context

Treat these skills, agents, and governance skills as the active SDD surface:

| Surface | Use |
|---|---|
| `sdd:lifecycle-governance` | Frontmatter schema, status enum, status transitions, open-marker gating, and the freeze state-transition |
| `create-spec` | Draft or revise a creation artifact contract during exploration |
| `validate-spec` | Run the spec gate or impl gate and record approved status transitions |
| `render-spec-graph` | Regenerate the derived spec dependency graph |
| `sdd-orchestrator` | Run one autonomous segment for create/validate workflows |

Load `sdd:lifecycle-governance` for all lifecycle rules (schema, status enum, transitions, freeze). Runtime SDD work does not call `governance show`.

Do not route user questions to `sdd-orchestrator`. It has no user channel. User questions belong to this skill's gateway intake, `create-spec`, `validate-spec`, or this skill's brief routing report.

## Route The Work

First identify the artifact domain, spec folder, or requested SDD action from the user's request. If the request does not contain enough information, use gateway intake before choosing the route.

To find an existing spec for a named domain, use the discovery rule in `sdd:lifecycle-governance` ("Spec discovery"): glob `**/spec.md`, keep those with a lifecycle `status`, and match the domain to a spec folder slug. Do not assume a fixed path like `specs/<domain>/` — specs may be flat or nested, and the spec folder is distinct from the implementation folder. If no discovered spec matches, treat it as "no spec" in the lifecycle routing table.

If a spec folder exists, read these files before choosing the route:

- `spec.md`
- `<domain>.feature` or another `.feature` file in the same folder
- `plan.md`
- `tasks.md`

Name the route to the user as a **workflow action**, not the skill or CLI that runs it. Use the action names in the left column below; the right column is how the gateway carries it out internally.

| Workflow action | Carried out by |
|---|---|
| **Draft spec** (new artifact) | Run `create-spec` before implementation |
| **Backfill spec** (existing artifact) | Run `create-spec` in backfill mode |
| **Revise spec** (draft) | Run `create-spec` for the existing spec folder |
| **Review at the spec gate** | Run `validate-spec` targeting the spec gate |
| **Re-review at the spec gate** | Run `validate-spec` in force-spec-gate mode (overrides current status) |
| **Review at the impl gate** | Keep `.feature` frozen, implement through the SDD workflow, then run `validate-spec` targeting the impl gate |
| Change behavior after approval | Revert to `draft` through the gate path before changing scenarios |
| Deprecate an artifact | Treat deprecation as a Framer decision and retain the spec for graph history |
| **Refresh spec graph** | Run `render-spec-graph` |

Never surface `create-spec`, `validate-spec --target spec`, or `--target impl` to the user — those are how, not what.

## Lifecycle Routing

Load `sdd:lifecycle-governance` for the status enum, meanings, and freeze transition rules. Use the frontmatter in `spec.md` to choose the route:

| Status | Required action |
|---|---|
| no spec | **Draft spec**; if implementation exists, use **Backfill spec** |
| `draft` | Apply the draft tiebreaker below |
| `approved` | Implement against the `.feature`, then **Review at the impl gate** |
| `implemented` | Behavior changes require returning to `draft` through the gate path |
| `deprecated` | Do not treat as implementable work |

If lifecycle frontmatter is missing, malformed, or contradictory, route to **Review at the spec gate** for state validation before implementation.

**Override: Re-review at the spec gate.** When the user explicitly asks to re-review the spec (e.g. "review the spec again", "force spec gate", "redo the spec review") regardless of current status, route to **Re-review at the spec gate** — even for `approved` or `implemented` specs. Do not require the user to first revert to `draft` manually. Name the override explicitly: "Forcing spec gate review — current status is `<status>`."

### Draft tiebreaker

When `spec.md` is `draft`, inspect completion signals before offering routes:

| Signals | Default route |
|---|---|
| `tasks.md` all items checked **and** no `<!-- open: ... -->` markers in `spec.md` or the `.feature` | **Review at the spec gate** — route there directly; do not offer revise as an alternative |
| Any unchecked task **or** any open marker | **Revise spec** — name the open items that must be resolved first |
| No `tasks.md` and no markers (inconclusive) | Present both **Revise spec** and **Review at the spec gate** |

Routing to the spec gate is safe to automate: the gate still takes the human verdict, so routing only submits the draft for review. Do not generate the review summary yourself — `validate-spec` surfaces the spec digest at the gate.

## Freeze Handling

Freeze rules are in `sdd:lifecycle-governance`. When `spec.md` is `approved` and the user asks to change a scenario or add to the `.feature`:

1. Recognize the frozen contract.
2. Do not invoke a direct edit of the `.feature`.
3. Route the work through the draft re-open path.

Only after the spec is back in `draft` may `create-spec` revise scenarios.

## Backfill Detection

When no spec exists, inspect the local project structure enough to decide whether implementation already exists for the named domain.

- If implementation exists, route to `create-spec` in backfill mode.
- If implementation does not exist, route to `create-spec` for a new artifact.
- If source inspection is inconclusive, ask whether the work is net-new or backfill before routing.

Backfill infers What, Why, decisions, and surface from source, tests, and history, but the inferred contract still needs user confirmation before scenarios are frozen.

## Workflow

1. Activate SDD from explicit `$sdd`, "use SDD", or Spec-Driven Development creation-artifact requests.
2. Conduct gateway intake if the request has no work item, artifact, or action.
3. Identify the spec folder or artifact domain from the user's request.
4. Read `spec.md`, `.feature`, `plan.md`, and `tasks.md` when they already exist.
5. Apply the lifecycle routing table above.
6. Route to the matching skill above.
7. Keep user questions batched at skill boundaries; do not let `sdd-orchestrator` ask the user directly.

## Report

When gateway activation changes the next action, state the route briefly by its workflow-action name:

- **Draft spec** / **Backfill spec** / **Revise spec** for contract authoring
- **Review at the spec gate** for draft approval
- **Review at the impl gate** for implementation approval
- **Refresh spec graph** for dependency graph refresh

Also name the active constraint when it matters:

- `.feature` is frozen for approved specs
- implementation cannot start until lifecycle state is legal
- graph output is derived and must be regenerated, not hand-edited
