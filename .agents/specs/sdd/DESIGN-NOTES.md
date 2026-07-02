# SDD redesign — design notes

> **SUPERSEDED — historical record, not the working model.** These are the original CR #34
> (<https://github.com/cyberuni/cyberplace/issues/34>) design-discussion notes, kept for
> provenance. The working model is now the root [`spec.md`](./spec.md) narrative + the
> [`design/`](./design/) rules + the capability folders. The model evolved past these notes
> during the post-review cleanup; where this doc disagrees with the spec tree, **the spec
> tree wins.**
>
> **What changed since these notes** (CR #34 post-review cleanup):
> - **No spec graph.** `subtasks` (composition) and `blocked-by` (dependency) were both
>   removed — the spec is flat, not a graph. The "structural axis derived from graph edges /
>   `root` vs `composite`" idea below is **dead**; one project is one spec. Cross-project
>   execution ordering lives in the source tracker, not in frontmatter.
> - **No `priority` field.**
> - **`type` → `artifact-types`** (plural): a project spans many artifact-types and squads
>   resolve **per file** — not one spec-`type` matched against `domains[]`. ("One squad per
>   spec" below is superseded by "one squad per artifact-type, one producer per file".)
> - **Plans are tracked, not gitignored** — committed with the work, distilled then deleted
>   from the tree at retro (durable in git history). The combat log is no longer "ephemeral".
> - The `corpus/` `sdd-spec-graph` + `dag-tooling` entries in the skeleton below are **gone**.

These notes capture the full design discussion so the CR's grilling phase had every
detail, even where the issue body was terse. Not a spec.

## Core reframe — the abstraction stack

Each layer is an abstraction of the one below; every layer matters and stays maintained.

- **outcome** — what actually happens.
- **code** — abstraction of outcome. Still real, still maintained, still statically
  analyzable by engineers, security specialists, and agents.
- **spec + behavior suite** — abstraction of code. What humans read to know what the
  project *is* and does.
- **change-request (CR)** — abstraction of the behavior suite. The intent you *grill*
  into concrete deltas to spec + suite (and from there, code).

## Unit = the project, not the feature

- **One durable spec per project.** A project = repo harness, agent config, npm package,
  website, or an individual package inside a monorepo.
- Size is solved by **organizing into files/folders**, NOT by splitting into smaller
  sibling specs. The spec is a directory tree. The spec-fleet (one frozen spec per
  feature) was the disease — it caused cross-cutting ripple and repeated approvals.
- The **behavior suite** is part of the project spec, organized as:
  - an **e2e suite** — the project's outcome-level contract (the important scenarios);
  - **unit suites** — for the smaller internal pieces.
  - (This is the old project/feature behavior split surviving as *test organization
    within one corpus*, not as separate lifecycles to re-gate.)
- `.feature` is **part of the behavior suite**, never part of the CR.

## The squad / specialist model

- The producer/judge selection unit is the **squad**, keyed by **artifact-type**:
  `artifact-type → { producer, judge, governances (actor + discipline), model, effort }`.
- **One squad per spec.** No domain arrays, no producer composition, no "best match"
  producer race, never two producers on the same file.
- Disciplines (process/workflow) fold into governances. "Basic knowledge" (react, TS,
  logic) is never *loaded* — it is just picking the right **model + effort**.
- **Language ≠ squad.** "TS script for a skill" lives inside the *skill* squad
  (skill-script rules: no deps unless packaged), NOT a generic `code` squad. The
  artifact-in-context determines the knowledge, not the file extension.
- A **specialist** = a producer + judge squad. A CR summons the specialists for the
  artifact-types it touches; the **operator** orchestrates them and delivers.
- Naming idea: collapse `domain-type` into `type`, and let `type` name the artifact /
  squad (`npm-package`, `agent-plugin`, `agent-skill`, `agent-definition`,
  `react-component`, `docs`, …). The structural axis (`project|feature`) is then
  **derived from graph edges** — root = nothing parents it; composite = has `subtasks`
  — not declared. "Project owns no behavior beyond composition" becomes a DRY
  consequence of *having children*, not a declared type.
- `domain-plugin` stays **distinct** from `produced-by`: `domain-plugin` = chosen plugin
  for an ambiguous artifact-type (forward input to resolution); `produced-by` = who
  actually produced each artifact (after-the-fact record). The produced-by cutover
  wrongly conflated them. (This was the original `sdd-plugin` impl-gate blocker.)

## The Mission Loop (steps 1–4) + post-mission outer loops

The **Mission Loop is steps 1–4** — one cycle = one CR carried to completion. **Step 5 is
post-mission**: the 4 outer loops are *not* part of the Mission Loop.

1. **intake** — a CR from a prompt, Asana, Jira, Linear, GitHub, or the local store. The
   *only* work-intake. The CR subsystem **feeds** the mission; it is not "step 1 inside" it.
2. **explore (build to learn)** — grill the CR → spec + suite diff. May need human, but
   **self-clears** when the agent can confidently generate a good diff. Spikes are thrown
   away and intermediate results are shown to steer the contract. Runs the shared `authoring/`
   capability (human-driven or mission-driven). Ends at the spec gate (freeze).
3. **deliver (build to keep)** — build against the **frozen** suite. The operator serves
   **expansion and minor fixes** in-flight (not the human), recorded in a
   **detail-adjustment report** (a view of the combat log). Human enters only on the hard
   floor. Ends at the impl gate.
4. **handoff** — take step-3's verified result and land it in the **project-declared
   delivery shape**: commits broken down by unit of work committed/merged to `main`; or a
   branch pushed → PR; or a written chapter; etc. (Verb; the *outcome* is the noun.)

**Post-mission (step 5):** once a cycle completes, the 4 outer loops run; any further change
re-enters as a **new CR**. Only explore and deliver iterate *internally* (inside a cycle);
the outer loops fire across cycles.

## The human gate dissolves into the autonomy bar

- There is **no mandatory approval station**. Every write to spec/suite — the initial
  diff (step 2) or an in-flight adjustment (step 3) — passes **one arbiter**: the
  autonomy self-clear-vs-escalate rubric.
- The human is an **escalation target the bar invokes**, not a fixed checkpoint. Humans
  decide *what to build* by raising the CR and reading the outcome/retro — not by gating
  each transition. This fully realizes the north-star (maximize agent autonomy via
  governance to assess risk; humans only decide what to build).

## Hard floor — the only mandatory human escalations (two kinds)

- **Authorization** — a breaking change = **narrowing or deleting an e2e scenario** /
  breaking a published contract (one category — breaking *is* narrowing). Escalates for
  human **acknowledgment**, UNLESS the CR pre-authorizes it (stated explicitly in the CR,
  or acknowledged during grilling). **Overridable and payable in advance**, so it never
  has to halt mid-flight.
- **Resolution** — a **logical contradiction inside the suite** (Scenario A says yes while
  Scenario B says no). Human disambiguates which is intended. **Not pre-authorizable** —
  a defect, not a choice. (Softening: an obvious stale-mistake contradiction is an
  operator-served minor fix; escalate only when both sides are plausibly intended.) This
  is the only thing that truly halts implementation unexpectedly — reduce it by grilling
  harder in step 2.
- Everything **additive / internal / minor self-clears**.
- There is **no** separate delivery-layer floor for irreversible execution acts
  (force-push, data loss, history rewrite) — those were rejected as bad examples.

## The 4 outer loops (step 5)

A **complete cover** of what a retrospective can decide needs to change. Each emits its
findings as a **new CR** — so the outer loops are CR-generators that close the
single-intake loop. Nothing re-enters the system except as a CR (human- or loop-raised).

| Loop | Concern | Spec | Status |
|---|---|---|---|
| product / **campaign** | what the project delivers | `sdd-campaign-loop` | draft |
| structure / **formation** | how the corpus is organized | `sdd-formation-loop` | implemented |
| process / **doctrine** | how we work (strategy, workflow) | `sdd-doctrine-loop` | implemented |
| field / **forge** | improve **SDD itself** from opt-in end-user field corrections | `sdd-forge-loop` | draft |

Campaign/formation/doctrine are **internal** (the project's own combat logs); **forge is
external** (opt-in end-user corrections across installations, Consent-gated). **Mission is the
INNER loop** (per-CR execution), not one of the four.

## Migration (this CR)

- Redo the SDD spec + suite **in one shot** under `artifacts/specs/sdd`, organized so it
  can be **approved at the spec gate** (step 2). Consolidates the current ~40 scattered
  specs.
- **Follow-up after the spec gate:** decide whether to update `plugins/sdd/` **in-place
  in one go**, or **archive it and create a fresh** plugin from the new spec.

## Organization of `artifacts/specs/sdd` (the skeleton)

**Invariants (these are what prevent the old spec-fleet problem):**

- `artifacts/specs/sdd` is **ONE spec, ONE behavior suite, ONE gate/freeze baseline**.
  Folders are **views, never lifecycle units** — no folder ever gets its own `status`,
  approval, or freeze. The fleet problem was lifecycle fragmentation, not folder count.
- Organized by **screaming architecture** (top-level folders = SDD capabilities), with two
  exceptions: `design/` (the abstract idea / rules) and `acceptance/` (the outcome contract).
- **Rule-in-design + behavior-in-capability**: the lifecycle schema, the autonomy rubric,
  and the provenance shape live in `design/` as *rules*; the behaviors that *enact* them
  live in the capability folders.
- **Scenarios**: unit scenarios **colocate** with their capability folder; **acceptance**
  (e2e, cross-capability outcome) scenarios live in `acceptance/`.

**Top-level skeleton:**

```
artifacts/specs/sdd/
  spec.md            # root: what SDD is + capability map + index (gate-readable top)
  DESIGN-NOTES.md
  design/            # THE ABSTRACT IDEA (rules / model)
    abstraction-stack.md          # outcome <- code <- spec+suite <- CR
    loops.md                      # Mission Loop (steps 1-4: intake->explore->deliver->handoff) + 4 post-mission outer loops
    unit-and-organization.md      # project = unit; one spec; files/folders, not a fleet
    actors-and-governance.md      # <- governance-composition; refs motive-model (external)
    lifecycle-model.md            # states, transitions, gates, freeze (the schema/rules)
    autonomy-rubric.md            # <- autonomy-governance — the hard floor (the bar)
    provenance-model.md           # <- sdd-provenance shape (two-face combat log)
    specialists-and-squads.md    # <- squad model (artifact-type -> {producer,judge,governances,model,effort})
                                  #    + sdd-contract-registry SHAPE (role map / file format)
    suite-style.md                # <- rubric-gherkin
  gateway/           # the UNIVERSAL ROUTER/DOOR (not a loop step)
                     #    <- sdd-skill: classify + routing table (= the user-skill->capability index)
  intake/            # the CR SUBSYSTEM (feeds missions; step 1)
                     #    <- sdd-change-request, sdd-escape-hatch, sdd-inject-channel
                     #    the CR: sources (prompt/Asana/Jira/Linear/GitHub/local store + beads?), escape, inject
  authoring/         # the SHARED authoring capability (create-spec / revise-spec); owns the SPEC GATE
                     #    EXPLORE (step 2): driven by a human directly OR by the mission autonomously
  mission/           # the AUTONOMOUS ORCHESTRATOR (the operator) — Mission Loop steps 1-4
                     #    <- sdd-operator (+segment/explore/deliver/dispatch), sdd-mission-loop,
                     #    contract-registry READ (resolution), sdd-stop-provenance (halt-recording);
                     #    invokes authoring/ for explore; owns the IMPL GATE (verify vs acceptance/ + unit)
    deliver/         # DELIVER (step 3): build to keep against the frozen suite
    handoff/         # HANDOFF (step 4): land the verified result in the project-declared delivery
                     #    shape (commits to main / branch->PR / prose chapter). Mostly NEW content.
  corpus/            # <- sdd-spec-discovery, sdd-spec-graph + dag-tooling, sdd-spec-digest,
                     #    sdd-dedupe-specs, sdd-split-spec
  campaign/          # <- sdd-campaign-loop   (product — outer loop)
  formation/         # <- sdd-formation-loop + sdd-warden   (structure — outer loop)
  doctrine/          # <- sdd-doctrine-loop   (process — outer loop)
  forge/             # <- sdd-forge-loop   (FIELD — external outer loop; improve SDD itself)
  plugin/            # SDD's plugin nature: ships-as-plugin (manifest) + extended-by-plugins
                     #    (plugin contract = 5 roles) + contract-registry init-WRITE. Has a suite.
  acceptance/        # the e2e behavior suite (consumed by mission's step-3 verify, NOT a step)
```

The three **internal** outer loops evolve a standing subject — campaign→capabilities,
formation→`corpus/`, doctrine→`design/`. **forge is the one external loop**: it improves
**SDD itself** from opt-in, cross-installation end-user field corrections (Consent-gated); it
has **no folder subject**. The old `harness/` folder (a project's toolchain/CI/distribution)
is **dropped** — outside SDD, no dedicated loop; toolchain/CI/contribution live in the repo's
own config, referenced not specced.

**`gate/` dissolves** (gates are not a fixed station — they dissolved into the autonomy
bar). The gate *rules* (legal-state transitions `sdd-state-legality`, freeze
`freeze-alignment`, accountability `sdd-gate-autonomy`) live in `design/lifecycle-model.md`
+ `design/autonomy-rubric.md`. The spec-gate *behavior* folds into `authoring/`; the
impl-gate *behavior* folds into `mission/`. Invariant to keep in prose: producer/judge
role separation survives the fold (the judge stays a distinct actor).

The Mission Loop (steps 1-4) maps to folders: **intake** (1, the CR subsystem feeding the
loop) -> **authoring** (2, explore; owns spec gate; invoked by the mission) ->
**mission/deliver** (3, build to keep; owns impl gate; verifies vs `acceptance/` + unit) ->
**mission/handoff** (4, landing). **mission/** is the autonomous orchestrator sequencing the
loop; **gateway/** is the universal router/door (not a step). The 4 outer loops fire
**post-mission** (step 5), not inside the Mission Loop. `design/`, `corpus/`, `plugin/`,
`acceptance/` are cross-cutting — not loop steps.

- **`autonomy-rubric-harness`** folds in: the rubric *bar* is `design/autonomy-rubric.md`;
  its deterministic helper + golden suite become the autonomy rubric's scenarios
  (colocated near the rule / in `acceptance`).
- **`mission/` is the autonomous orchestrator (steps 1-4)** run by the operator — distinct
  in *nature* from the human-interactive face of `authoring/` and from the 4 post-mission
  outer loops. It owns `mission/deliver/` and `mission/handoff/`, invokes `authoring/` for
  explore, and is fed by `intake/`.
- **`contract-registry` splits three ways**: SHAPE -> `design/specialists-and-squads.md`;
  init-WRITE -> `plugin/`; READ/resolution -> `mission/`.
- **`mission/handoff/` (step 4) ≠ `sdd-operator-deliver`**: the latter is the operator's
  produce *phase inside* step 3 (`mission/deliver/`, build to keep); `mission/handoff/` is
  what happens to the verified result.

**Scope** — IN: all `sdd-*` core + `autonomy-governance`, `governance-composition`,
`rubric-gherkin`, `freeze-alignment`, `autonomy-rubric-harness`. OUT (own project specs):
`aced-*`, `define-skill`, `universal-plugin`, `motive-model` (referenced, not folded).
Dead: `sdd-orchestrator`, `aced-spec-designer-composition`.
