@frozen
Feature: Plan retirement — the gated, idempotent tracked deletion of a retired plan
  Unit suite for plan retirement, the Doctrine loop's last retro step. Every scenario asserts an
  OBSERVABLE outcome of the sweep over a given cleared set — the filesystem effect. The clearance
  JUDGMENT (source done/merged AND distilled) is the caller's, out of this unit, so no scenario
  asserts it. Cross-capability e2e scenarios (a mission distilled then retired end-to-end) live in
  ../../acceptance/.

  # ---- Delete-only: the sweep never distills ----

  Scenario: the sweep only deletes and writes nothing to the ledger
    Given a cr-ref cleared for retirement
    When the sweep runs
    Then it deletes the cr-ref's plan files
    And it writes no strategy or recurrence to the ledger

  # ---- The sweep deletes both plan files ----

  Scenario: a cleared cr-ref deletes both its plan files
    Given a cr-ref cleared for retirement
    And both its plan.md and log.jsonl exist on disk
    When the sweep runs
    Then it deletes the cr-ref's plan.md
    And it deletes the cr-ref's log.jsonl
    And the deletion is a tracked deletion of the tree only

  Scenario: a cleared cr-ref with only its plan.md present deletes it and no-ops the missing half
    Given a cr-ref cleared for retirement
    And its plan.md exists but its log.jsonl is already gone
    When the sweep runs
    Then it deletes the plan.md
    And it makes no change for the already-missing log.jsonl

  # ---- Fail-closed: only an explicitly-cleared cr-ref is touched ----

  Scenario: a plan the caller did not clear is left untouched
    Given a plan on disk whose cr-ref the caller did not clear
    When the sweep runs
    Then it does not delete that plan

  Scenario: clearing a cr-ref does not delete a different cr-ref it is a prefix of
    Given a cr-ref is cleared for retirement
    And a different plan whose cr-ref begins with the cleared one exists on disk
    When the sweep runs
    Then it does not delete the different plan

  # ---- Idempotency ----

  Scenario: a cleared cr-ref with no plan on disk is a no-op
    Given a cr-ref cleared for retirement
    And it has no plan on disk
    When the sweep runs
    Then it deletes nothing for that cr-ref

  Scenario: re-running the sweep makes no further change
    Given a sweep that already retired its cleared plans
    When the sweep is run again over the same inputs
    Then it makes no further change