@frozen
Feature: SDD acceptance — handoff (the verified result → the delivery shape)
  Cross-capability e2e outcomes for landing a verified result, spanning mission/handoff and
  commit discipline. Outcome-level only.

  Scenario: a verified multi-unit result lands as commits broken by unit of work
    Given a verified result spanning several units of work
    When handoff lands it
    Then it lands as commits broken by unit of work in the project's declared shape

  Scenario: a PR-flow project lands the result as a branch and pull request
    Given a project whose declared delivery shape is PR-flow
    When handoff lands the verified result
    Then it lands as a branch and a pull request

  Scenario: a commit-to-main project lands the result as commits on main
    Given a project whose declared delivery shape is commit-to-main
    When handoff lands the verified result
    Then it lands as commits on main

  Scenario: handoff introduces no new hard floor
    Given handoff landing a verified result
    When it runs
    Then it introduces no new hard floor
    And it adds no force-push or history-rewrite gate

  Scenario: a rejected push leaves the verified result unlanded
    Given a PR-flow project whose branch push is rejected
    When handoff attempts to land the verified result
    Then the result is not landed
    And handoff surfaces the failure rather than forcing the push