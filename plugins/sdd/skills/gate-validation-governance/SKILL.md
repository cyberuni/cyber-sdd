---
name: gate-validation-governance
description: "Partial Skill: invoke by name only — the SDD gate-legality contract. Loaded by spec-gate, the conductor, and the spec-judge, not user-triggered."
user-invocable: false
---

# SDD Gate-Validation Governance

What makes a spec's state legal, and how a gate records its verdict. The field schema and transitions
are in `sdd:lifecycle-governance`; this skill is the legality layer on top of them. It carries **no
leash** — the self-clear-vs-escalate bar that derives how far an agent may self-assert is the
conductor's autonomy bar (baked into `start-mission`), a hard floor + a three-dimension gradient.

## Legal-state tuples

The mechanical authority is `spec-gate/scripts/check-spec-state.mts` — run it
(`node <skill>/scripts/check-spec-state.mts`) to enforce; if `node` is unavailable, apply the same
rules by reading frontmatter. The `(status, markers, .feature, approval)` tuple of the root
`spec.md` — plus the durable gate lines globbed from its sibling `ledger/` shards (a legacy `ledger.jsonl` still counts) — is **illegal** when:

- `status: approved` with no `.feature` — a spec requires a frozen `.feature` to be approved.
- `status: approved` or `implemented` with any `<!-- open: -->` markers — markers block the gate.
- `approval` names a gate other than `spec` or `impl`.
- an `approval.<gate>` has a `verdict` other than `approve`, `pause`, or `reject`.
- an `approval.<gate>` is `verdict: pause` carrying a `by` — a pause is always the agent's act and omits `by`.
- an `approval.<gate>` is `verdict: approve` with no `by` — an approve must record its approver.
- an `approval.<gate>` is `by: agent` with no `why` block — a self-assertion must record its derivation.
- an `approval.<gate>` has a `cause` other than `dimension` or `ceiling` — the stop cause is a closed enum.
- an `approval.<gate>` is `verdict: pause` on a gate the spec has already passed (spec once `approved`/`implemented`, impl once `implemented`).
- `status: approved` or `implemented` with no `approval.spec` `verdict: approve` + `by` — the spec gate has no recorded ratification.
- `status: implemented` with no `approval.impl` `verdict: approve` + `by` — the impl gate has no recorded ratification.
- `status: approved` or `implemented` with no `gate` line `gate: spec`, `verdict: approve` in the sibling `ledger/` shards — **the durable gate floor is missing**. The `approval` map is the overwritten current-state twin; the ledger line is the **immutable durable twin**, so a status advance with no ledger gate line is an unenforced gate.
- `status: implemented` with no `gate` line `gate: impl`, `verdict: approve` in the ledger — the impl-gate durable floor is missing.

`implemented` is backed by the impl gate's runtime suite run, not a stored flag (ADR-0017); its
static guard here is the recorded `approval.impl` ratification. Open markers at `draft` are permitted
(they block only the *gate*, not the draft state). A `draft` requires **no** ledger shard (no gate
has run); the durable floor applies only once a gate has advanced the status.

Reject illegal tuples **before** any other gate work. If `check-spec-state.mts` changes, this list
follows it — the script is the source of truth, this prose is the readable mirror.

## Per-node `spec-type` checks

Same fail-closed class, enforced by the same helper. A capability node README's `spec-type` marker
must agree with its shape (`sdd:spec-format-governance`):

- `spec-type: reference` with a sibling `.feature` — illegal (a reference artifact is suite-less by design).
- `spec-type: reference` with no `## Subject` section — illegal (the reference descriptor is required).
- `spec-type: behavioral` with no `## Use Cases` section — illegal (a behavioral spec maps use cases to scenarios).
- a node README carrying any **lifecycle field** (`status`, `project-path`, `approval`, `produced-by`,
  or a retired `aligned` / `spec-layout` / `strategy`) — illegal: lifecycle frontmatter is
  **root-`spec.md`-only** (`sdd:lifecycle-governance`); a node carries only its `spec-type` marker.

## The two gates

| Gate | Transition | Object judged |
|---|---|---|
| spec gate | Draft → Approved | `spec.md` + the `.feature` (no implementation required) |
| impl gate | Approved → Implemented | the implementation vs the frozen `.feature` |

`producer ≠ judge` survives the gate fold: even though gates are no longer a fixed station, the judge
stays a distinct actor from the producer, and never patches what it grades.

## Sync is derived, not stored (no `aligned` flag)

There is no `aligned` field (ADR-0017). "Synced" is two properties at two layers, each derived or
judged — never a stored boolean:

- **Contract layer** (`spec.md` ↔ `.feature`) — **judged** at the spec gate by the Builder coverage
  lens; implementation is not required, and spike code is excluded as scaffolding.
- **Impl layer** (impl ↔ frozen `.feature`) — derived by **running the frozen suite**; the impl gate
  advances to `implemented` only when **every** impl-judge passes, else it stays `approved` and
  surfaces the blocker.
- **Per-node settled state** is the **`@frozen`** scan; **what is in flux now** is the `.plan.md`
  todos.

`status` alone carries the lifecycle — no segment-level toggle.

## No-resolvable-producer fails closed

A required production role **always** resolves to a real producer — a plugin agent or the SDD default
for that role. When a gate runs and a required role has **no resolvable producer** (not a plugin
agent and not even an SDD default), the gate **fails closed** with a blocker; it advances nothing.
This is a **structural** error, the same fail-closed class as a malformed `produced-by` entry or an
off-enum `cause` (defined in `sdd:combat-log-governance`). Distinct from availability: a recorded
producer whose plugin is merely uninstalled is **flagged**, not blocked.
