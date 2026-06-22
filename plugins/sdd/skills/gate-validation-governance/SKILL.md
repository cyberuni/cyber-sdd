---
name: gate-validation-governance
description: "Internal skill: the SDD gate-legality contract — legal frontmatter-state tuples, aligned layer-scoping, and approved-by attribution. Loaded by validate-spec, sdd-orchestrator, and sdd-spec-judge — not triggered by users directly."
metadata:
  user-invocable: false
---

# SDD Gate-Validation Governance

What makes a spec's state legal, and how a gate records its verdict. The field schema and transitions are in `lifecycle-governance`; this skill is the legality layer on top of them.

## Legal-state tuples

The mechanical authority is `validate-spec/scripts/check-spec-state.mts` — run it (`node <skill>/scripts/check-spec-state.mts`) to enforce; if `node` is unavailable, apply the same rules by reading frontmatter. The `(status, aligned, markers, .feature, approved-by)` tuple is **illegal** when:

- `status: draft` with `aligned: true` — draft never means implemented.
- `status: approved` with no `.feature` — approved requires a frozen `.feature`.
- `status: implemented` with `aligned` not `true` — implemented requires `aligned: true`.
- `status: approved` or `implemented` with any `<!-- open: -->` markers — markers block the gate.
- `approved-by` names a gate other than `spec` or `impl`.
- an `approved-by.<gate>` is `by: agent` with no `why` block — a self-assertion must record its derivation.
- `status: approved` or `implemented` with no `approved-by.spec.by` — the spec gate has no recorded approver.
- `status: implemented` with no `approved-by.impl.by` — the impl gate has no recorded approver.

Reject illegal tuples **before** any other gate work. If `check-spec-state.mts` changes, this list follows it — the script is the source of truth, this prose is the readable mirror.

## The two gates

| Gate | Transition | Object judged |
|---|---|---|
| spec gate | Draft → Approved | `spec.md` + the `.feature` (no implementation required) |
| impl gate | Approved → Implemented | the implementation vs the frozen `.feature` |

## `aligned` is layer-scoped

`aligned` means *the current layer's artifacts are synced* — which layer depends on the gate:

- **At the spec gate**, `aligned: true` means the **contract layer** (`spec.md` ↔ `.feature`) is in sync. Implementation is **not** required; exploratory spike code is excluded as scaffolding.
- **At the impl gate**, `aligned: true` means the **impl layer** conforms to the frozen `.feature`. Set it only when **every** impl-judge returns `IMPLEMENTATION_PASS: true`; if any fails, leave `aligned: false` and surface the `BLOCKER`.

The orchestrator sets `aligned: false` at the start of a segment and only synthesis sets it back to `true` (per `ownership-governance`).

## `approved-by` attribution

On a passing gate, the gate skill records the approver under the gate's key:

- **Spec gate** → `status: approved`, `approved-by.spec.by: <approver>`.
- **Impl gate** → `status: implemented`, `approved-by.impl.by: <approver>`.

If an agent self-asserted within its leash, the entry is `by: agent` with a `why` derivation — **provisional**, awaiting human ratification. The decision to advance is always the human's; never advance on agent judgment alone. Re-run `check-spec-state.mts` after writing the transition to confirm the new tuple is legal.
