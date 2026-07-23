@frozen
Feature: SDD acceptance — escalation floor (the autonomy bar across authoring + mission)
  Cross-capability e2e outcomes for the self-clear-vs-escalate floor spanning both gates.
  Outcome-level only.

  # ── Self-clear within leash ──

  Scenario: an additive minor change self-clears both gates
    Given a change that is additive, internal, and minor
    When it passes through the spec gate and the impl gate
    Then it self-clears both gates with no human stop

  Scenario: a change within the change-class ceiling proceeds without halting
    Given a change whose semver class is within the authorized ceiling
    When the autonomy bar assesses the write
    Then it proceeds without halting

  Scenario: an obvious stale-mistake contradiction is a minor fix, not an escalation
    Given a contradiction that is an obvious stale mistake
    When the conductor reaches it
    Then it is served as a conductor minor fix
    And it is not escalated

  # ── Escalate at the floor ──

  Scenario: a narrowing escalates unless the CR pre-authorized it
    Given a change whose diff narrows an e2e acceptance scenario
    And the change request did not pre-authorize the narrowing
    When the autonomy bar assesses the write
    Then it escalates for human acknowledgment before the write lands

  Scenario: a class-exceeding change escalates as Compatibility
    Given a change whose semver class exceeds the authorized change-class ceiling
    When the autonomy bar assesses the write
    Then it escalates as a Compatibility stop

  Scenario: a suite contradiction halts implementation for human resolution
    Given two frozen scenarios that contradict each other and are both plausibly intended
    When the conductor reaches the contradiction during implementation
    Then implementation halts
    And the bar escalates for human resolution

  # ── Async ratification ──

  Scenario: a self-asserted gate advances asynchronously and enqueues for review
    Given a gate the conductor self-asserts within its leash
    When the verdict is recorded
    Then the run advances asynchronously
    And the spec appears in the ratify-or-kick-back review backlog