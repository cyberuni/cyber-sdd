@frozen
Feature: The align-specs procedure — detect & reconcile prose↔suite drift
  Unit suite for the align-specs tool. Detect and reconcile behaviors only — on-demand and CI
  alignment over chosen specs. Cross-capability e2e scenarios live in ../../acceptance/.

  # ── Detect ──

  Scenario: detect reports a coverage gap between prose and suite
    Given a spec whose prose describes a behavior with no scenario
    When align-specs runs in detect mode over it
    Then it reports the uncovered behavior as drift

  Scenario: detect reports a prose-scenario contradiction
    Given a spec whose prose contradicts one of its scenarios
    When align-specs runs in detect mode over it
    Then it reports the contradiction as drift

  Scenario: detect runs over one, several, or all specs
    Given a request to align a chosen set of specs
    When align-specs runs in detect mode
    Then it reports drift per spec across exactly the chosen set

  Scenario: a scenario-diff flags a narrowing of the frozen suite
    Given a spec whose suite narrows a scenario relative to the frozen suite
    When align-specs runs the mechanical scenario-diff
    Then it flags the narrowing as a Clearance

  Scenario: detect over an aligned spec reports no drift
    Given a spec whose prose and suite are aligned
    When align-specs runs in detect mode over it
    Then it reports no drift

  Scenario: check mode exits non-zero on drift and writes nothing
    Given a spec with drift
    When align-specs runs with the check flag
    Then it exits non-zero
    And it writes no artifact

  Scenario: check mode exits zero when there is no drift
    Given a spec whose prose and suite are aligned
    When align-specs runs with the check flag
    Then it exits zero

  # ── Reconcile ──

  Scenario: an in-scope gap is reconciled by adding a scenario
    Given a detected gap the Director lens judges in scope
    When align-specs reconciles it
    Then it adds a scenario to the .feature

  Scenario: an out-of-scope prose claim is reconciled by trimming the prose
    Given a detected gap the Director lens judges out of scope
    When align-specs reconciles it
    Then it trims the prose

  Scenario: a contradiction is reconciled by aligning the losing side
    Given a detected prose-scenario contradiction
    When align-specs reconciles it
    Then it aligns the losing side to the winning one

  Scenario: a gap that would narrow a frozen scenario escalates as a Clearance
    Given a detected gap whose fix would narrow an already-frozen scenario
    When align-specs reconciles it
    Then it escalates a Clearance CR
    And it does not silently rewrite the frozen scenario

  # ── The write boundary ──

  Scenario: reconcile never writes lifecycle state
    Given align-specs reconciling drift in a spec
    When it writes its fixes
    Then it writes only prose or scenarios
    And it writes no status, approval, or freeze