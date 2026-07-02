@frozen
Feature: run — score the current config against its golden set
  Unit suite for the run skill: resolve a golden-set eval suite, judge every case, and report.
  Scoring a single case is aced-case-judge's contract; diff and roll-up are compare/report. Cross-
  capability e2e scenarios live in ../../acceptance/.

  # ---- Triggering ----

  Scenario: a request to score a config against its suite triggers run
    Given the user asks to run the evals for an agent configuration
    When ACED routes the request
    Then run handles it

  Scenario: a request to diff two versions defers to compare
    Given the user asks to compare two versions of a configuration
    When ACED routes the request
    Then run does not handle it and compare does

  Scenario: a request for a project-wide health summary defers to report
    Given the user asks for the eval health across all suites
    When ACED routes the request
    Then run does not handle it and report does

  Scenario: a request to add a case defers to add
    Given the user asks to add a case for a failure they just saw
    When ACED routes the request
    Then run does not handle it and add does

  # ---- Resolving the suite ----

  Scenario: a single suite is selected automatically
    Given exactly one eval suite exists and the user names no target
    When run resolves the suite
    Then it selects that suite without asking

  Scenario: a named target resolves to its suite
    Given the user names a target configuration
    When run resolves the suite
    Then it selects the eval suite belonging to that target

  Scenario: several suites prompt the user to choose
    Given more than one eval suite exists and the user names no target
    When run resolves the suite
    Then it asks the user which suite to run

  Scenario: no suite reports that none is initialized
    Given no eval suite exists for the request
    When run resolves the suite
    Then it reports that no eval suite is initialized and does not run

  # ---- Running the cases ----

  Scenario: the full target config is read before judging
    Given a resolved suite and its target configuration
    When run prepares the evaluation
    Then it reads the target configuration in full before any case is judged

  Scenario: every case runs in a stable order
    Given a golden set of several cases
    When run executes the suite
    Then it judges every case in filename order

  Scenario: layers absent from the suite config are skipped
    Given a suite whose config omits a layer
    When run executes a case carrying that layer
    Then it skips that layer for the case

  Scenario: a failing case does not stop the run
    Given a golden set where an early case fails
    When run executes the suite
    Then it judges all remaining cases before reporting

  # ---- Reporting and persistence ----

  Scenario: the report states pass rate and per-layer breakdown
    Given a completed run
    When run reports the outcome
    Then it states the overall pass rate and the per-layer pass rate

  Scenario: failing cases are listed worst-first
    Given a completed run with at least one failing case
    When run reports the outcome
    Then it lists the failing cases ordered worst-first

  Scenario: the run is persisted as a timestamped record
    Given a completed run
    When run finishes
    Then it writes a timestamped results record under the suite's results directory

  Scenario: an all-passing run points to widening coverage
    Given a run in which every case passes
    When run reports the outcome
    Then it suggests running add to expand edge-case coverage
