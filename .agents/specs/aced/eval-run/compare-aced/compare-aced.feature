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

  # ---- Scoring model ----

  Scenario: a persisted comparison records the model it was scored under
    Given the user asks to record the comparison
    When compare writes the results record
    Then the record carries the model both sides were scored under

  Scenario: a persisted comparison that cannot name its judge model records unknown
    Given the user asks to record a comparison whose judge model compare cannot name
    When compare writes the results record
    Then the record carries the scoring model as unknown rather than omitting it

  # ---- Measured mode: selecting the mode ----

  Scenario: a request to compare two measured arms of a bench suite triggers compare
    Given the user asks to compare the real-run records of the "without" and "with" arms of the bench suite "atlas.migrations"
    When ACED routes the request
    Then compare handles it

  Scenario: a request to plan or run a bench measurement is not handled by compare
    Given the user asks to run fresh real runs of the bench suite "atlas.migrations" to measure their change to the skill "schema-linter"
    When ACED routes the request
    Then compare does not handle it
    And no bench plan or run is started by compare

  Scenario: a request to compare a simulated result against a measured record is refused as incomparable by layer
    Given the user asks to compare the latest simulated run result of the skill "schema-linter" against the latest measured run record of the bench suite "atlas.migrations"
    When compare selects its mode
    Then it says simulated and measured results are never compared with each other
    And it dispatches no aced-case-judge scoring and makes no aced-bench compare call

  Scenario: a measured-layer request is diffed by the engine and no case is scored
    Given the user asks for compare --layer measured --suite atlas.migrations --before without --after with
    And .agents/aced/results/bench/atlas.migrations/ holds a run record for the arm "without" and one for the arm "with"
    When compare selects its mode
    Then it calls aced-bench compare with --suite atlas.migrations
    And it dispatches no aced-case-judge scoring

  # ---- Measured mode: resolving the records ----

  Scenario: a measured request that names no suite is asked for one and nothing is compared
    Given the user asks to compare the measured "without" and "with" arms without naming a suite
    And .agents/aced/bench/ holds exactly one suite, "atlas.migrations"
    When compare resolves the two records
    Then it asks the user which suite to compare
    And it makes no aced-bench compare call

  Scenario: with no person present, a measured request that names no suite returns the question as needs-input and compares nothing
    Given a session with no user channel
    And the request asks to compare the measured "without" and "with" arms without naming a suite
    And .agents/aced/bench/ holds exactly one suite, "atlas.migrations"
    When compare resolves the two records
    Then it returns needs-input asking which suite to compare
    And it makes no aced-bench compare call

  Scenario: an arm label resolves to that arm's latest run record
    Given the user asks for compare --layer measured --suite atlas.migrations --before without --after with
    And .agents/aced/results/bench/atlas.migrations/ holds 2026-09-02T10:00:00Z.with.json and 2026-09-21T08:30:00Z.with.json
    And it holds 2026-09-21T07:00:00Z.without.json
    When compare resolves the two records
    Then the aced-bench compare call's --after names 2026-09-21T08:30:00Z.with.json
    And its --before names 2026-09-21T07:00:00Z.without.json

  Scenario: a record path is passed to the engine as named
    Given the user asks for compare --layer measured --suite atlas.migrations --before .agents/aced/results/bench/atlas.migrations/2026-09-02T10:00:00Z.with.json --after with
    And .agents/aced/results/bench/atlas.migrations/ also holds the newer 2026-09-21T08:30:00Z.with.json
    When compare resolves the two records
    Then the aced-bench compare call's --before names 2026-09-02T10:00:00Z.with.json
    And its --after names 2026-09-21T08:30:00Z.with.json

  Scenario: a before side of baseline is passed to the engine as the baseline
    Given the user asks for compare --layer measured --suite atlas.migrations --before baseline --after with
    And .agents/aced/bench/atlas.migrations/baseline.json is committed
    When compare resolves the two records
    Then the aced-bench compare call carries --before baseline

  Scenario: an after side of baseline is refused and nothing is compared
    Given the user asks for compare --layer measured --suite atlas.migrations --before without --after baseline
    And .agents/aced/bench/atlas.migrations/baseline.json is committed
    When compare resolves the two records
    Then it says the baseline can only be the before side
    And it makes no aced-bench compare call

  Scenario: an arm with no run record is handed to bench and no run is planned or launched
    Given the user asks for compare --layer measured --suite atlas.migrations --before without --after with
    And .agents/aced/results/bench/atlas.migrations/ holds only 2026-09-21T07:00:00Z.without.json
    When compare resolves the two records
    Then it says the arm "with" has no run record and names the bench skill as the next step
    And it makes no aced-bench plan, run, or compare call

  # ---- Measured mode: the engine's comparison ----

  Scenario: a caller's tags reach the engine's compare unchanged
    Given a consumer tool hands off to compare by name with the suite "atlas.migrations", the arms "without" and "with", and the tag pr=418
    And each arm has a run record
    When compare calls the engine
    Then the aced-bench compare call carries --tag pr=418 and no other tag

  Scenario: a measured compare the engine refuses is reported with its reason and no verdict
    Given a measured compare of the suite "atlas.migrations" whose before record carries schemaVersion 2
    And aced-bench compare exits non-zero naming that schema version
    When compare reports the result
    Then the report names the engine's schema-version refusal
    And it states no verdict and does not confirm the change is safe to commit

  Scenario: an incomparable measured comparison lists every reason and presents no statistics
    Given an engine comparison record for "atlas.migrations" whose verdict is incomparable because the records differ in model and in harness
    When compare reports the result
    Then the report names both the model mismatch and the harness mismatch
    And it presents no per-task deltas or p-values as a comparison

  Scenario: a comparable measured result shows the per-task, pooled, and pass-rate rows
    Given an engine comparison record for "atlas.migrations" over the tasks "rename-column" and "backfill-index" whose verdict is inconclusive
    When compare reports the result
    Then for each task and compared metric it shows both sides' ranges, the delta, the p-value, and whether the row is tooFew
    And it shows the pooled row of each metric that has one
    And it shows the pass-rate delta with its p-value

  Scenario: the engine's test count is disclosed with the count chance alone would make significant
    Given an engine comparison record for "atlas.migrations" whose footer states a test count of 17
    When compare reports the result
    Then the report states the test count 17 and that about 0.85 rows would be significant by chance alone

  # ---- Measured mode: regression gate ----

  Scenario: a regressed measured result blocks the commit with a warning naming the row
    Given an engine comparison record whose verdict is regressed because the task "backfill-index" mean turns rose with p 0.02
    When compare applies the regression gate
    Then it warns explicitly naming the task "backfill-index", turns, and p 0.02
    And it advises against committing until the regression is resolved

  Scenario: an inconclusive measured result is reported as neither a regression nor safe
    Given an engine comparison record whose verdict is inconclusive because the task "rename-column" pass rate fell with p 0.31
    When compare applies the regression gate
    Then it says the result cannot be called and suggests more runs per arm
    And it neither warns of a regression nor confirms the change is safe to commit

  Scenario: an improved measured result names the improved row and is confirmed safe to commit
    Given an engine comparison record whose verdict is improved because the task "rename-column" mean tool calls fell with p 0.01
    When compare applies the regression gate
    Then it names the task "rename-column", tool calls, and p 0.01
    And it confirms the change is safe to commit

  Scenario: an unchanged measured result at a too-few run count is not confirmed safe
    Given an engine comparison record whose verdict is unchanged and whose every gated row is flagged tooFew
    When compare applies the regression gate
    Then it says the run count was too low to call any change
    And it does not confirm the change is safe to commit

  Scenario: an unchanged measured result at a callable run count is confirmed safe to commit
    Given an engine comparison record at 10 runs per arm whose verdict is unchanged and whose gated rows are not flagged tooFew
    When compare applies the regression gate
    Then it confirms the change is safe to commit
    And it does not say the run count was too low

  Scenario: significant cost and cache-read rises with no gated regression are reported as non-gating changes
    Given an engine comparison record at 10 runs per arm whose verdict is unchanged
    And its costUsd row rose with p 0.03
    And its cacheReadTokens row rose with p 0.01
    When compare applies the regression gate
    Then it reports the cost rise and the cache-read rise as changes that do not gate
    And it does not warn of a regression

  # ---- Measured mode: recording ----

  Scenario: a measured comparison asks nothing about recording and writes no record of its own
    Given a measured compare of "atlas.migrations" after which the engine wrote compare-2026-10-05T09:00:00Z.json
    And the user did not ask to record the comparison
    When compare reports
    Then it does not ask the user whether to record the comparison
    And the only file added under .agents/aced/results/ during the compare is the engine's .agents/aced/results/bench/atlas.migrations/compare-2026-10-05T09:00:00Z.json

  # ---- The skill artifact: binding rules ----

  Scenario: the compare skill carries a Validate section with one assertion per binding rule
    Given the compare skill's SKILL.md
    When its sections are read
    Then it has a ## Validate section
    And that section holds an assertion for each of: no plan, run, or spend in measured mode; no inconclusive or too-few unchanged result presented as safe; no cost or cache-read change used as a gate; no guessed suite; and no simulated result compared with a measured record

  Scenario: every mechanical Validate assertion passes against the compare skill
    Given the compare skill's SKILL.md and its ## Validate section
    When each assertion in that section that names a checkable property of the file is checked against the file
    Then every such assertion holds
