@frozen
Feature: The resolve-tracking procedure — resolve an artifact's tracking signal
  Unit suite for the resolve-tracking tool. Derivation behaviors only — the four-step
  resolution order, the optional .sddignore override file (gitignore syntax, last-match-wins),
  and the fixed kind-default location conventions. Cross-capability e2e scenarios live in
  ../../acceptance/.

  # ── Step 1 — explicit override wins first ──

  Scenario: an explicit tracking declaration wins over everything else
    Given an artifact with an explicit tracking declaration and a conflicting .sddignore rule
    When resolve-tracking resolves it
    Then the explicit declaration decides
    And the .sddignore file is not consulted

  # ── Step 2 — .sddignore is the universal override valve (gitignore syntax) ──

  Scenario: a matching .sddignore pattern resolves an artifact ignored
    Given a path matched by a plain .sddignore pattern, whose kind default is tracked
    When resolve-tracking resolves it
    Then it resolves ignored by the .sddignore rule

  Scenario: a bang rule re-tracks a path an earlier pattern ignored
    Given a .sddignore where a pattern ignores a directory and a later !pattern re-includes one path in it
    When resolve-tracking resolves that path
    Then it resolves tracked by the later !pattern

  Scenario: the last matching rule wins
    Given a .sddignore where two rules match one path, the later one disagreeing with the earlier
    When resolve-tracking resolves it
    Then the last matching rule's value decides

  Scenario: a bang rule re-tracks a code artifact that has no kind default
    Given a script at a path a .sddignore pattern ignores and a later !pattern re-includes
    When resolve-tracking resolves it
    Then it resolves tracked by the later !pattern

  Scenario: a path no .sddignore rule matches falls through
    Given a .sddignore whose rules do not match the artifact's path
    When resolve-tracking resolves it
    Then resolution falls through to the next step

  Scenario: a missing .sddignore is legal and falls through
    Given a repo with no .agents/sdd/.sddignore
    When resolve-tracking resolves an artifact
    Then resolution falls through to the next step

  Scenario: .sddignore comments and blank lines are ignored
    Given a .sddignore with comment lines, blank lines, and one real rule
    When resolve-tracking parses it
    Then only the real rule is loaded

  # ── Step 3 — kind default (agent-config location convention) ──

  Scenario: a project-private skill resolves ignored by kind default
    Given a skill at a project-private path with no override and no .sddignore rule
    When resolve-tracking resolves it
    Then it resolves ignored

  Scenario: a project-public skill resolves tracked by kind default
    Given a skill at a project-public (shipped) path with no override and no .sddignore rule
    When resolve-tracking resolves it
    Then it resolves tracked

  Scenario: a project-private subagent resolves ignored by kind default
    Given a subagent at a project-private path with no override and no .sddignore rule
    When resolve-tracking resolves it
    Then it resolves ignored

  Scenario: a project-private command resolves ignored by kind default
    Given a command at a project-private path with no override and no .sddignore rule
    When resolve-tracking resolves it
    Then it resolves ignored

  Scenario: an agents-section artifact has no kind default
    Given an agents-section artifact with no override and no .sddignore rule
    When resolve-tracking resolves it
    Then no kind default applies
    And resolution falls through to fail-closed

  Scenario: a code artifact has no kind default
    Given a script or tool artifact with no override and no .sddignore rule
    When resolve-tracking resolves it
    Then no kind default applies
    And resolution falls through to fail-closed

  # ── Step 4 — fail closed to tracked ──

  Scenario: no resolvable signal resolves tracked
    Given an artifact with no explicit declaration, no .sddignore rule, and no kind default
    When resolve-tracking resolves it
    Then it resolves tracked

  # ── Validate the ignore file (no --path given) ──

  Scenario: a well-formed .sddignore validates OK
    Given a .sddignore whose every line is a comment, a blank, or a valid gitignore pattern
    When resolve-tracking validates the file with no path given
    Then it reports the file OK

  Scenario: a missing .sddignore validates OK
    Given a repo with no .agents/sdd/.sddignore
    When resolve-tracking validates the file with no path given
    Then it reports OK without error

  Scenario: a malformed .sddignore reports a parse note
    Given a .sddignore with a line that is not a valid gitignore pattern
    When resolve-tracking validates the file with no path given
    Then it reports a per-line parse note instead of OK
