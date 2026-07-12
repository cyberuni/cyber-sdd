@frozen
Feature: The init onboarding skill — wire SDD's opt-in conveniences into the repo
  Unit suite for the init unit (the init skill). A user-facing setup skill that offers SDD's
  opt-in conveniences and, on consent, wires them into operational config only — it opens no CR,
  invokes no gate, and never writes the runtime status value (that is the conductor's).
  Cross-capability e2e scenarios live in ../../acceptance/.

  # ---- Front door ----

  Scenario: init is a user-invocable onboarding skill
    Given a user invokes init
    When it handles the invocation
    Then it runs the onboarding setup rather than classifying a request to another skill

  Scenario: init opens no change request and invokes no gate
    Given any invocation of init
    When it carries out setup
    Then it opens no change request and invokes no gate

  Scenario: init writes only operational config, never contract state
    Given init wires a convenience into the repo
    When it writes to the repo
    Then it writes operational config only
    And it writes no status, approval, or spec content

  # ---- Offer and consent ----

  Scenario: init asks whether to enable the statusline
    Given a user runs init
    When it reaches the statusline convenience
    Then it asks the user whether to enable it

  Scenario: a declined statusline writes nothing
    Given the user declines the statusline
    When init finishes
    Then it wires no statusLine command
    And it adds no gitignore entry

  # ---- Display-mode choice ----

  Scenario: enabling the statusline asks for the display mode
    Given the user enables the statusline
    When init continues setup
    Then it asks whether the mission status renders on its own line or the same line

  Scenario: the chosen display mode is wired into the reader
    Given the user picks a display mode for the statusline
    When init wires the reader
    Then the wired command renders the mission status in the chosen mode

  # ---- Wire the reader ----

  Scenario: init wires the reader into project settings
    Given the user enables the statusline
    When init wires the reader
    Then it writes a statusLine command into the project .claude/settings.json
    And the command reads the status file the conductor writes

  Scenario: init never wires the global settings
    Given the user enables the statusline
    When init wires the reader
    Then it does not modify the global settings file

  Scenario: the wired command falls through when the status file is absent
    Given the statusline is wired
    And the status file is absent
    When the status line renders
    Then the wired command shows nothing beyond any composed base

  # ---- Compose, not stomp ----

  Scenario: an existing statusLine is composed with, not replaced
    Given the project settings already define a statusLine
    When init wires the mission statusline
    Then it preserves the existing command's output and adds the SDD line
    And it does not overwrite the existing statusLine

  Scenario: init with no existing statusLine creates one
    Given the project settings define no statusLine
    When init wires the mission statusline
    Then it creates a statusLine command that renders the mission status

  # ---- Gitignore ----

  Scenario: init ignores the status file when the folder is a git repo
    Given the folder is a git repository
    When init wires the statusline
    Then it adds the status file to .gitignore

  Scenario: init skips the gitignore when the folder is not a git repo
    Given the folder is not a git repository
    When init wires the statusline
    Then it adds no gitignore entry

  # ---- Idempotency ----

  Scenario: re-running init does not duplicate the wiring
    Given init already wired the statusline once
    When the user runs init again and re-enables it
    Then it does not add a second SDD segment to the statusLine
    And it does not duplicate the gitignore entry
