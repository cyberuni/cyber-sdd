---
spec-type: behavioral
concept: [sdd-roles]
---

# spec-validator — the spec-judge role

Judge an agent-config `.feature` against the ACED agent-scenario criteria (trigger context, near-miss
balance, rule/edge coverage, boolean form, rubric structure, selection, discrimination, pairwise
consistency) and report a per-scenario verdict. It grades the contract; it never edits it, never runs
or scores the evals, and is not SDD's generic `spec-gate`.

## Use Cases

**Fit:** partial — `spec-validator` is dispatched by name by the conductor at the spec gate and makes
no activation decision of its own, so its trigger layer carries no signal (trigger-balance / near-miss
is N/A for it); its grading judgment and verdict output remain LLM-graded.
**Subject** — when the conductor dispatches it as the spec-judge at the spec gate, it reads the
subject's declared `**Fit:**` tier first (a missing declaration is a `CONTENT_GAP`, never defaulted to
strong; a wrong-squad subject is recused and routed to the SDD-default builder), then grades the
`.feature` against the agent-scenario criteria — applying only the checks the tier carries — and
reports a pass/fail verdict per scenario with the failed check named.
**Non-goals** — writing or fixing the `spec.md` or `.feature` (that is `scenario-writer`); running or
scoring the eval suite (`implementer` / `judge`); the generic SDD `spec-gate` gate check.

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Judge a .feature at the spec gate | dispatched with the `.feature` and the subject text | a pass/fail verdict per scenario; it never edits the spec or feature and never runs an eval |
| Read fit before grading | a subject whose `spec.md` declares a `**Fit:**` tier | it reads the tier and applies only the criteria that tier carries; a missing declaration is a `CONTENT_GAP` (never default to strong) |
| Recuse and route a wrong-squad subject | a subject determined wrong-squad for ACED | it reports the subject recused and routes it to the SDD-default builder + a script harness, rather than a per-scenario verdict |
| Check trigger context | a firing scenario built on a vague stand-in | that scenario is reported failing on trigger-context |
| Check rule + edge coverage | an uncovered rule, or fewer than three guard scenarios | the suite is reported failing on rule-coverage / edge-coverage |
| Check trigger balance (tier-conditional) | a **strong-fit** suite with no near-miss | reported failing on trigger-balance; a **partial-fit** suite with no near-miss **passes** (N/A) |
| Check boolean form | an **untagged** `Then` embedding a rubric/threshold/score | that scenario is reported failing on boolean-form |
| Check rubric structure | a `@rubric` scenario | a well-formed one (dimensions + per-dimension max + one threshold + collapsing `Then`, no double-barrel) is accepted **on structure**; a malformed one fails before scoring — passing structure is never acceptance |
| Check selection (before discrimination) | every `@rubric` dimension | a non-substitutable criterion (incl. a boolean **same-object** smuggle) fails selection; a rulable-reject trade fails (not escalated); only an unrulable trade escalates; the producer's recorded trade is neither the object nor a rescue; a failing dimension is **not** remedied by a per-dimension minimum |
| Check discrimination | every scenario and every `@rubric` dimension | one no plausible wrong config / config-quoting memorizer fails (presence / restatement / procedure, memorizer-banks-to-bar, single-brancher, empty-file-clears-nothing) is reported failing; a clearance by one point is not failed on the margin alone; an unclassifiable scenario is escalated, not passed |
| Check pairwise consistency | two scenarios sharing a `When` | contradiction on one constructible snapshot fails the suite; overlap with agreeing `Then`s, different operations, or a generic/specific exception do not |
| Pass a clean suite | a `.feature` meeting every criterion | every scenario reported passing, no blocker |
| Report and guard | failures found, or a null subject | each failing scenario named with its failed check; a null subject returns needs-input rather than an invented contract |

## Control Flow

Read the declared `**Fit:**` tier first — missing → `CONTENT_GAP` (never default strong); wrong-squad →
recuse and route to the SDD-default builder + script harness (do not grade); null subject →
needs-input. Otherwise grade every scenario against the tier-conditioned criteria: trigger-context
(firing only), rule-coverage, trigger-balance (strong only), edge-coverage, boolean-form (untagged),
and for `@rubric` scenarios the ordered rubric pipeline — **structure → selection → discrimination**.
Selection runs before discrimination and has no second reader; rule when you can and escalate only the
unrulable; never remedy a bad dimension with a per-dimension minimum. Discrimination fails what no
plausible wrong config misses (the config-quoting memorizer) but never fails a rubric for a one-point
clearance (cSEM), and escalates the unclassifiable rather than passing it. Read the suite for pairwise
contradictions. Report each failing scenario by name with its check; never edit the spec or feature.

```mermaid
flowchart TD
  A[Conductor dispatches cold at the spec gate: .feature + SUBJECT] --> B{SUBJECT readable?}
  B -- null --> X1[needs-input: never invent the contract]
  B -- yes --> C{declared Fit tier?}
  C -- missing --> X2[CONTENT_GAP; never default to strong]
  C -- wrong-squad --> X3[Recuse + route to SDD-default builder + script harness; do not grade]
  C -- strong/partial --> D[Grade every scenario against the tier-conditioned criteria]
  D --> E[trigger-context: firing scenarios need a concrete situation;\npartial-fit has no firing scenarios, so it does not bind]
  E --> F[rule-coverage / edge-coverage / trigger-balance strong-only / boolean-form untagged]
  F --> G{@rubric scenario?}
  G -- yes --> H[rubric-structure: dimensions + per-dim max + one threshold + collapsing Then, no double-barrel]
  H --> I[selection BEFORE discrimination]
  I --> I1{substitutable trade?}
  I1 -- no --> J1[FAIL selection: same-object boolean smuggle / non-tradeable;\nrule reject when you can; do NOT prescribe a per-dimension minimum]
  I1 -- unrulable --> J2[Escalate: cannot classify; not a pass]
  I1 -- yes --> K[discrimination]
  G -- no --> K
  K --> K1{a plausible wrong config registers a miss?}
  K1 -- no --> L1[FAIL discrimination: presence / restatement / procedure / memorizer-banks-to-bar / single-brancher; empty file clears nothing]
  K1 -- unclassifiable --> L2[Escalate rather than pass]
  K1 -- yes --> M[Pass; a one-point clearance is NOT failed on the margin alone cSEM]
  J1 --> N[pairwise-consistency across the suite]
  J2 --> N
  L1 --> N
  L2 --> N
  M --> N
  N --> N1{two When-sharing scenarios, opposite verdicts on one snapshot?}
  N1 -- yes, no intended winner --> O1[FAIL suite on pairwise-consistency; name both]
  N1 -- generic/specific, agree, or different ops --> O2[Not a contradiction]
  O1 --> P[Report each failing scenario by name + failed check; never edit spec/.feature]
  O2 --> P
```

## Scenario map

Every scenario binds 1:1 to a CFG edge.

| Edge | Path (Given) | Scenario |
|---|---|---|
| dispatched → per-scenario verdict | dispatched with a .feature + its subject | `dispatched as the spec-judge it reports a verdict` |
| never edits spec/feature | a failing scenario is found | `it never edits the spec or the feature` |
| does not run/score evals | inline @rubric scenarios present | `it does not run the eval suite` |
| read fit before grading | spec.md declares a fit tier | `it reads the declared fit tier before grading` |
| missing fit → content gap | spec.md declares no fit tier | `a missing fit declaration returns a content gap` |
| wrong-squad recused | subject determined wrong-squad | `a wrong-squad subject is recused rather than graded` |
| wrong-squad routed | subject determined wrong-squad | `a recused wrong-squad subject is routed to the SDD-default builder` |
| vague stand-in fails trigger-context | a situation saying only "a file" | `a vague stand-in fails trigger-context` |
| partial-fit trigger-context N/A | a partial-fit suite asserting no firing | `a partial-fit subject with no firing scenarios passes trigger-context` |
| uncovered rule fails rule-coverage | a rule no scenario exercises | `an uncovered rule fails rule-coverage` |
| strong no near-miss fails trigger-balance | strong suite, only irrelevant negatives | `a missing near-miss fails trigger-balance for a strong-fit subject` |
| partial no near-miss passes | partial suite, no activation decision | `a partial-fit suite with no near-miss passes trigger-balance` |
| too few guards fail edge-coverage | only two guard scenarios | `too few guards fail edge-coverage` |
| leaked grade fails boolean-form | untagged Then earning a graded value | `a leaked grade in an untagged scenario fails boolean-form` |
| well-formed rubric passes structure | dimensions + max + threshold + collapse | `a well-formed @rubric scenario passes rubric-structure` |
| malformed rubric fails structure | missing threshold or dimensions | `a malformed @rubric scenario fails rubric-structure` |
| double-barreled fails structure | one dimension scoring two criteria | `a dimension naming two criteria fails rubric-structure` |
| non-substitutable fails selection | a criterion no strength pays for | `a dimension scoring a criterion no strength elsewhere pays for fails selection` |
| genuine trade passes selection | dimensions a reviewer would trade | `a rubric whose dimensions a reviewer would genuinely trade passes selection` |
| rulable-reject fails, not escalated | an arguable trade it can reject | `an arguable trade the judge can rule against is ruled on, not escalated` |
| unrulable escalated, not passed | a trade it can rule neither way | `a trade the judge can rule neither way on is escalated rather than passed` |
| recorded trade does not rescue | a recorded trade for a rejected dim | `a recorded trade does not rescue a dimension the judge rejects on its own` |
| recorded trade not the object | a recorded trade, dims re-derived good | `the producer's recorded trade is not the judge's object of selection` |
| same-object smuggle fails selection | a dim re-grading a boolean's property | `a dimension re-grading a property a boolean scenario in the same suite decides fails selection` |
| shared criterion, no twin passes | two dims share a criterion, no boolean | `two dimensions sharing a criterion with no boolean twin pass selection` |
| no per-dimension-minimum remedy | a dim reported failing on selection | `a failing dimension is not remedied by a per-dimension minimum` |
| memorizer scores all max fails | every dimension a memorizer maxes | `a well-formed @rubric whose every dimension a memorizer scores at max fails discrimination` |
| terms from vocab fail (restatement) | dimension terms lifted from the config | `a rubric dimension drawn from the subject's own vocabulary fails discrimination` |
| memorizer floor reaches bar fails | free dimensions carry the memorizer to the bar | `a memorizer floor reaching the bar on free dimensions alone fails discrimination` |
| untagged no-wrong-config fails | every wrong config passes it | `an untagged scenario that no plausible wrong configuration fails is reported on discrimination` |
| grades procedure fails | scores that steps were followed | `a dimension grading that the steps were followed fails discrimination` |
| single-brancher always-passes fails | a config always taking one branch passes | `a scenario a single-brancher configuration always passes fails discrimination` |
| empty file clears nothing | only an empty file fails it | `an empty configuration does not clear discrimination` |
| loseable rubric passes | a dimension a memorizer scores below max | `a loseable rubric passes discrimination` |
| grades presence fails | scores that a required line is present | `a dimension grading mere presence fails discrimination` |
| one-point clearance not failed on margin | honest score clears by one point | `a rubric clearing the bar by a single point is not failed on the margin alone` |
| unclassifiable escalated not passed | can name neither a wrong config nor its absence | `a scenario whose discriminability cannot be classified is escalated not passed` |
| contradiction fails pairwise | shared When, opposite verdicts, one snapshot | `two scenarios contradicting on one snapshot fail pairwise consistency` |
| overlap agreeing passes | shared When, Thens agree | `overlapping Givens whose Thens agree pass pairwise consistency` |
| different operations pass | Whens name different operations | `two scenarios naming different operations pass pairwise consistency` |
| specialization passes | narrower Given carves an exception | `a specific scenario carving an exception from a general sibling passes pairwise consistency` |
| clean suite passes all | a .feature meeting every criterion | `a clean suite passes every criterion` |
| failures named with the check | two scenarios failing different criteria | `failures are reported by name with the failed check` |
| null subject → needs-input | the subject text is null | `a null subject returns needs-input` |
