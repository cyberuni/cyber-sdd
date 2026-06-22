---
name: ownership-governance
description: "Internal skill: the SDD write-ownership contract — who may write each spec.md frontmatter field and artifact, plus the freeze write-constraint. Loaded by every SDD producer, judge, orchestrator, and the create-spec/validate-spec skills — not triggered by users directly."
metadata:
  user-invocable: false
---

# SDD Ownership Governance

Who may write what. Every act in the SDD workflow has a write leash; this skill is the canonical matrix. The field definitions are in `lifecycle-governance`; the legality of the resulting state is in `gate-validation-governance`.

## Write-ownership matrix

| Field / artifact | Written by | Never written by |
|---|---|---|
| `status` | the gate skill (`validate-spec`) | orchestrator, any producer |
| `approved-by` | the gate skill (`validate-spec`) | orchestrator, any producer |
| `aligned` | `sdd-orchestrator` (synthesis only) | producers, gate skill |
| `<!-- open: -->` markers | `sdd-orchestrator` | producers (they *emit gaps*, not markers) |
| `domain-plugin` map | `create-spec` (on the user's choice) | orchestrator, producers |
| `priority`, `blocked-by` | the authoring skill / spec author | producers as a side effect |
| `spec.md` body + the `.feature` | the spec-producer | orchestrator, judges, plan/impl producers |
| `plan.md`, `tasks.md` | the plan-producer | spec-producer, judges |
| implementation + its verification | the impl-producer | the impl-judge (it *runs*, never authors) |

## Producer write boundary

A **spec-producer** writes the `spec.md` body and the `.feature` only. It must **not** write the control frontmatter (`status`, `aligned`, `domain-plugin`). A required input it cannot supply or infer is returned as a `CONTENT_GAP` — the orchestrator turns it into an `<!-- open: -->` marker. Producers do not write markers directly.

The **orchestrator** writes only `<!-- open: -->` markers and `aligned`. The **gate skill** writes `status` and `approved-by`. No role writes outside the spec it owns or spawns specs on its own.

## Freeze (write constraint)

**Never write a frozen `.feature`.** Once `spec.md` is `approved`, the `.feature` is frozen: no role — producer, judge, planner, or orchestrator — may add, remove, or rewrite its scenarios. A discovered gap that requires changing specified behavior is a `BLOCKER` returned upward (the spec must revert to `draft` — the gate/skill decides), never an in-place edit. The matching lifecycle rule (what freezing *means* as a state) is in `lifecycle-governance`.

The same applies to judges: a spec-judge or impl-judge must not modify `spec.md` or the `.feature`; it reports, it does not patch.
