Feature: The impl-judge procedure — run the verification against the frozen contract
  Unit suite for the default impl-judge (sdd-implementer). Judge behaviors only — it runs the
  verification the impl-producer authored and advises; it never authors tests, sets the bar, or
  writes the gate verdict (that is ../../conductor/). Cross-capability e2e scenarios live in
  ../../../acceptance/.

  # ---- Map and run ----

  Scenario: each frozen scenario is mapped to its authored verification
    Given a frozen feature and the impl-producer's verification
    When the impl-judge runs
    Then it locates one functional check per frozen scenario among that verification
    And it does not free-author a check of its own

  Scenario: a scenario passes only when its check exercises the asserted behavior
    Given a frozen scenario with an authored check
    When the impl-judge runs the check
    Then the scenario passes only when a passing check exercises the observable behavior it asserts

  Scenario: a frozen scenario with no verification fails
    Given a frozen scenario that has no authored verification
    When the impl-judge runs
    Then it reports that scenario failing

  Scenario: a failing check fails its scenario
    Given a frozen scenario whose authored check fails
    When the impl-judge runs the check
    Then it reports that scenario failing

  # ---- Structural read and rollup ----

  Scenario: the judge folds in an orthogonal structural read
    Given the impl-judge running the verification
    When it judges the implementation
    Then it folds in a fit and no-duplication and no-conflict reading orthogonal to the builder's lens

  Scenario: the implementation passes only when every scenario passes
    Given a run where some frozen scenarios pass and at least one fails
    When the impl-judge rolls up its result
    Then it reports the implementation not passing

  Scenario: the implementation passes when every scenario has a passing check
    Given a run where every frozen scenario has a passing check
    When the impl-judge rolls up its result
    Then it reports the implementation passing

  # ---- Boundaries ----

  Scenario: a graded subject is collapsed to a boolean per scenario
    Given a scenario whose check yields a rubric score
    When the impl-judge reports it
    Then it collapses the score to a boolean pass or fail for that scenario

  Scenario: a behavior-changing gap is reported as a blocker, not edited
    Given the impl-judge finds a gap that needs specified behavior to change
    When it reports
    Then it raises a blocker
    And it does not edit spec.md or the feature

  Scenario: the judge runs cold and only advises
    Given the impl-judge spawned at the impl gate
    When it completes
    Then it runs in a fresh context the impl-producer cannot reach
    And it returns advice rather than writing the gate verdict, status, or aligned
