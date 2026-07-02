@frozen
Feature: The resolve-durability procedure — resolve an artifact's durability signal
  Unit suite for the resolve-durability tool. Derivation behaviors only — the four-step
  resolution order, the optional durability.toml override table, and the fixed kind-default
  location conventions. Cross-capability e2e scenarios live in ../../acceptance/.

  # ── Step 1 — explicit override wins first ──

  Scenario: an explicit durability declaration wins over everything else
    Given an artifact with an explicit durability declaration and a conflicting durability.toml entry
    When resolve-durability resolves it
    Then the explicit declaration decides
    And the durability.toml entry is not consulted

  # ── Step 2 — durability.toml is the universal override valve ──

  Scenario: a durability.toml entry overrides an artifact-type's kind default
    Given a skill at a path durability.toml declares durable, whose kind default is non-durable
    When resolve-durability resolves it
    Then the durability.toml entry decides

  Scenario: a durability.toml entry resolves a code artifact with no kind default
    Given a script at a path durability.toml declares non-durable
    When resolve-durability resolves it
    Then it resolves non-durable by the table entry

  Scenario: the most specific glob in durability.toml wins
    Given two durability.toml entries whose globs both match one path, one more specific than the other
    When resolve-durability resolves it
    Then the more specific glob's value decides

  Scenario: a missing durability.toml is legal and falls through
    Given a repo with no .agents/sdd/durability.toml
    When resolve-durability resolves an artifact
    Then resolution falls through to the next step

  Scenario: durability.toml comments and blank lines are ignored
    Given a durability.toml with comment lines, blank lines, and one real entry
    When resolve-durability parses it
    Then only the real entry is loaded

  # ── Step 3 — kind default (agent-config location convention) ──

  Scenario: a project-private skill resolves non-durable by kind default
    Given a skill at a project-private path with no override and no table entry
    When resolve-durability resolves it
    Then it resolves non-durable

  Scenario: a project-public skill resolves durable by kind default
    Given a skill at a project-public (shipped) path with no override and no table entry
    When resolve-durability resolves it
    Then it resolves durable

  Scenario: a project-private subagent resolves non-durable by kind default
    Given a subagent at a project-private path with no override and no table entry
    When resolve-durability resolves it
    Then it resolves non-durable

  Scenario: a project-private command resolves non-durable by kind default
    Given a command at a project-private path with no override and no table entry
    When resolve-durability resolves it
    Then it resolves non-durable

  Scenario: an agents-section artifact has no kind default
    Given an agents-section artifact with no override and no table entry
    When resolve-durability resolves it
    Then no kind default applies
    And resolution falls through to fail-closed

  Scenario: a code artifact has no kind default
    Given a script or tool artifact with no override and no table entry
    When resolve-durability resolves it
    Then no kind default applies
    And resolution falls through to fail-closed

  # ── Step 4 — fail closed to durable ──

  Scenario: no resolvable signal resolves durable
    Given an artifact with no explicit declaration, no table entry, and no kind default
    When resolve-durability resolves it
    Then it resolves durable

  # ── Validate the override table (no --path given) ──

  Scenario: a well-formed durability.toml validates OK
    Given a durability.toml whose every entry is a well-formed path/glob to durable-or-non-durable binding
    When resolve-durability validates the table with no path given
    Then it reports the table OK

  Scenario: a missing durability.toml validates OK
    Given a repo with no .agents/sdd/durability.toml
    When resolve-durability validates the table with no path given
    Then it reports OK without error

  Scenario: a malformed durability.toml reports a parse note
    Given a durability.toml with a line that is not a well-formed path/glob to durable-or-non-durable binding
    When resolve-durability validates the table with no path given
    Then it reports a per-line parse note instead of OK
