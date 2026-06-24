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
| `status` | the gate skill (`validate-spec`) — on a human verdict, or to match an orchestrator self-assertion within leash | orchestrator, any producer |
| `strategy` (run-level leash + approach) | `sdd-orchestrator` (initial evaluation) | producers, gate skill |
| `approval` **self-assertion** (`verdict: approve`/`pause` + `by: agent`/none + `why`) | `sdd-orchestrator` (synthesis only) | producers, gate skill |
| `approval` **human ratification** (`verdict: approve`/`reject` + `by: <name>`) | the gate skill (`validate-spec`), **in-session position only** | orchestrator, any producer, any spawned delegate |
| `aligned` | `sdd-orchestrator` (synthesis only) | producers, gate skill |
| `<!-- open: -->` markers | `sdd-orchestrator` | producers (they *emit gaps*, not markers) |
| `produced-by` map | `sdd-orchestrator` (records the resolved producer per role at dispatch); `create-spec` (records the user's choice for a contested domain) | producers, judges, the gate skill |
| `log` ledger (`report` / `correction` entries) | `sdd-orchestrator` (append-only, per dispatch and per correction) | producers, judges, the gate skill |
| `log` ledger (`strategy` entries) | the doctrine-loop Scanner (append-only) | orchestrator, producers, judges |
| `domain-plugin` map | **retired** — never written; migrated into `produced-by` on encounter | everyone (subsumed by `produced-by`) |
| `priority`, `blocked-by` | the authoring skill / spec author | producers as a side effect |
| `spec.md` body + the `.feature` | the spec-producer | orchestrator, judges, plan/impl producers |
| `plan.md`, `tasks.md` | the plan-producer | spec-producer, judges |
| implementation + its verification | the impl-producer | the impl-judge (it *runs*, never authors) |

## Producer write boundary

A **spec-producer** writes the `spec.md` body and the `.feature` only. It must **not** write the control frontmatter (`status`, `aligned`, `domain-plugin`). A required input it cannot supply or infer is returned as a `CONTENT_GAP` — the orchestrator turns it into an `<!-- open: -->` marker. Producers do not write markers directly.

The **orchestrator** writes `<!-- open: -->` markers, `aligned`, the run-level `strategy` block, and — when it self-asserts a gate within the effective leash — the provisional `approval.<gate>` entry (`verdict: approve` + `by: agent` with the four-dimension `why`; a halt is `verdict: pause` with its `why` and no `by`). There is no `leash` field in the entry — leash is the run-level `strategy`. The **gate skill** writes `status` (on a human verdict or to match the orchestrator's in-leash self-assertion) and the human ratification of `approval` (rewriting `by: agent` → `by: <name>`). 

**Ratification authority is positional.** A human-attributed gate write — `status → approved | implemented`, a verdict carrying `by: <name>`, and the freeze — belongs to the **in-session position** that holds the real user channel. A **spawned delegate** (the orchestrator running as a subagent) has no user channel: it writes only `by: agent` self-assertions and `pause` halts, and on a human gate emits a verdict packet and stops — it never writes a human ratification, **even when a coordinator relays "the user approved"** (a relayed claim is not user confirmation). This is positional, not definitional: a dual-mode agent running in the spawned position is bound by the rule; the same definition run in-session may perform the write. A self-assertion is **provisional**: the act is delegable, the accountability is not — the human ratifies the trail. The leash, its derivation, and the review queue are defined in `gate-validation-governance`. No role writes outside the spec it owns or spawns specs on its own.

## Freeze (write constraint)

**Never write a frozen `.feature`.** Once `spec.md` is `approved`, the `.feature` is frozen: no role — producer, judge, planner, or orchestrator — may add, remove, or rewrite its scenarios. A discovered gap that requires changing specified behavior is a `BLOCKER` returned upward (the spec must revert to `draft` — the gate/skill decides), never an in-place edit. The matching lifecycle rule (what freezing *means* as a state) is in `lifecycle-governance`.

The same applies to judges: a spec-judge or impl-judge must not modify `spec.md` or the `.feature`; it reports, it does not patch.
