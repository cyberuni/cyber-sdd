---
spec-type: behavioral
concept: [eval-run, benchmarking]
---

# skill — measure a change for real, spending only on an explicit yes

The `bench` skill puts a person in front of the measured-layer engine (`../engine/`). It checks the
question is one real runs can answer, shows the plan and its price, runs only after the person says
yes to that plan, and reports what the numbers can and cannot claim.

## What

The engine can spend real money and returns statistics that are easy to over-read. This skill is the
part with judgment around both. It decides whether a measured run is the right tool for the question
at all, picks the arms from what the person asked, and never spends without an explicit yes to the
exact plan on screen. Afterwards it says plainly whether the change regressed, improved, or could not
be called — and never presents an unclear result as safe, or a price change as a regression.

It is reached **by name**: from `/bench`, from a consumer tool handing off by name with its own
suite, and later from `compare`'s measured mode. It is never matched to a user's
situation from its description. So it makes no activation decision of its own.

**Fit:** partial — the skill runs a fixed procedure (fit check → arms → plan → consent → run →
report) reached by name, so trigger near-miss balance is N/A; its behavior carries real signal,
because the consent rule, the headless refusal, and how it words an inconclusive or incomparable
result are agent conduct a judge must grade.

**Non-goals** — the statistics, the record schema, the run sequence, and every number in the plan
(`../engine/`); declaring a subject's `measured` fit in its `eval.md` (the spec-producer, under
`aced:aced-fit`); the simulated diff (`../../compare/`); the project-wide roll-up (`../../report/`);
choosing tasks for a suite (the suite maintainer writes `tasks.json`); a model matrix (a separate
change). The skill is driven by the change in hand, not by the subject's `bench:` declaration: a
declared `measured: worth` does not skip the fit re-ask, and an absent or `not-worth` declaration does
not by itself stop a person from measuring.

**Key terms** — **arm**, **suite**, **plan**, **ceiling**, **too few**, and the verdicts
(`regressed`, `inconclusive`, `improved`, `unchanged`, `incomparable`) are the engine's
(`../engine/README.md`). **Consent** here means one thing: the person's explicit yes to the plan
currently shown.

## Use Cases

### Actors and their goals

| Actor | Goal |
|---|---|
| **A developer** changing a skill, an AGENTS.md section, a plugin version, or repo setup | Learn whether the change makes real work turn out better or worse, for a known price. |
| **A consumer tool** (hands off by name with its own suite) | Get a comparison record it can act on by its own rules. |
| **A headless driver** (`sdd-automaton`, a coordinator, a scheduled agent) | Move a mission forward without a person present. |
| **The person paying** *(stakeholder)* | Never be charged for a run they did not approve, and never be misled about what a result shows. |
| **A maintainer recording a baseline** | Refresh the suite's committed `baseline.json`. |

### UC1 — measure a change (`/bench`, or a by-name hand-off)

**Actor** developer, or a consumer tool. **Goal** a trustworthy verdict on a change, at a price they
agreed to.

| Trigger | Inputs | Outcome |
|---|---|---|
| the skill is loaded with a suite and the change to measure | suite, arms (or none), runs | a plan shown and approved, the arms run, and a plain report of the verdict |

Extensions:

- **The question is not one real runs answer** — the change only rewords a description or alters when
  something triggers, or the outcome could only be graded by a rubric, not a shell check → the skill
  says the simulated layer answers it, names `compare`, and plans nothing.
- **No suite named** → it asks which suite to use and plans nothing; it never guesses one, even when
  only one suite exists.
- **The suite has no task set** → it says so and offers `init`; it writes no tasks of its own and plans
  nothing.
- A consumer tool reaches the same path as a developer, with its suite already named; nothing in the
  procedure depends on which of the two called.
- **No arms named** → with a committed baseline the engine can read (schema version 3), it plans one
  arm at HEAD and compares that arm's record against the baseline. With no baseline, or one of another
  schema version, it says which and asks which arms to compare (or offers to re-record the baseline)
  instead of guessing — checked **before** any spend, because the engine would refuse that baseline
  only at `compare`, after the run was paid for.
- **The engine refuses `run` or `compare`** (the suite changed since the plan was approved; a record
  it cannot read) → it reports the engine's reason, says whether anything was spent, and reports no
  verdict.
- **A consumer tool passes tags** → they go through to the engine's `compare` unchanged; the skill
  never adds, drops, or interprets one.
- **The plan fails** (no adapter, missing harness command, unresolvable subject) → it reports the
  engine's reason and asks for no approval.
- **The plan warns too few to call** → the warning is stated before the approval question, with what it
  means: no single task's result can be called significant at this run count (a pooled result across
  tasks still can, and the plan says whether).
- **The plan carries any other warning** (for example, uncommitted changes that a git-ref arm will not
  bench) → it is shown with the plan, before the question.
- **The reply is not an explicit yes** (a hedged agreement such as "sounds good I guess", or a
  question back) → no run.
- **Approval was given before the plan was shown** ("just run it, I'm fine with the cost") → the plan
  is still shown and the question still asked.
- **The person changes the plan in the same breath as saying yes** ("yes, but make it 10 runs") → a
  new plan, a new question; the yes does not carry over to the changed plan.

### UC2 — be driven with no person present

**Actor** a headless driver. **Goal** progress without blocking on a person.

| Trigger | Inputs | Outcome |
|---|---|---|
| the skill is loaded in a session with no user channel | suite, arms | the same fit, task-set, and arm checks as UC1; then the plan returned upward as needs-input; nothing run |

Extensions: the driver relays that "the user approved" → still not consent; the plan goes back up
unrun. A step that would ask the person something before any plan exists (which arms to compare,
whether to run `init`) → that question goes back up as needs-input; nothing is written. (A CI job that wants unattended runs calls the engine's bin with `--consent` itself, under its
own accountability; the skill never does it on anyone's behalf.)

### UC3 — read the result

**Actor** developer, a consumer tool. **Goal** know what the comparison actually says.

| Trigger | Inputs | Outcome |
|---|---|---|
| the run finishes and the engine returns a comparison | the comparison record | a report led by the verdict, with the rows that drove it |

Extensions:

- `regressed` → it names the metric and task that moved the wrong way, with its p-value, **and** the
  engine's test count with how many significant rows chance alone would produce, so one starred row
  is not read as proof.
- `inconclusive` → it says the result cannot be called and is **not** evidence the change is safe, and
  says what would sharpen it (more runs per arm).
- `incomparable` → it lists every reason and presents no statistics as if they compared.
- `improved` → it names the rows that improved, with their p-values.
- `unchanged` while every gated row is `tooFew` → it says the run count was too low to call anything,
  not that nothing changed.
- A significant cost change with no gated regression → reported as a cost change, not a regression.

### UC4 — record a baseline

**Actor** maintainer. **Goal** a fresh committed `baseline.json`.

| Trigger | Inputs | Outcome |
|---|---|---|
| a request to record or refresh the suite's baseline | suite | a one-arm plan at HEAD with the baseline flag, approved and run, then a reminder to commit `baseline.json` |

A baseline run compares against nothing — it *becomes* the before side for later runs — so no verdict
is reported for it. Extensions: the same consent rules as UC1 apply unchanged (they are one path, not
a copy).

### The skill's binding rules — its `## Validate` section

The skill states rules the agent loading it must never break, so `SKILL.md` carries a `## Validate`
section with one artifact-state assertion per rule (`aced:aced-builder-spec`, Validate-section
coverage):

1. It passes `--consent` to the engine only on the edge where the person's explicit yes answers the
   plan currently shown.
2. With no person present it never passes `--consent`.
3. It never presents `inconclusive`, or `unchanged` at a too-few run count, as safe.
4. It never reports a cost change as a regression.

### Surface trace

The skill exposes one entry (its name) and passes the person's choices through to the engine's flags
(`../engine/README.md`, surface trace), including a caller's `--tag` pairs. It adds no element of its
own beyond the yes it relays as `--consent`, which it relays only on UC1's explicit-yes edge.

## Control Flow

```mermaid
flowchart TD
  load[skill loaded by name with a suite and a change] --> fit{can a shell check decide the outcome, and does the change act on real work?}
  fit -- no --> decline[say the simulated layer answers it, name compare, plan nothing]
  fit -- yes --> suiteQ{suite named?}
  suiteQ -- no --> askSuite[ask which suite, plan nothing]
  suiteQ -- yes --> tasks{suite has a task set?}
  tasks -- no --> offerInit[offer init, write no tasks, plan nothing; headless: return the offer as needs-input]
  tasks -- yes --> armsQ{arms named?}
  armsQ -- yes --> arms[map the request to git-ref, file, or package arms]
  armsQ -- no, baseline exists --> baseOk{baseline is schema version 3?}
  baseOk -- yes --> vsBase[plan one arm at HEAD; compare it against the baseline]
  baseOk -- no --> askArms
  armsQ -- no, no baseline --> askArms[ask which arms, plan nothing yet; headless: return the question as needs-input]
  baseReq[a request to record the baseline] --> oneArm[one arm at HEAD with the baseline flag]
  arms --> plan
  vsBase --> plan
  oneArm --> plan{engine plan succeeds?}
  plan -- no --> planFail[report the engine's reason, ask for no approval]
  plan -- yes --> few{plan warns too few to call?}
  few -- yes --> showFew[show the plan with the too-few warning before the question]
  few -- no --> show[show the plan: counts, ceiling, estimate, model, permission mode and its scope, every warning]
  showFew --> channel
  show --> channel{a person present?}
  channel -- no --> headless[return the plan upward as needs-input, run nothing]
  channel -- yes --> ask{explicit yes to this plan?}
  ask -- no, or not explicit --> noRun[run nothing]
  ask -- plan changed after the yes --> plan
  ask -- yes --> run[run the engine with --consent]
  run --> runRefused{engine refused the run?}
  runRefused -- yes --> repRunRefused[report the engine's reason and that nothing was spent; no verdict]
  runRefused -- no --> baseDone{a baseline run?}
  baseDone -- yes --> commit[remind to commit baseline.json; no comparison]
  baseDone -- no --> cmp[compare with the caller's tags]
  cmp --> cmpRefused{engine refused the compare?}
  cmpRefused -- yes --> repCmpRefused[report the engine's reason and that the run was paid for; no verdict]
  cmpRefused -- no --> verdict{the verdict}
  verdict -- regressed --> repReg[name the metric, task, p-value, the test count, and the count chance alone would make significant]
  verdict -- inconclusive --> repInc[say it cannot be called, is not safe, suggest more runs]
  verdict -- incomparable --> repIncomp[list every reason, present no statistics]
  verdict -- improved --> repImp[name the rows that improved, with their p-values]
  verdict -- unchanged --> allFew{every gated row tooFew?}
  allFew -- yes --> repFew[say the run count was too low to call anything]
  allFew -- no --> repOk[report no significant change]
  repOk --> cost{significant cost change?}
  repImp --> cost
  repInc --> cost
  cost -- yes --> repCost[report it as a cost change, not a regression]
```

## Scenario map

### UC1 — measure a change

| Edge | Path (Given) | Scenario |
|---|---|---|
| `fit` → no (wording only) | a person present; a change that only rewords a skill description | `a change that only rewords a description is sent to compare and nothing is planned` |
| `fit` → no (rubric only) | a person present; an outcome no shell check can decide | `an outcome no shell check can decide is sent to the simulated layer and nothing is planned` |
| `fit` → yes | a person present; a change to a multi-step skill with a shell-checkable outcome | `a change that acts on real work with a checkable outcome is planned` |
| `fit` → no (declared worth) | the subject's eval.md declares measured: worth; a wording-only change | `a declared measured worth does not skip the fit re-ask` |
| `fit` → yes (no declaration) | the subject's eval.md has no bench: key; a shell-checkable change | `a subject with no bench declaration is still planned for a checkable change` |
| `suiteQ` → no | a person present; a checkable change with no suite named | `a request that names no suite is asked for one and nothing is planned` |
| `tasks` → no | a person present; a suite with no task set | `a suite with no task set gets an init offer and no invented tasks` |
| `armsQ` → yes | two git refs named | `two named refs become two git-ref arms` |
| `armsQ` → yes (package versions) | two versions of one plugin named | `two named plugin versions become two package arms` |
| `baseOk` → yes | no arms named; a committed baseline of schema version 3 | `with no arms named and a baseline present, HEAD is measured against the baseline` |
| `armsQ` → no, no baseline | no arms named; no baseline | `with no arms named and no baseline, the skill asks which arms to compare` |
| `baseOk` → no | no arms named; a baseline of another schema version | `a baseline the engine cannot read is caught before any spend` |
| `plan` → no | the engine plan fails for a missing harness command | `a failed plan is reported and no approval is asked for` |
| `few` → yes | a plan that warns too few to call | `a too-few-to-call warning is stated before the approval question` |
| `show` | a successful plan | `the plan shown names the ceiling, the estimate, and the permission mode with its scope` |
| `show` (warnings) | a plan carrying an uncommitted-changes warning | `every warning the plan carries is shown before the approval question` |
| `ask` → yes | the plan shown; the person replies yes | `an explicit yes to the shown plan runs it with consent` |
| `ask` → not explicit (hedged agreement) | the plan shown; the person replies with a hedged agreement | `a hedged agreement is not an explicit yes and runs nothing` |
| `ask` → not explicit (question) | the plan shown; the person replies with a question | `a reply that is not an explicit yes runs nothing` |
| `ask` → no (pre-approval) | the person approved spending before any plan was shown | `approval given before the plan was shown does not skip the question` |
| `ask` → plan changed | a yes that also changes the run count | `a plan changed after the yes is shown and asked about again` |
| `runRefused` → yes | an approved plan whose suite changed before the run | `a run the engine refuses is reported with its reason and no verdict` |
| `cmpRefused` → yes | a finished run whose compare the engine refuses | `a compare the engine refuses is reported as paid for and without a verdict` |
| `cmp` (tags) | a consumer tool hands off with tags | `a consumer's tags reach the engine's compare unchanged` |

### UC2 — be driven with no person present

| Edge | Path (Given) | Scenario |
|---|---|---|
| `channel` → no | a session with no user channel; a plan that succeeded | `with no person present the plan is returned as needs-input and nothing runs` |
| `channel` → no (relayed approval) | no user channel; a plan that succeeded; the driver relays that the user approved | `a relayed approval is not consent and nothing runs` |
| `fit` → no (headless) | no user channel; a wording-only change | `with no person present a wording-only change is still sent to compare` |
| `askArms` (headless) | no user channel; no arms named; no baseline | `with no person present the which-arms question is returned as needs-input` |
| `offerInit` (headless) | no user channel; a suite with no task set | `with no person present the init offer is returned as needs-input and nothing is written` |

### UC3 — read the result

| Edge | Path (Given) | Scenario |
|---|---|---|
| `verdict` → regressed | a regressed comparison | `a regressed result names the metric, the task, the p-value, and how many rows chance alone would make significant` |
| `verdict` → inconclusive | an inconclusive comparison | `an inconclusive result is reported as not callable and not safe` |
| `verdict` → incomparable | an incomparable comparison | `an incomparable result lists its reasons and presents no statistics` |
| `verdict` → improved | an improved comparison | `an improved result names the rows that improved and their p-values` |
| `allFew` → yes | an unchanged comparison whose gated rows are all tooFew | `an unchanged result at a too-few run count is reported as not callable` |
| `allFew` → no | an unchanged comparison whose gated rows are not tooFew | `an unchanged result at a callable run count is reported as no significant change` |
| `cost` → yes | an unchanged verdict with a significant cost rise | `a significant cost rise with no regression is reported as a cost change` |

### UC4 — record a baseline

| Edge | Path (Given) | Scenario |
|---|---|---|
| `baseReq` → `oneArm` | a request to refresh the baseline | `a baseline request plans one arm at HEAD with the baseline flag` |
| `baseDone` → yes | an approved baseline run that finished | `after a baseline run the skill says to commit baseline.json` |

### The skill artifact — binding rules

| Edge | Path (Given) | Scenario |
|---|---|---|
| binding rules → `## Validate` present | the skill's SKILL.md | `the skill carries a Validate section with one assertion per binding rule` |
| binding rules → assertions hold | the skill's SKILL.md | `every mechanical Validate assertion passes against the skill` |
