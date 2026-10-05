# aced-fit

Internal ACED governance (`user-invocable: false`). The **fit classifier** — `strong | partial |
wrong-squad`, defined as **which of ACED's four eval layers (Structural / Trigger / Behavior /
Quality) carry real signal** for a subject.

Fit is decided **early** — in explore, by `aced-scenario-writer`, before any scenario is authored —
and only **enforced** at the gate by `aced-spec-validator`, which reads the declared tier and never
re-decides it. It makes the spec bar's trigger-context / trigger-balance criteria **conditional on
tier** (required for `strong`, N/A for `partial`), and **recuses** a `wrong-squad` deterministic
engine to the SDD-default builder + a script harness instead of forcing the agent-behavior lens onto
it.

A second, orthogonal axis, **`measured: worth | not-worth`**, says whether real headless runs (the
measured layer, `eval-run/bench/`) answer a question simulation cannot. It is declared under `bench:`
in `eval.md` and is opt-in: an absent `bench:` means not-worth and is not a content gap. Dollars
never decide it.

Loaded by the ACED spec-producer and spec-judge, and by the `bench` skill to re-ask the measured
criteria for the change in hand. The normative model is `design/fit.md` (ADR 0001 for the tier,
ADR 0003 for the measured axis). Not triggered by users directly.
