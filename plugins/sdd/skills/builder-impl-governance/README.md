# builder-impl-governance

This is an internal SDD governance about the Builder's bar at the **impl gate**.

It answers two questions: does the implementation meet the frozen suite, and is each scenario
verified at a level that earns confidence? In SDD, the `.feature` suite is frozen at the spec gate —
it is the contract the implementation is built against and cannot be edited to make the build pass.
This bar governs how conformance to that contract is demonstrated.

It is one half of a matched pair: its sibling **`builder-spec-governance`** asks "is the contract
testable and covered?" at the spec gate; this bar asks "does the implementation meet that frozen
contract?" at the impl gate.

## What it requires

| Requirement | What it means |
| --- | --- |
| **The bar is not self-set** | Each check derives from the frozen suite — one per scenario — never free-authored from the producer's sense of done. The cold impl-judge re-derives the oracle (the expected answer) independently (ADR-0016). |
| **Verify as high as it doesn't hurt** | Choose each scenario's verification *level* to maximize confidence until cost, fragility, or feasibility bites: a cheap base, a thin end-to-end cap on the paths that matter, and boundary (the external dependency mocked) as the honest substitute where end-to-end is infeasible or unsafe. Record the level chosen and why. |
| **A graded subject still yields a boolean** | A non-deterministic subject reaches the per-scenario boolean through a rubric plus a threshold over N runs; the rubric stays out of the `.feature`. |
| **No green-by-tampering** | Passing means the behavior holds — never that a check was edited to pass or the frozen suite modified to make the implementation conform. |
| **Deterministic combinatorics go to units** | Where the domain has a deterministic inner layer, its combinatorial space (truth tables, matrices) is covered with unit tests drawn from the inner rules — the pyramid's base, separate from the one-verification-per-scenario duty. Missing that coverage is its own finding and withholds the pass. A non-deterministic subject has no such layer — verify at the acceptance level only. |

This is the SDD default for the `builder` impl bar; a plugin may bind its own per artifact-type, and
this one loads when the registry leaves `builder`/`impl` unbound.

## Usage

One merged bar loaded by both faces at the **impl gate**:

- **impl-producer:** builds to it — derives its checks from the frozen suite and picks each
  scenario's verification level
- **impl-judge:** verifies against it, re-deriving the oracle independently

`producer ≠ judge` holds at the agent level — the same bar, two independent readers.

## Related governances

This bar owns conformance and per-scenario verification level. Its neighbors own everything
around that:

- **`builder-spec-governance`** — the other half of the pair: testability and coverage of the
  contract, judged at the spec gate. That bar freezes what must hold; this one verifies it held.
- **`architect-impl-governance`** — the suite's overall pyramid shape. This bar picks each
  scenario's level; the whole-suite shape is the architect's call.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
