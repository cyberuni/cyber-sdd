@frozen
Feature: The spec-producer procedure — grill a CR into spec prose + a boolean suite
  Unit suite for the spec-producer-governance procedure (the producer unit). Producer
  behaviors only — no gate verdict, freeze, or digest scenarios (those are
  ../spec-gate/spec-gate.feature's).

  # ---- Modes — create / revise / backfill ----

  Scenario: create scaffolds prose and scenarios for new capability content
    Given a CR for capability content that does not exist yet
    When the spec-producer runs in create mode
    Then it scaffolds the spec prose and an initial set of boolean scenarios

  Scenario: revise tightens existing prose without scaffolding
    Given a CR that touches a capability whose prose and scenarios already exist
    When the spec-producer runs in revise mode
    Then it interrogates the existing content and tightens what is weak or stale
    And it scaffolds no new capability skeleton

  Scenario: revise adds scenarios for new behavior and retires them for removed behavior
    Given a revise that adds some behavior and removes other behavior
    When the spec-producer updates the suite
    Then it adds scenarios for the new behavior
    And it retires the scenarios for the removed behavior

  Scenario: backfill skips the up-front grill and reads the existing implementation
    Given a CR whose behavior already exists in code
    When the spec-producer runs in backfill mode
    Then it infers the what, why, and decisions from source, tests, and history
    And it does not ask the up-front grill questions

  # ---- Grilling discipline ----

  Scenario: the producer settles the prose before editing the suite
    Given a CR under grilling
    When the prose contract is still unsettled
    Then the producer makes no scenario edits until the prose is settled

  Scenario: the producer scans all issues and summarizes them before resolving any
    Given a CR with several distinct issues
    When the producer begins grilling
    Then it scans the issues holistically and summarizes them before resolving any single one

  Scenario: the producer takes one issue to resolution before the next
    Given the producer has summarized several issues in the CR
    When it works them
    Then it resolves the single most important issue before starting another

  Scenario: grilling that reveals a bundle of several recommends a split
    Given a CR under grilling that reveals a bundle of several distinct units
    When the producer recognizes the bundle
    Then it recommends a split rather than growing one node into a monolith

  Scenario: a missing required input becomes an open marker, not an invention
    Given the producer needs an input that is missing and cannot be inferred
    When it cannot recover the input
    Then it records the gap as an open marker in the body
    And it does not invent a value

  Scenario: a contradiction is reconciled toward the correct answer
    Given two statements in the spec conflict
    And one reading is coherent with the design's intent and the implementation
    When the producer reconciles them
    Then it edits the side that conflicts with the design's intent
    And it does not adopt a reading merely because more files repeat it

  Scenario: an unclear authority is raised rather than guessed
    Given two statements conflict and the correct reading cannot be established
    When the producer cannot determine the right answer
    Then it raises the conflict as an open marker
    And it picks no reconciliation direction

  # ---- Output — what the producer writes ----

  Scenario: the producer writes the spec body and the feature, not the control frontmatter
    Given the spec-producer authoring a diff
    When it writes its output
    Then it writes the spec.md body and the .feature scenarios
    And it does not write the status, project-path, approval, or produced-by frontmatter

  Scenario: the producer leaves no placeholder in its output
    Given the spec-producer authoring a diff
    When it writes its output
    Then it leaves no TBD, TODO, or empty section

  Scenario: scoring lingo is confined to a tagged rubric scenario
    Given the producer writes a gradient behavior that needs a rubric
    When it authors the scenario
    Then the rubric form never appears in an untagged scenario
    And every untagged scenario stays a pure boolean assertion