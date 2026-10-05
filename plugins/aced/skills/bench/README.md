# bench

Measure whether a change makes real agent work turn out better or worse — pass rate, turns, tokens,
wall time — with real headless harness runs, at a price the person approved first.

`bench` is ACED's **measured layer**. The simulated layers (`run`, `compare`) say what an agent
*would* do; `bench` runs the agent for real in throwaway checkouts, grades each run with a shell
`check`, and compares two arms with permutation tests.

## How it is reached

By name only — its `description` is `"By name only"`, so it is never matched to a situation:

- `/bench` from a person in the session;
- a consumer tool handing off by name with its own suite, and optionally its own comparison tags;
- `compare`'s measured mode (a later change).

## What it does

1. **Fit.** Loads `aced-fit` and re-asks its measured criteria 1–2 for the change in hand: does the
   change move how real work turns out, and can a shell check decide the outcome? A wording-only or
   rubric-only question goes to `compare` and nothing is planned. A subject's `bench:` declaration
   neither skips nor forbids this check.
2. **Suite and task set.** Asks for a suite when none is named (never guesses, even with one suite
   in the repo); offers the engine's `init` when the suite has no `tasks.json`, writing no tasks
   itself.
3. **Arms.** Maps the request to git-ref, package, or file arms. With no arms named, measures HEAD
   against the suite's committed `baseline.json` — after checking, before any spend, that the
   baseline is a schema version the engine reads.
4. **Plan.** Runs the engine's `plan` (spends nothing) and shows the counts, model, ceiling,
   estimate, permission mode and its throwaway-checkout scope, and every warning, then asks.
5. **Consent.** Runs only on an explicit yes to the plan on screen. A hedge, a question, a yes given
   before the plan was shown, a yes that changes the plan, or an approval relayed by another agent is
   not consent. With no person present, the plan goes back up as needs-input and nothing runs.
6. **Run, compare, report.** Leads with the verdict and the rows that drove it, and never presents
   `inconclusive` (or `unchanged` at a too-few run count) as safe, or a cost change as a regression.

A baseline request plans one arm at HEAD with the baseline flag and, after the approved run, reminds
the maintainer to commit `baseline.json`.

## The engine

`scripts/bench.mts` (bin `aced-bench`) is the deterministic half: `init`, `plan`, `run --consent`,
`compare`. It owns every number — the statistics, the record schema, the ceiling and estimate, the
verdict rule — and is usable without the plugin installed (for example from CI, which passes
`--consent` itself under its own accountability). The skill adds judgment around it and restates
none of its numbers.

Verdicts: `regressed`, `inconclusive`, `improved`, `unchanged`, `incomparable`.

## Suite layout

```
.agents/aced/bench/<suite>/
  tasks.json       # the task set (written by the suite maintainer; `init` writes a template)
  checks/          # shell checks the tasks call
  baseline.json    # optional, committed — the before side when no arms are named
```

Run records and comparisons go to `.agents/aced/results/bench/<suite>/`, which `init-aced`
git-ignores.

Spec: `.agents/specs/aced/eval-run/bench/skill/` (this skill) and
`.agents/specs/aced/eval-run/bench/engine/` (the engine).
