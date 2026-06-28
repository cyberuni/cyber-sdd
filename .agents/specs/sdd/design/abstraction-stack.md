# Abstraction stack

Five layers.
Each abstracts the one below: the same change viewed as intent → sequenced work → contract →
artifact → behavior.
The lower three (spec + suite, implementation, outcome) are durable, maintained, and statically
inspectable; the upper two (CR, plan) are transient intent, consumed into them — never frozen.
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

- **outcome** — what actually happens when the project runs: the behavior a user observes, the side effects, the shipped result.
  The ground truth every layer above exists to predict.
- **implementation** — an abstraction of outcome.
  The built artifact — code, documentation, configuration, agent definitions, whatever the project ships.
  SDD is not limited to generating code.
  Still real, still maintained, still statically analyzable by engineers, security specialists, and agents.
  Not discarded once written; it is the durable artifact that produces the outcome.
- **spec + behavior suite** — an abstraction of the implementation.
  What humans read to know what the project *is* and does without reading every line.
  The spec narrates the capabilities; the behavior suite pins them to checkable scenarios.
  This layer comprises the three spec-node types — **descriptive**, **reference**, and **behavioral** (`unit-and-organization.md`); only behavioral nodes carry the suite.
  Both stay maintained alongside the implementation — the spec is not a one-time design doc that rots after the first commit.
- **plan** — an abstraction of spec + suite.
  The change as sequenced work: the todos and working method that carry the CR's intent into concrete spec + suite deltas, without the delta content itself.
  Unlike the durable layers below it, the plan is **transient** per-CR mission state — scaffolded at intake, filled during explore, retired at the post-mission retro (`loops.md`).
  Distinct from the per-unit **solution** (`unit-and-organization.md`), which is durable.
- **change-request (CR)** — an abstraction of the plan.
  The goal stated as intent, before it is decomposed into sequenced work; you *grill* it into concrete deltas against spec + suite (and, through them, against the implementation and outcome).
  A CR is the only unit of incoming intent; it is never the destination, only the request.

## Invariants

- **The durable layers stay maintained; the intent layers are consumed.**
  The lower three (spec + suite, implementation, outcome) are never scaffolding to be thrown away — a drifted spec or a stale suite is a defect at that layer, the same as a bug in the implementation.
  The upper two (CR, plan) are transient intent that is **consumed** into those durable layers, not kept: the CR is grilled away into deltas, the plan is retired at retro.
- **Abstraction flows down; change enters at the top.**
  A CR is decomposed into a plan; the plan sequences deltas to spec + suite; authoring realizes them there; mission drives them into the implementation; the outcome follows.
  You do not edit outcome directly — you edit the abstraction that produces it.
- **The `.feature` is part of the behavior suite, never part of the CR.**
  A CR describes a desired change to behavior; the scenarios that *encode* behavior live one layer down, in the suite.
  (See `../authoring/suite-format/README.md` for how scenarios are written and judged, and `unit-and-organization.md` for how the suite is organized within the one project spec.)
- **The CR is consumed, not stored.**
  Once grilled into spec + suite deltas, the CR's job is done; it does not become a frozen artifact.
  Outer-loop retrospectives emit *new* CRs rather than reopening old ones (see `loops.md`).
