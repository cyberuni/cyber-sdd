@frozen
Feature: impl-judge — run and roll up the eval suite at the impl gate
  Unit suite for the ACED impl-judge the conductor dispatches at the impl gate: run the eval suite the
  impl-producer authored over N runs, collapse each frozen scenario to a boolean, and roll up the gate
  verdict. Authoring the evals is the impl-producer; grading the spec .feature is spec-validator;
  scoring one case is judge. Cross-capability e2e (a full impl gate over a real subject) lives in
  ../../acceptance/, not here.

  # ---- Role boundary ----

  Scenario: dispatched as the impl-judge it runs the evals
    Given the conductor dispatches impl-judge with a subject and its eval suite keyed to frozen scenarios
    When it runs the impl-judge role
    Then it reports a pass or fail verdict for each frozen scenario

  Scenario: it does not author the evals
    Given the eval suite handed to impl-judge was written by the impl-producer
    When it runs the impl gate
    Then it does not write or rewrite any rubric or golden-set case

  Scenario: it never edits the spec or the feature
    Given impl-judge is running the eval suite
    When it judges the implementation
    Then it does not modify the spec.md or the .feature

  Scenario: it delegates per-case scoring to judge
    Given a frozen scenario with its eval
    When impl-judge evaluates that scenario
    Then it invokes judge to do the scoring rather than scoring the case itself

  # ---- Running the suite ----

  Scenario: one eval per frozen scenario is confirmed
    Given every frozen .feature scenario has exactly one eval keyed to it
    When impl-judge loads the eval suite
    Then it runs one eval per frozen scenario

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

  # ---- Rolling up and guards ----

  Scenario: all scenarios passing rolls up to a passing gate
    Given every frozen scenario collapsed to passing
    When impl-judge rolls up the gate verdict
    Then it reports the implementation passing

  Scenario: any scenario failing rolls up to a failing gate
    Given at least one frozen scenario collapsed to failing
    When impl-judge rolls up the gate verdict
    Then it reports the implementation failing and names the failing scenarios

  Scenario: a frozen scenario with no eval is a blocker
    Given a frozen scenario that has no eval authored for it
    When impl-judge loads the eval suite
    Then it reports a blocker and does not free-author the missing eval

  Scenario: a behavior-changing gap is a blocker not an edit
    Given impl-judge finds a behavior-changing gap while running the suite
    When it records the gap
    Then it reports a blocker and does not edit the spec.md or the .feature
