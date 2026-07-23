@frozen
Feature: report — project-wide eval health
  Unit suite for the report skill: discover every eval suite, classify each one's health, and
  render a project dashboard with attention flags. Single-suite scoring is run; two-version diff
  is compare. Cross-capability e2e scenarios live in ../../workflows/.

  # ---- Triggering ----

  Scenario: a request for project-wide health triggers report
    Given the user asks how the eval suites are doing across the project
    When ACED routes the request
    Then report handles it

  Scenario: a request to score one suite defers to run
    Given the user asks to run the evals for a single configuration
    When ACED routes the request
    Then report does not handle it and run does

  Scenario: a request to diff two versions defers to compare
    Given the user asks to compare two versions of a configuration
    When ACED routes the request
    Then report does not handle it and compare does

  Scenario: a request to author a case defers to add
    Given the user asks to add a case for a failure they saw
    When ACED routes the request
    Then report does not handle it and add does

  # ---- Discovery ----

  Scenario: every suite with an eval is discovered
    Given a project tree containing several eval suites
    When report discovers the suites
    Then it includes every suite that has an eval definition

  Scenario: no suites reports that none is initialized
    Given a project tree with no eval suite
    When report discovers the suites
    Then it reports that no eval suite is initialized

  Scenario: the latest and previous results are read per suite
    Given a suite with more than one results record
    When report reads the suite
    Then it takes the most recent record and the one before it for the trend

  # ---- Classification ----

  Scenario: a high-passing suite is classified healthy
    Given a suite whose latest run passes at or above the healthy bar
    When report classifies it
    Then it marks the suite healthy

  Scenario: a low-passing suite is classified critical
    Given a suite whose latest run passes below the critical bar
    When report classifies it
    Then it marks the suite critical

  Scenario: a mid-band suite is classified degraded
    Given a suite whose latest run passes between the critical and healthy bars
    When report classifies it
    Then it marks the suite degraded

  Scenario: a suite with no results is classified no-data
    Given a suite with no results record
    When report classifies it
    Then it marks the suite no-data

  Scenario: a dropping suite is classified trending-down
    Given a suite whose pass rate fell sharply against its previous run
    When report classifies it
    Then it marks the suite trending-down

  # ---- Reporting ----

  Scenario: the dashboard shows each suite with its trend and attention list
    Given the per-suite metrics
    When report renders the dashboard
    Then it shows each suite's pass rate, mean, and trend and lists the suites needing attention

  Scenario: the mean column normalizes each scenario rather than averaging raw totals
    Given a suite whose scenarios declare different rubric maxima
    When report computes the suite's mean
    Then it means each scenario's total over its own maximum and never averages the raw totals

  Scenario: a suite with no rubric scenarios shows no mean
    Given a suite whose scenarios are all boolean or trigger with no rubric maximum
    When report computes the suite's mean
    Then it renders the mean as not-applicable rather than a raw score

  Scenario: a request for one suite's detail lists its failing cases
    Given the user asks for the detail on a specific suite
    When report renders that suite
    Then it lists every failing case with its per-dimension scores and what failed

  Scenario: the needs-attention entry names the suite's worst failing case
    Given a suite that needs attention with at least one failing case
    When report renders the needs-attention list
    Then it names the worst failing case and its total against its own maximum

  Scenario: each suite is given a matching next action
    Given suites across several health classes
    When report suggests next actions
    Then it points a critical or trending-down suite at improve, a no-data suite at run, and an all-healthy project at add

  Scenario: a degraded suite is pointed at run for detail
    Given a suite classified degraded
    When report suggests next actions
    Then it points the degraded suite at run for details before improve
