@frozen
Feature: judge — the internal scorer
  Unit suite for the ACED scorer invoked by implementer and the run/compare reporting skills: score one
  simulated agent behavior against a rubric for a single scenario and layer, and emit the four-field
  result. Rolling up the gate verdict and aggregating across runs are implementer's job; authoring the
  rubric is scenario-writer's (inline in the frozen .feature). Cross-capability e2e (scoring inside a
  full impl-gate run) lives in ../../acceptance/, not here.

  # ---- Role boundary ----

  Scenario: invoked for one case it emits the four-field result
    Given judge is invoked with a subject and one test case for the behavior layer
    When it evaluates that case
    Then it emits a SCORE, a PASS, a WHAT WORKED, and a WHAT FAILED for that one case

  Scenario: it does not render the gate verdict
    Given judge has finished scoring one case
    When it returns its result
    Then it does not report an implementation-level gate verdict across the suite

  Scenario: it does not aggregate across runs
    Given judge is invoked once for a single run of one case
    When it returns its result
    Then it reports only that one run and does not average several runs together

  # ---- The three layers ----

  Scenario: the trigger layer scores the invoke decision
    Given a test case carrying the trigger layer
    When judge evaluates it
    Then it emits a pass-or-fail verdict on whether the agent would invoke the subject

  Scenario: the behavior layer walks the simulated steps
    Given a test case carrying the behavior layer with expected behaviors and a must-not-do list
    When judge evaluates it
    Then it compares the simulated steps against those lists and emits a verdict

  Scenario: the quality layer evaluates the produced output
    Given a test case carrying the quality layer
    When judge evaluates it
    Then it judges the simulated output against the rubric criteria and emits a verdict

  # ---- Scoring discipline and output ----

  Scenario: the rubric overrides the evaluator's own taste
    Given a rubric whose criteria conflict with the evaluator's personal preference
    When judge scores the case
    Then its verdict matches the rubric criteria, not the evaluator's own preference

  Scenario: a triggered must-not-do withholds the top score
    Given a simulation that triggers a must-not-do guard from the test case
    When judge scores the case
    Then it does not award the maximum score and emits a non-passing verdict

  Scenario: phrasing-dependent outcomes are scored conservatively
    Given a simulation whose outcome depends on how the prompt is phrased
    When judge scores the case
    Then it reports the lower pass-or-fail verdict rather than the optimistic one

  Scenario: the output is exactly the four fields
    Given any completed evaluation
    When judge returns its result
    Then it emits exactly SCORE, PASS, WHAT WORKED, and WHAT FAILED with no preamble or extra text

  Scenario: a flawless simulation reports nothing failed
    Given a simulation that meets every expected behavior and trips no must-not-do
    When judge returns its result
    Then its WHAT FAILED field reads "nothing"
