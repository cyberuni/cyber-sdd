# Abstraction stack

Four layers.
Each abstracts the one below; every layer is real, maintained, and statically inspectable.
SDD operates the upper two and drives them down into the lower two.

```
change-request (CR)   ← intent: the deltas you grill into spec + suite
  spec + behavior suite  ← what the project is and does; what humans read
    code                   ← abstraction of outcome; what engineers, security, and agents analyze
      outcome                ← what actually happens
```

## The layers

- **outcome** — what actually happens when the project runs: the behavior a user observes, the side effects, the shipped result.
  The ground truth every layer above exists to predict.
- **code** — an abstraction of outcome.
  Still real, still maintained, still statically analyzable by engineers, security specialists, and agents.
  Not discarded once written; it is the durable artifact that produces the outcome.
- **spec + behavior suite** — an abstraction of code.
  What humans read to know what the project *is* and does without reading every line.
  The spec narrates the capabilities; the behavior suite pins them to checkable scenarios.
  Both stay maintained alongside the code — the spec is not a one-time design doc that rots after the first commit.
- **change-request (CR)** — an abstraction of the behavior suite.
  The intent you *grill* into concrete deltas against spec + suite (and, through them, against code and outcome).
  A CR is the only unit of incoming intent; it is never the destination, only the request.

## Invariants

- **Every layer matters and stays maintained.**
  None is scaffolding to be thrown away.
  A drifted spec or a stale suite is a defect at that layer, the same as a bug in code.
- **Abstraction flows down; change enters at the top.**
  A CR names a delta to spec + suite; authoring realizes it there; mission drives it into code; the outcome follows.
  You do not edit outcome directly — you edit the abstraction that produces it.
- **The `.feature` is part of the behavior suite, never part of the CR.**
  A CR describes a desired change to behavior; the scenarios that *encode* behavior live one layer down, in the suite.
  (See `suite-style.md` for how scenarios are written and judged, and `unit-and-organization.md` for how the suite is organized within the one project spec.)
- **The CR is consumed, not stored.**
  Once grilled into spec + suite deltas, the CR's job is done; it does not become a frozen artifact.
  Outer-loop retrospectives emit *new* CRs rather than reopening old ones (see `loops.md`).
