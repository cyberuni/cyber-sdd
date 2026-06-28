# Spec-Driven Development (SDD)

> Root project spec — the **descriptive** top index for the whole project. Rules live in
> [`design/`](./design/); behaviors live in the capability folders. (`DESIGN-NOTES.md` is the
> superseded design discussion, kept for history — not the working model.)

## What SDD is

SDD is a workflow that maintains a project through a stack of abstractions and carries each
change through one autonomous loop, with humans deciding *what to build* and the agent
deciding *how far it may go on its own*.

SDD targets **Level 2 — Spec-Anchored** on the three-level maturity spectrum (Spec-First →
Spec-Anchored → Spec-as-Source): the spec is authoritative and **co-delivers and co-evolves** with
the code, never drifting (Level 1) and never replacing human-editable code (Level 3)
([`design/sdd-maturity.md`](./design/sdd-maturity.md)).

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
inside a monorepo (projects nest) — has **one durable spec**, one behavior suite, one gate/freeze
baseline. Size is solved by **organizing into files and folders** (folders are views, never
lifecycle units), never by splitting into a fleet of per-feature specs.
([`design/project-unit.md`](./design/project-unit.md).)

### The gateway — the one front door

Every interaction enters through the universal **[`gateway/`](./gateway/README.md)** (the `sdd` skill): it activates SDD,
classifies the request, and **routes** it — to a **mission** (a CR run through the loop below), a
**[`corpus/`](./corpus/README.md)** operation (dedupe, split, inspect), inner-loop agent-tuning (inject / project), a
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
   (Approved → Implemented) ([`mission/deliver/`](./mission/deliver/README.md)).
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
- **formation** (Structure) — is the corpus organized right: dedupe, split, reconcile.
- **doctrine** (Process) — how we work: distill strategy from the combat log, retire plans.
- **forge** (Field, external) — improve SDD itself from opt-in end-user field corrections.

## Capability map

| Folder | Owns | Loop role |
|---|---|---|
| [`design/`](./design/) | the abstract idea — rules & model | — |
| [`gateway/`](./gateway/README.md) | the universal router/door | — (not a loop step) |
| [`intake/`](./intake/README.md) | the CR subsystem (sources + escape + inject) | feeds the mission (step 1) |
| [`authoring/`](./authoring/README.md) | grill CR → spec+suite diff (+ spec gate); shared capability | explore (step 2), invoked |
| [`mission/`](./mission/README.md) | the orchestrator / conductor (+ impl gate) | Mission Loop steps 1–4 |
| [`mission/deliver/`](./mission/deliver/README.md) | build to keep against the frozen suite | deliver (step 3) |
| [`mission/handoff/`](./mission/handoff/README.md) | land the result in the delivery shape | handoff (step 4) |
| [`campaign/`](./campaign/README.md) [`formation/`](./formation/README.md) [`doctrine/`](./doctrine/README.md) [`forge/`](./forge/README.md) | the 4 post-mission outer loops | step 5 (not in the Mission Loop) |
| [`common-governances/`](./common-governances/README.md) | the cross-cutting governance bar specs (actor + fixed-universal) | — |
| [`corpus/`](./corpus/README.md) | spec-corpus tooling | — |
| [`plugin/`](./plugin/README.md) | SDD's plugin nature (ships-as-plugin + extended-by-plugins; registry init-write) | — |
| [`acceptance/`](./acceptance/README.md) | e2e behavior suite | — |

## Invariants

- **ONE spec, ONE behavior suite, ONE gate/freeze baseline.** Folders are *views*, never lifecycle units — none gets its own `status`/approval.
- **Rule-in-design + behavior-in-capability.**
- **Three spec types** ([`design/spec-structure.md`](./design/spec-structure.md)): **descriptive** (no subject — rule docs + indexes; no marker), **reference artifact** (`spec-type: reference` — a suite-less shipped thing), **behavioral artifact** (`spec-type: behavioral` — a testable unit with a `.feature`). `spec-type` is per-node classification, never lifecycle.
- **Unit scenarios colocate** with their capability; **acceptance (e2e) scenarios** live in `acceptance/`.
