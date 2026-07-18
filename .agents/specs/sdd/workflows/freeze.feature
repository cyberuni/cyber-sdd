@frozen
Feature: SDD acceptance — freeze (the spec gate → the impl gate)
  Cross-capability e2e outcomes for the freeze that spans authoring's spec gate and mission's
  impl gate. Outcome-level only.

  Scenario: a spec-gate approve freezes the CR's touched feature files
    Given a CR approved at the spec gate
    When the gate applies its verdict
    Then each feature file the CR touched carries a per-file frozen tag
    And spec.md is kept in sync but never frozen
    And the plan brief and its todos are never frozen and have no separate gate

  Scenario: the frozen feature is the object at the spec gate and the bar at the impl gate
    Given the spec gate judged the feature and froze it
    When the impl gate evaluates the implementation
    Then it judges the implementation against the frozen feature as the bar

  Scenario: an agent refuses to edit a frozen feature
    Given a feature that is frozen
    When an agent is asked to edit it
    Then it refuses
    And it directs reverting the spec to draft first

  Scenario: a fatal deal-breaker reverts an approved spec to draft and unfreezes it
    Given an approved spec with a fatal deal-breaker found later
    When a Director-lens revert is applied
    Then the spec returns to draft
    And its feature is unfrozen

  Scenario: a spec can be approved with no implementation
    Given a spec approved at the spec gate
    When no implementation has been built yet
    Then the approved state is legal

  Scenario: an implementation committed against an unfrozen feature is rejected
    Given an implementation committed against a feature that is not frozen
    When the state is checked
    Then the illegal state tuple is rejected