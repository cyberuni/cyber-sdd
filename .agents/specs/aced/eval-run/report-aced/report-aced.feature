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

  # ---- Measured section ----

  Scenario: a project with no measured suite gets no measured section
    Given a project tree whose only eval suites are the simulated suites of the skills "invoice-parser" and "ticket-triage"
    When report renders the dashboard
    Then the dashboard carries no measured section

  Scenario: every measured suite with a task set is listed in the measured section
    Given a project tree holding .agents/aced/bench/atlas.migrations/tasks.json and .agents/aced/bench/fleet.smoke/tasks.json
    And a simulated eval suite for the skill "invoice-parser"
    When report renders the dashboard
    Then a measured section separate from the simulated suite table lists "atlas.migrations" and "fleet.smoke"

  Scenario: a bench directory without a task set is not listed as a measured suite
    Given a project tree holding .agents/aced/bench/atlas.migrations/tasks.json
    And .agents/aced/bench/orbit.legacy/ holding only baseline.json
    When report renders the dashboard
    Then the measured section lists "atlas.migrations"
    And it does not list "orbit.legacy"

  Scenario: a project with only measured suites still gets its measured section
    Given a project tree whose only suite is the measured suite at .agents/aced/bench/atlas.migrations/tasks.json
    And .agents/aced/results/bench/atlas.migrations/ holds one run record
    When report renders the dashboard
    Then the dashboard carries a measured section listing "atlas.migrations"

  Scenario: a measured suite shows its latest pass rate, cost per success, and last comparison's age and verdict
    Given the time is 2026-10-05T12:00:00Z
    And .agents/aced/results/bench/atlas.migrations/ holds 2026-09-10T12:00:00Z.with.json with pass rate 50%
    And it holds 2026-09-28T12:00:00Z.with.json with pass rate 75% and a recorded costPerSuccessUsd of 0.42
    And it holds compare-2026-09-14T12:00:00Z.json with verdict regressed and compare-2026-09-21T12:00:00Z.json with verdict inconclusive
    When report renders the measured section
    Then the "atlas.migrations" row shows pass rate 75% and cost per success $0.42
    And it shows the last comparison as 14 days old with verdict inconclusive

  Scenario: the latest pass rate comes from the newest run record across arms and names its arm
    Given .agents/aced/results/bench/atlas.migrations/ holds 2026-09-28T12:00:00Z.with.json with pass rate 75%
    And it holds 2026-09-30T12:00:00Z.without.json with pass rate 25%
    When report renders the measured section
    Then the "atlas.migrations" row shows pass rate 25%
    And it names the arm "without" as the source of that pass rate

  Scenario: a measured suite with no passing run shows cost per success as not applicable
    Given the latest run record of the measured suite "fleet.smoke" has 0 passing runs of 6
    And that record's total cost is $2.10
    And that record carries no costPerSuccessUsd field
    When report renders the measured section
    Then the "fleet.smoke" row shows cost per success as not-applicable
    And it shows neither $0 nor an infinite cost per success

  Scenario: a measured suite with no comparison record shows none and computes no verdict
    Given .agents/aced/results/bench/atlas.migrations/ holds 2026-09-21T07:00:00Z.without.json and 2026-09-21T08:30:00Z.with.json
    And those two run records are the only files in that directory
    When report renders the measured section
    Then the "atlas.migrations" row shows that the suite has no comparison yet
    And it shows no verdict and no p-value for the suite

  Scenario: a measured suite with no run record is shown as not yet measured and pointed at bench
    Given .agents/aced/bench/fleet.smoke/tasks.json is committed
    And .agents/aced/results/bench/ holds a directory only for "atlas.migrations"
    When report renders the measured section
    Then the "fleet.smoke" row is marked not yet measured
    And it is not marked no-data
    And its next action is bench

  Scenario: a measured run record the report cannot read is shown as unreadable
    Given the latest run record of the measured suite "atlas.migrations" carries schemaVersion 2
    When report renders the measured section
    Then the "atlas.migrations" row is listed and marked unreadable, naming schema version 2

  Scenario: a measured suite never enters the simulated health classification
    Given the measured suite "atlas.migrations" whose latest run record has pass rate 40%
    And whose previous run record has pass rate 90%
    When report classifies and renders the dashboard
    Then "atlas.migrations" is not marked healthy, degraded, critical, or trending-down
    And it carries no trend or mean %max and is not on the needs-attention list

  Scenario: a simulated suite never appears in the measured section
    Given a simulated eval suite for the skill "invoice-parser" with two results records
    And the measured suite "atlas.migrations" with one run record
    When report renders the measured section
    Then the measured section lists "atlas.migrations" and does not list "invoice-parser"

  # ---- The skill artifact: binding rules ----

  Scenario: the report skill carries a Validate section with one assertion per binding rule
    Given the report skill's SKILL.md
    When its sections are read
    Then it has a ## Validate section
    And that section holds an assertion for each of: no verdict or p-value computed by report; no measured suite in a simulated health class, trend, or needs-attention list; and no unreadable record dropped silently

  Scenario: every mechanical Validate assertion passes against the report skill
    Given the report skill's SKILL.md and its ## Validate section
    When each assertion in that section that names a checkable property of the file is checked against the file
    Then every such assertion holds
