Feature: SDD acceptance — gate verdicts (producer/judge separation across both gates)
  Cross-capability e2e outcomes for the gate verdicts spanning authoring and mission.
  Outcome-level only.

  Scenario: the gate report carries a verdict regenerated from current state
    Given a gate rendering its report
    When the report is produced
    Then it carries the verdict with its Director, Builder, and Architect lens faces
    And it names the contestable defaults chosen
    And it flags when the verdict was self-asserted
    And it is regenerated from current state rather than stored

  Scenario: the impl gate passes only when every frozen scenario has a passing verification
    Given an implementation judged at the impl gate
    When every frozen scenario has a passing verification
    Then the impl gate passes

  Scenario: an uncovered frozen scenario fails the impl gate
    Given a frozen scenario with no passing verification
    When the impl gate evaluates the implementation
    Then the impl gate fails
    And status stays approved

  Scenario: the cold judge re-reads structurally and the producer never self-passes
    Given the impl-producer authored the verification
    When the cold impl-judge judges the implementation
    Then the verdict reports the producer's verification result and the judge's own structural and scope findings
    And the producer never declares its own pass verdict

  Scenario: status advances to implemented only when every impl-judge passes
    Given an implementation at the impl gate
    When every impl-judge passes
    Then status advances to implemented
    And the gate station, not the conductor, writes status and the human ratification
