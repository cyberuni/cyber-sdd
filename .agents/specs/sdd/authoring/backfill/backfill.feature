@frozen
Feature: The backfill workflow — derive a spec + suite from shipped behavior
  Unit suite for the backfill unit. The ordered five-step procedure the spec-producer runs when the
  behavior it specifies already exists in code, each step emitting a named output collected into one
  step record, and the re-derivation that answers a change verdict against a node it produced.
  Cross-capability e2e scenarios live in ../../workflows/.

  # ── derive ──

  Scenario: a backfill enters the ordered workflow at step one
    Given a change request whose behavior already exists in the project's source
    And the producer is running in backfill mode
    When the producer begins authoring the node
    Then the step record's first entry names the source read-set it read

  Scenario: a created or revised node does not enter the backfill workflow
    Given a change request for a node the producer is authoring in revise mode
    When the producer begins authoring the node
    Then it returns no step record

  Scenario: the served goals are enumerated from the source read-set
    Given a backfill whose source exposes one entry point reached by two different actors
    When step two runs
    Then the step record's second entry lists both actors against that entry point

  Scenario: a reachable tracker is searched for unserved goals
    Given a backfill of a project whose issue tracker is reachable
    When step three runs
    Then the step record's third entry names the tracker it searched

  Scenario: an unreachable tracker is recorded as a named limitation
    Given a backfill of a project with no reachable issue tracker
    When step three runs
    Then the step record's third entry reads none with no reachable tracker as its reason

  Scenario: a step that found nothing states none and where it looked
    Given a backfill whose tracker search returns no candidate goal at all
    When step three runs
    Then the step record's third entry reads none together with the places it searched

  Scenario: a recovered goal the source already serves is recorded as served
    Given a backfill whose tracker search returns a goal the source has an entry point for
    When step three classifies that goal
    Then the step record lists it among the served goals and not among the unserved ones

  Scenario: an unserved goal is recorded with where it came from
    Given a backfill whose tracker search returns a goal the source has no entry point for
    When step three classifies that goal
    Then the step record's third entry names that goal and the tracker item it came from

  Scenario: the control-flow graph is drawn from the source
    Given a backfill whose source takes a branch the standing .feature describes nowhere
    When step four runs
    Then the node's Control Flow graph carries that branch

  Scenario: the whole scenario set is re-derived from the graph edges
    Given a backfill whose drawn Control Flow graph carries an edge the standing .feature covers with no scenario
    When step five runs
    Then the node's Scenario map carries a row for that edge

  Scenario: a standing suite entry the source contradicts is dropped as a stale claim
    Given a backfill of a node whose standing .feature asserts an outcome the current source does not produce
    When step five re-derives the scenario set
    Then that entry is absent from the re-derived suite and the step record reports it as a stale claim

  Scenario: a standing suite entry survives only where an edge derives it
    Given a backfill of a node whose standing .feature asserts an outcome the current source produces
    When step five re-derives the scenario set
    Then the re-derived suite carries that outcome under the row of the edge it was derived from

  Scenario: a record missing an entry is reported and the backfill is not complete
    Given a backfill run in which step three was never run
    When the producer returns
    Then it reports the missing step-three entry and does not return the node as complete

  Scenario: a complete record returns the node with its step record
    Given a backfill run in which all five steps ran
    When the producer returns
    Then it returns the node together with a step record carrying one entry per step

  # ── re-derive ──

  Scenario: a change verdict implicating a step re-enters the workflow at that step
    Given a change verdict against a backfilled node whose earliest implicated step is step two
    When the producer answers the verdict
    Then the fresh step record carries a new entry for step two

  Scenario: every step downstream of the re-entry point re-runs
    Given a change verdict against a backfilled node whose earliest implicated step is step two
    When the producer answers the verdict
    Then the fresh step record carries a new entry for every step after step two

  Scenario: steps before the re-entry point are not re-run
    Given a change verdict against a backfilled node whose earliest implicated step is step two
    When the producer answers the verdict
    Then the fresh step record carries step one's original entry unchanged

  Scenario: findings implicating no step are answered without re-running the workflow
    Given a change verdict against a backfilled node whose only finding names a broken link in the node's prose
    When the producer answers the verdict
    Then it returns no fresh step record and answers the finding under the remediation bar
