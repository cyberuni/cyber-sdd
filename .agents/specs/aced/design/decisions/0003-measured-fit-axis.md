# ADR 0003 — the measured layer gets its own fit axis

**Status:** proposed (cyber-sdd#69, step 2 — awaiting the spec gate)

## Context

ACED adds a measured layer (`eval-run/bench/`): real headless runs of a task set, graded by shell
checks, compared with permutation statistics. Real runs cost money and time; simulation does not.
Fit (ADR 0001) already says which simulated layers carry signal, as one tier. The question "is a
real run worth paying for?" needed a home.

## Decision

Add a second, **orthogonal** fit axis, `measured: worth | not-worth` (`design/fit.md`), declared
per subject in `eval.md` under `bench:`, opt-in (absence = not-worth), and re-asked per comparison
by the `bench` skill and the engine's plan. The criteria and their reasoning live in
`design/fit.md`; the operative rules in `aced:aced-fit`. Dollars are recorded and compared but never
decide a result.

## Alternatives rejected

- **A fourth tier above `strong`.** The axes are independent — a `strong` skill whose change is
  wording-only is not worth measuring, and a `partial` procedure can be. One tier would force a
  false ordering.
- **Absence as a content gap**, matching the tier. Every existing `eval.md` would fail the gate on
  the day the axis lands, for a layer none of them asked for.
- **Cost per success as a gate input.** Prices change with the model, so a gate on dollars would flip
  on a price list rather than on the subject (owner decision on #69).

## Consequences

- No existing node changes classification.
- The engine itself is `wrong-squad` under the tier (its output is asserted), so it is built and
  judged by the SDD-default chain with `node:test`; the `bench` skill wrapping it is `partial`.
- The `spec-validator` enforces a declared `worth` (a suite and a reason are required), never
  re-deciding it; the `scenario-writer` declares it. Neither duty has a scenario in those roles'
  frozen suites yet (`sdd-roles/spec-validator/`, `sdd-roles/scenario-writer/`). That is a follow-up
  of additive scenarios on those nodes, together with naming the duty in the agent definitions.
