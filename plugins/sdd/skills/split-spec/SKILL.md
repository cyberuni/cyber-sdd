---
name: split-spec
description: Use this skill when a spec has grown too large or spans more than one behavior — decompose it into a project spec plus feature children, with human confirmation of both the plan and the result.
metadata:
  internal: true
---

# split-spec

Decompose one oversized `spec.md` into a **project spec plus feature children** (per the composition model in `lifecycle-governance`). The trigger is the **spec-granularity heuristic** in `sdd:spec-governance`: a `.feature` past ~15–20 scenarios, use cases spanning more than one behavior, or parts changing on independent cadences.

A split is **not mechanical sharding**. A spec is read by humans to understand the project, so a structurally-correct split can still wreck comprehension. This station therefore pairs **actor-owned structural correctness** with **two human confirmation checkpoints** — the human owns how the project reads.

Load `sdd:lifecycle-governance` (project/feature composition via `subtasks`, the freeze re-open transition), `sdd:ownership-governance` (write-ownership, freeze write-constraint), and `sdd:spec-governance` (the granularity heuristic and the `## Use Cases` rule).

## Actors

- **Architect leads** — decomposition is the structural-fit decision: where are the real seams between behaviors? The Architect proposes the boundaries.
- **Director** — checks each resulting child is a **coherent scope unit** (a shippable behavior, not an arbitrary fragment); a split that cuts mid-behavior fails this bar.
- **Builder** — checks **coverage survives**: every scenario lands in exactly one child, none orphaned, none duplicated; each child's use-cases↔scenarios mapping still holds.
- **Council (human)** — owns comprehension; confirms both the plan and the result.

## Precondition — the source must be writable

If the source spec is `approved` or `implemented`, its `.feature` is **frozen**. Splitting is a structural change; confirm the freeze re-open was ratified by the Council (carried by the relay) before editing. Never shard a frozen `.feature` without the ratified re-open.

## Phase 1 — propose the split plan (Architect-led)

Produce a **human-readable plan**, not a diff:

- the **seam**: which behaviors become which feature children, and what the parent **project spec** holds as the overview a person reads first;
- the **scenario assignment**: each source scenario → exactly one child (Builder coverage check — no orphans, no duplicates);
- the **edges**: `subtasks` from the parent to the children, any `blocked-by` between children;
- a one-line **comprehension rationale**: why this seam helps a human understand the project better than the monolith did.

## Checkpoint 1 — Council confirms the plan

Escalate the plan to the Council through the relay (`STATUS: needs-input`) **before sharding anything**. The Council may redraw the seams, rename children, or reject the split. Execute only the confirmed plan.

## Phase 2 — execute the confirmed plan

- Re-type the source as the **project spec** (the human overview: project-level use cases + narrative), or create a new project spec and deprecate the source per `lifecycle-governance`.
- Create each **feature child** with its slice of use cases and its `.feature` (the assigned scenarios), step-down ordered.
- Wire `subtasks` (parent → children) and any inter-child `blocked-by`.
- Builder verifies total coverage is preserved; Director verifies each child is a coherent scope; Architect verifies the seam holds with no cross-child duplication.

## Checkpoint 2 — Council confirms the result

Escalate the resulting set to the Council through the relay (`STATUS: needs-input`) **before committing** — a review of the children and the parent overview for comprehension, not just correctness. The Council may send any child back for reshaping.

## Report

- The seam taken; the parent project spec and each feature child created
- Coverage check: source scenario count = sum of children's, none orphaned or duplicated
- `subtasks` / `blocked-by` edges written
- Both confirmations recorded; any reshaping done
- Next step: each child flows through its own spec gate (`validate-spec`); refresh the graph (`render-spec-graph`)

## Commit

Only commit after **both** confirmations and a clean coverage check. Stage the parent and all children together (one coherent decomposition):

```
refactor(specs): split <domain> into project + feature children
```
