@frozen
Feature: SDD acceptance — resolve a squad (registry → resolution → production chain)
  Cross-capability e2e outcomes spanning plugin/ init-WRITE and mission/ resolution.
  Outcome-level only.

  # ── Resolve from the registry ──

  Scenario: a registered plugin's delegates resolve without directory scanning
    Given a plugin's init-write added its sdd-plugins entry to the registry
    When the conductor resolves delegates for that plugin's domain
    Then it reads the role-to-agent map from the registry
    And it does not scan user-global, project-global, or project-local plugin directories

  Scenario: an unfilled producer role degenerates to inline authoring
    Given a domain whose producer role is unfilled
    When the conductor resolves that role
    Then the conductor authors inline and records produced-by as sdd:automaton

  Scenario: an unfilled judge role is graded by the cold SDD-default judge
    Given a domain whose judge role is unfilled
    When the conductor resolves that role
    Then the cold SDD-default judge produces the verdict for that role

  # ── Disambiguate and fail ──

  Scenario: a domain claimed by two plugins resolves without looping
    Given a domain claimed by two plugins
    When the conductor resolves its delegates
    Then it returns needs-input once
    And the recorded choice lets resume proceed without looping

  Scenario: a required role with no resolvable delegate hard-fails
    Given a required role with no resolvable delegate
    When the conductor resolves it
    Then it hard-fails
    And it records nothing

  # ── Reconcile the registry ──

  Scenario: re-running init at a newer version reconciles a stale entry
    Given a registry entry stale against a newer plugin version
    When init is re-run
    Then it reconciles the stale entry to the current shape

  Scenario: a corrupt registry fails closed and is left untouched
    Given a registry file containing malformed JSON
    When init is re-run
    Then it fails closed
    And the registry file is left untouched