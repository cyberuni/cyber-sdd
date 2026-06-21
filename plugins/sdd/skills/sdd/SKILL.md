---
name: sdd
description: Use this skill when the user wants to work on a software feature with Spec-Driven Development - load the SDD governance and workflow, then route creation, validation, implementation, or deprecation through the SDD lifecycle.
---

# SDD

Load the Spec-Driven Development context before feature work. This skill is a context skill: it does not edit project files, register hooks, or require a CLI command. It brings the SDD workflow rules into the active conversation so the agent follows the lifecycle for the user's next feature task.

## Load Context

Treat these skills and agents as the active SDD surface:

| Surface | Use |
|---|---|
| `sdd:spec-governance` | Universal `.feature` format bar, scenario ordering, and human-readable `spec.md` enrichment |
| `create-spec` | Draft or revise a feature contract during exploration |
| `validate-spec` | Run the spec gate or impl gate and record approved status transitions |
| `render-spec-graph` | Regenerate the derived spec dependency graph |
| `sdd-orchestrator` | Run one autonomous segment for create/validate workflows |

Load `sdd:spec-governance` before writing or judging `spec.md` and `.feature` content. Runtime SDD work does not call `governance show`.

## Core Rules

**Spec owns behavior.** If implementation disagrees with `spec.md`, the implementation is wrong. Fix implementation, or revert the spec to `draft` and complete a new review cycle.

**`.feature` freeze.** Once `spec.md` reaches `approved`, do not modify the `.feature` file. Adding, removing, or changing scenarios requires reverting the spec to `draft` and passing the spec gate again.

**Two modes, two gates.** Before `approved`, exploration may update `spec.md`, `.feature`, `plan.md`, `tasks.md`, and implementation spikes. After `approved`, implementation proceeds against the frozen `.feature`; every frozen scenario must pass before `implemented`.

**Artifact alignment.** Every spec has an `aligned` field. `aligned: false` means artifacts are being updated or contain unresolved markers. `aligned: true` means the current layer is synced. Do not commit SDD artifacts while their spec is `aligned: false`.

**Open questions are explicit.** Missing contributor input is recorded as `<!-- open: ... -->` in the owning artifact. Resolve open markers before advancing to `approved`.

## Route The Work

Use the user's intent to choose the next SDD workflow:

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

## Workflow

1. Identify the spec folder or feature domain from the user's request.
2. Read `spec.md`, `.feature`, `plan.md`, and `tasks.md` when they already exist.
3. Apply the current lifecycle state:
   - `draft` -> contract can evolve; use `create-spec`.
   - `approved` -> `.feature` is frozen; implement against it.
   - `implemented` -> behavior changes require a new draft cycle.
   - `deprecated` -> do not treat the spec as implementable work.
4. Route to the matching skill above.
5. Keep user questions batched at skill boundaries; do not let `sdd-orchestrator` ask the user directly.

## Report

When context loading changes the next action, state the route briefly:

- `create-spec` for draft/backfill work
- `validate-spec --target spec` for contract approval
- `validate-spec --target impl` for implementation approval
- `render-spec-graph` for dependency graph refresh
