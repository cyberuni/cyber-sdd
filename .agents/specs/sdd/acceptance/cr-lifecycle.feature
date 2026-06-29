@frozen
Feature: SDD acceptance — CR lifecycle (intake → authoring → mission → handoff)
  Cross-capability e2e outcomes for a change request carried end-to-end. Outcome-level only;
  single-capability behavior lives as a unit scenario in its own folder.

  Scenario: a prompt-raised CR runs end-to-end to a delivered outcome
    Given a human raises a change request as a prompt
    When SDD intakes it, grills it to a spec and suite diff, passes the spec gate, implements against the frozen feature, and passes the impl gate
    Then the verified result is landed in the project-declared delivery shape

  Scenario: a GitHub or Asana CR routes through the same single intake
    Given a change request raised from a GitHub issue or an Asana task
    When SDD intakes it
    Then it enters through the same single intake as a prompt-raised CR
    And it reaches a delivered outcome through the same loop

  Scenario: an outer-loop finding re-enters only as a new CR
    Given an outer loop produces a finding
    When the finding is carried back into the system
    Then it re-enters only as a new change request
    And nothing changes the system through any side channel

  Scenario: a confidently-diffable CR self-clears the grill without a human
    Given a CR the agent can confidently turn into a spec and suite diff
    When the explore phase runs
    Then the grill step self-clears without a human stop

  Scenario: a CR's status is independent of the target spec's lifecycle status
    Given a CR moving through open, accepted, and done
    When the target spec advances through its own lifecycle status
    Then the CR status and the spec lifecycle status stay independent

  Scenario: a CR that fails a gate does not reach a delivered outcome
    Given a CR whose spec is rejected at the spec gate
    When the mission cannot pass the gate
    Then the CR does not reach a delivered outcome
    And no implementation is landed