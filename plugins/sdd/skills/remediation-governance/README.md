# remediation-governance

This is an internal SDD governance about **what a producer does when a gate sends work back**.

A gate returns one of three verdicts. `approve` and `reject` end the round. **`change`** sends the
work back with findings — and this bar governs what happens next.

Its single claim: **the findings are evidence, not a work order.** The tempting response is to read
them as a task list and edit each cited line. That fixes the lines and leaves the defect, because a
judge can only ever name the instances it happened to see.

## What it requires — the four rules

| Rule | What it means |
| --- | --- |
| **Substantiate first** | A finding is a claim about the artifact, and claims can be wrong. Check it before changing anything. One that does not hold is **contested** — send back the evidence and change nothing. |
| **State the rule, then sweep** | The finding names one instance; the actual defect is the rule it breaks. Name that rule, then search for every other place it is broken — in a script, so anyone can re-run it. Report what you looked at and **ruled out**, not only what you found. |
| **Re-derive against the governing rule** | Check the fix against the rule that governs the artifact, not just against the finding. "Does it still trip the finding?" is weak. "Is what it now says **true**?" is the question — a fix that satisfies the finding while breaking a rule the artifact is bound by is worse than the original defect. |
| **Account for provenance** | For each finding, ask whether the artifact it names was changed by the **last** round of fixes. If so it is a **regression** — the fixes are creating work rather than finishing it, and the loop stops for a re-plan instead of running again. |

## Sweeping is not string-matching

The most common way rule 2 goes wrong is a blanket search. A term retired in one place may be
correct in another, and the same word may name a different thing in a sibling project. Three
separations matter: **use vs mention** (deploying a retired term versus naming it *to say* it is
deprecated), **scope** (the live spec is bound; ADRs and ledger lines are history and are never
rewritten), and **word boundaries** (a substring is not an instance).

## Usage

- **spec-producer:** responding to a `change` verdict at the **spec gate**
- **impl-producer:** responding to a `change` verdict at the **impl gate**

Both return the trace — rule, sweep hits, ruled-out candidates, provenance — in their `Output`, which
is what lets the next judge check the remediation instead of taking it on trust.

## Related governances

- **`spec-producer-governance`** / **`impl-producer-governance`** — the producers that load this bar;
  they own *how the work is done*, this bar owns *how a returned verdict is answered*.
- **`gate-validation-governance`** — which gate states are legal; this bar is silent on state and
  governs only the response.
- **`suite-format-governance`** / **`spec-format-governance`** — the rules a correction is re-derived
  against under rule 3.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
