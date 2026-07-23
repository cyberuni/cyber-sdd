@frozen
Feature: compare — diff two config versions for regressions
  Unit suite for the compare skill: score a before-version and an after-version against the same
  golden set and classify the per-case change, gating on regressions. Single-version scoring is
  run; the project roll-up is report. Cross-capability e2e scenarios live in ../../workflows/.

  # ---- Triggering ----

  Scenario: a request to diff two versions triggers compare
    Given the user asks to compare two versions of a configuration for regressions
    When ACED routes the request
    Then compare handles it

  Scenario: a request to score one version defers to run
    Given the user asks to run the evals for the current configuration
    When ACED routes the request
    Then compare does not handle it and run does

  Scenario: a request for a project-wide health summary defers to report
    Given the user asks for the eval health across all suites
    When ACED routes the request
    Then compare does not handle it and report does

  Scenario: a request to author or fix a case defers to add-scenario
    Given the user asks to add a new case to the eval suite
    When ACED routes the request
    Then compare does not handle it and add-scenario does

  # ---- Resolving the versions ----

  Scenario: the default compares the working tree against the previous revision
    Given the user names no versions
    When compare resolves the two versions
    Then it takes the working tree as after and the previous revision as before

  Scenario: two explicit paths are used as the two versions
    Given the user provides two configuration paths
    When compare resolves the two versions
    Then it uses the first as before and the second as after

  Scenario: a git ref names the before version
    Given the user provides a git ref for the before version
    When compare resolves the two versions
    Then it reads that ref as before and the working tree as after

  Scenario: an unresolvable before version is reported
    Given a before version that cannot be read
    When compare resolves the two versions
    Then it reports the version cannot be resolved and scores nothing

  Scenario: both versions are read in full before scoring
    Given two resolved versions
    When compare prepares the diff
    Then it reads both versions in full before any case is scored

  # ---- Diffing ----

  Scenario: both versions are scored over the same golden set
    Given two resolved versions and a golden set
    When compare runs the diff
    Then it scores every case against both versions and labels each result before or after

  Scenario: each case is classified by its change
    Given the before and after results
    When compare computes the diff
    Then it classifies each case as improved, regressed, unchanged, now-passing, or now-failing

  Scenario: the net change across cases is reported
    Given the before and after results
    When compare reports the diff
    Then it reports the net change in passing cases across the golden set

  Scenario: raw totals are not averaged across scenarios into one score
    Given per-case totals whose maxima differ across the golden set
    When compare reports the diff
    Then it aggregates by net passing change and per-dimension delta and reports no single averaged total across cases

  Scenario: a diff is not persisted by default
    Given a completed diff and no request to record it
    When compare reports
    Then it writes no results record

  Scenario: a diff is persisted only on request
    Given the user asks to record the comparison
    When compare reports
    Then it writes a results record

  # ---- Regression gate ----

  Scenario: a regressed case blocks the commit with a warning
    Given a diff in which a case dropped from passing to failing
    When compare applies the regression gate
    Then it warns explicitly and advises against committing until the regression is resolved

  Scenario: a dimension that drops while the case still passes is flagged as a regression
    Given a diff in which a case stays passing but one dimension's score dropped
    When compare applies the regression gate
    Then it warns explicitly and advises against committing until the regression is resolved

  Scenario: a clean net improvement is confirmed safe to commit
    Given a diff with no regressed case and a net improvement
    When compare applies the regression gate
    Then it confirms the change is safe to commit
