@frozen
Feature: skillify — generalize the current session into a reusable skill
  Unit suite for the skillify skill: route a "turn what we just did into a skill" request, mine the
  workflow the current session actually performed, separate decisions from documentation, resolve
  placement and pattern, draft the name and description, write a SKILL.md that encodes the why, flag
  script-extraction candidates, validate it, and place and link it. Scaffolding a skill from scratch
  is define-skill; diagnosing why a skill's evals fail is improve; an agent or persona is define-agent;
  a reference-only rule set is define-governance. Cross-capability e2e scenarios live in
  ../../workflows/.

  # ── Triggering ──

  @trigger
  Scenario Outline: skillify activates on a session-extraction request and defers its siblings
    Given a user query "<query>"
    When ACED routes the request
    Then invocation is "<should_trigger>"

    Examples:
      | query                                                                        | should_trigger |
      | skillify this                                                                 | yes            |
      | turn what we just did in this session into a skill                            | yes            |
      | make this reusable so I don't have to redo it next time                      | yes            |
      | capture the workflow we just went through as a skill I can run again          | yes            |
      | I want a new skill that formats our changelog entries                         | no             |
      | scaffold a skill from scratch for deploying previews                          | no             |
      | why are my skill's golden-set evals failing and how do I fix them             | no             |
      | make a reusable code-reviewer agent I can delegate work to                    | no             |
      | write criteria other skills load on demand but never execute as steps         | no             |

  Scenario: a request to scaffold a skill from scratch defers to define-skill
    Given the user says "I want a skill that formats our changelog entries" with no session work behind it
    When ACED routes the request
    Then skillify does not handle it and define-skill does

  Scenario: a request to diagnose why a skill's evals fail defers to improve
    Given the user asks why their existing skill's golden-set cases are failing and how to fix them
    When ACED routes the request
    Then skillify does not handle it and improve does

  Scenario: a request to extract the session into a delegated agent defers to define-agent
    Given the user asks to turn what they just did into a code-reviewer agent they can fan out to
    When ACED routes the request
    Then skillify does not handle it and define-agent does

  Scenario: a request to extract the session into a reference-only rule set defers to define-governance
    Given the user asks to capture the session as criteria other skills load but never execute as steps
    When ACED routes the request
    Then skillify does not handle it and define-governance does

  # ── Mining the workflow from the session ──

  @behavior
  Scenario: the workflow is mined from what the session actually did
    Given a session in which the user manually migrated a config across three files and verified it
    When skillify identifies the workflow to generalize
    Then it extracts the trigger, the decisions made, the ordered steps, the inputs, and the outputs from the session history

  @behavior
  Scenario: decisions are separated from documentation
    Given a session whose work mixed a load-bearing choice with steps the model already knows how to do
    When skillify identifies the workflow to generalize
    Then it keeps the choice-and-why in the skill and drops the reference material the model already knows

  # ── Placement and pattern ──

  @behavior
  Scenario: placement and pattern are resolved from the session signal
    Given a session workflow that is an ordered multi-step process scoped to contributors of this repo
    When skillify resolves placement and pattern
    Then it selects the project-private placement and the process pattern

  @behavior
  Scenario: an ambiguous placement is resolved with the user, not guessed
    Given a session workflow whose scope is unclear between a personal and a project skill
    When skillify resolves placement
    Then it asks the user to resolve the scope before writing the SKILL.md rather than assuming one

  @behavior
  Scenario: a personal session workflow resolves to the user placement
    Given a session workflow that is personal and not tied to any specific codebase
    When skillify resolves placement
    Then it selects the user placement rather than a project-scoped one

  @behavior
  Scenario: a tool-centered session workflow resolves to the tool-based pattern
    Given a session workflow centered on calling tools or external systems
    When skillify resolves the pattern
    Then it selects the tool-based pattern rather than the process pattern

  # ── Drafting ──

  @behavior
  Scenario: the SKILL.md carries a matching name and a trigger-bearing description
    Given a mined workflow with a settled scope and steps
    When skillify writes the SKILL.md
    Then the frontmatter name is kebab-case and the description is at most 120 characters and contains "Use this skill when"

  @behavior
  Scenario: each body step encodes the why behind it
    Given a mined workflow whose steps each carried a constraint or decision
    When skillify writes the SKILL.md body
    Then each step records the constraint or decision behind it and not only the action taken

  @behavior
  Scenario: a deterministic fixed-output step is flagged as a script-extraction candidate
    Given a mined step that produces the same output for the same input with no judgment
    When skillify writes the SKILL.md
    Then it marks that step as a script-extraction candidate rather than leaving it as body prose

  # ── Validating, placing, linking ──

  @behavior
  Scenario: the draft is validated and CRITICAL findings are fixed before handoff
    Given a freshly drafted SKILL.md whose audit reports a CRITICAL finding
    When skillify validates the draft
    Then it fixes the CRITICAL finding before presenting the skill

  @behavior
  Scenario: the SKILL.md is placed at its resolved path and linked into the runtime
    Given a validated SKILL.md and a resolved project-public placement
    When skillify places the skill
    Then it writes the SKILL.md at the resolved path and creates a runtime link that resolves to it

  # ── Guards ──

  @behavior
  Scenario: session-specific values are generalized, not transcribed
    Given a session that operated on a specific file path and a specific project name
    When skillify writes the SKILL.md
    Then the body generalizes those values into workflow parameters and does not hard-code the session's specific path or project name

  @behavior
  Scenario: no step the session never performed is invented
    Given a session that performed four of a workflow's five conceivable steps
    When skillify mines the workflow
    Then it encodes only the steps the session actually performed and does not invent the step that was never done

  @behavior
  Scenario: validation is not skipped before handoff
    Given a drafted SKILL.md that has not yet been audited
    When skillify prepares to present the skill
    Then it does not present the skill without first running the audit

  # ── Quality of the generalized skill ──

  @quality @rubric
  Scenario: the generalized skill encodes decisions, a discriminating trigger, and flagged script candidates
    Given a session with a settled workflow and its decisions
    When skillify produces the SKILL.md
    Then the judge evaluates the produced skill against the rubric
      """
      dimensions:
        - name: decisions_not_documentation
          max: 3
        - name: discriminating_trigger
          max: 2
        - name: script_candidates_flagged
          max: 2
        - name: generalized_not_transcribed
          max: 2
      threshold: 7
      """
    And the rubric score is at least the threshold
