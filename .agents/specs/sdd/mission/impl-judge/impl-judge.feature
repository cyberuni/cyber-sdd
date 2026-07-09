@frozen
Feature: The impl-judge procedure — run the verification against the frozen contract
  Unit suite for the default impl-judge (sdd-impl-judge). Judge behaviors only — it runs the
  verification the impl-producer authored and advises; it never authors tests, sets the bar, or
  writes the gate verdict (that is ../conductor/). Cross-capability e2e scenarios live in
  ../../acceptance/.

  # ---- Map and run ----

  Scenario: each frozen scenario is mapped to its authored verification
    Given a frozen feature and the impl-producer's verification
    When the impl-judge runs
    Then it locates one functional check per frozen scenario among that verification
    And it does not free-author a check of its own

  Scenario: the judge re-derives the oracle from a scenario it judges by hand
    Given a frozen scenario the impl-judge judges by hand and the impl-producer's authored check
    When the impl-judge judges that scenario
    Then it derives the expected behavior from the scenario's Given and When and Then
    And it confirms the authored check asserts that behavior rather than trusting the producer's chosen assertion

  Scenario: a by-hand check whose assertion diverges from the re-derived oracle fails
    Given a frozen scenario the impl-judge judges by hand whose authored check asserts something other than the re-derived oracle
    When the impl-judge judges that scenario
    Then it reports that scenario failing rather than trusting the producer's assertion

  Scenario: a by-hand scenario passes only when its check exercises the asserted behavior
    Given a frozen scenario the impl-judge judges by hand with an authored check
    When the impl-judge runs the check
    Then the scenario passes only when a passing check exercises the observable behavior it asserts

  Scenario: a by-hand passing check that does not exercise the asserted behavior fails its scenario
    Given a frozen scenario the impl-judge judges by hand whose authored check passes without exercising the behavior it asserts
    When the impl-judge judges that scenario
    Then it reports that scenario failing

  Scenario: the producer's own green run is a pre-filter, not the verdict
    Given the impl-producer reports its authored tests passing
    When the impl-judge judges the implementation
    Then the producer's passing run does not by itself pass the gate
    And the judge's independent re-derivation decides the verdict of each scenario it judges by hand

  Scenario: without a scenario bridge the judge re-derives the oracle for every scenario regardless of blast radius
    Given a domain with no scenario bridge configured
    And frozen scenarios at both high and low blast radius
    When the impl-judge judges each scenario
    Then it re-derives the oracle from the frozen scenario in every case
    And it never substitutes the producer's passing run for its own re-derivation on a low-blast-radius scenario

  Scenario: a frozen scenario with no verification fails
    Given a frozen scenario that has no authored verification
    When the impl-judge runs
    Then it reports that scenario failing

  Scenario: a failing check fails its scenario
    Given a frozen scenario whose authored check fails
    When the impl-judge runs the check
    Then it reports that scenario failing

  # ---- The scenario bridge (deterministic artifact-types) ----

  Scenario: for a deterministic artifact-type the judge runs the scenario bridge
    Given a deterministic artifact-type with a scenario bridge configured
    When the impl-judge judges the implementation
    Then it runs verify-scenarios to classify each frozen scenario as PASS or FAIL or UNBOUND

  Scenario: an UNBOUND scenario from the bridge gets the full by-hand judgment
    Given the scenario bridge reports a frozen scenario UNBOUND
    When the impl-judge judges that scenario
    Then it re-derives the oracle and verifies the behavior by hand

  Scenario: a FAIL from the bridge fails its scenario
    Given the scenario bridge reports a frozen scenario FAIL
    When the impl-judge judges that scenario
    Then it reports that scenario failing

  Scenario: a low-blast-radius bound and passing scenario is accepted on the bridge report
    Given the run-level leash is low blast radius
    And the scenario bridge reports a frozen scenario bound and passing
    When the impl-judge judges that scenario
    Then it accepts the passing bound test on the bridge report without re-deriving the oracle by hand

  Scenario: a high-blast-radius bound and passing scenario is still re-derived independently
    Given the run-level leash is high blast radius
    And the scenario bridge reports a frozen scenario bound and passing
    When the impl-judge judges that scenario
    Then it re-derives the oracle and applies the exercise backstop rather than trusting the bound test

  Scenario: the bound-scenario blast-radius split uses the run-level leash
    Given the impl-judge consuming the scenario bridge
    When it decides whether to re-derive a bound and passing scenario
    Then it reads the blast radius from the run-level leash rather than a per-scenario tag

  Scenario: a domain with no scenario bridge falls back to full by-hand judging
    Given a domain with no scenario bridge configured
    When the impl-judge judges the implementation
    Then it judges every frozen scenario by hand rather than consuming a bridge report

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

  Scenario: a structural read finding is raised as a blocker that withholds the pass
    Given the impl-judge's orthogonal structural read finds a fit or duplication or conflict problem
    When the impl-judge reports its result
    Then it raises that finding as a structural blocker distinct from the per-scenario checks
    And it does not report the implementation passing while that structural blocker stands

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

  Scenario: each failing scenario is reported by name with its owning lens and failed check
    Given a run where one or more frozen scenarios fail
    When the impl-judge reports its result
    Then it names each failing scenario with the lens that owns it and the check that failed

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