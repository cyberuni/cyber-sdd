@frozen
Feature: acceptance — the author → run → improve → compare loop
  Cross-capability e2e: the full ACED eval loop tying add, run, improve, and compare across a single
  agent configuration. Unit-level behavior lives in each capability folder; this suite asserts the
  capabilities compose into the working loop.

  Scenario: a config is scored, improved, and confirmed end to end
    Given an agent configuration with a golden-set eval suite that has failing cases
    When the author runs the suite, improves the configuration for the failures, and compares the new version against the old
    Then the comparison shows the addressed cases now passing and confirms the change is safe to commit

  Scenario: growing the golden set then re-running widens coverage
    Given a configuration whose suite currently passes every case
    When the author adds an edge case for a gap they noticed and runs the suite again
    Then the new case is scored alongside the existing ones and the run reports the updated pass rate
