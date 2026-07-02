@frozen
Feature: spec-validator — the spec-judge role
  Unit suite for the ACED spec-judge the conductor dispatches at the spec gate: grade an agent-config
  .feature against the agent-scenario criteria and report a per-scenario verdict. Authoring the suite
  is scenario-writer; running the evals is implementer; scoring one case is judge. Cross-capability
  e2e (a gate pass over a real produced suite) lives in ../../acceptance/, not here.

  # ---- Role boundary ----

  Scenario: dispatched as the spec-judge it reports a verdict
    Given the conductor dispatches spec-validator with a commit-work.feature and its subject
    When it grades the suite
    Then it reports a pass or fail verdict for each scenario in the suite

  Scenario: it never edits the spec or the feature
    Given spec-validator finds a failing scenario in the .feature
    When it records the failure
    Then it does not modify the spec.md or the .feature

  Scenario: it does not run the eval suite
    Given the subject's .feature carries inline @rubric scenarios
    When spec-validator grades the spec gate
    Then it validates the rubric structure but does not run an eval or score a case

  # ---- Fit (read, never decided) ----

  Scenario: it reads the declared fit tier before grading
    Given a subject whose spec.md declares a fit tier
    When spec-validator begins grading
    Then it reads the declared fit tier and applies only the criteria that tier carries

  Scenario: a missing fit declaration returns a content gap
    Given a subject whose spec.md declares no fit tier
    When spec-validator grades the suite
    Then it returns a content gap for the missing fit tier
    And it does not default the subject to strong fit

  Scenario: a wrong-squad subject is recused rather than graded
    Given a subject determined wrong-squad for ACED
    When spec-validator is asked to grade its suite
    Then it reports the subject recused rather than a per-scenario verdict

  # ---- The criteria ----

  Scenario: a vague stand-in fails trigger-context
    Given a scenario whose situation says only "a file" where the value matters for simulation
    When spec-validator checks trigger-context
    Then it reports that scenario failing on trigger-context

  Scenario: an uncovered rule fails rule-coverage
    Given a subject rule that no scenario in the suite exercises
    When spec-validator checks rule-coverage
    Then it reports the suite failing on rule-coverage

  Scenario: a missing near-miss fails trigger-balance for a strong-fit subject
    Given a strong-fit suite with only obviously-irrelevant negatives and no same-keyword near-miss
    When spec-validator checks trigger-balance
    Then it reports the suite failing on trigger-balance

  Scenario: a partial-fit suite with no near-miss passes trigger-balance
    Given a partial-fit suite whose subject makes no activation decision and carries no near-miss
    When spec-validator checks trigger-balance
    Then it does not report the suite failing on trigger-balance

  Scenario: too few guards fail edge-coverage
    Given a suite with only two edge-case or must-not-do guard scenarios
    When spec-validator checks edge-coverage
    Then it reports the suite failing on edge-coverage

  Scenario: a leaked grade in an untagged scenario fails boolean-form
    Given an untagged scenario whose Then asserts the agent earns a graded rubric value
    When spec-validator checks boolean-form
    Then it reports that scenario failing on boolean-form

  Scenario: a well-formed @rubric scenario passes rubric-structure
    Given a @rubric scenario with named dimensions, a per-dimension max, one threshold, and a collapsing Then
    When spec-validator checks rubric-structure
    Then it accepts the scenario and does not report it failing on boolean-form

  Scenario: a malformed @rubric scenario fails rubric-structure
    Given a @rubric scenario missing its threshold or its named dimensions
    When spec-validator checks rubric-structure
    Then it reports that scenario failing on rubric-structure before any scoring

  # ---- Reporting and guards ----

  Scenario: a clean suite passes every criterion
    Given a .feature that meets trigger-context, rule-coverage, trigger-balance, edge-coverage, boolean-form, and rubric-structure
    When spec-validator grades the suite
    Then it reports every scenario passing and emits no blocker

  Scenario: failures are reported by name with the failed check
    Given two scenarios that each fail a different criterion
    When spec-validator reports the outcome
    Then it names each failing scenario alongside the check it failed

  Scenario: a null subject returns needs-input
    Given the subject text handed to spec-validator is null
    When spec-validator cannot read the contract it must judge against
    Then it returns a needs-input status and does not invent the subject
