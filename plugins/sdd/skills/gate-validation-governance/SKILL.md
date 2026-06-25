---
name: gate-validation-governance
description: "Internal skill: the SDD gate-legality contract — legal frontmatter-state tuples, aligned layer-scoping, and approval attribution. Loaded by validate-spec, sdd-operator, and sdd-spec-judge — not triggered by users directly."
metadata:
  user-invocable: false
---

# SDD Gate-Validation Governance

What makes a spec's state legal, and how a gate records its verdict. The field schema and transitions are in `lifecycle-governance`; this skill is the legality layer on top of them.

## Legal-state tuples

The mechanical authority is `validate-spec/scripts/check-spec-state.mts` — run it (`node <skill>/scripts/check-spec-state.mts`) to enforce; if `node` is unavailable, apply the same rules by reading frontmatter. The `(status, aligned, markers, .feature, approval)` tuple is **illegal** when:

- `status: approved` with no `.feature` **and no `subtasks`** — a leaf requires a frozen `.feature`. A **composition node** (declares `subtasks`, owns no `.feature` of its own) is **exempt**: its behavior lives in its children and its gate rolls up their states.
- a **composition parent** (declares `subtasks`) is `status: implemented` while any non-`deprecated` child is not yet `implemented` — a parent's status may not outrun its children. (`approved` is **not** rolled up: a composition contract is approved first, then its children are built — which is why a project sits at `approved` over draft children.)
- `status: implemented` with `aligned` not `true` — implemented requires `aligned: true`.
- `status: approved` or `implemented` with any `<!-- open: -->` markers — markers block the gate.
- `approval` names a gate other than `spec` or `impl`.
- an `approval.<gate>` has a `verdict` other than `approve`, `pause`, or `reject`.
- an `approval.<gate>` is `verdict: pause` carrying a `by` — a pause is always the agent's act and omits `by`.
- an `approval.<gate>` is `verdict: approve` with no `by` — an approve must record its approver.
- an `approval.<gate>` is `by: agent` with no `why` block — a self-assertion must record its derivation.
- an `approval.<gate>` is `verdict: pause` on a gate the spec has already passed (spec once `approved`/`implemented`, impl once `implemented`).
- `status: approved` or `implemented` with no `approval.spec` `verdict: approve` + `by` — the spec gate has no recorded ratification.
- `status: implemented` with no `approval.impl` `verdict: approve` + `by` — the impl gate has no recorded ratification.

`status: draft` with `aligned: true` is **legal** — `aligned` is layer-scoped, so a synced contract may hold `aligned: true` while still draft, ready for the spec gate.

Reject illegal tuples **before** any other gate work. If `check-spec-state.mts` changes, this list follows it — the script is the source of truth, this prose is the readable mirror.

### No-resolvable-producer is a fail-closed gate check

Symmetric to the operator's terminal resolution rule: a required production role **always** resolves to a real producer — a plugin agent or the SDD default for that role. When a gate runs and a required role has **no resolvable producer** — not a plugin agent and not even an SDD default — the gate **fails closed** with a blocker; it advances nothing. This is a **structural** error and joins the same fail-closed class as a malformed `produced-by` entry or an off-enum `cause` — owned and defined in `sdd-provenance` / `combat-log-governance`; this skill references that class, it does not restate the `produced-by` schema. (Distinct from availability: a recorded producer whose plugin is merely uninstalled is flagged, not blocked.)

## The two gates

| Gate | Transition | Object judged |
|---|---|---|
| spec gate | Draft → Approved | `spec.md` + the `.feature` (no implementation required) |
| impl gate | Approved → Implemented | the implementation vs the frozen `.feature` |

## `aligned` is layer-scoped

`aligned` means *the current layer's artifacts are synced* — which layer depends on the gate:

- **At the spec gate**, `aligned: true` means the **contract layer** (`spec.md` ↔ `.feature`) is in sync. Implementation is **not** required; exploratory spike code is excluded as scaffolding.
- **At the impl gate**, `aligned: true` means the **impl layer** conforms to the frozen `.feature`. Set it only when **every** impl-judge returns `IMPLEMENTATION_PASS: true`; if any fails, leave `aligned: false` and surface the `BLOCKER`.

The operator sets `aligned: false` at the start of a segment and only synthesis sets it back to `true` (per `ownership-governance`).

## The leash — how far the agent may self-assert

An agent **may advance a gate on its own**, within a **leash** derived per gate. The leash names the furthest gate the agent may self-assert this run:

| Level | Self-asserts | Stops at |
|---|---|---|
| `auto-none` | nothing | the **spec gate** |
| `auto-spec` | the spec gate | the **impl gate** |
| `auto-all` | both gates | nothing (both provisional) |

The names follow an `auto-<reach>` scheme — they name **how far autonomy reaches**, not where it stops: `auto-none` self-asserts nothing, `auto-spec` self-asserts through the spec gate, `auto-all` self-asserts every gate.

**Derived, not just declared.** The agent assesses each gate on four dimensions; a gate is self-assertable only when **all four** read *safe*:

| Dimension | Safe → self-assert | Risky → stop and ask |
|---|---|---|
| **Reversibility** | cheap revert, no external effect | irreversible / published / external side effect |
| **Blast radius** | contained to the artifacts **this spec owns** | reaches beyond — another spec, a shared/frozen contract, an installed/public surface, prod, security |
| **Decision novelty** | trivial / defaulted, or already human-ratified | new contestable choices the human has not seen |
| **Confidence** | clear pass on the judge bar | marginal verdict, unresolved markers |

The derived leash is the furthest gate reachable where every gate up to it reads safe: spec gate risky → `auto-none`; spec gate safe, impl gate risky → `auto-spec`; both safe → `auto-all`. One risky dimension makes a gate non-self-assertable.

**Ceiling and scope.** The Conductor may cap the run (`effective = min(ceiling, derived)`); the agent may stop earlier, never further. The leash is **per run/sitting** (session-local, like the iteration cap), **re-derived at each gate** — an `auto-none` spec gate does not bind a later impl gate.

## `approval` attribution

Each gate records its verdict under the gate's key — `verdict: approve | pause | reject`:

- **Spec gate** → on approve, `status: approved`, `approval.spec: { verdict: approve, by }`.
- **Impl gate** → on approve, `status: implemented`, `approval.impl: { verdict: approve, by }`.

A gate within the effective leash is **self-asserted**: the **operator** writes `approval.<gate>: { verdict: approve, by: agent, why }` (the four-dimension derivation) during synthesis, and the gate skill writes the matching `status`. There is **no `leash` field in the entry** — the leash is run-level (the `strategy` block), not per-gate. A self-assertion is **provisional** — the act is done, the accountability is not yet reconciled. A gate outside the leash (or a marginal verdict) **stops at the gate**: the operator records `verdict: pause` (with its `why`, and **no `by`** — a pause is always the agent's act) and emits a verdict packet.

**Ratification authority is positional.** A human ratification (`verdict: approve | reject` carrying `by: <name>`) and the `status`/freeze write are reserved to the **in-session position** that holds the real user channel. A spawned delegate may write only `by: agent` self-assertions and `pause` halts — it never writes a human-attributed verdict, even on a relayed claim of user approval. See `ownership-governance`.

### A self-assertion is an ASYNC review marker — NOT a synchronous stop

Read this before treating a `by: agent` gate as blocking. **It is not.** A `by: agent` self-assertion is a **provisional, asynchronous review marker, not a synchronous human-ratification stop.** The moment the operator self-asserts a gate within the effective leash, **the run advances and continues immediately** — it does **not** pause, wait, or hand control back to a human at that gate. The spec simply lands in the **derived review queue** (the set of specs with any `by: agent`) for the human to **ratify or kick back later, asynchronously**.

A synchronous stop happens **only** when the gate is *outside* the effective leash — a risky/marginal dimension or a human ceiling. Within leash, self-assert and keep going. Misreading a self-assertion as a blocking stop defeats the entire leash mechanism: the leash exists precisely to convert a synchronous wait into an asynchronous review marker without surrendering accountability (the human still ratifies the trail).

```yaml
approval:
  spec:
    verdict: approve   # approve | pause | reject
    by: agent          # provisional — in the review queue until ratified
    why:
      reversibility: "safe — new files only, cheap revert"
      blast-radius:  "safe — one skill folder, no shared surface"
      novelty:       "safe — contract already ratified"
      confidence:    "safe — every scenario passes"
  impl:
    verdict: approve
    by: unional        # ratified by the human (in-session); no why needed
```

**The review queue is derived, not stored.** The set of specs with any `approval.*.verdict: approve` + `by: agent` **is** the human's review queue — no separate backlog file. Specs with a `verdict: pause` form the awaiting-input queue. Ratifying rewrites `by: agent` → `by: <name>`, and the spec leaves the review queue. A self-assertion never makes a decision final; it chooses *self-assert-and-continue (async review)* over *stop-and-ask-now (sync)*. Re-run `check-spec-state.mts` after writing any transition to confirm the new tuple is legal — a `by: agent` entry with no `why` is rejected.
