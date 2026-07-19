---
name: remediation-governance
description: "Partial Skill: invoke by name only — the SDD remediation bar: how a producer responds to a `change` verdict at either gate. Loaded by the spec-producer and the impl-producer, not user-triggered."
user-invocable: false
metadata:
  internal: true
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
```

A `contested` finding carries the evidence against it and **no edit** to the artifact it named.

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
