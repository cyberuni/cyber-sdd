@frozen
Feature: The solution-producer procedure — record the per-unit solution
  Unit suite for the solution-producer-governance procedure. Solution-producer behaviors only —
  the optional per-unit design record. No gate, no judge, no freeze (the solution is ungated and
  unfrozen). It writes no spec.md prose, no .feature, and no control frontmatter.

  # ---- When a solution is written, and when it is not ----

  Scenario: a unit with a real design fork gets a solution record
    Given a unit whose shape was chosen over plausible alternatives
    When the solution-producer runs
    Then it writes a solution record beside the unit's spec and suite
    And the record names the chosen approach and the rejected alternatives

  Scenario: a unit with no durable rationale gets no solution file
    Given a unit whose shape follows directly from its spec
    When the solution-producer runs
    Then no solution file is written

  Scenario: a revise tightens an existing solution in place
    Given a unit that already has a solution record
    When a revise changes the design reasoning
    Then the existing solution is tightened in place

  Scenario: a revise whose design fork no longer exists removes the solution file
    Given a unit that already has a solution record
    When a revise leaves the unit with no remaining design fork
    Then the existing solution file is removed

  Scenario: grill discussion without a real fork gets no solution file
    Given a unit with extensive grill discussion but only one viable approach
    When the solution-producer evaluates it
    Then no solution file is written

  # ---- What the solution records — and must not ----

  Scenario: the solution is aligned to the design boundary, not to scenarios
    Given a unit with several scenarios and one design fork
    When the solution-producer records the solution
    Then the record maps to the design decision
    And it does not carry one entry per scenario

  Scenario: a solution that only restates the contract is not written
    Given a candidate solution that only paraphrases the spec and suite
    When the solution-producer evaluates it
    Then no solution file is written

  Scenario: the solution-producer writes no spec, suite, or control frontmatter
    Given the solution-producer recording a unit's design rationale
    When it writes the solution file
    Then it writes no spec.md prose, no .feature, and no control frontmatter

  Scenario: a behavior gap found while recording becomes an observation, not an edit
    Given the solution-producer finds a behavior gap while recording the rationale
    When it reports
    Then it raises the gap as an observation
    And it does not edit spec.md or the feature in place

  Scenario: the solution lives beside the unit and persists
    Given a unit with a durable design rationale
    When the solution is recorded
    Then the file is placed next to the unit's README and feature
    And it persists rather than living in the per-CR execution plan

  # ---- Ungated, unfrozen, transitively validated ----

  Scenario: no judge grades the solution
    Given a unit with a solution record
    When the spec gate and the impl gate run
    Then neither gate judges the solution directly

  Scenario: the freeze never touches the solution
    Given a unit whose feature is frozen at the spec gate
    When the freeze is applied
    Then the solution file is not frozen

  Scenario: a wrong solution surfaces through the implementation
    Given a recorded solution whose chosen approach is wrong
    When the implementation is built against the frozen feature
    Then the implementation fails its frozen scenarios
    And the solution is validated transitively rather than by its own gate

  # ---- Producer surface ----

  Scenario: the solution-producer runs in-session and is never spawned
    Given an SDD-default solution-producer role
    When the conductor runs it
    Then it runs inline in the conductor's session
    And it is recorded as produced by the conductor