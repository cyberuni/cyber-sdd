@frozen
Feature: define-governance — author a reference-only governance
  Unit suite for the define-governance skill: classify the content as governance, resolve placement,
  scaffold the canonical file and runtime symlinks, enforce the non-auto-trigger contract, then
  verify and report. A user-triggered workflow agent is define-agent; scoring and case authoring are
  run/add. Cross-capability e2e scenarios live in ../../acceptance/.

  # ---- Triggering ----

  Scenario: a request to write a rule set triggers define-governance
    Given the user asks to write criteria that other skills load on demand
    When ACED routes the request
    Then define-governance handles it

  Scenario: a request to improve an existing governance triggers define-governance
    Given the user asks to improve the review-rubric governance they already have
    When ACED routes the request
    Then define-governance handles it

  Scenario: a request for a user-triggered workflow agent defers to define-agent
    Given the user asks to create a named role they can delegate a task to
    When ACED routes the request
    Then define-governance does not handle it and define-agent does

  Scenario: a request to score a config defers to run
    Given the user asks to run the evals for an agent configuration
    When ACED routes the request
    Then define-governance does not handle it and run does

  Scenario: a request to add an eval case defers to add
    Given the user asks to add a golden-set case for a failure they just saw
    When ACED routes the request
    Then define-governance does not handle it and add does

  Scenario: a request to fix a failing config defers to improve
    Given the user asks to fix the configuration because its eval cases are failing
    When ACED routes the request
    Then define-governance does not handle it and improve does

  # ---- Classifying ----

  Scenario: criteria content is treated as a governance
    Given the content the user supplies describes a quality bar to enforce
    When define-governance classifies it
    Then it proceeds to author the content as a governance file

  Scenario: step-by-step content is redirected to a workflow skill
    Given the content the user supplies describes a numbered sequence of actions to perform
    When define-governance classifies it
    Then it does not author a governance and tells the user the content belongs in a workflow skill

  # ---- Resolving placement ----

  Scenario: the canonical path is derived from the chosen scope
    Given the user selects the project scope for the governance
    When define-governance resolves placement
    Then it writes the canonical file under the project skills directory

  Scenario: a symlink is created for each selected runtime
    Given the user targets Claude Code and Cursor
    When define-governance links the canonical file
    Then it creates a runtime symlink for Claude Code and for Cursor that resolves to the canonical file

  # ---- Drafting ----

  Scenario: the governance body opens with a scope line and matches the content type
    Given the user selects the checklist content type and supplies the items
    When define-governance writes the canonical file
    Then the body opens with an Apply-when scope line and lists the checklist items

  Scenario: the description carries the Partial Skill prefix
    Given a gathered name, topic, and rules
    When define-governance writes the canonical file
    Then the frontmatter description begins with the "Partial Skill:" prefix

  Scenario: the file is marked non-invokable and typed as governance
    Given a gathered name, topic, and rules
    When define-governance writes the canonical file
    Then the frontmatter sets user-invocable to false and sets the metadata type to governance

  Scenario: no rationale section is written into the body
    Given the user offers a justification for a rule
    When define-governance writes the canonical file
    Then the body carries no Why or Rationale section

  # ---- Improving an existing governance ----

  Scenario: an existing file is read before any change
    Given the named governance file already exists
    When define-governance improves it
    Then it reads the existing file before changing anything

  Scenario: only the gaps found are changed when improving
    Given an existing governance file missing the user-invocable field
    When define-governance improves it
    Then it adds the missing field and leaves the rest intact

  # ---- Quality and report ----

  Scenario: a high-severity quality failure is fixed before the file is presented
    Given a drafted governance whose description omits the "Partial Skill:" prefix
    When define-governance finishes drafting
    Then it fixes the failing check before presenting the file

  Scenario: the report names the artifacts and the next step
    Given a completed governance file
    When define-governance reports
    Then it states the canonical path, the runtime symlinks, the content type, and points the user at start-mission to spec and eval it
