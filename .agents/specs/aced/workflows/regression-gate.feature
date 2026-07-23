@frozen
Feature: acceptance — the regression gate
  Cross-capability e2e: compare's regression gate as the guard that blocks a config change which
  drops a previously passing case. Unit-level diff behavior lives in eval-run/compare; this suite
  asserts the gate decides commit-readiness across an authoring change.

  Scenario: a change that drops a passing case below the bar is blocked
    Given a configuration whose suite currently passes and an edit that makes a passing case fail
    When the author compares the edited version against the committed one
    Then the regression gate flags the regression and advises against committing until it is resolved

  Scenario: a clean improvement clears the gate
    Given an edit that fixes failing cases and drops no passing case
    When the author compares the edited version against the committed one
    Then the regression gate confirms the change is safe to commit

  Scenario: improving against the gate keeps a change honest
    Given an edit blocked by the regression gate
    When the author improves the configuration and compares again
    Then the regression is gone and the gate confirms the change is safe to commit
