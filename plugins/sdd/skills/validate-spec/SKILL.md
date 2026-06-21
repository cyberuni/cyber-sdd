---
name: validate-spec
description: Use this skill when the user wants to check a spec for completeness, consistency, or readiness to advance status (Draft → Approved or Approved → Implemented).
---

# validate-spec

Run an SDD **gate**. This skill owns the gate decision: it judges the artifact, confirms the required voices are heard, and — on the human verdict — writes `status` and `approved-by`. There are two gates, judging two objects: the **spec gate** (Draft → Approved, judges `spec.md` + the `.feature`) and the **impl gate** (Approved → Implemented, judges the implementation against the frozen `.feature`).

## 1. State check (deterministic, run first)

Reject illegal `(status, aligned, markers, .feature, approved-by)` tuples before doing anything else:

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

## 3. Judge via the orchestrator

Invoke `sdd-orchestrator` (`DOMAIN`, `DOMAIN_PATH`). It resolves the spec-judge (or impl-judge) for the domain — a plugin agent or the SDD default (`sdd-spec-judge` / `sdd-implementer`) — runs it, and synthesizes `aligned` for the gate's layer. Relay its `STATUS`, `ALIGNED`, failing scenarios, remaining `<!-- open: -->` markers, and `OBSERVATIONS`.

**Do not advance** if: the judge reports failures, any open markers remain, or `ALIGNED` is false. Report the blockers for the user to fix; surface `OBSERVATIONS` (on accept, spawn a new spec — never edit this spec's markers).

## 4. Confirm the voices, then take the verdict

When the judge passes and `ALIGNED` is true, present the **gate report** (verdict per backward face + open items) and confirm the required reviewers have acknowledged the spec — a PR approval, a recorded comment, or an explicit async ack. The decision is the human's; never advance on your own.

## 5. Write the transition (only after the human approves)

The skill owns `status` and `approved-by`; the orchestrator already owns `aligned`. On approval:

- **Spec gate** → set `status: approved` and `approved-by.spec.by: <approver>`.
- **Impl gate** → set `status: implemented` and `approved-by.impl.by: <approver>`.

If the agent self-asserted within its leash, the entry is `by: agent` with a `why` derivation (the orchestrator wrote it) — provisional, awaiting human ratification. Re-run the state check to confirm the new tuple is legal.

## Report

- PASS / FAIL per face, relayed from the judge
- `ALIGNED: true | false`; if false, which artifacts are missing or out of sync
- Open markers / failing scenarios still blocking, if any
- On success: confirm the spec advanced to the next status and who approved it

Do not fix issues automatically — report them for the user to address or confirm intent.
