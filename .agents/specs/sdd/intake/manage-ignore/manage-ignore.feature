@frozen
Feature: The manage-ignore procedure — curate the .sddignore file
  Unit suite for the manage-ignore tool. Curation behaviors only — list, add, remove, induce,
  preview — over .agents/sdd/.sddignore (gitignore syntax, order-preserving). It writes only
  the ignore file, never spec content.

  # ── list ──

  Scenario: list reports every rule in order
    Given a .sddignore with several rules including a !re-track rule
    When manage-ignore lists the rules
    Then it reports every rule in file order

  Scenario: list a missing .sddignore reports nothing without error
    Given a repo with no .agents/sdd/.sddignore
    When manage-ignore lists the rules
    Then it reports no rules and no error

  # ── add / remove (CRUD) ──

  Scenario: add appends a well-formed rule
    Given a repo whose .sddignore does not contain a given pattern
    When manage-ignore adds that pattern
    Then the rule is appended to .sddignore

  Scenario: add creates the ignore file when absent
    Given a repo with no .agents/sdd/.sddignore
    When manage-ignore adds a pattern
    Then .sddignore is created containing that rule

  Scenario: add preserves existing rule order
    Given a .sddignore with existing rules in a meaningful order
    When manage-ignore adds a new pattern
    Then the new rule is appended after the existing rules
    And the existing rules keep their order

  Scenario: add refuses a malformed pattern
    Given a pattern that is not a well-formed gitignore pattern
    When manage-ignore adds it
    Then the rule is refused and .sddignore is unchanged

  Scenario: remove drops a present rule
    Given a .sddignore containing a given rule
    When manage-ignore removes that rule
    Then the rule is gone and the other rules keep their order

  Scenario: remove an absent rule is a no-op
    Given a .sddignore that does not contain a given rule
    When manage-ignore removes that rule
    Then the file is unchanged

  # ── induce ──

  Scenario: induce offers a literal and a generalized candidate
    Given a sample path under the repo
    When manage-ignore induces a pattern from it
    Then it offers a literal-path candidate and a ** generalization
    And it persists nothing

  Scenario: induce refuses a path outside the repo
    Given a sample path that is not under the repo
    When manage-ignore induces a pattern from it
    Then the induction is refused

  # ── preview ──

  Scenario: preview lists the paths a pattern would ignore without saving
    Given a candidate ignore pattern
    When manage-ignore previews it
    Then it lists the paths the pattern would ignore
    And .sddignore is unchanged

  Scenario: preview shows a !rule re-tracking a path
    Given a candidate !pattern against an already-ignored path
    When manage-ignore previews it
    Then it reports the path the !pattern would re-track
    And .sddignore is unchanged

  Scenario: preview refuses a malformed pattern
    Given a candidate that is not a well-formed gitignore pattern
    When manage-ignore previews it
    Then the preview is refused
