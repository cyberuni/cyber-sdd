@frozen
Feature: registry — register ACED as the agent-config SDD plugin
  Unit suite for the init-aced skill: upsert the ACED entry in .agents/universal-plugin.json so the
  conductor resolves ACED for the agent-config artifact-types. Idempotent, fail-closed. Cross-
  capability e2e scenarios live in ../acceptance/.

  # ---- Triggering ----

  Scenario: a request to register ACED triggers init-aced
    Given the user asks to register or initialize ACED as the SDD plugin
    When ACED routes the request
    Then init-aced handles it

  Scenario: a request to run evals defers to run
    Given the user asks to run the evals for a configuration
    When ACED routes the request
    Then init-aced does not handle it and run does

  Scenario: a request to change the project spec defers to start-mission
    Given the user asks to add or revise part of the project spec
    When ACED routes the request
    Then init-aced does not handle it and start-mission does

  # ---- Registering ----

  Scenario: an absent entry is appended as the canonical squad
    Given a registry with no aced entry
    When init-aced registers ACED
    Then it appends the canonical aced squad serving skill, subagent, command, and agents-section

  Scenario: a missing registry file is created
    Given no registry file exists
    When init-aced registers ACED
    Then it creates the registry file with the aced entry

  Scenario: other plugins' entries are left untouched
    Given a registry holding entries for other plugins
    When init-aced registers ACED
    Then it leaves the other entries unchanged

  # ---- Migration ----

  Scenario: a legacy-shape entry is rewritten to squads
    Given an aced entry in the legacy domains shape
    When init-aced registers ACED
    Then it rewrites the entry to the squads shape

  Scenario: a stale version stamp is refreshed
    Given an aced squads entry stamped with a different version
    When init-aced registers ACED
    Then it rewrites the entry with the current ACED version

  Scenario: an up-to-date entry is left unchanged
    Given an aced squads entry already stamped with the current version
    When init-aced registers ACED
    Then it leaves the entry unchanged

  # ---- Failing closed ----

  Scenario: a corrupt registry stops without overwriting
    Given a registry file containing malformed JSON
    When init-aced registers ACED
    Then it stops with an error and leaves the file untouched

  Scenario: a squad missing its governances block is rejected
    Given a payload whose squad has no governances block
    When init-aced validates the payload
    Then it fails with an error and writes nothing

  # ---- Reporting ----

  Scenario: a successful registration confirms the entry
    Given ACED has been registered
    When init-aced reports
    Then it confirms the entry, its version, and the served artifact-types
