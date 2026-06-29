@frozen
Feature: The split-spec procedure — propose decomposing an oversized spec
  Unit suite for the split-spec tool. Decomposition-analysis and proposal behaviors only — it
  executes nothing and writes nothing. Cross-capability e2e scenarios live in ../../acceptance/.

  # ── Split an oversized spec ──

  Scenario: the target's decisions and scenarios group into cohesive concerns
    Given an oversized spec holding several independent concerns
    When split-spec analyzes the target
    Then it groups the design decisions and scenarios into cohesive child concerns

  Scenario: every decision and scenario lands in exactly one child
    Given a proposed split into child concerns
    When split-spec produces the plan
    Then each design decision is assigned to exactly one child
    And each scenario is assigned to exactly one child

  Scenario: shared vocabulary is lifted to a governance rather than duplicated
    Given a concept used across more than one proposed child
    When split-spec produces the plan
    Then the shared concept is proposed as a governance
    And it is not copied into each child

  Scenario: the plan states each child's scope
    Given a proposed split into child concerns
    When split-spec produces the plan
    Then the plan names each child and the scope it owns

  Scenario: deleting the parts about one topic is out of scope
    Given a request to just remove the parts of a spec about one topic
    When split-spec is asked to handle it
    Then it reports the request as a revise or deprecate, not a split

  # ── The write-free and freeze boundary ──

  Scenario: the tool writes nothing and requires approval before any change
    Given split-spec has produced a split plan
    When it completes
    Then it has written no artifact, status, approval, or freeze
    And no child is created without explicit approval

  Scenario: a frozen target routes through the draft re-open path
    Given a target whose status is approved and whose .feature is frozen
    When the plan would move scenarios into a child
    Then the tool requires the draft re-open before any scenario moves