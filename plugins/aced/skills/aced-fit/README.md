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

Loaded by the ACED spec-producer and spec-judge; the normative model is `design/fit.md` (ADR 0001).
Not triggered by users directly.
