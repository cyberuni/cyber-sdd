@frozen
Feature: impl-judge — run and roll up the frozen .feature suite at the impl gate
  Unit suite for the ACED impl-judge the conductor dispatches at the impl gate: run the frozen .feature
  suite (its inline @rubric and @trigger cases) over N runs, collapse each frozen scenario to a boolean,
  and roll up the gate verdict. Authoring the .feature and its inline rubric is scenario-writer at
  explore; grading the spec .feature is spec-validator; scoring one case is judge. Cross-capability e2e
  (a full impl gate over a real subject) lives in ../../workflows/, not here.

  # ---- Role boundary ----

  Scenario: dispatched as the impl-judge it runs the evals
    Given the conductor dispatches impl-judge with a subject and its frozen .feature suite
    When it runs the impl-judge role
    Then it reports a pass or fail verdict for each frozen scenario

  Scenario: it does not author the evals
    Given the frozen .feature handed to impl-judge was authored by scenario-writer at explore
    When it runs the impl gate
    Then it does not write or rewrite the .feature or its inline rubric

  Scenario: it never edits the spec or the feature
    Given impl-judge is running the eval suite
    When it judges the implementation
    Then it does not modify the spec.md or the .feature

  Scenario: it delegates per-case scoring to judge
    Given a frozen @rubric scenario
    When impl-judge evaluates that scenario
    Then it invokes judge to do the scoring rather than scoring the case itself

  # ---- Running the suite ----

  Scenario: every frozen scenario is exercised once
    Given a frozen .feature suite
    When impl-judge loads it
    Then it exercises every frozen scenario exactly once and reads each scenario's own inline criteria

  Scenario: a trigger-layer scenario runs the trigger policy
    Given a frozen scenario tagged as a trigger-layer case
    When impl-judge runs it
    Then it runs the scenario under the trigger-run policy and reports a pass or fail

  Scenario: a behavior scenario runs N runs
    Given a frozen behavior scenario with a configured run count
    When impl-judge runs it
    Then it runs the scenario that many times before reporting its verdict

  Scenario: each scenario collapses to one boolean
    Given the aggregated runs for a scenario
    When impl-judge collapses the result
    Then it reports the scenario as passing or failing, not as a raw number

  Scenario: it blinds the judge to the scenario body
    Given impl-judge invokes judge to score a frozen scenario
    When it composes that invocation
    Then it passes the .feature path, the scenario name, and the threshold, and does not pass the scenario's steps, its Then, or its inline rubric

  Scenario: a trigger Scenario Outline is run once per Examples row
    Given a frozen trigger Scenario Outline with several Examples rows
    When impl-judge runs it
    Then it invokes judge once per Examples row passing each row's zero-based index, and aggregates the invoke decisions across the rows itself

  Scenario: an inline rubric threshold overrides the run-policy default
    Given a frozen @rubric scenario whose inline rubric declares its own threshold
    When impl-judge collapses that scenario
    Then it decides the scenario's pass or fail against the scenario's own inline threshold, not the run policy's default threshold

  Scenario: a scenario with no inline threshold collapses against the run-policy default
    Given a frozen @rubric scenario whose inline rubric declares no threshold of its own
    When impl-judge collapses that scenario
    Then it decides the scenario's pass or fail against the run policy's default threshold

  # ---- Rolling up and guards ----

  Scenario: all scenarios passing rolls up to a passing gate
    Given every frozen scenario collapsed to passing
    When impl-judge rolls up the gate verdict
    Then it reports the implementation passing

  Scenario: any scenario failing rolls up to a failing gate
    Given at least one frozen scenario collapsed to failing
    When impl-judge rolls up the gate verdict
    Then it reports the implementation failing and names the failing scenarios

  Scenario: a @rubric scenario with no inline rubric is a blocker
    Given a frozen @rubric scenario whose inline rubric block is absent
    When impl-judge loads the suite
    Then it reports a blocker and does not free-author the missing rubric

  Scenario: a behavior-changing gap is a blocker not an edit
    Given impl-judge finds a behavior-changing gap while running the suite
    When it records the gap
    Then it reports a blocker and does not edit the spec.md or the .feature

  Scenario: a trigger scenario collapses on activation accuracy
    Given the aggregated invoke decisions across a trigger scenario's Examples rows
    When impl-judge collapses the result
    Then it passes the scenario when the activation accuracy meets the trigger threshold, not when a rubric total meets its threshold

  Scenario: a triggered must-not-do fails the scenario outright
    Given a scenario whose run trips a must-not-do while its aggregate total still meets the threshold
    When impl-judge collapses the result
    Then it reports the scenario failing regardless of the total

  Scenario: a failing scenario is reported with its per-dimension scores
    Given a frozen @rubric scenario that collapsed to failing
    When impl-judge reports it
    Then it reports the scenario's per-dimension scores, not the total alone
