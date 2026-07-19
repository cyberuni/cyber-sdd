---
name: impl-producer-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
---

# Impl-Producer Governance — the default build procedure

The procedure the **spawned builder** follows when the conductor runs the **impl-producer** role from
the SDD default — no plugin covers the domain and no model-tuned producer is named, so the conductor
spawns a generic builder that loads this and builds. Load alongside: the resolved **builder** +
**architect** impl bars (to self-align and to author the verification) and `sdd:ownership-governance`.
The grader is separate — a cold impl-judge runs the verification this role authored; this role never
declares its own pass.

## Inputs (folded in by the conductor)

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, SOLUTION_PATH
MODE: explore | implement
```

## Procedure

1. **Read the contract.** Read the suite — every scenario in full, `Given` steps included. In
   `implement` mode it is **frozen**: build against it as the fixed bar. In `explore` mode it is a
   **draft**: spike to probe it; a discovery that the chosen solution needs a behavior the suite
   omits returns as a `CONTENT_GAP` / `OBSERVATIONS`, never written into `spec.md` or the suite.

2. **Build against the suite,** applying the builder + architect bars. **A `Given` is a test
   vector** (`sdd:suite-format-governance`): conform to each scenario's `Then`; owe nothing to its
   `Given`'s apparatus. Draw every illustration from a domain the suite does not probe; special-case
   no literal a `Given` names. Self-check with the **swap test**.

3. **Author the verification** — one check per frozen scenario, anchored to the scenario, never
   free-authored from your own sense of done. **Prefer executing the frozen scenario directly** (the
   suite as the runnable check) so the oracle stays spec-owned and only the glue is
   producer-authored. Where a unit-test mapping is unavoidable, the expected outcome comes from the
   frozen scenario, never your sense of done — the impl-judge re-derives that oracle (ADR-0016). A
   scenario you cannot yet verify is a reported gap, never a fabricated passing check.

4. **Verify as high as it doesn't hurt.** Choose each scenario's verification **level** to maximize
   confidence until cost, fragility, or feasibility bites: a cheap base, a **thin e2e cap** on the
   paths that matter, **boundary** (the external mocked at its seam) as the honest substitute where
   e2e is infeasible or unsafe. **Record the level and why.** Where the domain has a deterministic
   inner layer, also cover its combinatorial space (truth tables, matrices) with unit tests drawn from
   the inner rules — the pyramid's base, separate from the per-scenario duty. A non-deterministic
   subject has no such layer — verify at the acceptance level only.

5. **Never modify `spec.md` or the suite** — four-eyes. A behavior-changing gap is a
   `CONTENT_GAP` / `BLOCKER`, never an in-place edit. Never change or remove a `@pinned` scenario —
   propose it and surface for user authorization (`sdd:ownership-governance`).

## Responding to a `change` verdict — evidence, not a work order

A gate verdict's findings are **evidence to reason from**, never a task list to execute. Working
down the list edit-by-edit is the failure this section exists to prevent: it fixes cited lines while
leaving the defect, and it can introduce defects the next round then reports.

1. **Substantiate each finding first.** A finding is a **hypothesis**. Verify it against the artifact
   before touching anything. One you cannot substantiate is **contested** — return your evidence and
   edit nothing. Fixing an unverified finding is how a vague line becomes a wrong one.
2. **State the rule, then sweep.** A judge names an **instance**; the defect is the **rule**. Name
   the rule the finding instantiates and sweep the corpus for every other instance — in a script, so
   the result is reproducible — before making any edit. Report the sweep's **negative** half too: the
   candidates you inspected and ruled out, so the next reader need not re-run it.
3. **Re-derive the correction against the rule that governs the artifact**, not merely against the
   finding. "Does this still trip the finding?" is the weak question. "Is what it now says **true**?"
   is the one that matters — a correction that clears the finding while contradicting a governance
   the artifact is bound by is a worse defect than the one it replaced.
4. **Account for findings by provenance, every round.** Split them into *pre-existing* and
   *introduced by the previous round's remediation*. All pre-existing ⇒ the loop is **converging**;
   continue. **Any** finding traceable to the last round's fix ⇒ the loop is **diverging** — stop,
   report it, and re-plan. Do not open another remediation round on a diverging loop.

Frozen as `workflows/gate-verdicts.feature` (theme E, rows E5-E8).

## Output (the conductor collects)

```
STATUS:               complete | needs-input | blocked
ARTIFACTS_WRITTEN:    [ paths ]
VERIFICATION_WRITTEN: [ paths ]   # one per frozen scenario, each with its level + why
CHANGES_MADE:         <what was built>
QUESTIONS:            [ batched, when needs-input ]
CONTENT_GAPS:         [ { artifact, location, gap } ]
OBSERVATIONS:         [ { owner: architect | strategist, note, evidence } ]
```

## Key points (read-check)

1. **Read the frozen suite in full**; build against it; a needed behavior it omits is a
   `CONTENT_GAP`, never an in-place edit.
2. **A `Given` is a test vector** — conform to the `Then`, owe nothing to the apparatus (swap test);
   no absorption.
3. **Author one check per frozen scenario** anchored to it; prefer running the scenario directly so
   the oracle stays spec-owned; an unverifiable scenario is a reported gap.
4. **Verify as high as it doesn't hurt** — record level + why; deterministic combinatorics go to unit
   tests (the pyramid base).
5. **Never modify `spec.md` / the suite; never touch a `@pinned` scenario without user
   authorization.**
