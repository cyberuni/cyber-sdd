Feature: Plan retirement — the gated, idempotent tracked deletion of a retired plan
  Unit suite for plan retirement, the Doctrine loop's last retro step. The sweep deletes a plan's
  two files as a tracked deletion only when its caller has cleared the cr-ref (source done/merged
  AND distilled); everything else is a no-op. Cross-capability e2e scenarios (a mission distilled
  then retired end-to-end) live in ../../acceptance/.

  # ---- Distill and delete are decoupled ----

  Scenario: distill fires early and delete is a separate later step
    Given a mission distilled at the implemented transition
    When the plan is later retired
    Then the deletion is a separate retro step from the distill

  # ---- The sweep deletes both plan files ----

  Scenario: a cleared cr-ref deletes both its plan files
    Given a cr-ref cleared for retirement
    And both its plan.md and log.jsonl exist on disk
    When the sweep runs
    Then it deletes the cr-ref's plan.md
    And it deletes the cr-ref's log.jsonl
    And the deletion is a tracked deletion of the tree only

  # ---- Never retire an uncleared plan ----

  Scenario: a plan whose source is still open is not cleared
    Given a plan whose source is still open
    When the sweep runs
    Then the plan is not cleared for retirement
    And it is left untouched

  Scenario: a plan that was never distilled is not cleared
    Given a plan whose mission was never distilled
    When the sweep runs
    Then the plan is not cleared for retirement
    And it is left untouched

  # ---- Fail-closed on clearance ----

  Scenario: only an explicitly-cleared cr-ref is touched
    Given a plan on disk that the caller did not clear
    When the sweep runs
    Then it does not delete that plan

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
