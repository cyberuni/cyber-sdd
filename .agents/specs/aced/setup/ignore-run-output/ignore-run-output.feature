Feature: ignore-run-output — keep ACED run output out of version control
  Unit suite for the deterministic engine init-aced invokes to ensure the ACED results directory
  (.agents/aced/results/) is git-ignored. The rule is appended as the LAST line, so gitignore's
  last-match-wins guarantees the path is ignored with no post-write check. Behavior is idempotent and
  fail-closed: every failure exits before any write, so it changes nothing it cannot guarantee. Writing
  the run output is run's; registering the role-map is registry's. Every Given names the apparatus that
  DISCRIMINATES — a starting .gitignore state the outcome must reach or preserve. Cross-capability e2e
  lives in ../../workflows/, not here.

  # ---- Emit the guarantee ----

  Scenario: an absent gitignore is created carrying the rule
    Given a repository with no .gitignore at its root
    When the engine runs
    Then a .gitignore is created and a path under the results directory is reported ignored by git

  Scenario: a gitignore missing the rule gains it
    Given a .gitignore that does not ignore the results directory
    When the engine runs
    Then the results directory is thereafter reported ignored by git

  Scenario: existing gitignore lines are left unchanged
    Given a .gitignore carrying unrelated rules
    When the engine runs
    Then every pre-existing line is still present, and the new rule is added after them

  Scenario: an already-ignored path adds no duplicate
    Given a .gitignore that already ignores the results directory via a broader pattern
    When the engine runs
    Then no rule is appended and the file is left byte-for-byte unchanged

  Scenario: an earlier un-ignore of the path is overridden by the appended rule
    Given a .gitignore whose existing lines re-include the results directory with a later negation
    When the engine runs
    Then the rule is appended after them and a path under the results directory is reported ignored by git

  Scenario: the results directory is git-ignored after the engine runs
    Given any starting state in which the engine succeeds
    When the engine finishes
    Then a probe path under the results directory is reported ignored by git

  # ---- Idempotence ----

  Scenario: a second run leaves exactly one matching rule
    Given a repository in which the engine has already ensured the rule
    When the engine runs a second time
    Then exactly one rule matching the results directory remains and the path stays ignored

  # ---- Fail closed ----

  Scenario: outside a git repository it fails closed
    Given a directory that is not inside any git repository
    When the engine runs
    Then it exits non-zero and creates or modifies no file

  Scenario: an unwritable gitignore fails closed
    Given a .gitignore that cannot be written
    When the engine runs
    Then it exits non-zero and changes nothing
