@frozen
Feature: define-governance — author a reference-only governance
  Unit suite for the define-governance skill: classify the content as governance, resolve placement,
  scaffold the canonical file and runtime symlinks, enforce the non-auto-trigger contract, then
  verify and report. A user-triggered workflow agent is define-agent; scoring and case authoring are
  run/add. Cross-capability e2e scenarios live in ../../workflows/.

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

  Scenario: an unclear scope is asked about before any path is derived
    Given the user asks for a governance without saying whether it belongs to this repo, to all their projects, or inside a plugin, and nothing in the context settles it
    When define-governance resolves placement
    Then it asks the user to choose the scope and derives no canonical path until the user answers

  # ---- Gathering requirements ----

  Scenario: the name, consumers, content type, and rules are asked for
    Given the user asks for a governance and supplies only the topic it should cover
    When define-governance gathers requirements
    Then it asks the user for the name, the consumers, the content type, and the rules

  Scenario: no file is drafted until the drafting requirements are gathered
    Given the user asks for a governance and supplies only the topic it should cover
    When define-governance gathers requirements
    Then it drafts no file until the name, the content type, and the rules are gathered

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

  Scenario: a compound rule is split into independently falsifiable rules
    Given the user supplies the single rule "Every skill has a README and its description names a trigger"
    When define-governance writes the canonical file
    Then the body carries the README requirement and the trigger-naming requirement as two rules that can each be falsified without the other

  Scenario: a rule whose second clause qualifies the first is left as one rule
    Given the user supplies the single rule "the description names when to trigger, and does so in the user's own phrasing"
    When define-governance writes the canonical file
    Then the body carries that rule as one rule and does not split it in two

  Scenario: a rule whose clauses share one object but state separate demands is split
    Given the user supplies the single rule "the description names when to trigger and is under 500 characters"
    When define-governance writes the canonical file
    Then the body carries the trigger-naming requirement and the length requirement as two rules that can each be falsified without the other

  Scenario: a non-kebab-case name is normalized and matches the file stem
    Given the user names the governance "Commit Discipline"
    When define-governance finishes drafting
    Then the frontmatter name is the kebab-case slug commit-discipline and the file stem is the same slug

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

  Scenario: a quality failure below the fix bar is still reported
    Given a drafted governance whose only failing quality check is the medium-severity no-workflow-steps check, left unfixed
    When define-governance reports
    Then the report names the no-workflow-steps check as failing
