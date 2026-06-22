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

## The leash — how far the agent may self-assert

An agent **may advance a gate on its own**, within a **leash** derived per gate. The leash names the furthest gate the agent may self-assert this run:

| Level | Self-asserts | Stops at |
|---|---|---|
| `gated` | nothing | the **spec gate** |
| `auto-to-spec` | the spec gate | the **impl gate** |
| `auto` | both gates | nothing (both provisional) |

**Derived, not just declared.** The agent assesses each gate on four dimensions; a gate is self-assertable only when **all four** read *safe*:

| Dimension | Safe → self-assert | Risky → stop and ask |
|---|---|---|
| **Reversibility** | cheap revert, no external effect | irreversible / published / external side effect |
| **Blast radius** | contained to the artifacts **this spec owns** | reaches beyond — another spec, a shared/frozen contract, an installed/public surface, prod, security |
| **Decision novelty** | trivial / defaulted, or already human-ratified | new contestable choices the human has not seen |
| **Confidence** | clear pass on the judge bar | marginal verdict, unresolved markers |

The derived leash is the furthest gate reachable where every gate up to it reads safe: spec gate risky → `gated`; spec gate safe, impl gate risky → `auto-to-spec`; both safe → `auto`. One risky dimension makes a gate non-self-assertable.

**Ceiling and scope.** The Conductor may cap the run (`effective = min(ceiling, derived)`); the agent may stop earlier, never further. The leash is **per run/sitting** (session-local, like the iteration cap), **re-derived at each gate** — a gated spec gate does not bind a later impl gate.

## `approved-by` attribution

On a passing gate, the approver is recorded under the gate's key:

- **Spec gate** → `status: approved`, `approved-by.spec`.
- **Impl gate** → `status: implemented`, `approved-by.impl`.

A gate within the effective leash is **self-asserted**: the **orchestrator** writes `approved-by.<gate>: { by: agent, leash, why }` (the four-dimension derivation) during synthesis, and the gate skill writes the matching `status`. A self-assertion is **provisional** — the act is done, the accountability is not yet reconciled. A gate outside the leash (or a marginal verdict) **stops at the gate** for the human; the gate skill records `by: <name>` on the human verdict (no `why` required).

```yaml
approved-by:
  spec:
    by: agent          # provisional — in the review queue until ratified
    leash: auto
    why:
      reversibility: "safe — new files only, cheap revert"
      blast-radius:  "safe — one skill folder, no shared surface"
      novelty:       "safe — contract already ratified"
      confidence:    "safe — every scenario passes"
  impl:
    by: unional        # ratified by the human; no why needed
```

**The review queue is derived, not stored.** The set of specs with any `approved-by.*.by: agent` **is** the human's review queue — no separate backlog file. Ratifying rewrites `by: agent` → `by: <name>`, and the spec leaves the queue. A self-assertion never makes a decision final; it chooses *self-assert-and-continue (async review)* over *stop-and-ask-now (sync)*. Re-run `check-spec-state.mts` after writing any transition to confirm the new tuple is legal — a `by: agent` entry with no `why` is rejected.
