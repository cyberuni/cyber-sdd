@frozen
Feature: define-skill — author a workflow skill
  Unit suite for the define-skill skill: route a "create a skill" request, settle scope, choose the
  pattern, resolve placement, scaffold the SKILL.md (plus a README for a public skill), audit it, and
  hand it to the ACED eval loop to spec and score. Authoring an agent definition or persona is
  define-agent; a reference-only governance is define-governance; extracting the current session is
  skillify; scoring and case authoring are run / add. Cross-capability e2e scenarios live in
  ../../acceptance/.

  # ---- Triggering ----

  Scenario: a request to create a new workflow skill triggers define-skill
    Given the user says "I want a skill that formats our changelog entries"
    When ACED routes the request
    Then define-skill handles it

  Scenario: a request to formalize an existing ad-hoc workflow into a skill triggers define-skill
    Given the user has a documented multi-step process and asks to turn it into a reusable skill
    When ACED routes the request
    Then define-skill handles it

  Scenario: a request to fill out an incomplete existing skill definition triggers define-skill
    Given the user points at a SKILL.md with a weak description and missing steps and asks to improve its definition
    When ACED routes the request
    Then define-skill handles it

  Scenario: a request to create an agent or persona defers to define-agent
    Given the user asks to create a delegated code-reviewer agent they can fan out to
    When ACED routes the request
    Then define-skill does not handle it and define-agent does

  Scenario: a request for a persona role defers to define-agent
    Given the user asks for a skill that makes the model adopt a senior-security-reviewer stance
    When ACED routes the request
    Then define-skill does not handle it and define-agent does

  Scenario: a request for a reference-only rule set defers to define-governance
    Given the user asks to write criteria that other skills load on demand but never execute as steps
    When ACED routes the request
    Then define-skill does not handle it and define-governance does

  Scenario: a request to extract the current session into a skill defers to skillify
    Given the user says "turn what we just did in this session into a skill"
    When ACED routes the request
    Then define-skill does not handle it and skillify does

  Scenario: a request to score an existing skill defers to run
    Given the user asks to run the evals for a skill they already have
    When ACED routes the request
    Then define-skill does not handle it and run does

  Scenario: a request to add a golden-set case for an existing skill defers to add
    Given the user asks to capture a failure they just saw as a new eval case for their skill
    When ACED routes the request
    Then define-skill does not handle it and add does

  Scenario: a request to diagnose why a skill's evals fail defers to improve
    Given the user asks why their skill's golden-set cases are failing and how to fix them
    When ACED routes the request
    Then define-skill does not handle it and improve does

  # ---- Settling scope ----

  Scenario: the five design questions are settled before scaffolding
    Given the user wants a new skill but has named only a rough topic
    When define-skill gathers the shape
    Then it settles scope, trigger phrasing, output contract, quality bar, and out-of-scope before writing the SKILL.md

  Scenario: an unanswerable design question is resolved with the user, not guessed
    Given the output contract cannot be inferred from what the user has said
    When define-skill gathers the shape
    Then it asks the user to resolve the output contract before scaffolding rather than inventing one

  # ---- Choosing the pattern ----

  Scenario: the skill pattern is chosen and drives the body shape
    Given a skill whose workflow is an ordered multi-step process
    When define-skill selects the pattern
    Then it picks the process pattern and shapes the body as ordered steps

  Scenario: a persona pattern request is redirected out of define-skill
    Given the gathered shape turns out to be an opt-in expert persona rather than a workflow
    When define-skill selects the pattern
    Then it hands the request to define-agent instead of scaffolding a persona skill itself

  # ---- Resolving placement ----

  Scenario: the placement path is derived from the chosen scope
    Given the user selects the project-public scope for the skill
    When define-skill resolves placement
    Then it creates the SKILL.md under the project public skills directory

  Scenario: a runtime symlink is created and verified for each selected agent
    Given the user targets Claude Code and Cursor for a user-global skill
    When define-skill links the skill
    Then it creates a runtime symlink for Claude Code and for Cursor that resolves to the canonical SKILL.md and verifies each exists

  Scenario: a project-public skill gets a README beside the SKILL.md
    Given the user selects the project-public scope
    When define-skill scaffolds the skill
    Then it writes a README beside the SKILL.md with a title, when-to-use, what-it-does, and install line

  Scenario: a user-global skill gets no README
    Given the user selects the user-global scope
    When define-skill scaffolds the skill
    Then it writes no README

  # ---- Drafting ----

  Scenario: the SKILL.md carries a matching name and a trigger-bearing description
    Given a gathered name, scope, trigger phrasing, and body steps
    When define-skill writes the SKILL.md
    Then the frontmatter name is kebab-case and matches the directory and the description carries a capability, a "Use when" trigger, and an implicit-phrasing example

  Scenario: a partial skill's description carries the Partial Skill prefix to prevent accidental activation
    Given the skill is a partial skill other skills call by name rather than a user-triggered one
    When define-skill writes the SKILL.md
    Then the description begins with the "Partial Skill:" prefix so it does not self-activate

  Scenario: deterministic fixed-output logic is extracted to a script rather than baked into the body
    Given a gathered workflow whose core step produces a fixed, assertable output
    When define-skill writes the SKILL.md
    Then it moves that step to a script and the body retains only when to run it

  # ---- Improving an existing skill ----

  Scenario: an existing skill is read before any change
    Given the named SKILL.md already exists
    When define-skill improves it
    Then it reads the existing file before changing anything

  Scenario: only the gaps found are changed when improving
    Given an existing SKILL.md with a weak description and an otherwise sound body
    When define-skill improves it
    Then it changes only the description and leaves the rest intact

  # ---- Quality audit ----

  Scenario: the structural audit runs before the skill is presented
    Given a freshly drafted SKILL.md
    When define-skill finishes drafting
    Then it runs the structural audit before presenting the skill

  Scenario: a high-severity audit finding is fixed before handoff
    Given the audit reports a CRITICAL finding on the drafted skill
    When define-skill finishes the audit
    Then it fixes the CRITICAL finding before presenting the skill

  # ---- Handoff to the ACED eval loop ----

  Scenario: the report names the artifacts and points at the ACED eval loop
    Given a completed skill that carries triggering behavior
    When define-skill reports
    Then it states the SKILL.md path, the README, the runtime symlinks, and the audit outcome, and points the user at start-mission to spec and eval the skill

  Scenario: no legacy trigger-query eval file is embedded as the test step
    Given a completed skill
    When define-skill reports
    Then it does not embed a legacy trigger-query eval file as the test step and defers scoring to the ACED eval loop

  # ---- Gate-role naming ----

  Scenario: a gate-scorer subagent is named by the gate and scope it serves
    Given the subagent's role is to score or verify a named gate for a domain, realized as a partial skill
    When define-skill names the subagent
    Then it names the subagent by its gate and scope in the domain-gate-judge form, like aced-impl-judge, not a bare action verb

  Scenario: a case-scorer subagent takes the case-judge form
    Given the subagent's role is to score individual cases within a scope
    When define-skill names the subagent
    Then it names the subagent in the domain-case-judge form, like aces-case-judge, not a bare judge

  Scenario: a gate-scorer subagent drafted with a bare action-verb name is flagged and corrected before handoff
    Given a drafted partial-skill subagent that scores a gate but is named with a bare action verb like implementer, judge, or validator
    When define-skill runs its quality checks
    Then the gate-role naming check flags the name at HIGH severity and define-skill renames it to the gate-and-scope form before presenting the skill

  Scenario: a non-scorer producer subagent keeps its action-oriented name
    Given the subagent's role is to produce an artifact rather than score a gate or case, named like scenario-writer or doc-writer
    When define-skill runs its quality checks
    Then the gate-role naming check does not fire and define-skill keeps the action-oriented name

  # ---- Impl-producer dual mode ----

  Scenario: dispatched against a frozen suite it co-produces the eval suite
    Given the conductor dispatches define-skill as the ACED impl-producer against a frozen feature
    When define-skill produces the implementation
    Then it writes the SKILL.md and an eval suite carrying one eval per frozen scenario

  Scenario: invoked standalone it produces only the skill
    Given define-skill is invoked with no frozen feature
    When define-skill produces the artifact
    Then it writes the SKILL.md and no eval suite
