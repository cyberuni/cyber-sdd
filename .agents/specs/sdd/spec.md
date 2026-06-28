# Spec-Driven Development (SDD)

> Root project spec — the **descriptive** top index for the whole project. Rules live in
> [`design/`](./design/); behaviors live in the capability folders. (`DESIGN-NOTES.md` is the
> superseded design discussion, kept for history — not the working model.)

## What SDD is

SDD is a workflow that maintains a project through a stack of abstractions and carries each
change through one autonomous loop, with humans deciding *what to build* and the agent
deciding *how far it may go on its own*.

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

### The Mission Loop (steps 1–4)

One cycle = one CR carried to completion, on one working tree ([`design/loops.md`](./design/loops.md)):

1. **intake** — a CR enters from a prompt, GitHub, Asana, or the local store (`intake/`,
   the only work-intake; it *feeds* the mission).
2. **explore** — *build to learn*: grill the CR into a spec + suite diff, spike to discover
   what the contract needs, iterate the spec-producer against the cold spec-judge. Ends at
   the **spec gate** (Draft → Approved), which **freezes** the `.feature` files it touched
   (`authoring/`, invoked).
3. **deliver** — *build to keep* against the frozen suite, then verify at the **impl gate**
   (Approved → Implemented) (`mission/deliver/`).
4. **handoff** — land the verified result in the project-declared delivery shape — commits
   to `main`, a branch + PR, or prose (`mission/handoff/`).

`mission/` is the **orchestrator** — the conductor (the operator role), the main session by
default, a spawned `sdd-operator` only in the headless fallback — sequencing steps 1–4;
`gateway/` is the universal router/door (not a loop step). There is **no mandatory approval
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
| `design/` | the abstract idea — rules & model | — |
| `gateway/` | the universal router/door | — (not a loop step) |
| `intake/` | the CR subsystem (sources + escape + inject) | feeds the mission (step 1) |
| `authoring/` | grill CR → spec+suite diff (+ spec gate); shared capability | explore (step 2), invoked |
| `mission/` | the orchestrator / conductor (+ impl gate) | Mission Loop steps 1–4 |
| `mission/deliver/` | build to keep against the frozen suite | deliver (step 3) |
| `mission/handoff/` | land the result in the delivery shape | handoff (step 4) |
| `campaign/` `formation/` `doctrine/` `forge/` | the 4 post-mission outer loops | step 5 (not in the Mission Loop) |
| `corpus/` | spec-corpus tooling | — |
| `plugin/` | SDD's plugin nature (ships-as-plugin + extended-by-plugins; registry init-write) | — |
| `acceptance/` | e2e behavior suite | — |

## Invariants

- **ONE spec, ONE behavior suite, ONE gate/freeze baseline.** Folders are *views*, never lifecycle units — none gets its own `status`/approval.
- **Rule-in-design + behavior-in-capability.**
- **Three spec types** ([`design/spec-structure.md`](./design/spec-structure.md)): **descriptive** (no subject — rule docs + indexes; no marker), **reference artifact** (`spec-type: reference` — a suite-less shipped thing), **behavioral artifact** (`spec-type: behavioral` — a testable unit with a `.feature`). `spec-type` is per-node classification, never lifecycle.
- **Unit scenarios colocate** with their capability; **acceptance (e2e) scenarios** live in `acceptance/`.
