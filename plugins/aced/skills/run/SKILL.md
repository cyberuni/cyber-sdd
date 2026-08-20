---
name: run
description: Use this skill when running ACED evals to score agent configuration behavior against its frozen .feature suite — after editing a skill, AGENTS.md section, subagent, or command.
---

# ACED Run

Run the frozen `.feature` suite for a target agent configuration and report results. The `.feature`
is the single eval source — scenarios, inline `@rubric` criteria, and `@trigger` `Examples` all live
in it. `eval.md` carries only the subject binding and run policy.

## Locate the suite

If the user specifies a target, find the target's node in the project spec —
`.agents/specs/<project>/…/<node>/` (discovered through the SDD spec tree; the node's `eval.md` names
the subject) — which holds the frozen `<node>.feature` and its colocated `eval.md` (subject + run
policy). If no target is specified and only one node in the project spec carries an `eval.md`, use it.
If multiple exist, ask which to run. **If no suite exists at all, report that no eval suite is
initialized and stop — do not run.**

Read `eval.md` for the **measurement policy** (two-level shape):

- `subject` — the agent configuration under test.
- `eval.layers` — which layers run (`trigger` / `behavior` / `quality`).
- `eval.judge.model` and `eval.judge.default_threshold` — the scoring engine + fallback threshold.
- `eval.trigger.{activation_threshold, runs}` — the trigger-layer run policy.

Read the `subject` agent configuration in full before evaluating — the judge needs the current version.

## Run each scenario

Enumerate the scenarios of `<feature-name>.feature` **in file order**. For each scenario:

1. Determine its layer from its tag (`@trigger` / `@behavior` / `@quality`); a scenario with no layer
   tag defaults to `behavior`.
2. **Skip** the scenario if its layer is not listed in `eval.layers`.
3. Extract the eval from the scenario itself:
   - `@rubric` scenario → the inline rubric docstring (dimensions + per-dimension `max` + `threshold`);
     an inline `threshold` overrides `eval.judge.default_threshold`.
   - `@trigger` `Scenario Outline` → each `Examples` row is one case; invoke the judge **once per row**, passing its zero-based `ROW`.
   - a deterministic boolean scenario → its boolean `Then` assertions.
4. Invoke `aced-case-judge` with the `subject`, the **`.feature` path and the scenario name** (plus the
   `ROW` for a trigger outline), and its threshold, over the run count for its layer
   (`eval.trigger.runs` for trigger; else a single behavior/quality run unless the caller sets N).
5. Collect, by shape: a `@rubric` case returns a score per named dimension against that dimension's
   own `max`, plus the total and pass/fail (pass = total ≥ threshold; a triggered must-not-do is a
   fail outright). A trigger row returns its invoke decision against the expected one — accuracy is
   yours to aggregate across rows and runs, against `eval.trigger.activation_threshold`. A boolean
   scenario returns pass/fail with no dimension scores. Every shape also returns `WHAT WORKED` and
   `WHAT FAILED` — those two are the whole explanation the judge emits, and it emits nothing else.

Run all scenarios before reporting. Do not stop on first failure.

## Invoking aced-case-judge

Pass this context block to the judge:

```
SUBJECT:
<full agent configuration text>

FEATURE_PATH: <path to the frozen .feature>
SCENARIO: <exact scenario name>
ROW: <zero-based Examples row — trigger outlines only>
LAYER: <layer>
THRESHOLD: <inline threshold, else eval.judge.default_threshold>
```

**Pass the path and the name — never the steps, the `Then`, or the rubric.** The judge simulates and
scores in two separate contexts and composes the simulating context's brief with the
`extract-situation` engine; handing it the scenario body would put the answer key back in the
context that has to reach the answer. One invocation covers both passes — never sequence them here.

**Wait for each judge, and bank only its last word.** The dispatch is asynchronous, and the judge is
itself waiting on its own blind simulator — so it can report before its measurement exists and
correct itself afterwards. Where an agent reports more than once, the **final** report for that agent
id supersedes the earlier one entirely: never bank the first, never merge them. Do not compute
results while any judge is still live; a run that ends with cases outstanding reports those cases as
**unmeasured**, not as passes or failures. A judge that emits `BLOCKER: <reason>` in place of a score
is likewise unmeasured — surface it rather than folding it into the pass rate.

## Compute results

After all scenarios:

- Pass rate = passing scenarios / total scenarios
- Per-layer breakdown (trigger pass rate, behavior pass rate)
- Failing scenarios sorted by **margin** (`total − threshold`) ascending, worst first

Report each scenario's total **against its own maximum** (`4/5`), never as a bare number. Maxima
differ per scenario, so a mean taken across raw totals compares scales that do not line up — if you
report a headline number, report the mean **margin** or the mean **fraction of maximum**, and say
which.

## Record what was evaluated

Before writing the record, list **every input you consumed to judge this target** — the target
configuration, each file it loads, the target's `eval.md`, the frozen `.feature`, and any directory
you **listed** to find those files. This is what makes a recorded result checkable later:
`check-freshness` re-hashes exactly these paths and nothing else, so a result whose provenance is
missing or wrong is worse than one carrying none.

**Record only what you actually consumed.** A file you did not open does not belong in the set —
this is not "everything next to the config". Over-reporting is visible against a fixture and will
fail the suite; it also makes every later freshness answer wrong in the direction of `stale`.

Compute each hash with the **shared engine**, never by hand and never with a second implementation.
`<aced-skills>` is the directory **containing** this skill (`run`'s parent), so the engine resolves as
the sibling `check-freshness`:

```bash
node "<aced-skills>/check-freshness/scripts/check-freshness.mts" --hash-file <repo-relative path>
node "<aced-skills>/check-freshness/scripts/check-freshness.mts" --hash-dir  <repo-relative path>
```

`check-freshness` compares using that same routine. Two schemes that merely agree today would
surface their divergence as a permanent `stale` rather than as an error, so there is one routine and
both sides call it.

| Entry `kind` | What the hash covers | Why |
|---|---|---|
| `file` | the bytes of the content you read | a content change must be detectable; a timestamp must never stand in for one |
| `directory` | the **names** the listing returned (sorted, `\n`-joined) | this is what makes a file later **added** to that directory detectable without re-resolving the subject |

**An entry carries no modification time** — not as a hash, and not alongside one. A recorded mtime
invites a reader to compare it, and a file rewritten with identical bytes would then read as changed.

**Record each `path` repo-relative, and run the engine from the repository root.** The reader
resolves every entry against the repo root, so an absolute path is silently unverifiable. The engine
resolves its argument against the current directory — invoked from elsewhere it can hash a
same-named file somewhere else and record a right-looking path over a wrong digest.

**A directory you expanded needs BOTH**: the directory entry *and* a `file` entry for each file that
listing yielded. The directory hash covers names only, so it is invariant under a content edit
inside it — without the per-file entries, editing a file the subject loads from a references
directory would read as `current` forever.

## Record the model that scored the run

Record **the model you dispatched `aced-case-judge` under** — as you can name it, and `unknown`
exactly when you cannot. That is one condition, not a combination of several:

- You dispatched under the `eval.md` `judge.model` → record that value.
- You dispatched under a different model (a caller named one, or the policy was overridden) → record
  **the model you dispatched under**, never the declaration you did not honor.
- `eval.md` declares none and you cannot name what the harness chose → record `unknown`.

**`unknown` is a value, never an omitted field.** A missing field and a recorded `unknown` make
different claims, and a reader grouping results by model has to tell a run nobody attributed from one
attributed to a named model.

**It goes beside the scores, never inside `evaluated`.** The evaluated set is inputs whose bytes get
re-hashed; a model has none, so recording it there hands `check-freshness` a member it could only
ever report as unverifiable. The `eval.md` that *declares* the model is already in the set — what
this field adds is which model actually ran.

**One model per record.** It is a property of the run that produced these scores, not of the target:
two runs for one target under different models each carry their own, which is what keeps a target's
results groupable by model.

## Write results

Write to `.agents/aced/results/<target-slug>/<ISO8601-timestamp>.json` — the shared, git-ignored ACED results directory at the repo root, keyed by the target (a filesystem-safe slug of the target agent-configuration path), not scattered under each project-spec directory:

```json
{
  "timestamp": "<ISO8601>",
  "target": "<agent configuration path>",
  "pass_rate": 0.82,
  "scoring_model": "<the model you dispatched the judge under, or \"unknown\">",
  "evaluated": [
    { "path": "<agent configuration path>", "sha256": "<hex>", "kind": "file" },
    { "path": "<a directory the config loads from>", "sha256": "<hex>", "kind": "directory" },
    { "path": "<each file that listing yielded>", "sha256": "<hex>", "kind": "file" },
    { "path": "<the target eval.md>", "sha256": "<hex>", "kind": "file" },
    { "path": "<the frozen .feature>", "sha256": "<hex>", "kind": "file" }
  ],
  "scenarios": [
    {
      "name": "<scenario name>",
      "layer": "behavior",
      "dimensions": [
        { "name": "correctness", "score": 2, "max": 3 },
        { "name": "completeness", "score": 1, "max": 2 }
      ],
      "total": 3,
      "max": 5,
      "threshold": 4,
      "pass": false,
      "what_worked": "...",
      "what_failed": "..."
    }
  ]
}
```

A `@trigger` row carries `"row"`, `"invoke"`, `"expected"`, and `"pass"` instead of `"dimensions"`; a
boolean scenario carries `"pass"` alone.

## Report to user

```
ACED Run — <name>
──────────────────────────
Pass rate:  18/22 (82%)

Trigger layer:  8/10 (80%)
Behavior layer: 10/12 (83%)

FAILING SCENARIOS (worst first):
  ✗ no trigger for an audit request   [invoked: no, expected: yes] — <what failed>
  ✗ stages only related files         [3/5 vs 4: correctness 2/3, completeness 1/2] — <what failed>
  ✗ trigger on skill creation         [invoked: yes, expected: no] — <what failed>
  ✗ red tests block the commit        [3/5 vs 4: correctness 1/3, completeness 2/2] — <what failed>

Run improve to address failing scenarios.
Run compare after editing the agent configuration.
```

If pass rate is 100%, say so and suggest running `add-scenario` to expand edge case coverage.
