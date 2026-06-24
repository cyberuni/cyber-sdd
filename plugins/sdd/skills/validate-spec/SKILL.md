---
name: validate-spec
description: Use this skill when the user wants to check a spec for completeness, consistency, or readiness to advance status (Draft → Approved or Approved → Implemented).
---

# validate-spec

Run an SDD **gate**. This skill owns the gate decision: it judges the artifact, confirms the required voices are heard, and — on the human verdict — writes `status` and `approval`. There are two gates, judging two objects: the **spec gate** (Draft → Approved, judges `spec.md` + the `.feature`) and the **impl gate** (Approved → Implemented, judges the implementation against the frozen `.feature`).

Load `sdd:lifecycle-governance` for the status enum and transition rules, `sdd:ownership-governance` for the write-ownership matrix (who may write `status`, `approval`, `aligned`), and `sdd:gate-validation-governance` for legal-state tuples, `aligned` layer-scoping, and `approval` attribution.

## 1. State check (deterministic, run first)

Reject illegal `(status, aligned, markers, .feature, approval)` tuples before doing anything else:

```bash
node "<skill>/scripts/check-spec-state.mts" [--root <specs-dir>]
```

Exit `0` = legal; exit `1` = it prints each violation as `✗ <slug>: <reason>` — fix the frontmatter before continuing. If `node` is unavailable, perform the same checks by reading each `spec.md` frontmatter yourself.

## 2. Identify the target and the gate

Resolve the spec: a named domain/path → `specs/<domain>/spec.md`; otherwise ask which domain. Determine the transition from its current `status`:

| Current status | Gate | Object judged |
|---|---|---|
| draft | spec gate (Draft → Approved) | `spec.md` + the `.feature` |
| approved | impl gate (Approved → Implemented) | the implementation vs the frozen `.feature` |

**Force-spec-gate override.** When the caller explicitly requests a spec gate review regardless of current status (e.g. routed from the `sdd` gateway as **Re-review at the spec gate**), run the spec gate even if status is `approved` or `implemented`:

1. Temporarily set `status: draft` and `aligned: false` so the state check passes.
2. Run the spec gate (judge `spec.md` + the `.feature`).
3. After the human verdict:
   - **Approved** → restore `status: approved` (re-affirm) and `approval.spec.by: <approver>`. For `implemented` specs, restore `status: implemented` — the spec re-affirmed at the gate does not regress the impl status.
   - **Blocked** → leave in `draft` so blockers can be fixed through the normal path.

The state check (step 1) must re-run after the write to confirm the restored tuple is legal.

## 3. Judge and derive the leash via the orchestrator

Invoke `sdd-orchestrator` (`DOMAIN`, `DOMAIN_PATH`). It resolves the spec-judge (or impl-judge) for the domain — a plugin agent or the SDD default (`sdd-spec-judge` / `sdd-implementer`) — runs it, synthesizes `aligned` for the gate's layer, and **derives the leash** for this gate (the four-dimension assessment in `sdd:gate-validation-governance`). It returns a **gate report**: verdict per backward face, the leash derivation, open markers as questions with proposed answers, contestable defaults, and a decision menu. Relay its `STATUS`, `ALIGNED`, failing scenarios, remaining `<!-- open: -->` markers, `OBSERVATIONS`, and the gate report.

**Never advance** — neither by self-assertion nor by human verdict — if the judge reports failures, any open markers remain, or `ALIGNED` is false. These fail the **confidence** dimension, so they also forbid self-assertion. Report the blockers for the user to fix; surface `OBSERVATIONS` (on accept, spawn a new spec — never edit this spec's markers).

## 4. Take the verdict — self-assertion within leash, else the human

The clean gate splits two ways on the **effective leash** the orchestrator derived for this gate:

- **In leash** (the leash reaches this gate, all four dimensions read *safe*): the orchestrator has **self-asserted** — it wrote `approval.<gate>: { verdict: approve, by: agent, why }` and `aligned` in synthesis. This skill writes the matching `status` (step 5). The advance is **provisional**: the spec lands in the review queue (any `by: agent`) for asynchronous ratification. Still emit the `spec-digest` + gate report flagged **"agent-asserted — ratify or kick back."**
- **Gated** (the leash stops before this gate): **do not advance.** Call `spec-digest` and present it above the gate report so the human sees what they are deciding, then take the human verdict (`approve` / `change` / `reject`). On `approve`, proceed to step 5 with `by: <name>`.

The leash is the agent's, derived per gate; the **ceiling** is the human's (`effective = min(ceiling, derived)`). A self-assertion never makes a decision final — it only chooses async review over a synchronous stop.

## 5. Write the transition

The skill owns `status` and human ratifications of `approval`; the orchestrator owns `aligned` and agent self-assertions of `approval`. Write the gate's transition:

- **Spec gate** → `status: approved`; **freeze** the `.feature`.
- **Impl gate** → `status: implemented`.

For a **human verdict**, also write `approval.<gate>: { verdict: approve, by: <name> }` (no `why`) — only the **in-session position** may write this human attribution; a spawned delegate emits a verdict packet and stops. For a **self-assertion**, the orchestrator already wrote `approval.<gate>: { verdict: approve, by: agent, why }`; this skill only writes the matching `status`. **Ratifying** a queued self-assertion rewrites `by: agent` → `by: <name>` and drops it from the queue. Re-run the state check to confirm the new tuple is legal (a `by: agent` entry with no `why` is rejected).

## 6. The three gate actions

Both gates take the same three verbs; what each does differs by gate, because the gates judge different objects:

| Action | Spec gate (judges the contract) | Impl gate (judges code vs the frozen contract) |
|---|---|---|
| **approve** | → `approved`; **freeze** the `.feature`; set `approval.spec` | → `implemented`; set `approval.impl` |
| **change** | revise the contract (`spec.md` / `.feature`); stays `draft` | fix the **code** against the frozen `.feature`; the `.feature` is **not** modified |
| **reject** | scope-kill — drop or return to `draft` | redo the implementation — **or** a **Director-revert**: building proved a frozen scenario fatal, so **unfreeze** the `.feature` and return to `draft` |

Two asymmetries: at the spec gate **change edits the contract**; at the impl gate **change edits the code** (the frozen `.feature` is off-limits). The impl gate is the **only** place a frozen `.feature` reopens, via the Director-revert — rare and deliberate.

## Report

- PASS / FAIL per face, relayed from the judge
- `ALIGNED: true | false`; if false, which artifacts are missing or out of sync
- Open markers / failing scenarios still blocking, if any
- The leash derivation and the **effective leash** for this gate
- On success: the new status, the approver (`agent` = provisional, in the review queue; or `<name>` = ratified), and whether the `.feature` was frozen

Do not fix issues automatically — report them for the user to address or confirm intent.
