Feature: The revise-spec entry skill — re-open a draft and dispatch the producer
  Unit suite for the revise-spec entry skill (the user-facing revise unit). Entry-skill
  behaviors only — no grilling/authoring (those are ../spec-producer/spec-producer.feature's)
  and no gate verdict, freeze, or digest (those are ../validate-spec/validate-spec.feature's).

  # ---- Guard the re-open precondition ----

  Scenario: a draft node is revised directly
    Given a CR touching an existing node at status draft
    When revise-spec runs
    Then it proceeds to dispatch the producer without a re-open

  Scenario: an approved node requires a ratified re-open before revising
    Given a CR touching a node at status approved with a frozen feature
    When revise-spec runs without a ratified re-open
    Then it does not edit the frozen feature
    And it requires a ratified re-open before proceeding

  Scenario: a ratified re-open lets an approved node be revised
    Given a CR touching an approved node whose re-open has been ratified
    When revise-spec runs
    Then it proceeds to dispatch the producer under the re-open

  # ---- Grill + dispatch (revise) ----

  Scenario: revise-spec scaffolds no new node
    Given a CR touching an existing writable node
    When revise-spec runs
    Then it dispatches the producer in revise mode
    And it scaffolds no new node skeleton

  Scenario: the revise intent is collected before the first dispatch
    Given a writable node and a CR with revise intent
    When revise-spec prepares to dispatch the operator
    Then it collects the revise intent from the user first

  Scenario: a needs-input wave is batched back to the user
    Given the operator returns needs-input during revise
    When revise-spec handles the result
    Then it asks the user the batched questions
    And it re-dispatches the operator with the answers

  Scenario: the iteration cap is never silently auto-accepted
    Given the iteration cap is reached without the spec converging
    When revise-spec must decide how to proceed
    Then it presents the failing scenarios to the user
    And it does not auto-accept the spec

  # ---- Route observations ----

  Scenario: a split observation becomes a new node, not a marker grown here
    Given the producer bubbles an observation that the node bundles several behaviors
    When revise-spec handles the observation
    Then it surfaces the split to the user as a new node or corpus operation
    And it does not grow the observation into a marker in this node

  # ---- Leave at draft ----

  Scenario: a converged node is left at draft for the spec gate
    Given revise converges on a spec and suite diff
    When revise-spec finishes
    Then the node is left at status draft
    And revise-spec advances no status
