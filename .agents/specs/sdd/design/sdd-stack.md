---
model: true
---

# The SDD stack

Five layers — **intent → work → contract → artifact → behavior** — that get more concrete as you
read down. Change enters at the top and is **driven down**: each layer **produces** the one below.
Two different relationships stack here, hinged at the contract:

- **Below the contract — an abstraction ladder.** The **spec + suite**, the **implementation**, and
  the **outcome** are *the same project at three altitudes*. Read **up**, each is an abstraction of
  the one below: the spec is the human-readable abstraction of the implementation, which abstracts
  the outcome. This ladder is the heart of SDD.
- **Above the contract — intent.** The **CR** and the **plan** are *not* the project — they are the
  intent to change it and the work to do so. The plan is not a view of the spec; it is what
  **produces** the spec delta. The CR is not abstracted from the plan; the user writes it first and
  it **drives** the plan. Different category: process, not artifact.
- **The spec + suite is the hinge** — the top rung of the abstraction ladder *and* the output of the
  intent above it. That is why it is the one durable thing both halves point at.

The lower three are durable, maintained, and statically inspectable; the upper two (CR, plan) are
transient intent, consumed into them — never frozen.
SDD operates the intent and contract layers (CR → plan → spec + suite) and drives them down into
implementation and outcome.

```
change-request (CR)     ← intent: the goal you grill into spec + suite deltas
  plan                    ← the change as sequenced work (per-CR execution state)
    spec + behavior suite   ← what the project is and does; what humans read
      implementation          ← abstraction of outcome; code, docs, config — what engineers, security, and agents analyze
        outcome                 ← what actually happens
```

## The layers

- **change-request (CR)** — the **source of intent** (not an abstraction of anything below it).
  The goal stated as intent — often **under-specified**, the raw request before it is researched into workable shape; it **drives** a plan, and you *grill* it into concrete deltas against spec + suite (and, through them, against the implementation and outcome).
  A CR is the only unit of incoming intent; it is never the destination, only the request.
- **plan** — the CR's intent **grilled into workable shape and sequenced as work** (not an abstraction of the spec).
  The todos and working method that **produce** the concrete spec + suite deltas — the work, without the delta content itself.
  Unlike the durable layers below it, the plan is **transient** per-CR mission state — scaffolded at intake, filled during explore, retired at the post-mission retro (`loops.md`).
  Distinct from the per-unit **solution** (`spec-structure.md`), which is durable.
- **spec + behavior suite** — an abstraction of the implementation.
  What humans read to know what the project *is* and does without reading every line.
  The spec narrates the capabilities; the behavior suite pins them to checkable scenarios.
  This layer comprises the three spec-node types — **descriptive**, **reference**, and **behavioral** (`spec-structure.md`); only behavioral nodes carry the suite.
  Both stay maintained alongside the implementation — the spec is not a one-time design doc that rots after the first commit.
- **implementation** — an abstraction of outcome.
  The built artifact — code, documentation, configuration, agent definitions, whatever the project ships.
  SDD is not limited to generating code.
  Still real, still maintained, still statically analyzable by engineers, security specialists, and agents.
  Not discarded once written; it is the durable artifact that produces the outcome.
- **outcome** — what actually happens when the project runs: the behavior a user observes, the side effects, the shipped result.
  The ground truth every layer above exists to predict.

## Invariants

- **The durable layers stay maintained; the intent layers are consumed.**
  The lower three (spec + suite, implementation, outcome) are never scaffolding to be thrown away — a drifted spec or a stale suite is a defect at that layer, the same as a bug in the implementation.
  The upper two (CR, plan) are transient intent that is **consumed** into those durable layers, not kept: the CR is grilled away into deltas, the plan is retired at retro.
- **Change enters at the top and is driven down.**
  A CR enters as intent and is **grilled** into shape — explore researches the gaps and applies the Oracle / Builder / Architect lenses, expanding the thin CR into the plan (sequenced work) and the spec + suite deltas together; mission drives those into the implementation; the outcome follows.
  You do not edit outcome directly — you edit the layer that produces it.
- **The CR is consumed, not stored.**
  Once grilled into spec + suite deltas, the CR's job is done; it does not become a frozen artifact.
  Outer-loop retrospectives emit *new* CRs rather than reopening old ones (see `loops.md`).
