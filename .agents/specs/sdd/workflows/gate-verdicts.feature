@frozen
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

  # ── Remediation: a change verdict is evidence, not a work order ──

  Scenario: a finding the producer cannot substantiate is contested rather than edited away
    Given a gate verdict of change carrying a finding
    And the producer's own inspection does not substantiate that finding
    When the producer responds to the verdict
    Then it returns its evidence against the finding
    And it makes no edit to the artifact the finding named

  Scenario: a substantiated finding is remediated
    Given a gate verdict of change carrying a finding
    And the producer's own inspection substantiates that finding
    When the producer responds to the verdict
    Then it remediates the finding

  Scenario: a finding naming one instance is swept for every instance before it is fixed
    Given a gate verdict of change whose finding names one artifact
    When the producer responds to the verdict
    Then it states the rule that finding instantiates
    And it sweeps the corpus for every other instance of that rule
    And its remediation covers the instances the sweep returned

  Scenario: a correction is re-derived against the rule that governs it
    Given a producer that has corrected an artifact a finding named
    When the correction is checked before re-gating
    Then it is checked against the rule governing that artifact
    And a correction that clears the finding while contradicting that rule is rejected

  Scenario: a finding caused by the previous round's fix halts the loop
    Given a gate round carrying a finding that the previous round's remediation introduced
    When the producer accounts for its findings by provenance
    Then it reports the loop as diverging
    And it re-plans rather than opening another remediation round

  Scenario: a round whose findings all predate the last fix continues the loop
    Given a gate round whose findings all predate the previous round's remediation
    When the producer accounts for its findings by provenance
    Then it reports the loop as converging
    And remediation continues

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