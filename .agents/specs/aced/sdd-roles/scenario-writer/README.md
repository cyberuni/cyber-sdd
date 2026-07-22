---
spec-type: behavioral
concept: [sdd-roles]
---

# scenario-writer — the spec-producer role

Author the `spec.md` body and a `.feature` for one agent-config artifact (skill, subagent, command, or
AGENTS.md section): boolean scenarios for deterministic behavior, `@rubric` scenarios (dimensions +
threshold inline in the `Then` docstring) for graded behavior, and a `@trigger` `Scenario Outline` for
activation. The rubric is authored **inline** in the frozen `.feature` — there is no separate golden set.

## Use Cases

**Fit:** partial — `scenario-writer` is dispatched by name by the conductor in explore and makes no
activation decision of its own, so its trigger layer carries no signal (trigger-balance / near-miss is
N/A); its authoring judgment and output remain LLM-graded.
**Subject** — when the conductor dispatches it in explore for one agent-config artifact, it classifies
the subject's **fit tier first**, writes the `spec.md` body (Use Cases + the four sections on a
backfill), and authors the sibling `.feature`: boolean scenarios for deterministic behavior, `@rubric`
scenarios (dimensions + threshold inline in the `Then` docstring, each dimension able to register a
miss) for graded behavior, and a `@trigger` `Scenario Outline` for a strong-fit subject's activation
cases — the rubric frozen inline, no separate golden set.
**Non-goals** — grading the suite (that is `spec-validator`); running the evals (`implementer`);
scoring one simulated case (`judge`); writing the control frontmatter (`status`, `project-path`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Produce a spec for an artifact | dispatched as the spec-producer with a subject (or null for a new one), trigger surface, and any user input | it writes the `spec.md` body and a sibling `.feature` (rubric inline, no golden set), leaving control frontmatter untouched |
| Classify fit first | any dispatched subject | it classifies the subject's fit tier and declares it as a `**Fit:**` line in `## Use Cases` **before** authoring scenarios |
| Recuse a wrong-squad subject | a subject that is a deterministic engine with no activation decision | it recuses, authoring **no** `.feature`, and recommends the SDD-default builder + a script harness |
| Frame the use cases | the subject's trigger surface and rules | the `spec.md` carries a `## Use Cases` section with Subject + Non-goals, enriched for the gate reader |
| Cover triggering by tier | the subject's intended trigger surface | a **strong-fit** subject gets should-trigger + same-keyword near-miss scenarios; a **partial-fit** subject gets **no fabricated near-miss** |
| Give every scenario a situation | each scenario it authors | every scenario carries concrete trigger context — who the user is, what they said, the state of the tree — enough to simulate blind |
| Cover the rules and guards | each major rule/step and each prohibited behavior | each rule gets at least one behavior scenario and each prohibition a boolean must-not-do `Then` |
| Author graded behavior inline, discriminating | a non-deterministic subject whose quality is graded | graded scenarios are `@rubric` with dimensions + threshold in the `Then` docstring; each dimension can register a miss; presence / restatement / procedure are never dimensions |
| Structure → select → discriminate a rubric | a candidate rubric dimension | a double-barreled dimension is split first; a non-substitutable rule stays a boolean; a property a boolean already decides is kept out of the compensatory sum |
| Author activation as an outline | a strong-fit subject's representative queries | a `@trigger` Scenario Outline whose `Examples` table carries one row per query with its `should_trigger` value |
| Re-derive a backfill from the CFG | an existing subject with a standing `.feature` | it re-derives the scenario set from the configuration's control-flow edges, treating the standing suite as reference only, never the baseline to patch |
| Keep the suite self-consistent | two scenarios sharing a `When` | it never returns two demanding opposite verdicts on one constructible snapshot; it narrows one `Given` |
| Surface missing intent | intent that cannot be read or inferred | it returns a content gap instead of inventing the behavior |
| Revise on judge feedback or unclear input | spec-judge failures from a prior pass, or ambiguous inputs | it revises only the named scenarios, or returns batched questions when it cannot proceed |

## Control Flow

Classify the subject's fit tier first (**strong** / **partial** / **wrong-squad**), and recuse a
wrong-squad engine with no `.feature`. Otherwise write the `spec.md` body (the four sections mandatory
on a backfill) and author the `.feature` from the subject's control flow — on a backfill re-derived
from the CFG's edges, the standing suite reference-only. Each scenario carries concrete trigger context;
strong-fit subjects get a `@trigger` outline with should + near-miss rows, partial-fit none. Every rule
gets a behavior scenario, every prohibition a boolean must-not-do. Graded behavior becomes a `@rubric`
only after structure → selection → discrimination (split double-barreled, keep non-substitutable rules
boolean, ensure every dimension registers a miss). Read the scenarios against each other before
returning; surface uninferable intent as a gap and ambiguous input as batched questions; on a revision
pass, edit only the named scenarios.

```mermaid
flowchart TD
  A[Conductor dispatches in explore: SUBJECT or null] --> B[Read the subject: trigger surface, rules, prohibitions]
  B --> C{fit tier?}
  C -- wrong-squad --> X1[Recuse: no .feature, recommend SDD-default builder + script harness]
  C -- strong/partial --> D[Declare the Fit line in Use Cases BEFORE authoring]
  D --> E[Write spec.md body: Use Cases + Non-goals, enriched]
  E --> F{backfill?}
  F -- yes --> F1[spec.md mandates ALL four sections:\nControl Flow CFG + Scenario map, never stop at Use Cases]
  F1 --> G1[Re-derive scenario set from the CFG's edges;\nstanding .feature / retired golden set = reference only]
  F -- no --> G2[Derive scenario set from the subject's control flow]
  G1 --> H[Every scenario carries concrete trigger context]
  G2 --> H
  H --> I{tier gates triggers}
  I -- strong --> J1[@trigger Outline: should + same-keyword near-miss rows]
  I -- partial --> J2[No fabricated near-miss]
  J1 --> K[One behavior scenario per rule; edge cases;\nevery prohibition a boolean must-not-do Then]
  J2 --> K
  K --> L{criterion form?}
  L -- deterministic --> M1[boolean Then]
  L -- graded --> M2[Split double-barreled dimension]
  M2 --> M3{substitutable trade?}
  M3 -- no --> M1
  M3 -- yes --> M4[Author as @rubric dimension;\nevery dimension must register a miss;\nno presence/restatement/procedure;\nkeep boolean-decided properties out]
  M1 --> N[Read scenarios against each other:\nno When-sharing pair with opposite verdicts on one snapshot]
  M4 --> N
  N --> O{intent readable?}
  O -- no --> X2[CONTENT_GAP: do not invent]
  O -- ambiguous --> X3[needs-input: batched QUESTIONS]
  O -- yes --> P{JUDGE_FEEDBACK?}
  P -- yes --> Q[Revise only the named scenarios; leave the rest unchanged]
  P -- no --> R[Return the spec.md + .feature]
  Q --> R
```

## Scenario map

Every scenario binds 1:1 to a CFG edge.

| Edge | Path (Given) | Scenario |
|---|---|---|
| writes both artifacts | the conductor dispatches for a named skill | `dispatched as the spec-producer it writes both artifacts` |
| never writes control frontmatter | dispatched for an artifact | `it does not write the control frontmatter` |
| does not grade its own suite | scenario-writer has just written a .feature | `it does not grade the suite it produced` |
| rubric inline, no golden set | a graded-behavior artifact | `it authors the rubric inline in the .feature, not a separate golden set` |
| classify + declare fit first | any dispatched subject | `the fit tier is classified and declared before scenarios are authored` |
| wrong-squad recuses | a deterministic engine with assertable output | `a wrong-squad subject is recused with no feature` |
| spec carries Use Cases | a subject with readable trigger surface + rules | `the spec carries a Use Cases section` |
| spec enriched for the reader | a multi-step-workflow subject | `the spec is enriched for the gate reader` |
| backfill mandates all four sections | an existing subject being backfilled | `a backfilled spec carries all four sections` |
| every scenario carries context | a subject whose situations are readable | `every scenario it writes carries concrete trigger context` |
| pairwise self-consistency | two drafted scenarios sharing a When | `two scenarios sharing a When never demand opposite verdicts` |
| backfill re-derives from CFG | an existing subject with a standing .feature | `on a backfill the scenario set is re-derived from the CFG` |
| strong-fit triggers both ways | a strong-fit skill firing only on stage+commit | `a strong-fit subject covers triggering both ways` |
| triggers as a @trigger outline | a strong-fit subject with representative queries | `trigger cases are authored as a @trigger Scenario Outline` |
| partial-fit no fabricated near-miss | a partial-fit mechanical procedure | `a partial-fit subject gets no fabricated near-miss` |
| one behavior scenario per rule | a subject listing three distinct rules | `every major rule gets a behavior scenario` |
| prohibition gets a must-not-do | a subject forbidding "git add -A" | `a prohibited behavior gets a must-not-do guard` |
| graded @rubric, deterministic boolean | a graded non-deterministic subject | `a graded subject uses @rubric while a deterministic one stays boolean` |
| prohibition asserted as boolean Then | a subject forbidding a specific action | `a prohibited behavior is asserted as a boolean Then` |
| boolean-decided property out of rubric | a subject whose suite already decides a property | `a property a boolean scenario in the suite decides is kept out of the rubric` |
| structure: split double-barreled | a dimension name bundling two properties | `a double-barreled dimension is split before it is selected` |
| selection: non-substitutable stays boolean | a rule nobody would trade for | `a non-substitutable rule stays a boolean not a dimension` |
| discrimination: every dimension misses | authoring a @rubric for a graded subject | `every dimension can register a miss` |
| uninferable intent → gap | a subject omitting when it fires | `uninferable intent returns a content gap` |
| ambiguous input → batched questions | input too ambiguous to author against | `ambiguous input returns batched questions` |
| revise only the named scenarios | spec-judge feedback naming two failures | `judge feedback revises only the named scenarios` |
