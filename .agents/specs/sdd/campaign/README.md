# campaign/ — the product outer loop

The **Campaign loop** (metaphor) / **Product loop** (descriptive) — the step-5 outer loop
that **grows and prunes the product**: it decides which capabilities the project should
*have*. Actor: the **Oracle**. Fleet role: the **Commander**. The delegate watches missions
reach a terminal state and reasons across the whole product — *"we shipped capability A; B is
the natural next; and with B, capability C is now redundant — deprecate it."*

Standing subject: **the capability folders** — what the project delivers. Campaign evolves the
set of capabilities the product carries; it never judges whether one change ships.

## Altitude — product-wide, never per-gate

The Commander operates across many missions and the whole product, asking *"what should the
product BE?"* — never *"should THIS change ship?"* That second question is the in-mission
verdict (`mission/`, the impl gate) and stays exactly where it is. The Commander does not act
at a gate and does not run per-change; it reads the whole product and reasons about it as a
whole.

## Output — emits new CRs

The loop's findings re-enter the system as **new CRs** through the single intake
(`intake/README.md`); raising the CR is what closes the loop. Two finding kinds,
neither auto-applied:

- a **grow** finding — a shipped capability suggests its successor → a CR to add the next
  capability;
- a **prune / scrub** finding — a new or shipped capability subsumes an existing one → a CR to
  deprecate the redundant capability.

The human **Council** holds the **go / keep-or-cut**: no finding becomes work and no capability
is deprecated without a ratified CR. The Commander **never writes the `→ deprecated`
transition** itself — that lifecycle write is owned by `design/lifecycle-model.md` and performed
once the CR is ratified.

## Input — the public trail read post-hoc

The Commander reads the durable **public trail** **post-hoc** — the CR-source conclusions, the
changesets, and git history (`design/provenance-model.md`), plus the product's current
capabilities — never the combat log (the doctrine loop's input, retired at retro) and never
live subagent context. It reads the trail **forward** via a cursor over the public trail so a
re-run resumes from the last-seen conclusion rather than cold-scanning the whole product.
Parallel to the Scanner (`doctrine/`), it always fires *after* missions end, so post-hoc file
reading is the right model.

## Detect-and-draft vs keep-or-cut

The same split as the other outer loops: the delegate **detects and drafts** cheaply (grow
findings, prune findings, reprioritizations); the human **Council** holds the **go /
keep-or-cut**. Nothing enters work without the Council's ruling.

## Triggers

| Use case | Trigger | Input | Outcome |
|---|---|---|---|
| **Shipped capability suggests a successor** | a change ships (`→ implemented`) | the finished work + the product + the public trail | a CR to add the next capability |
| **A capability subsumes another → redundant** | a capability ships that subsumes another | the product + the redundant capability | a deprecation (scrub) CR |
| **Product review → reprioritize** | a human-held product-review event | the whole product + the public trail | a reprioritization (and possibly grow / prune CRs) |
| **A capability no longer earns its keep** | a capability's value no longer justifies its maintenance | the capability + product signal | a deprecation (scrub) CR |

## Boundaries — Campaign owns the product only

The four outer loops, by concern (Campaign + its three siblings):

| Loop | Role | Owns |
|---|---|---|
| **Campaign** (Product) | Commander | *what to build* — grow and prune the product |
| **Formation** (Structure) | Warden | the corpus is organized right — see `formation/` |
| **Doctrine** (Process) | Scanner | how we operate — see `doctrine/` |
| **Forge** (Field) | maintainers | improve SDD from opt-in end-user field corrections — see `forge/` |

A structure observation (overlap, split) routes to `formation/`; a process lesson routes to
`doctrine/`; field corrections route to `forge/`. Campaign decides **what the product
should be** — and nothing else.

## Scenarios

Unit scenarios for this loop colocate in this folder; cross-capability outcome scenarios that
exercise a grow/prune CR end-to-end live in `acceptance/`.
