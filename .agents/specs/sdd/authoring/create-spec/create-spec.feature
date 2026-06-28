Feature: The create-spec entry skill — scaffold a new spec node and run the explore grill
  Unit suite for the create-spec entry skill (the user-facing create unit). Entry-skill
  behaviors only — no grilling/authoring (those are ../spec-producer/spec-producer.feature's)
  and no gate verdict, freeze, or digest (those are ../validate-spec/validate-spec.feature's).
  Grouped by the three invocation modes (UC1 new feature, UC2 backfill, UC3 redirect) then the
  cross-cutting guarantees UC1/UC2 share.

  # ---- UC1 — spec a new feature (no code yet) ----

  Scenario: a CR for new capability content is located to a node under the project tree
    Given a CR for capability content that has no spec node and no implementation
    When create-spec runs
    Then it determines the target capability folder under the project spec tree

  Scenario: a new feature collects the seed intent before the grill loop
    Given a new-feature CR with missing what, why, or interface
    When create-spec prepares to run the explore grill
    Then it collects the seed intent from the user first

  # ---- UC2 — backfill from existing code ----

  Scenario: a backfill skips the seed-intent grill
    Given a CR whose behavior already exists in code but has no spec node
    When create-spec prepares to run the explore grill
    Then it skips the seed-intent questions
    And it signals backfill to the producer

  # ---- UC3 — redirect when the node already exists ----

  Scenario: an existing node routes to revise-spec
    Given a CR whose target spec node already exists
    When create-spec runs
    Then it routes the work to revise-spec
    And it scaffolds no new node

  # ---- Cross-cutting — classify + scaffold ----

  Scenario: an ambiguous classification is asked, not guessed
    Given the spec-type or artifact-types of the node cannot be determined
    When create-spec must classify the node
    Then it asks the user to disambiguate
    And it does not guess a classification

  Scenario: a behavioral node is scaffolded with a Use Cases section and an empty feature
    Given the node is classified as behavioral
    When create-spec scaffolds the skeleton
    Then the node README declares spec-type behavioral with a Use Cases section
    And an empty unit feature file is created beside it

  Scenario: a reference node is scaffolded with a Subject section and no feature
    Given the node is classified as a reference artifact
    When create-spec scaffolds the skeleton
    Then the node README declares spec-type reference with a Subject section
    And no feature file is created

  Scenario: a descriptive index is scaffolded with no marker and no use cases
    Given the node is classified as descriptive
    When create-spec scaffolds the skeleton
    Then the node README carries no spec-type marker and no Use Cases section

  Scenario: scaffolding writes no control frontmatter
    Given create-spec scaffolds a new node
    When it writes the skeleton
    Then it writes no status, aligned, approval, or produced-by frontmatter

  # ---- Cross-cutting — run the grill in-session, then leave at draft ----

  Scenario: the user is advised to use a capable model for the live grill
    Given create-spec is entered
    When it prepares to run the in-session grill
    Then it advises the user that a capable model such as Opus is recommended

  Scenario: the grill asks the user live and continues in-session
    Given the in-session grill needs an answer from the user during explore
    When create-spec handles it
    Then it asks the user live in-session
    And it continues the grill with the answers without respawning

  Scenario: the iteration cap is never silently auto-accepted
    Given the iteration cap is reached without the spec converging
    When create-spec must decide how to proceed
    Then it presents the failing scenarios to the user
    And it does not auto-accept the spec

  Scenario: a converged node is left at draft for the spec gate
    Given explore converges on a spec and suite diff
    When create-spec finishes
    Then the node is left at status draft
    And create-spec advances no status past draft
