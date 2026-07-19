@frozen
Feature: SDD acceptance — gate verdicts (producer/judge separation across both gates)
  Cross-capability e2e outcomes for the gate verdicts spanning authoring and mission.
  Outcome-level only.

  Scenario: the gate report carries a verdict regenerated from current state
    Given a gate rendering its report
    When the report is produced
    Then it carries the verdict with its Oracle, Builder, and Architect lens faces
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

  Scenario: a finding naming one instance is answered with its rule and its sweep
    Given a gate verdict of change whose finding names one artifact
    When the producer returns its remediation
    Then the returned remediation names the rule that finding instantiates
    And it lists the other instances of that rule the sweep found
    And it lists the candidates the sweep inspected and excluded

  Scenario: a correction contradicting the rule governing its artifact is rejected
    Given a correction that clears the finding it answers
    And that correction contradicts a governance the corrected artifact is bound by
    When the correction is checked before re-gating
    Then it is rejected

  Scenario: a correction satisfying both the finding and its governing rule is accepted
    Given a correction that clears the finding it answers
    And that correction agrees with every governance the corrected artifact is bound by
    When the correction is checked before re-gating
    Then it is accepted

  Scenario: a finding naming an artifact the previous round changed is a regression
    Given a gate finding naming an artifact that the previous remediation round's commits changed
    When the producer accounts for that finding's provenance
    Then the returned remediation reports it as a regression
    And the loop stops for a re-plan rather than opening another remediation round

  Scenario: a finding naming an artifact older than the previous round continues the loop
    Given a gate finding naming an artifact that predates the previous remediation round's commits
    When the producer accounts for that finding's provenance
    Then the returned remediation reports it as pre-existing
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