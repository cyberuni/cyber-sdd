---
spec-type: reference
concept: production-chain
---

# actor-bars — the shipped ACED governances

## Subject

The **actor bars** ACED ships and binds into its squad's `governances` slots in the registry entry.
Each unions onto the SDD default of the same key; none replaces it.

| Slot | Governance | Asks |
|---|---|---|
| `builder-spec` | `aced-builder-spec` | is the `.feature` a complete, simulable agent-config contract? |
| `builder-impl` | `aced-builder-impl` | does the artifact pass its frozen `.feature`? |
| `architect-impl` | `aced-architect-impl` | is the artifact well-formed **as configuration a model loads and executes**? |
| *(not a slot)* | `aced-fit` | which of ACED's eval layers carry real signal for this subject? |

`oracle-spec` and `architect-spec` are unbound; those keys degenerate to their SDD defaults.

**Reference artifacts**: each is a real shipped thing with no testable surface of its own, so none
carries a `.feature`. Their criteria are exercised through the artifacts they grade.

**Two faces read each bar** — the producer forward to self-align, the judge backward to grade.
`producer ≠ judge` holds at the agent level, so the shared bar does not collapse the independence.

**Why `architect-impl` exists.** `builder-impl` asks only whether the artifact passes its suite, so
before this bar was bound an artifact could clear the impl gate while violating every principle in
the shipped `skill-design` governance. The bar carries the gradeable criteria and cites
`cyberplace governance show skill-design` for full depth rather than duplicating it — one source of
truth. That contract is skill-specific; for `subagent`, `command`, and `agents-section` the bar is
the whole agent-config shape contract.

**Non-goals** — the eval layers and their thresholds (`aced-fit`, `design/`); the `.feature` form
(`sdd:suite-format-governance`); the SDD defaults these union onto; authoring any artifact (that is
`config-authoring/`).
