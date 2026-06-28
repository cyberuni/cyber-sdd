Feature: The revise-spec entry skill — re-open a draft and run the explore grill
  Unit suite for the revise-spec entry skill (the user-facing revise unit). Entry-skill
  behaviors only — no grilling/authoring (those are ../spec-producer/spec-producer.feature's)
  and no gate verdict, freeze, or digest (those are ../validate-spec/validate-spec.feature's).

  # ---- Guard the re-open precondition ----

  Scenario: a draft node is revised directly
    Given a CR touching an existing node at status draft
    When revise-spec runs
    Then it proceeds to run the producer in-session without a re-open

  Scenario: an approved node requires a ratified re-open before revising
    Given a CR touching a node at status approved with a frozen feature
    When revise-spec runs without a ratified re-open
    Then it does not edit the frozen feature
    And it requires a ratified re-open before proceeding

  Scenario: a ratified re-open lets an approved node be revised
    Given a CR touching an approved node whose re-open has been ratified
    When revise-spec runs
    Then it proceeds to run the producer in-session under the re-open

  # ---- Grill in-session (revise) ----

  Scenario: revise-spec scaffolds no new node
    Given a CR touching an existing writable node
    When revise-spec runs
    Then it runs the producer inline in revise mode
    And it scaffolds no new node skeleton

  Scenario: the revise intent is collected before the grill loop
    Given a writable node and a CR with revise intent
    When revise-spec prepares to run the explore grill
    Then it collects the revise intent from the user first

  Scenario: the grill asks the user live and continues in-session
    Given the in-session grill needs an answer from the user during revise
    When revise-spec handles it
    Then it asks the user live in-session
    And it continues the grill with the answers without respawning

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
