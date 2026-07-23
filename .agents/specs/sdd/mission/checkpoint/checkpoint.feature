@frozen
Feature: The checkpoint procedure — write a mission's state into its plan brief
  Unit suite for the checkpoint unit (the pause-mission skill). Writing the live session state back
  into the plan brief so a later session resumes, and clearing a reviewed mission for headless
  dispatch by setting status: approved. It writes only the plan brief. Cross-capability e2e
  scenarios live in ../../workflows/.

  # ---- Checkpoint the mission ----

  Scenario: a checkpoint updates the touched todo statuses
    Given an in-progress mission with a plan brief
    When the mission is checkpointed
    Then each touched todo's status is updated in the brief frontmatter

  Scenario: a checkpoint rewrites the NEXT anchor
    Given an in-progress mission with a plan brief
    When the mission is checkpointed
    Then the brief's ## NEXT anchor is rewritten to lead with the next action

  Scenario: a checkpoint scaffolds a missing brief
    Given an in-progress mission with no plan brief under the plans location
    When the mission is checkpointed
    Then a plan brief is scaffolded with frontmatter todos and a ## NEXT anchor

  Scenario: a checkpoint writes only the plan brief
    Given an in-progress mission with a plan brief
    When the mission is checkpointed
    Then it writes no spec.md status and no spec.md approval

  # ---- Approve on checkpoint ----

  Scenario: an approve checkpoint sets the brief status to approved
    Given a human checkpoints a reviewed mission with the approve intent
    When the checkpoint writes the brief
    Then the brief's top-level status is set to approved

  Scenario: a plain checkpoint leaves the status unchanged
    Given a checkpoint with no approve intent
    When the checkpoint writes the brief
    Then the brief's top-level status is left unchanged

  Scenario: approving an already-approved brief keeps it approved
    Given a brief whose status is already approved
    When it is checkpointed with the approve intent
    Then the brief's status remains approved

  Scenario: a headless automaton cannot self-approve even when approval is requested
    Given a headless automaton with no user channel checkpoints a mission with the approve intent
    When it writes the brief
    Then the approve is refused and the brief's status is not set to approved

  Scenario: approve writes only the status flag, not a dispatch
    Given a human checkpoints a reviewed mission with the approve intent
    When the checkpoint writes the brief
    Then it sets the status flag and does not itself dispatch or resume the mission

  # ---- Reconcile-forward checkpoint ----

  Scenario: a reconcile-forward checkpoint runs the gate floor before marking retirement-ready
    Given a plan brief whose CR reached approved or implemented via commits merged outside this session
    When the mission is checkpointed as reconciled forward
    Then the checkpoint runs checkGateFloor for the CR before marking it retirement-ready

  Scenario: a reconcile-forward checkpoint with a gate floor violation surfaces the gap instead of hiding it
    Given a plan brief whose CR reached approved or implemented but checkGateFloor reports a violation
    When the mission is checkpointed as reconciled forward
    Then the ## NEXT anchor records the gate floor violation instead of declaring the plan retirement-ready

  Scenario: a reconcile-forward checkpoint of a non-CR investigation requires no gate floor check
    Given a plan brief whose mission opened no CR and invoked no gate
    When the mission is checkpointed as reconciled forward
    Then the checkpoint skips checkGateFloor and marks the plan complete on its own merits
