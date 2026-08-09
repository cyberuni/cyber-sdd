---
status: implemented
project-path: plugins/sdd
approval:
  spec:
    verdict: approve
    by: unional
    cause: dimension
    why:
      floor: none — the CR's net diff against `main` is ADDITIVE (8 added / 0 modified / 0 removed, confirmed mechanically by `classify-edit-class`), so the already-`@frozen` `handoff.feature` self-clears and stays frozen; nothing narrowed, no Clearance owed. The in-CR retraction of the superseded round-2 draft is invisible in the net diff and touched no agreed contract — `main` carries none of those 11 scenarios, they were pure additions on this branch, never gated, never a ledger line
      blast: low — one behavioral node's follow-up subsection (`mission/handoff/`) plus additive scenarios on its own suite. It reuses the existing follow-up channel end to end (record / classify / propose / drain unchanged), adds no stage, no class, no second channel, and no mechanical check. Two adjacent questions are held OUT of scope precisely to keep the blast here: where the declared vocabulary is stored, and the sweep engine itself — pulling either in would make this an engine CR past `auto-spec`
      novelty: low — a ratified doctrine KEEP (retro row CR-6, cyberlegion `strategy.dae416` seq:1), codification only. Option C reuses CR-5's shipped pattern (a declared registry plus a corpus-wide sweep over tracked files) rather than inventing a mechanism; same plumbing, different trigger
      confidence: high — cold `sdd-spec-judge` returned ALIGNED true with oracle/builder/architect all PASS, no blocker, no failing scenario, no content gap. The judge ran the miss test per scenario and named a plausible losing wrong subject for all 8; checked pairwise consistency against all 44 standing scenarios, including the classify triad that shares the classify `When`; and re-verified the rule's soundness against REAL corpus data rather than the plan's account (commit `55863653` and a live grep of the cyberlegion spec tree still showing the term in three frozen suites). Two earlier rounds were blocked and their rules struck by Council, so this is round 1 on the ruled rule, not round 3 on one rule. The fold bar is met: closed form stated before the CFG, each conjunct its own decision node, four guard scenarios each broken by a distinct mutation, and the no-term negative as the safety dual. `check:spec` 6/6, `pnpm verify` 35/35
  impl:
    verdict: approve
    by: unional
    cause: dimension
    why:
      floor: none — the frozen `retired-terms.feature` was never touched after the spec gate froze it; every delivery commit changed only the engine, its test, the skill docs, the seeded registry, the root check chain, and the one readme the guard's first run caught
      blast: medium — one new engine plus a check now wired into the root `check:specs` chain, so it gates every future push; it also introduces a new declared repo config file. Nothing narrowed, no package's public surface changed
      novelty: high — a new mechanical guard class in this repo: a declared registry of retired terms swept corpus-wide, where every prior guard of this shape carried a list hardcoded in its own source and reached one package
      confidence: high — two cold impl-judge rounds, the second IMPLEMENTATION_PASS with no blocker. All 17 frozen scenarios re-derived independently per ADR-0016 against fixtures the judge authored, never read off the producer's assertions, and the judge drove the real binary rather than trusting the unit tests. Non-vacuity proven by mutation on both sides — disabling the scope check, collapsing the substring-vs-file allow distinction, dropping the self-exclusion, reporting only the first survivor, and falling back to clean on a malformed registry each fail exactly one scenario and nothing else. The guard was also proven to bite on the live tree: a survivor injected into a real tracked in-scope file is caught at the right file:line. Round 1's blocker was the guard failing its own check chain once its files became tracked (the same tracked-vs-untracked blind spot the spec gate caught one document over), fixed by rewriting the worked example to placeholders rather than widening the self-exclusion. The judge's one residual — a `return 0` on the violations path surviving the whole suite — was closed in-CR with a main()-level test plus its clean-path control, both ablation-checked. Root `pnpm verify` 35/35 reproduced by conductor and judge
---

# Spec-Driven Development (SDD)

> Root project spec — the **descriptive** top index for the whole project. Rules live in
> [`design/`](./design/); behaviors live in the capability folders. (`DESIGN-NOTES.md` is the
> superseded design discussion, kept for history — not the working model.)

## What SDD is

SDD is a **spec-governed development process** that maintains a project through a stack of
abstractions and carries each change through one autonomous loop, with humans deciding *what to
build* and the agent deciding *how far it may go on its own*. Its **runtime is an agentic
workflow** — structured orchestration of LLM work, not free-form autonomy ([SDD vs agentic
workflows](#sdd-vs-agentic-workflows), below).

SDD targets **Level 2 — Spec-Anchored** on the three-level maturity spectrum (Spec-First →
Spec-Anchored → Spec-as-Source): the spec is authoritative and **co-delivers and co-evolves** with
the code, never drifting (Level 1) and never replacing human-editable code (Level 3)
([`design/sdd-maturity.md`](./design/sdd-maturity.md)).

### SDD vs agentic workflows

In [Anthropic's framing](https://www.anthropic.com/research/building-effective-agents), an **agentic
workflow** orchestrates LLMs and tools through *predefined code paths* (deterministic), distinct
from an **agent** that *dynamically directs its own process*. SDD's runtime sits on the workflow
side: the Mission Loop is **orchestrator-workers** (the conductor spawns cold judges + the
impl-producer builder) plus **evaluator-optimizer** (the producer ↔ cold-judge grill), with agentic
workers doing the dynamic work at the leaves. SDD chose structure on purpose — that is where freeze,
provenance, and auditability come from.

But SDD is **more than a workflow**. An agentic workflow is an ephemeral task automation; SDD wraps
that runtime in a durable **project-spec**, a **lifecycle** (draft → approved → implemented +
freeze), **human gates**, and **governance**. That governing layer is a *methodology* — the
**process** altitude (BPM / software-process). So the two terms are not rivals but **two altitudes**:
**process** = the governing methodology layer (*what SDD is*); **workflow** = the runtime
orchestration layer (*how SDD runs*). This is why "Process" names the doctrine loop and the
repo-level process spec, while "workflow" is reserved for the engine. Decision +
background: [ADR-0011](../../../artifacts/adr/0011-sdd-process-vs-agentic-workflow.md).

### The SDD stack

Five layers — intent → work → contract → artifact → behavior — getting more concrete downward; change
enters at the top and is driven down ([`design/sdd-stack.md`](./design/sdd-stack.md)). The lower three
are durable and maintained; the upper two (CR, plan) are transient intent, consumed into them — never
frozen:

- **change-request (CR)** — the source of intent; the goal that *drives* a plan and is *grilled* into
  concrete deltas to spec + suite (not an abstraction of anything below it).
- **plan** — the CR's intent grilled into sequenced work that *produces* the spec + suite deltas;
  transient per-CR state, retired at retro (not a view of the spec).
- **spec + behavior suite** — abstraction of the implementation; what humans read to know what
  the project *is* and does. The hinge: top of the abstraction ladder, output of the intent above.
- **implementation** — abstraction of outcome; the built artifact (code, docs, config, agent
  definitions…), still statically analyzable. SDD is not limited to generating code.
- **outcome** — what actually happens.

A **project** — a repo, an agent configuration, an npm package, a website, or a single package
inside a monorepo (projects nest) — has **one durable spec** (its **project-spec**), one behavior
suite, one gate/freeze baseline. Size is solved by **organizing into files and folders** (folders
are views, never lifecycle units), never by splitting into a fleet of per-feature specs. The
collection of project-specs in a repo is the **corpus** — a noun, not an operation; the three
nested levels (corpus ⊃ project-spec ⊃ node) are defined in
[`design/spec-structure.md`](./design/spec-structure.md).
([`design/project-unit.md`](./design/project-unit.md).)

### The gateway — the one front door

Every interaction enters through the universal **[`gateway/`](./gateway/README.md)** (the `sdd` skill): it activates SDD,
classifies the request, and **routes** it — to a **mission** (a CR run through the loop below), a
**[`corpus/`](./corpus/README.md)** or **[`project-spec/`](./project-spec/README.md)** operation (inspect, audit, align), inner-loop agent-tuning (inject / project), a
**plugin-management** operation (install/remove a domain plugin, author a governance — *planned*), or
one of the four **outer loops**. A task with no suite-relevant behavior **escapes** — outside the
lifecycle, leaving no SDD record. The gateway is a **thin relay**: it classifies and dispatches,
holding no production logic and writing no project files itself. It is not part of any loop.

### The Mission Loop (steps 1–4)

One cycle = one CR carried to completion, on one working tree ([`design/loops.md`](./design/loops.md)):

1. **intake** — a CR enters from a prompt, GitHub, Asana, or the local store ([`intake/`](./intake/README.md),
   the only work-intake; it *feeds* the mission).
2. **explore** — *build to learn*: grill the CR into a spec + suite diff, spike to discover
   what the contract needs, iterate the spec-producer against the cold spec-judge. Ends at
   the **spec gate** (Draft → Approved), which **freezes** the `.feature` files it touched
   ([`authoring/`](./authoring/README.md), invoked).
3. **deliver** — *build to keep* against the frozen suite, then verify at the **impl gate**
   (Approved → Implemented) ([`mission/delivery`](./mission/delivery.md)).
4. **handoff** — land the verified result in the project-declared delivery shape — commits
   to `main`, a branch + PR, or prose ([`mission/handoff/`](./mission/handoff/README.md)).

[`mission/`](./mission/README.md) **orchestrates** steps 1–4, run by the **conductor** — the main session by default, a
spawned `automaton` in the headless fallback. There is **no mandatory approval
station** — every write to spec/suite passes the **autonomy rubric**
([`design/autonomy-rubric.md`](./design/autonomy-rubric.md)), which self-clears or escalates; the human is an escalation
target the bar invokes, not a fixed checkpoint. Inside a mission, three hard-floor stops can
fire (Clearance, Compatibility, Conflict resolution); the fourth floor, **Consent**, guards the
forge loop's cross-installation egress, not a mission.

### The four post-mission outer loops (step 5)

Once a cycle completes, four loops may fire and emit **new CRs** — nothing re-enters the
system except as a CR ([`design/loops.md`](./design/loops.md)):

- **campaign** (Product) — what the project should *be*: grow and prune capabilities.
- **formation** (Structure) — is the corpus organized right: audit node-shape, align, reconcile.
- **doctrine** (Process) — how we work: distill strategy from the combat log, retire plans.
- **forge** (Field, external) — improve SDD itself from opt-in end-user field corrections.

## Capability map

The placement map — the declared organization (`design/spec-layout.md`). SDD is organized
**capability-first**: top-level folders name what the project *does*. A new concept routes to the
folder whose capability it serves; rules go to `design/`, cross-capability workflow scenarios to
`workflows/`.

| Folder | Owns | Loop role |
|---|---|---|
| [`design/`](./design/) | the abstract idea — rules & model | — |
| [`gateway/`](./gateway/README.md) | the universal router/door | — (not a loop step) |
| [`intake/`](./intake/README.md) | the CR subsystem (sources + escape + inject) | feeds the mission (step 1) |
| [`authoring/`](./authoring/README.md) | grill CR → spec+suite diff (+ spec gate); shared capability | explore (step 2), invoked |
| [`mission/`](./mission/README.md) | the orchestrator / conductor (+ impl gate) | Mission Loop steps 1–4 |
| [`mission/delivery`](./mission/delivery.md) | build to keep against the frozen suite | deliver (step 3) |
| [`mission/handoff/`](./mission/handoff/README.md) | land the result in the delivery shape | handoff (step 4) |
| [`campaign/`](./campaign/README.md) [`formation/`](./formation/README.md) [`doctrine/`](./doctrine/README.md) [`forge/`](./forge/README.md) | the 4 post-mission outer loops | step 5 (not in the Mission Loop) |
| [`common-governances/`](./common-governances/README.md) | the cross-cutting governance bar specs (actor + fixed-universal) | — |
| [`corpus/`](./corpus/README.md) | corpus-level tooling — discovery across project-specs, and the retired-term drift sweep over the tracked tree | — |
| [`project-spec/`](./project-spec/README.md) | project-spec-level maintenance — digest, index, place, audit, align (one project-spec) | — |
| [`mission-graph/`](./mission-graph/README.md) | the project's shared work list — what can start now (`ready`) and knotted-plan detection (`cycles`) | — (consumed by the dispatcher) |
| [`touch-set-correction/`](./touch-set-correction/README.md) | post-hoc correct a mission's declared touch-set against its real `git diff` (feeds the mission graph) | — (consumed at retirement) |
| [`collision-ladder/`](./collision-ladder/README.md) | at a known node collision, descend the finer-than-node ladder (file → region → semantic → symbol) to classify it hard or soft | — (consumed by the scheduler) |
| [`ssa-lowering/`](./ssa-lowering/README.md) | the reasoning front-end: lower one-or-more CRs into a partitioned set of Missions (one owning Mission per spec-node) via the Oracle + Architect lenses | — (run at intake/Explore) |
| [`blast-estimate/`](./blast-estimate/README.md) | compute a mission's blast from its touch-set (count × centrality × sensitivity) and line it up against the hand-asserted `blast:` (feeds the mission graph) | — (consumed by the graph's writer) |
| [`plugin/`](./plugin/README.md) | SDD's plugin nature (ships-as-plugin + extended-by-plugins; registry init-write) | — |
| [`workflows/`](./workflows/README.md) | workflows suite (cross-capability usage flows) | — |

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
|---|---|
| `artifact-type` | `design/artifact-type.md` (rule) |
| `autonomy` | `design/autonomy-rubric.md` (rule) · `workflows/` (workflow) |
| `delivery` | `mission/delivery.md` (index) · `mission/handoff/` (behavior) · `mission/impl-judge/` (behavior) · `mission/impl-producer/` (behavior) · `mission/manage-scenario-bridge/` (behavior) · `mission/verify-scenarios/` (behavior) · `workflows/` (workflow) |
| `doctrine` | `doctrine/plan-retirement/` (behavior) · `doctrine/scanner/` (behavior) |
| `governance` | `common-governances/architect/` (reference) · `common-governances/builder/` (reference) · `common-governances/oracle/` (reference) · `common-governances/ownership/` (reference) · `design/actors-governance.md` (rule) · `design/governance-resolution.md` (rule) · `design/specialists-and-squads.md` (rule) |
| `intake` | `intake/manage-ignore/` (behavior) · `intake/plan-discovery/` (behavior) · `intake/resolve-tracking/` (behavior) |
| `lifecycle` | `authoring/spec-gate/` (behavior) · `common-governances/gate-validation/` (reference) · `common-governances/lifecycle/` (reference) · `design/lifecycle-model.md` (rule) · `workflows/` (workflow) |
| `orchestration` | `blast-estimate/` (behavior) · `collision-ladder/` (behavior) · `design/cr-concurrency.md` (rule) · `design/gherkin-cli-dependency.md` (rule) · `design/harness-spawning.md` (rule) · `design/loops.md` (rule) · `mission-graph/` (behavior) · `mission/conductor/` (behavior) · `ssa-lowering/` (behavior) · `touch-set-correction/` (behavior) |
| `plugin` | `plugin/` (behavior) · `plugin/plugin-contract/` (reference) |
| `provenance` | `common-governances/combat-log/` (reference) · `design/provenance-model.md` (rule) · `doctrine/plan-retirement/` (behavior) · `mission/checkpoint/` (behavior) · `workflows/` (workflow) |
| `resolution` | `design/governance-resolution.md` (rule) · `design/specialists-and-squads.md` (rule) · `mission/resolution/` (behavior) · `workflows/` (workflow) |
| `routing` | `gateway/` (behavior) · `gateway/dispatch/` (behavior) · `gateway/manage/` (behavior) |
| `setup` | `gateway/init/` (behavior) |
| `spec-authoring` | `authoring/spec-format/` (reference) · `authoring/spec-gate/` (behavior) · `authoring/spec-producer/` (behavior) · `authoring/suite-format/` (reference) · `mission/solution-producer/` (behavior) |
| `spec-structure` | `authoring/scaffold-project-spec/` (behavior) · `common-governances/spec-structure/` (reference) · `corpus/discovery/` (behavior) · `corpus/retired-terms/` (behavior) · `corpus/spec-anchors/` (behavior) · `design/project-unit.md` (rule) · `design/spec-layout.md` (rule) · `design/spec-structure.md` (rule) · `formation/` (behavior) · `project-spec/align-spec/` (behavior) · `project-spec/check-spec-structure/` (behavior) · `project-spec/concept-index/` (behavior) · `project-spec/digest/` (behavior) · `project-spec/partition-quality/` (behavior) · `project-spec/place-node/` (behavior) · `project-spec/scenario-overlap/` (behavior) |

<!-- END generated: by-concept -->

## Invariants

- **ONE spec, ONE behavior suite, ONE gate/freeze baseline.** Folders are *views*, never lifecycle units — none gets its own `status`/approval.
- **Rule-in-design + behavior-in-capability.**
- **Three spec types** ([`design/spec-structure.md`](./design/spec-structure.md)): **descriptive** (no subject — rule docs + indexes; no marker), **reference artifact** (`spec-type: reference` — a suite-less shipped thing), **behavioral artifact** (`spec-type: behavioral` — a testable unit with a `.feature`). `spec-type` is per-node classification, never lifecycle.
- **Unit scenarios colocate** with their capability; **workflow (cross-capability) scenarios** live in `workflows/`.
