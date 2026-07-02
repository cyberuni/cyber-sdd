# ADR 0001 — ACED fit is a declared, early judgment

**Status:** accepted

## Context

ACED treated every registered artifact-type (`skill`, `subagent`, `command`, `agents-section`) as
eval-eligible, and its spec bar required trigger near-misses **unconditionally**. Re-judging the SDD
framework's own suites showed that agent configs split three ways by how much of ACED's value
applies, and the unconditional rule **false-failed** the mechanical ones (near-miss is N/A for a
subject with no activation decision). The rule was frozen into the role contracts, so the false-fail
was law.

## Decision

Introduce **fit** (`design/fit.md`): `strong | partial | wrong-squad`, defined as **which of ACED's
four eval layers carry real signal**.

- Fit is **decided early** — in explore, by the `scenario-writer`, before any scenario is authored —
  and only **enforced** at the gate by the `spec-validator`. The gate reads the declared tier; it
  never re-decides it.
- trigger-context / trigger-balance become **conditional on tier** (required for `strong`, N/A for
  `partial`).
- A **wrong-squad** subject is **recused**: no `.feature` is authored; the conductor falls back to
  the SDD-default chain + a script harness (the `sdd:` recuse→fallback seam).
- Fit is recorded as a `**Fit:**` line in the subject `spec.md` `## Use Cases` — a **declared**
  judgment consumers read, not re-derive. Hence a **governance** (`aced:aced-fit`), not a `.mts`
  engine.

## Consequences

- The false-fail is fixed: a `partial` suite with no near-miss passes; a `strong` one still fails.
- ACED no longer forces the agent-behavior lens onto deterministic engines; they route out cleanly.
- Non-goal (deferred): surfacing the tier in the user-facing skills (`run`/`report`/`init-aced`/
  `improve`).
