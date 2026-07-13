@frozen
Feature: define-agent — author an agent definition
  Unit suite for the define-agent skill: choose a mode, resolve placement, scaffold the canonical
  agent file plus runtime symlinks and (invokable) a companion command, then verify and report.
  Authoring a reference-only governance is define-governance; scoring and case authoring are
  run/add. Cross-capability e2e scenarios live in ../../acceptance/.

  # ---- Triggering ----

  Scenario: a request to create an agent definition triggers define-agent
    Given the user asks to create a delegated agent for a fan-out task
    When ACED routes the request
    Then define-agent handles it

  Scenario: a request to improve an existing agent definition triggers define-agent
    Given the user asks to improve the conductor agent definition they already have
    When ACED routes the request
    Then define-agent handles it

  Scenario: a request for a reference-only governance defers to define-governance
    Given the user asks to write a rule set that other skills load on demand
    When ACED routes the request
    Then define-agent does not handle it and define-governance does

  Scenario: a request to score a config defers to run
    Given the user asks to run the evals for an agent configuration
    When ACED routes the request
    Then define-agent does not handle it and run does

  Scenario: a request to add an eval case defers to add
    Given the user asks to add a golden-set case for a failure they just saw
    When ACED routes the request
    Then define-agent does not handle it and add does

  Scenario: a request to fix a failing config defers to improve
    Given the user asks to fix the agent definition because its eval cases are failing
    When ACED routes the request
    Then define-agent does not handle it and improve does

  # ---- Selecting the mode ----

  Scenario: the three modes are offered before scaffolding
    Given the user wants a new agent and has not named a mode
    When define-agent gathers the shape
    Then it presents the delegated, invokable, and in-context modes and asks which fits

  Scenario: the invokable mode scaffolds a companion command
    Given the user picks the invokable dual-mode mode
    When define-agent scaffolds the agent
    Then it writes a companion command alongside the canonical agent file

  Scenario: the delegated mode scaffolds no companion command
    Given the user picks the delegated mode
    When define-agent scaffolds the agent
    Then it writes no companion command

  # ---- Resolving placement ----

  Scenario: the canonical path is derived from the chosen scope
    Given the user selects the project scope for the agent
    When define-agent resolves placement
    Then it writes the canonical file under the project agents directory

  Scenario: a symlink is created for each selected runtime
    Given the user targets Claude Code and Cursor
    When define-agent links the canonical file
    Then it creates a runtime symlink for Claude Code and for Cursor that resolves to the canonical file

  # ---- Drafting ----

  Scenario: the agent file carries the required frontmatter and body shape
    Given a gathered name, role, responsibilities, output format, and out-of-scope
    When define-agent writes the canonical file
    Then the file carries a name and description in frontmatter and a body opening with the role line

  Scenario: the model field is omitted when the user names no model
    Given the user specifies no model preference
    When define-agent writes the canonical file
    Then the frontmatter omits the model field

  Scenario: the tools field is omitted for an in-context-only agent
    Given the user picks the in-context-only mode
    When define-agent writes the canonical file
    Then the frontmatter omits the tools field

  Scenario: an irreversible action carries a confirmation rule
    Given the agent performs an irreversible action
    When define-agent writes the canonical file
    Then the body states that the action requires user confirmation before it runs

  # ---- Improving an existing definition ----

  Scenario: an existing file is read before any change
    Given the named agent file already exists
    When define-agent improves it
    Then it reads the existing file before changing anything

  Scenario: only the gaps found are changed when improving
    Given an existing agent file with one missing field
    When define-agent improves it
    Then it changes only the missing field and leaves the rest intact

  # ---- Quality and report ----

  Scenario: a high-severity quality failure is fixed before the file is presented
    Given a drafted definition whose description fails a HIGH quality check
    When define-agent finishes drafting
    Then it fixes the failing check before presenting the file

  Scenario: the report names the artifacts and the next step
    Given a completed agent definition
    When define-agent reports
    Then it states the canonical path, the runtime symlinks, and points the user at start-mission to spec and eval it

  # ---- Gate-role naming ----

  Scenario: a gate-scorer agent is named by the gate and scope it serves
    Given the agent's role is to score or verify a named gate for a domain
    When define-agent names the agent
    Then it names the agent by its gate and scope in the domain-gate-judge form, like sdd-impl-judge, not a bare action verb

  Scenario: a case-scorer agent takes the case-judge form
    Given the agent's role is to score individual cases within a scope
    When define-agent names the agent
    Then it names the agent in the domain-case-judge form, like aces-case-judge, not a bare judge

  Scenario: a gate scorer drafted with a bare action-verb name is flagged and corrected before the file is presented
    Given a drafted gate-scorer agent named with a bare action verb like implementer, judge, or validator
    When define-agent runs its quality checks
    Then the gate-role naming check flags the name at HIGH severity and define-agent renames it to the gate-and-scope form before presenting the file

  Scenario: a non-scorer producer agent keeps its action-oriented name
    Given the agent's role is to produce an artifact rather than score a gate or case, named like scenario-writer or doc-writer
    When define-agent runs its quality checks
    Then the gate-role naming check does not fire and define-agent keeps the action-oriented name

  # ---- Impl-producer dual mode ----

  Scenario: dispatched against a frozen suite it co-produces the eval suite
    Given the conductor dispatches define-agent as the ACED impl-producer against a frozen feature
    When define-agent produces the implementation
    Then it writes the agent definition and an eval suite carrying one eval per frozen scenario

  Scenario: invoked standalone it produces only the definition
    Given define-agent is invoked with no frozen feature
    When define-agent produces the artifact
    Then it writes the agent definition and no eval suite
