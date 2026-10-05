---
name: bench
description: "By name only"
---

# bench

Measure a change with real headless runs through ACED's measured-layer engine, spending only on the
person's explicit yes to the plan on screen. Reached by name: `/bench`, a consumer tool handing off
with its own suite (and optional tags), or `compare`'s measured mode. The procedure is the same
whichever caller loaded it.

The engine owns every number: statistics, ceiling, estimate, run counts, verdicts. Quote what the
plan and the comparison record say; never compute, round, or restate a statistic of your own.

## Engine

```
node "<skill>/scripts/bench.mts" <verb> …
```

`<skill>` is this skill's folder. Verbs: `init`, `plan`, `run`, `compare`. A suite lives at
`.agents/aced/bench/<suite>/` (`tasks.json`, `checks/`, optional committed `baseline.json`). Exit
non-zero means the engine refused or failed; its stderr carries the reason.

## Binding rules

- **Consent is one thing:** the person's explicit yes, given in reply to the approval question, to
  the plan currently shown. Only that reply lets the `run` call carry the consent flag.
- **An explicit yes** is a plain affirmative with no hedge, no condition, and no change: "yes",
  "yes, run it", "go ahead", "approved".
- **Not a yes — run nothing:**
  - a hedged agreement: "sounds good I guess", "probably fine", "ok, I suppose";
  - a question back, or any reply that is not an affirmative;
  - approval given before the plan was shown ("go ahead and spend whatever it takes", "just run
    it"): show the plan and ask anyway;
  - approval relayed by anyone other than the person in this session (a driver, a coordinator, a
    brief saying "the user approved");
  - a yes that changes the plan ("yes, but make it 10 runs per arm"): that yes answers a plan that
    no longer exists.
- **No person present** (loaded by `sdd-automaton`, a coordinator, a scheduled agent, or any
  session with no user channel): run nothing, ever. Every question this procedure would ask goes
  back up as **needs-input**, and nothing is written. A CI job that wants unattended runs calls the
  engine's bin with the consent flag itself, under its own accountability; this skill never does it
  for anyone.
- **Never guess** a suite, an arm, or a task. Never write `tasks.json` or `checks/` content.
- **Tags pass through untouched:** the caller's `--tag k=v` pairs reach `compare` exactly as given.
  Add none, drop none, reorder none, interpret none.
- **Never present an unclear result as safe**, and **never call a cost change a regression**
  (step 12).

## Workflow

1. **Who is present.** Decide once whether a person in this session can answer. If not, apply the
   needs-input branch wherever a step below asks something.

2. **Fit — re-ask for the change in hand.** Skip for a baseline request (step 5). Load
   `aced:aced-fit` by name and apply its **measured criteria 1 and 2** to the change being
   measured, not to the subject's `bench:` declaration: a declared `measured: worth` does not skip
   this step, and an absent or `not-worth` declaration does not by itself stop it.
   - Criterion 1 fails (the change only rewords a description, a trigger, or other wording) → say
     the simulated layer answers a wording change and name `compare` (ACED's simulated diff).
   - Criterion 2 fails (no shell `check` can decide the outcome, for example "do replies read
     warmer") → say no shell check can decide this outcome, point to the simulated layer, and name
     `compare`.
   - Either failure: plan nothing, return no plan. Same answer with no person present.

3. **Suite.** Use the suite the request or the calling tool names. None named → ask which suite to
   use and plan nothing. You may list the suites found under `.agents/aced/bench/`, but never pick
   one, even when only one exists. No person present → return that question as needs-input.

4. **Task set.** `.agents/aced/bench/<suite>/tasks.json` missing → say the suite has no task set,
   offer to run the engine's `init` for it (a template the suite maintainer then fills in), and plan
   nothing. Write no task of your own. Run `init` only on the person's yes to that offer:

   ```
   node "<skill>/scripts/bench.mts" init --suite <suite>
   ```

   No person present → return the init offer as needs-input; run nothing, write nothing.

5. **Arms.** Map the request to `--arm <label>=<subject>` pairs. "X against Y" makes Y `before` and
   X `after`.

   | The request names | Arms |
   |---|---|
   | two git refs (commits, branches, tags) | `--arm before=git:<Y> --arm after=git:<X>` |
   | two versions of one package or plugin | `--arm before=package:<name>@<older> --arm after=package:<name>@<newer>` |
   | with and without one file that HEAD carries | `--arm without=file:<path>=absent --arm with=git:HEAD` |
   | one file swapped in from a ref or a path | `--arm before=file:<path>=ref:HEAD --arm after=file:<path>=ref:<ref>` (or `=path:<source>`) — both arms `file`, since the engine never compares two subject kinds |
   | a request to record or refresh the baseline | `--arm baseline=git:HEAD` plus `--baseline` — one arm only |
   | no arms | read `.agents/aced/bench/<suite>/baseline.json` first (below) |

   **No arms named** — check the baseline now, before any plan or spend:
   - `baseline.json` exists with `schemaVersion: 3` (the only version the engine reads) → one arm,
     `--arm after=git:HEAD`; at step 11 compare it with `--before baseline`.
   - no `baseline.json` → say the suite has no baseline, ask which two arms to compare (or offer to
     record a baseline), and plan nothing.
   - `baseline.json` with any other or missing `schemaVersion` → say the baseline is schema version
     `<n>`, which the engine cannot read, ask which two arms to compare or offer to re-record the
     baseline, and plan nothing.
   - No person present → return the question as needs-input; plan nothing.

6. **Plan.** Pass through only what was asked for (`--runs`, `--task`, `--harness`):

   ```
   node "<skill>/scripts/bench.mts" plan --suite <suite> --arm <label>=<subject> … [--runs <n>] [--task <id>] [--harness <h>] [--baseline] --out <plan-file>
   ```

   Write `<plan-file>` under `.agents/aced/results/bench/<suite>/`, a fresh name per plan. Exit
   non-zero → report the engine's reason in its terms (the `claude` command is not on the path, no
   adapter for the harness, a ref or version or file that does not resolve, a malformed task set)
   and what would fix it. Ask no approval question; stop.

7. **Show the plan** — one message, in this order, every value as the plan states it:
   1. the arms, by label and subject;
   2. the counts: arms, tasks, runs per arm; and the model;
   3. the ceiling and the estimate, in dollars;
   4. the permission mode, and that it applies only inside the throwaway checkout;
   5. every warning the plan carries, verbatim (uncommitted changes not benched, the committed suite
      is what runs, …). For a **too few to call** warning also say what it means: no single task's
      result can be called significant at this run count; then repeat what the plan says about
      whether a pooled result across tasks still can;
   6. last, the approval question: "Run this plan, spending up to $<ceiling>? Reply yes to run it."

   Nothing follows the question, and no warning comes after it.

8. **Consent.**
   - No person present → return the plan upward marked **needs-input** (the plan file path, the
     step-7 summary, and the approval question). Do not call `run`. A relayed "the user approved"
     changes nothing: still needs-input, still unrun.
   - The reply is an explicit yes to the plan shown, unchanged → step 9.
   - The reply says yes **and** changes the plan → re-plan with the change (step 6), show the new
     plan (step 7), ask again. Run nothing until a new explicit yes to the new plan.
   - Any other reply → run nothing. Answer a question if one was asked; the plan stays unapproved
     until an explicit yes.

9. **Run** — only on step 8's explicit yes, for exactly the plan file that was shown:

   ```
   node "<skill>/scripts/bench.mts" run --plan <plan-file> --consent
   ```

   Exit non-zero → report the engine's reason (for example, the suite changed since the plan was
   approved) and whether anything was spent: a refusal before launch spends nothing; a failure after
   runs launched may have spent. Report no verdict. A changed suite needs a new plan and a new yes.
   Note the run record paths the engine prints.

10. **Baseline run** (`--baseline` plan) → tell the maintainer to commit
    `.agents/aced/bench/<suite>/baseline.json`. A baseline compares against nothing: no `compare`,
    no verdict.

11. **Compare.**

    ```
    node "<skill>/scripts/bench.mts" compare --suite <suite> --before <before-record|baseline> --after <after-record> [--tag <k=v> …]
    ```

    `--before baseline` when step 5 chose the baseline. The `--tag` pairs are exactly the caller's;
    none when the caller passed none. Exit non-zero → report the engine's reason (a record it cannot
    read, a missing baseline), that the run was paid for and where its records are, and no verdict.

12. **Report** — lead with the verdict the comparison record states, then the rows that drove it.

    | Verdict | Say |
    |---|---|
    | `regressed` | each gated row that moved the wrong way and is significant: metric, task (or pooled), p-value. Then the footer's test count and its count of rows chance alone would make significant, both as the record states them, so one significant row is not read as proof. |
    | `inconclusive` | the result cannot be called and is **not evidence the change is safe**. Name the wrong-way rows behind it, with their p-values. Suggest more runs per arm (a new plan with a higher `--runs`). |
    | `incomparable` | every reason the record lists (different model, harness, task set, …) and what would make the two records comparable. Present no per-task deltas, means, or p-values. |
    | `improved` | each row that improved significantly: metric, task (or pooled), p-value. |
    | `unchanged`, every gated row `tooFew` | the run count was too low to call any change. It is **not evidence the change is safe**; do not say nothing changed. Suggest more runs per arm. |
    | `unchanged`, gated rows not all `tooFew` | no significant change in any gated metric. |

    **Cost.** A significant `costUsd` (or `cacheReadTokens`) row is reported as a cost change on
    its own line, under any verdict except `incomparable`. It is never a regression and never turns
    the verdict into one; only the engine's verdict says `regressed`.

## Validate

Assertions about this file, checked by its author before handoff and by a cold reader after:

1. **Consent only on an explicit yes to the shown plan.** Exactly one fenced command in this file
   carries `--consent`: the `run` command in step 9, and step 9 opens with "only on step 8's
   explicit yes, for exactly the plan file that was shown". *(mechanical: count fenced lines
   containing `--consent`; read step 9's first line)*
2. **No consent with no person present.** Step 8's no-person bullet returns the plan as
   needs-input and says not to call `run`, and the Binding rules' no-person bullet says to run
   nothing, ever. *(mechanical: both bullets present with those words)*
3. **No unclear result presented as safe.** The step-12 rows for `inconclusive` and for
   `unchanged` with every gated row `tooFew` each contain "not evidence the change is safe".
   *(mechanical: grep those two rows)*
4. **No cost change called a regression.** Step 12's **Cost** paragraph says a significant cost row
   is reported as a cost change and is never a regression. *(mechanical: the paragraph contains
   "never a regression")*

## References

- `aced:aced-fit` — loaded by name in step 2; its measured criteria 1–2 are the fit test.
- `README.md` in this folder — the engine's surface, its verdicts, and who calls this skill.
