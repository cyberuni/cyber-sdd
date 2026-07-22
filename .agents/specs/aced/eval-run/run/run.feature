@frozen
Feature: run — score the current config against its frozen .feature suite
  Unit suite for the run skill: resolve the frozen .feature suite and its eval.md, judge every
  scenario, and report. Scoring a single case is aced-case-judge's contract; diff and roll-up are
  compare/report. Cross-capability e2e scenarios live in ../../workflows/.

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

  Scenario: every scenario runs in a stable order
    Given a frozen .feature of several scenarios
    When run executes the suite
    Then it judges every scenario in .feature order

  Scenario: layers absent from the suite config are skipped
    Given an eval.md whose layers omit a layer
    When run executes a scenario tagged with that layer
    Then it skips that layer for the scenario

  Scenario: an untagged scenario is treated as a behavior scenario
    Given a scenario with no layer tag
    When run determines its layer
    Then it treats the scenario as a behavior scenario

  Scenario: the judge receives the scenario location, not its body
    Given a resolved suite and a scenario to score
    When run invokes the case judge
    Then it passes the .feature path and the scenario name and never the steps, the Then, or the rubric

  Scenario: a scenario's own inline pass bar overrides the default
    Given a scenario declaring its own inline pass bar and an eval.md default pass bar
    When run scores that scenario
    Then it judges against the scenario's own inline pass bar rather than the eval.md default

  Scenario: a trigger outline is judged once per Examples row
    Given a trigger Scenario Outline with several Examples rows
    When run executes that scenario
    Then it invokes the judge once for each Examples row

  Scenario: the trigger layer is scored over its configured run count
    Given an eval.md whose trigger run policy sets more than one run
    When run executes a trigger scenario
    Then it judges the scenario over that many runs rather than once

  Scenario: a behavior scenario is judged once unless the caller sets a run count
    Given a behavior scenario and no caller-set run count
    When run executes that scenario
    Then it judges the scenario once rather than over the trigger run count

  Scenario: a failing scenario does not stop the run
    Given a frozen .feature where an early scenario fails
    When run executes the suite
    Then it judges all remaining scenarios before reporting

  # ---- Reporting and persistence ----

  Scenario: the report states pass rate and per-layer breakdown
    Given a completed run
    When run reports the outcome
    Then it states the overall pass rate and the per-layer pass rate

  Scenario: totals are reported against their own maximum, not as comparable raw numbers
    Given scenarios whose maxima differ
    When run reports the outcome
    Then it reports each total against its own maximum rather than averaging the raw totals into one number

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
