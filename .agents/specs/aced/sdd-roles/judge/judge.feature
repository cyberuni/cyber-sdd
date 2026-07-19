@frozen
Feature: judge — the internal scorer
  Unit suite for the ACED scorer invoked by implementer and the run/compare reporting skills: score one
  simulated agent behavior against a rubric for a single scenario and layer, and emit a score per named
  rubric dimension collapsed to one verdict. The simulation it scores is produced blind, in a context
  that never saw the rubric or the expected outcome. Rolling up the gate verdict and aggregating across
  runs are implementer's job; authoring the rubric is scenario-writer's (inline in the frozen .feature).
  Cross-capability e2e (scoring inside a full impl-gate run) lives in ../../workflows/, not here.

  # ---- Role boundary ----

  Scenario: invoked for one rubric case it emits a score per named dimension
    Given judge is invoked with a subject and one rubric case for the behavior layer
    When it evaluates that case
    Then it emits exactly one score per named dimension in that case's rubric, and never a single collapsed score standing for all of them
    And it emits a PASS, a WHAT WORKED, and a WHAT FAILED for that one case

  Scenario: it does not render the gate verdict
    Given judge has finished scoring one case
    When it returns its result
    Then it does not report an implementation-level gate verdict across the suite

  Scenario: it does not aggregate across runs
    Given judge is invoked once for a single run of one case
    When it returns its result
    Then it reports only that one run and does not average several runs together

  # ---- The blind simulation protocol ----

  Scenario: the simulation is produced in a context separate from the scoring
    Given judge is invoked with a subject and one test case
    When it evaluates that case
    Then the simulation is produced in one context and scored in a different one

  Scenario: the simulating brief is extracted mechanically rather than composed by the judge
    Given a test case in a frozen .feature carrying a name, Given and When steps, a Then, and an inline rubric
    When judge composes the brief for the simulating context
    Then the extractor engine produces that brief, and judge never decides by its own judgment what to withhold

  Scenario: the simulating context is not shown the rubric
    Given a test case carrying an inline rubric of named dimensions with scoring ladders
    When judge produces the simulation
    Then the context that simulates is never shown the rubric

  Scenario: the simulating context is dispatched without a reachable copy of the frozen suite
    Given judge dispatches a context to simulate a case
    When it states its dispatch intent
    Then that intent requires a context which cannot read the frozen suite, and judge never passes the suite path to it

  Scenario: the simulating context is not shown the expected outcome
    Given a test case whose name states the verdict and whose Then states the expected outcome
    When judge produces the simulation
    Then both that name and that Then are withheld from the context that simulates

  Scenario: the simulating context is shown the situation and nothing else from the case
    Given a test case carrying Given and When steps alongside its name, Then, and rubric
    When judge produces the simulation
    Then the context that simulates receives the subject and those Given and When steps only

  Scenario: the scored simulation is the one the blind context returned
    Given a separate blind context has returned its simulation transcript
    When judge scores that case
    Then every dimension's verdict is derived from that returned transcript, and the context that scores never produces a simulation of its own

  Scenario: the context that scores reads the expected outcome
    Given a case whose must-not-do guards and expected behaviors live in its Then steps
    When judge scores the returned transcript
    Then it reads those Then steps, so what it gates on is never absent from the context that scores

  Scenario: an empty brief fails closed whatever the extractor's exit code
    Given the extractor emits an empty brief while reporting success
    When judge would dispatch the simulation
    Then it reports a blocker and scores nothing, rather than simulating from nothing

  Scenario: a dispatch returning no transcript fails closed
    Given the dispatched context returns no transcript
    When judge would score the case
    Then it reports a blocker and scores nothing, rather than simulating in the context that scores

  Scenario: one invocation covers both passes
    Given a caller holding a subject and one test case
    When it invokes judge once
    Then judge produces the blind simulation and scores it, requiring no second invocation from the caller

  # ---- The three layers ----

  Scenario: the trigger layer scores the invoke decision
    Given a test case carrying the trigger layer
    When judge evaluates it
    Then it emits a pass-or-fail verdict on whether the agent would invoke the subject

  Scenario: a trigger case carries no dimension scores
    Given a test case carrying the trigger layer and no rubric
    When judge returns its result
    Then it reports the simulated invoke decision against the expected one and emits no dimension scores

  Scenario: one outline row is one case
    Given a trigger Scenario Outline whose Examples hold several rows
    When judge is invoked for one of those rows
    Then it reports the invoke decision for that row alone and never collapses the rows into one verdict

  Scenario: a boolean case emits the verdict without dimension scores
    Given a test case carrying boolean Then assertions, no rubric, and no trigger tag
    When judge returns its result
    Then it reports whether every boolean Then held, including the must-not-do guards, and emits no dimension scores

  Scenario: the behavior layer walks the simulated steps
    Given a test case carrying the behavior layer with expected behaviors and a must-not-do list
    When judge evaluates it
    Then it compares the simulated steps against those lists and emits a verdict

  Scenario: the quality layer evaluates the produced output
    Given a test case carrying the quality layer
    When judge evaluates it
    Then it judges the simulated output against the rubric criteria and emits a verdict

  # ---- Per-dimension scoring ----

  Scenario: each dimension is scored against its own declared max
    Given a rubric whose named dimensions declare different maxima
    When judge scores the case
    Then no dimension's score exceeds that dimension's own max, and no scale is shared across the dimensions

  Scenario: the dimensions collapse to one verdict against the threshold
    Given a scored rubric case carrying exactly one threshold whose simulation trips no must-not-do
    When judge returns its result
    Then its PASS reports the total across the dimensions measured against that threshold

  Scenario: the top score is the total at every dimension's max
    Given a rubric case whose simulation earns each dimension's own max
    When judge returns its result
    Then its TOTAL equals the sum of every dimension's max, and no larger total is reachable

  # ---- Scoring discipline and output ----

  Scenario: the rubric overrides the evaluator's own taste
    Given a rubric whose criteria conflict with the evaluator's personal preference
    When judge scores the case
    Then its verdict matches the rubric criteria, not the evaluator's own preference

  Scenario: a triggered must-not-do withholds the top score
    Given a simulation that triggers a must-not-do guard from the test case
    When judge scores the case
    Then it does not award the maximum score and emits a non-passing verdict

  Scenario: a missed expected behavior costs points without forcing a non-passing verdict
    Given a simulation that misses an expected behavior and trips no must-not-do guard
    When judge scores the case
    Then the dimensions covering that behavior lose points, and no verdict is forced beyond what the threshold decides

  Scenario: phrasing-dependent outcomes are scored conservatively
    Given a simulation whose outcome depends on how the prompt is phrased
    When judge scores the case
    Then it reports the lower pass-or-fail verdict rather than the optimistic one

  Scenario: the output carries every rubric dimension and nothing else
    Given any completed evaluation of a rubric case
    When judge returns its result
    Then it emits one line per named dimension carrying that dimension's name and its score against its own max, a TOTAL, a THRESHOLD, a PASS, a WHAT WORKED, and a WHAT FAILED, with no preamble or extra text

  Scenario: the output of a trigger case carries the fixed fields and nothing else
    Given any completed evaluation of a trigger case
    When judge returns its result
    Then it emits an INVOKE, an EXPECTED, a PASS, a WHAT WORKED, and a WHAT FAILED, with no preamble or extra text

  Scenario: a flawless simulation reports nothing failed
    Given a simulation that meets every expected behavior and trips no must-not-do
    When judge returns its result
    Then its WHAT FAILED field reads "nothing"
