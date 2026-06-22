---
name: sdd
description: Use this skill when the user explicitly invokes SDD or wants Spec-Driven Development for feature work.
---

# SDD

Activate Spec-Driven Development for the current feature work. This is a gateway skill: it is explicitly invoked by the user, gathers missing workflow intent, loads SDD rules into the active conversation, and routes the request to the right SDD path. It does not edit project files, register hooks, install packages, or require a CLI command.

## Gateway Intake

Treat `$sdd`, "use SDD", and "use Spec-Driven Development" as explicit activation for the current workflow.

If the user invokes SDD without a feature, artifact, or action, ask what SDD work they want to do. Offer these routes:

- Create a new feature spec
- Backfill a spec for existing code
- Revise or validate an existing spec
- Implement an approved spec
- Manage or deprecate existing specs
- Refresh the spec graph

Do not begin implementation until the route is known.

## Load Context

Treat these skills, agents, and governance skills as the active SDD surface:

| Surface | Use |
|---|---|
| `sdd:spec-governance` | Universal `.feature` format bar, scenario ordering, and human-readable `spec.md` enrichment |
| `sdd:lifecycle-governance` | Frontmatter schema, status enum, status transitions, open-marker gating, and the freeze state-transition |
| `create-spec` | Draft or revise a feature contract during exploration |
| `validate-spec` | Run the spec gate or impl gate and record approved status transitions |
| `render-spec-graph` | Regenerate the derived spec dependency graph |
| `sdd-orchestrator` | Run one autonomous segment for create/validate workflows |

Load `sdd:spec-governance` before writing or judging `spec.md` and `.feature` content. Load `sdd:lifecycle-governance` for all lifecycle rules (schema, status enum, transitions, freeze). Runtime SDD work does not call `governance show`.

Do not route user questions to `sdd-orchestrator`. It has no user channel. User questions belong to this skill's gateway intake, `create-spec`, `validate-spec`, or this skill's brief routing report.

## Route The Work

First identify the feature domain, spec folder, or requested SDD action from the user's request. If the request does not contain enough information, use gateway intake before choosing the route.

If a spec folder exists, read these files before choosing the route:

- `spec.md`
- `<domain>.feature` or another `.feature` file in the same folder
- `plan.md`
- `tasks.md`

Use the lifecycle state and the user's intent to choose the next SDD workflow:

| User intent | Route |
|---|---|
| Start a new feature | Run `create-spec` before implementation |
| Backfill a spec for existing code | Run `create-spec` in backfill mode |
| Revise a draft spec | Run `create-spec` for the existing spec folder |
| Approve a draft contract | Run `validate-spec` targeting the spec gate |
| Implement an approved feature | Keep `.feature` frozen, implement through the SDD workflow, then run `validate-spec` targeting the impl gate |
| Change behavior after approval | Revert to `draft` through the gate path before changing scenarios |
| Deprecate a feature | Treat deprecation as a Framer decision and retain the spec for graph history |
| Refresh dependency view | Run `render-spec-graph` |

## Lifecycle Routing

Load `sdd:lifecycle-governance` for the status enum, meanings, and freeze transition rules. Use the frontmatter in `spec.md` to choose the route:

| Status | Required action |
|---|---|
| no spec | Run `create-spec`; if implementation exists, use backfill mode |
| `draft` | Use `create-spec` for revisions or `validate-spec --target spec` for approval |
| `approved` | Implement against the `.feature`; use `validate-spec --target impl` for completion |
| `implemented` | Behavior changes require returning to `draft` through the gate path |
| `deprecated` | Do not treat as implementable work |

If lifecycle frontmatter is missing, malformed, or contradictory, route to `validate-spec` for state validation before implementation.

## Freeze Handling

Freeze rules are in `sdd:lifecycle-governance`. When `spec.md` is `approved`:

1. Refuse any direct `.feature` edit.
2. Explain that approved scenarios are frozen.
3. Route the work through the draft re-open path.

Only after the spec is back in `draft` may `create-spec` revise scenarios.

## Backfill Detection

When no spec exists, inspect the local project structure enough to decide whether implementation already exists for the named domain.

- If implementation exists, route to `create-spec` in backfill mode.
- If implementation does not exist, route to `create-spec` for a new feature.
- If source inspection is inconclusive, ask whether the work is new-feature or backfill before routing.

Backfill infers What, Why, decisions, and surface from source, tests, and history, but the inferred contract still needs user confirmation before scenarios are frozen.

## Workflow

1. Activate SDD from explicit `$sdd`, "use SDD", or Spec-Driven Development feature-work requests.
2. Conduct gateway intake if the request has no feature, artifact, or action.
3. Identify the spec folder or feature domain from the user's request.
4. Read `spec.md`, `.feature`, `plan.md`, and `tasks.md` when they already exist.
5. Apply the lifecycle routing table above.
6. Route to the matching skill above.
7. Keep user questions batched at skill boundaries; do not let `sdd-orchestrator` ask the user directly.

## Report

When gateway activation changes the next action, state the route briefly:

- `create-spec` for draft/backfill work
- `validate-spec --target spec` for contract approval
- `validate-spec --target impl` for implementation approval
- `render-spec-graph` for dependency graph refresh

Also name the active constraint when it matters:

- `.feature` is frozen for approved specs
- implementation cannot start until lifecycle state is legal
- graph output is derived and must be regenerated, not hand-edited
