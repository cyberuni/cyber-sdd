---
spec-type: behavioral
concept: [lifecycle, autonomy, resolution, delivery, provenance]
---

# workflows/ — the workflows suite

The **workflows suite** — cross-capability usage flows: the scenarios that exercise SDD
end-to-end and **span capabilities**, the project-level analog of a use case (a path through
the composed capabilities, the way a use case is a path through a node's logic graph).
Consumed by `../mission/`'s step-3 verify (the impl gate). **Not a loop step.** Unit
scenarios stay colocated with their capability folder; only cross-capability workflow
scenarios live here.

Written in boolean Gherkin per `../authoring/suite-format/README.md`: every scenario is a
declarative Given/When/Then with a pass/fail reading, no rubric or threshold in the
`.feature` itself. A scenario earns a place here only if it crosses two or more capability
folders; a single-capability behavior belongs as a unit scenario.

## Use Cases

**Subject** — the cross-capability workflows that exercise SDD end-to-end, each spanning two
or more capability folders.
**Non-goals** — no single-capability behavior (those are unit scenarios in their own folder), no
loop step of its own, and no rubric/threshold in the `.feature`.

The suite is organized into one `.feature` per outcome **theme**; the `## Seed` below is the
row-level inventory each theme realizes.

| Theme | Cross-capability outcome | Suite |
|---|---|---|
| **A. CR lifecycle** | intake → authoring → mission → handoff | [`cr-lifecycle.feature`](./cr-lifecycle.feature) |
| **B. Escalation floor** | the autonomy bar across authoring + mission | [`escalation-floor.feature`](./escalation-floor.feature) |
| **C. Resolve-a-squad** | registry → resolution → production chain | [`resolve-squad.feature`](./resolve-squad.feature) |
| **D. Freeze** | the spec gate → the impl gate | [`freeze.feature`](./freeze.feature) |
| **E. Gate verdicts** | producer/judge separation across both gates | [`gate-verdicts.feature`](./gate-verdicts.feature) |
| **F. Handoff** | the verified result → the delivery shape | [`handoff.feature`](./handoff.feature) |

## Seed — the cross-capability outcomes to carry

Distilled from the in-scope `sdd-*` `.feature` files. Organized by outcome theme; each row
is a scenario to author. This is the organized inventory, not the full suite.

### A. CR lifecycle (intake → authoring → mission → handoff)
Sources: `sdd-change-request`, `sdd-skill`, `sdd-mission-loop`.

- A1. A prompt-raised CR is intaken, grilled to a spec+suite diff, implemented, verified, and delivered in the declared shape.
- A2. A GitHub/Asana-raised CR routes through the same single intake and reaches a delivered outcome.
- A3. An outer-loop finding re-enters only as a new CR (no side channel); nothing changes the system except through a CR.
- A4. A CR that the agent can confidently diff self-clears the grill step without a human.
- A5. A CR's status (open→accepted→done) stays independent of the target spec's lifecycle status.

### B. Escalation floor (autonomy bar across authoring + mission)
Sources: `sdd-gate-autonomy`, `sdd-escape-hatch`, `sdd-stop-provenance`, `../design/autonomy-rubric.md`.

- B1. Additive / internal / minor change self-clears both gates with no human stop.
- B2. Narrowing or deleting an e2e scenario (**Clearance**) escalates for human acknowledgment — unless the CR pre-authorized it.
- B3. A change whose **semver class** (patch/minor/major) exceeds the authorized change-class ceiling (**Compatibility**) escalates; a class within the CR / run-mode ceiling proceeds without halting.
- B4. A logical contradiction inside the suite (Scenario A says yes, Scenario B says no) halts implementation and escalates for human resolution.
- B5. An obvious stale-mistake contradiction is served as a conductor minor fix, not escalated.
- B6. A self-asserted gate advances the run asynchronously and enqueues the spec for ratify-or-kick-back review.

(The mid-flight combat-log write of a halt is a **mission unit scenario**, not a cross-capability one — it colocates under `../mission/`. Acceptance keeps only the cross-capability outcome: a CR halts → a human resolves → the mission resumes, in B4.)

### C. Resolve-a-squad (registry → resolution → production chain)
Sources: `sdd-contract-registry`, `automaton-resolution`, `plugin/` init-WRITE.

- C1. A plugin's init-write registers an `sdd-plugins` entry; the conductor later resolves that domain's delegates from it without scanning plugin directories.
- C2. An unfilled producer role degenerates to the conductor authoring inline (`produced-by.<role>: sdd:automaton`); an unfilled judge role spawns the cold SDD-default judge.
- C3. A domain claimed by two plugins returns needs-input once, the choice is recorded, and resume does not loop.
- C4. A required role with no resolvable delegate hard-fails and records nothing.
- C5. Re-running init at a newer version reconciles a stale entry; a corrupt registry fails closed and is left untouched.

### D. Freeze (authoring spec gate → mission impl gate)
Sources: `automaton-freeze`, `sdd-gate-autonomy`, `sdd-state-legality`.

- D1. A spec-gate approve freezes the `.feature` files the CR touched (a per-file `@frozen` tag); `spec.md` is kept in sync but never frozen, and the plan (brief + ordered `todos`) is never frozen — with no separate plan gate.
- D2. The frozen `.feature` is the object at the spec gate and the bar at the impl gate.
- D3. An agent refuses to edit a frozen `.feature` and directs reverting to draft.
- D4. A fatal deal-breaker reverts an approved spec to draft (a Oracle-revert) and unfreezes the `.feature`.
- D5. A spec can be Approved with no implementation; an illegal state tuple (impl committed against an unfrozen `.feature`) is rejected.

### E. Gate verdicts (authoring + mission, producer/judge separation)
Sources: `sdd-gate-autonomy`, `automaton-deliver`, `sdd-mission-loop`.

- E1. The gate report carries a verdict with its Oracle/Builder/Architect-lens faces, the contestable defaults chosen, and a flag when self-asserted; it is regenerated from current state, never stored.
- E2. The impl gate passes only when every frozen scenario has a passing verification; an uncovered scenario fails it and `status` stays `approved`.
- E3. The cold judge runs the producer's verification and adds its own structural/scope reading; the producer never declares its own pass verdict.
- E4. `status` advances to `implemented` only when every impl-judge passes, and the gate station (not the conductor) writes `status` and the human ratification.

### F. Handoff (mission verified result → delivery shape)
Sources: `mission/handoff/` (new), commit discipline.

- F1. A verified multi-unit result lands as commits broken by unit of work in the project's declared shape.
- F2. A PR-flow project lands the result as a branch + pull request; a commit-to-main project lands it as commits on `main`.
- F3. Handoff introduces no new hard floor (no force-push/history-rewrite gate).

The realized scenarios live in the six theme `.feature` files above.

## Source

- new — workflow scenarios distilled from the in-scope specs' `.feature` files (inventory above)
- judged per `../authoring/suite-format/README.md` (boolean / rubric Gherkin, by-hand where applicable)
