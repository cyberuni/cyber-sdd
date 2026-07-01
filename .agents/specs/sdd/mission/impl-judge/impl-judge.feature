@frozen
Feature: The impl-judge procedure — run the verification against the frozen contract
  Unit suite for the default impl-judge (sdd-implementer). Judge behaviors only — it runs the
  verification the impl-producer authored and advises; it never authors tests, sets the bar, or
  writes the gate verdict (that is ../conductor/). Cross-capability e2e scenarios live in
  ../../acceptance/.

  # ---- Map and run ----

  Scenario: each frozen scenario is mapped to its authored verification
    Given a frozen feature and the impl-producer's verification
    When the impl-judge runs
    Then it locates one functional check per frozen scenario among that verification
    And it does not free-author a check of its own

  Scenario: the judge re-derives the oracle from the frozen scenario
    Given a frozen scenario and the impl-producer's authored check
    When the impl-judge judges that scenario
    Then it derives the expected behavior from the scenario's Given and When and Then
    And it confirms the authored check asserts that behavior rather than trusting the producer's chosen assertion

  Scenario: a check whose assertion diverges from the re-derived oracle fails
    Given a frozen scenario whose authored check asserts something other than the re-derived oracle
    When the impl-judge judges that scenario
    Then it reports that scenario failing rather than trusting the producer's assertion

  Scenario: a scenario passes only when its check exercises the asserted behavior
    Given a frozen scenario with an authored check
    When the impl-judge runs the check
    Then the scenario passes only when a passing check exercises the observable behavior it asserts

  Scenario: a passing check that does not exercise the asserted behavior fails its scenario
    Given a frozen scenario whose authored check passes without exercising the behavior it asserts
    When the impl-judge judges that scenario
    Then it reports that scenario failing

  Scenario: the producer's own green run is a pre-filter, not the verdict
    Given the impl-producer reports its authored tests passing
    When the impl-judge judges the implementation
    Then the producer's passing run does not by itself pass the gate
    And the judge's independent re-derivation decides each scenario's verdict

  Scenario: a frozen scenario with no verification fails
    Given a frozen scenario that has no authored verification
    When the impl-judge runs
    Then it reports that scenario failing

  Scenario: a failing check fails its scenario
    Given a frozen scenario whose authored check fails
    When the impl-judge runs the check
    Then it reports that scenario failing

  # ---- Structural read and rollup ----

  Scenario: a high-blast-radius scenario gets the behavioral-exercise backstop
    Given a frozen high-blast-radius scenario with a passing check
    When the impl-judge applies the exercise backstop
    Then it confirms the check fails when the named behavior is broken
    And it scopes the backstop to the behavior the scenario names rather than the whole codebase

  Scenario: a low-blast-radius scenario skips the exercise backstop
    Given a frozen low-blast-radius scenario within the leash
    When the impl-judge judges it
    Then it does not apply the exercise backstop to that scenario

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
    And it returns advice rather than writing the gate verdict or status

  Scenario: the judge runs at a different model from the producer where the harness allows
    Given the impl-judge spawned cold at the impl gate
    When the harness allows selecting the grader model
    Then it runs at a different model from the impl-producer to break correlated blind spots