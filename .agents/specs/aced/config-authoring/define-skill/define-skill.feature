@frozen
Feature: define-skill — author a workflow skill
  Unit suite for the define-skill skill: route a "create a skill" request, settle scope, choose the
  pattern, resolve placement, scaffold the SKILL.md (plus a README for a public skill), audit it, and
  hand it to the ACED eval loop to spec and score. Authoring an agent definition or persona is
  define-agent; a reference-only governance is define-governance; extracting the current session is
  skillify; scoring and case authoring are run / add. Cross-capability e2e scenarios live in
  ../../workflows/.

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

  Scenario: a user-global skill is still written at the user-global path
    Given the user selects the user-global scope for a skill named "format-changelog"
    When define-skill scaffolds the skill
    Then it writes the SKILL.md at ~/.agents/skills/format-changelog/SKILL.md

  Scenario: a user-global skill gets no README
    Given the user selects the user-global scope
    When define-skill scaffolds the skill
    Then it writes no README

  # ---- Drafting ----

  Scenario: the SKILL.md frontmatter name is the kebab-case directory name
    Given the gathered skill is scaffolded at the directory "format-changelog"
    When define-skill writes the SKILL.md
    Then the frontmatter name is the kebab-case string "format-changelog"

  Scenario: a user-triggered skill's description carries the capability, the trigger, and an implicit phrasing
    Given a gathered scope, trigger phrasing, and body steps for a skill the user invokes directly
    When define-skill writes the SKILL.md
    Then the description states the capability the skill performs
    And the description carries a "Use when" trigger clause
    And the description carries an example of an implicit phrasing the user might say instead

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

  Scenario: improving an existing skill preserves a section its own template never generates
    Given an existing SKILL.md whose body carries a "## Rollback" section that no define-skill template emits
    And the only gap found in it is a weak description
    When define-skill improves it
    Then the file it leaves still carries the "## Rollback" section with its original text

  # ---- Quality audit ----

  Scenario: the structural audit runs before the skill is presented
    Given a freshly drafted SKILL.md
    When define-skill finishes drafting
    Then it runs the structural audit before presenting the skill

  Scenario: a high-severity audit finding is fixed before handoff
    Given the audit reports a CRITICAL finding on the drafted skill
    When define-skill finishes the audit
    Then it fixes the CRITICAL finding before presenting the skill

  Scenario: a HIGH audit finding with no CRITICAL alongside it is still fixed before handoff
    Given the audit reports one HIGH severity finding and no CRITICAL finding on the drafted skill
    When define-skill finishes the audit
    Then it fixes the HIGH finding before presenting the skill

  # ---- Handoff to the ACED eval loop ----

  Scenario: the report names the artifacts and points at the ACED eval loop
    Given the user invoked define-skill standalone, not through the non-durable escape hatch
    And the completed skill carries triggering behavior
    When define-skill reports
    Then it states the SKILL.md path, the README, the runtime symlinks, and the audit outcome, and points the user at start-mission to spec and eval the skill

  Scenario: a standalone run producing a non-triggering partial skill still points at the eval loop
    Given the user invoked define-skill standalone, not through the non-durable escape hatch
    And the completed skill is a partial skill that carries no triggering behavior
    When define-skill reports
    Then it points the user at start-mission to spec and eval the skill

  Scenario: an impl-producer run reports the eval loop as the next step
    Given the conductor dispatched define-skill as the ACED impl-producer against a frozen feature
    And define-skill has written the SKILL.md and run the structural audit on it
    When define-skill reports
    Then the report names the ACED eval loop as where the skill is specced and scored next

  Scenario: an escaped-entry skill is reported and stopped without pointing at the eval loop
    Given the gateway or start-mission resolved the request non-durable and invoked define-skill directly, with no change request open
    And define-skill has scaffolded the SKILL.md and run the structural audit on it
    When define-skill reports
    Then it states the SKILL.md path and the audit outcome
    And the report names neither start-mission nor the ACED eval loop as a next step

  Scenario: a request to bake a trigger-query eval file into the skill is answered with the ACED eval loop
    Given the user invoked define-skill standalone, not through the non-durable escape hatch
    And the skill is complete and its author asks define-skill to add an eval file listing trigger queries and their expected activations as the skill's test step
    When define-skill reports
    Then it names the ACED eval loop as where the skill is scored
    And the skill directory it hands back contains no trigger-query eval file

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

  Scenario: a gate scorer named for its action rather than its gate is flagged even when the name is not a bare verdict word
    Given a drafted partial-skill subagent named "eval-runner" whose role is to score the spec gate for the quill domain
    When define-skill runs its quality checks
    Then the gate-role naming check flags the name at HIGH severity
    And define-skill renames it to "quill-spec-judge" before presenting the skill

  Scenario: a non-scorer producer subagent keeps its action-oriented name
    Given the subagent's role is to produce an artifact rather than score a gate or case, named like scenario-writer or doc-writer
    When define-skill runs its quality checks
    Then the gate-role naming check does not fire and define-skill keeps the action-oriented name

  # ---- Impl-producer dual mode ----

  Scenario: dispatched against a frozen suite it builds the SKILL.md to pass that suite
    Given the conductor dispatches define-skill as the ACED impl-producer against a frozen feature carrying six scenarios
    And the spec directory beside that frozen feature already carries an eval.md naming the subject under test and the judge model and run counts
    When define-skill produces the implementation
    Then it writes the SKILL.md so that the six frozen scenarios pass against it
    And it writes no eval file carrying one eval per frozen scenario
    And the eval.md it leaves still names that same subject under test, that same judge model, and those same run counts, and nothing further

  Scenario: invoked standalone it produces only the skill
    Given define-skill is invoked with no frozen feature
    When define-skill produces the artifact
    Then it writes the SKILL.md and no eval suite
