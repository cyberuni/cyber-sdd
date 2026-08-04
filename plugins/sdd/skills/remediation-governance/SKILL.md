---
name: remediation-governance
description: "Partial Skill: invoke by name only — the SDD remediation bar: how a producer responds to a `change` verdict at either gate. Loaded by the spec-producer and the impl-producer, not user-triggered."
user-invocable: false
---

# Remediation Governance — responding to a `change` verdict

A gate verdict's findings are **evidence to reason from**, never a task list to execute. Working down
the list edit-by-edit fixes cited lines while leaving the defect, and can introduce defects the next
round then reports.

This bar applies at **both** gates — the spec gate and the impl gate — and is loaded by whichever
producer is responding.

## The four rules

1. **Substantiate each finding first.** A finding is a **hypothesis**. Verify it against the artifact
   before touching anything. One you cannot substantiate is **contested** — return your evidence and
   edit nothing. Fixing an unverified finding is how a vague line becomes a wrong one.
2. **State the rule, then sweep.** A judge names an **instance**; the defect is the **rule**. Name
   the rule the finding instantiates and sweep for every other instance — in a script, so the result
   is reproducible. Return the sweep's **negative** half too: the candidates inspected and excluded,
   so the next reader need not re-run it.
3. **Re-derive the correction against the rule governing the artifact**, not merely against the
   finding. "Does this still trip the finding?" is the weak question. "Is what it now says **true**?"
   is the one that matters — a correction that clears the finding while contradicting a governance
   the artifact is bound by is a worse defect than the one it replaced.
4. **Account for each finding's provenance.** A finding is a **regression** when the artifact it
   names was changed by the **previous remediation round's commits**; it is **pre-existing** when the
   artifact predates them. Any regression means the loop is **no longer converging**: stop, report
   it, and re-plan. Do not open another remediation round on a regressing loop.

## The Clearance-repair proof — a repaired frozen scenario must fail its pre-repair draft

A `change` verdict that re-opens an **already-frozen** scenario under a **ratified Clearance re-open**
(a narrowing/rewrite of specified behavior, or an impl-gate Oracle-lens revert) carries one extra bar
on top of the four rules. The repair changes a contract that was already frozen, so the danger is a
**back-fit**: a "correction" reverse-engineered to fit whatever the current draft/implementation
already says, changing nothing of substance. The proof against that is directional —

> a genuine repair makes the **pre-repair** artifact **FAIL**; a contract narrowed to fit an existing
> draft moves *toward* passing it.

So the repair is re-approved only when the repaired scenario **fails when checked against the
pre-repair artifact/draft** — not merely that it passes against the post-repair one:

- a repaired scenario that **fails** the pre-repair artifact is **accepted** as a genuine contract
  correction — the pre-repair failure is the evidence its substance changed;
- a repaired scenario that **already passes** the pre-repair artifact is **rejected** as a suspected
  **back-fit** — it may be reverse-engineered from what already existed, not a real correction;
- a **post-repair pass with no demonstrated pre-repair failure is not enough** — a repair carrying no
  pre-repair-failure proof is **not re-approved** (absence of the proof is not proof of substance).

The bar has **two faces**, both owed: the **producer** *demonstrates* the pre-repair failure as part
of the repair (run the repaired scenario against the pre-repair artifact and show it fails); the
**gate/judge** *requires* that proof before re-approving (a post-repair pass alone never re-approves).
An independent cold judge confirming the repaired scenario against the still-unrevised artifact is the
strongest form of the demonstration.

## A sweep is scope-aware, never a blanket match

Rule 2's sweep answers "every instance of the rule", which is **not** "every occurrence of a string".
Before acting on a sweep, separate:

- **use vs mention** — a retired term deployed as if current is the defect; the same term named *in
  order to* mark it deprecated, or preserved in an append-only record, is correct.
- **scope** — the live project spec is bound by the rule; ADRs and ledger lines are history and are
  never rewritten to match current vocabulary; a sibling tree may use the same word for a different
  concept.
- **word boundaries** — a substring hit is not an instance.

Report the excluded candidates with the reason each was excluded. A sweep that reports only its hits
cannot be checked, and invites the next producer to re-run it.

## What the producer returns

Remediation is **verifiable only if it leaves a trace**. Each finding answered carries, in the
producer's `Output`:

```
REMEDIATION:
  <finding>: verdict=<remediated | contested>
             rule=<the rule the finding instantiates>
             swept=<the other instances found, or none>
             ruled-out=<candidates inspected and excluded, with the reason>
             provenance=<pre-existing | regression>
             pre-repair-proof=<the repaired scenario FAILS the pre-repair artifact | n/a — not a Clearance-gated frozen-scenario repair>
```

A `contested` finding carries the evidence against it and **no edit** to the artifact it named. A
Clearance-gated repair of a frozen scenario carries its **`pre-repair-proof`** — the demonstration
that the repaired scenario fails the pre-repair artifact; a repair without it (or one that passes the
pre-repair draft) is not re-approved.

## Key points (read-check)

1. **A verdict is evidence, not a work order** — remediating cited lines one at a time is the defect
   this bar exists to prevent.
2. **Substantiate before acting** — an unsubstantiated finding is contested with evidence, not edited
   away.
3. **A finding names an instance; the defect is the rule** — sweep for every instance, and report the
   ruled-out candidates as well as the hits.
4. **A sweep is scope-aware** — use vs mention, scope, and word boundaries; a string match is not an
   instance.
5. **Re-derive the correction against the rule governing the artifact**, not against the finding
   alone.
6. **Provenance is derived from the diff** — an artifact changed by the previous round's commits
   makes its finding a **regression**, which stops the loop for a re-plan rather than another round.
7. **A Clearance-gated repair of a frozen scenario must fail its pre-repair draft** — re-approval
   requires the repaired scenario to **fail** against the pre-repair artifact (a repair that already
   passes it is a suspected back-fit; a post-repair pass alone is not enough). The producer
   demonstrates the failure; the gate/judge requires it.
