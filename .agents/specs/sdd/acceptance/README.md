# acceptance/ — the e2e behavior suite

The **outcome-level (e2e) behavior suite** — the scenarios that exercise SDD end-to-end and
**span capabilities**. Consumed by `../mission/`'s step-3 verify (the impl gate). **Not a
loop step.** Unit scenarios stay colocated with their capability folder; only
cross-capability outcome scenarios live here.

Written in boolean / rubric Gherkin per `../design/suite-style.md`: every scenario is a
declarative Given/When/Then with a pass/fail reading, no rubric or threshold in the
`.feature` itself. A scenario earns a place here only if it crosses two or more capability
folders; a single-capability behavior belongs as a unit scenario.

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
- B5. An obvious stale-mistake contradiction is served as an operator minor fix, not escalated.
- B6. A self-asserted gate advances the run asynchronously and enqueues the spec for ratify-or-kick-back review.

(The mid-flight combat-log write of a halt is a **mission unit scenario**, not a cross-capability one — it colocates under `../mission/`. Acceptance keeps only the cross-capability outcome: a CR halts → a human resolves → the mission resumes, in B4.)

### C. Resolve-a-squad (registry → resolution → production chain)
Sources: `sdd-contract-registry`, `sdd-operator-resolution`, `plugin/` init-WRITE.

- C1. A plugin's init-write registers an `sdd-plugins` entry; the operator later resolves that domain's delegates from it without scanning plugin directories.
- C2. An unfilled producer role degenerates to the operator authoring inline (`produced-by.<role>: sdd:sdd-operator`); an unfilled judge role spawns the cold SDD-default judge.
- C3. A domain claimed by two plugins returns needs-input once, the choice is recorded, and resume does not loop.
- C4. A required role with no resolvable delegate hard-fails and records nothing.
- C5. Re-running init at a newer version reconciles a stale entry; a corrupt registry fails closed and is left untouched.

### D. Freeze (authoring spec gate → mission impl gate)
Sources: `sdd-operator-freeze`, `sdd-gate-autonomy`, `sdd-state-legality`.

- D1. A spec-gate approve freezes the `.feature` files the CR touched (a per-file `@frozen` tag); `spec.md` is kept aligned but never frozen, and the plan (brief + ordered `todos`) is never frozen — with no separate plan gate.
- D2. The frozen `.feature` is the object at the spec gate and the bar at the impl gate.
- D3. An agent refuses to edit a frozen `.feature` and directs reverting to draft.
- D4. A fatal deal-breaker reverts an approved spec to draft (a Director-revert) and unfreezes the `.feature`.
- D5. A spec can be Approved with no implementation; an illegal state tuple (impl committed against an unfrozen `.feature`) is rejected.

### E. Gate verdicts (authoring + mission, producer/judge separation)
Sources: `sdd-gate-autonomy`, `sdd-operator-deliver`, `sdd-mission-loop`.

- E1. The gate report carries a verdict with its Director/Builder/Architect-lens faces, the contestable defaults chosen, and a flag when self-asserted; it is regenerated from current state, never stored.
- E2. The impl gate passes only when every frozen scenario has a passing verification; an uncovered scenario fails it and leaves `aligned` false.
- E3. The cold judge runs the producer's verification and adds its own structural/scope reading; the producer never declares its own pass verdict.
- E4. `aligned` is set true only when every impl-judge passes, and the gate station (not the operator) writes `status` and the human ratification.

### F. Handoff (mission verified result → delivery shape)
Sources: `mission/handoff/` (new), commit discipline.

- F1. A verified multi-unit result lands as commits broken by unit of work in the project's declared shape.
- F2. A PR-flow project lands the result as a branch + pull request; a commit-to-main project lands it as commits on `main`.
- F3. Handoff introduces no new hard floor (no force-push/history-rewrite gate).

## Exemplars

```gherkin
Feature: SDD acceptance — change request to delivered outcome

  Scenario: A prompt-raised CR runs end-to-end to a delivered outcome
    Given a human raises a change request as a prompt
    When SDD intakes it, grills it to a spec+suite diff, passes the spec gate,
      implements against the frozen .feature, and passes the impl gate
    Then the verified result is landed in the project-declared delivery shape

  Scenario: A narrowing escalates unless the CR pre-authorized it
    Given a change request whose diff narrows an e2e acceptance scenario
    And the change request did not pre-authorize the narrowing
    When the autonomy bar assesses the write
    Then it escalates for human acknowledgment before the write lands

  Scenario: A suite contradiction halts implementation for human resolution
    Given two frozen scenarios that contradict each other and are both plausibly intended
    When the operator reaches the contradiction during implementation
    Then implementation halts
    And the bar escalates for human resolution

  Scenario: A registered plugin's delegates resolve without directory scanning
    Given a plugin's init-write added its sdd-plugins entry to the registry
    When the operator resolves delegates for that plugin's domain
    Then it reads the role-to-agent map from the registry
    And it does not scan user-global, project-global, or project-local plugin directories

  Scenario: The frozen .feature is the object at the spec gate and the bar at the impl gate
    Given the spec gate judged the .feature against the domain criteria and froze it
    When the impl gate evaluates the implementation
    Then it judges the implementation against the frozen .feature as the bar
    And the impl gate passes only when every frozen scenario has a passing verification
```

## Source

- new — e2e scenarios distilled from the in-scope specs' `.feature` files (inventory above)
- judged per `../design/suite-style.md` (boolean / rubric Gherkin, by-hand where applicable)
