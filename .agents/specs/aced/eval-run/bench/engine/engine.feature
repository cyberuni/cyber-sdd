Feature: engine — run a task set for real and compare two arms
  Unit suite for the deterministic measured-layer engine: plan a measured run without spending, run
  arms x tasks x N real headless sessions in throwaway checkouts, grade each run with a shell check,
  record what the harness counted, and compare two arms with permutation tests. Verified by node:test
  against a stand-in harness binary on the PATH that appends its argv and environment to a log file
  and replays a scripted transcript. Unless a scenario says otherwise, a task set is committed at HEAD,
  sets no model, cap, or permission mode, and the tree is clean. Asking a person for consent is the
  bench skill's; the measured views of compare and report are those nodes'. Cross-capability e2e
  scenarios live in ../../../workflows/.

  # ── Resolving the suite ──

  Scenario Outline: a suite name outside the naming rule is refused
    Given a <verb> request for the suite "<name>"
    When the engine resolves the suite
    Then it exits non-zero with a message naming the suite naming rule
    And no directory named after "<name>" is created under .agents/aced/bench

    Examples:
      | verb | name           |
      | plan | Nightly        |
      | plan | nightly_checks |
      | plan | nightly..core  |
      | plan | -nightly       |
      | init | ../escape      |

  Scenario: a dotted owner-prefixed suite name is accepted
    Given the suite "harbor.nightly" has a task set listing the tasks "trim-logs" and "pin-versions"
    When the engine plans a run for that suite
    Then the plan lists the tasks "trim-logs" and "pin-versions"

  # ── UC1 — init ──

  Scenario: init writes a starter task set for a suite that has none
    Given a repository whose .agents/aced/bench directory holds only the suite "harbor.other"
    When the maintainer runs init for the suite "harbor.nightly"
    Then .agents/aced/bench/harbor.nightly/tasks.json exists
    And the plan step accepts that file once it is committed

  Scenario: init refuses to overwrite an existing task set
    Given the suite "harbor.nightly" already has a tasks.json listing the task "trim-logs"
    When the maintainer runs init for the suite "harbor.nightly"
    Then it exits non-zero and tasks.json is byte-for-byte unchanged

  # ── UC2 — plan ──

  Scenario: a valid request writes a plan file and launches nothing
    Given a task set of 2 tasks and a stand-in harness on the PATH
    When the engine plans 1 arm at 3 runs with an output file
    Then the output file holds a plan counting 1 arm, 2 tasks, and 3 runs
    And the stand-in harness log records no launch
    And the results directory holds no new file

  Scenario: a suite with no task set fails the plan and names init
    Given the suite directory .agents/aced/bench/harbor.nightly holds only a checks folder
    When the engine plans a run for that suite
    Then it exits non-zero with a message that names the init command

  Scenario Outline: a malformed task set fails the plan and names the defect
    Given a task set with <defect>
    When the engine plans a run for that suite
    Then it exits non-zero with a message naming <defect>

    Examples:
      | defect                       |
      | the task id trim-logs twice  |
      | a task with no check         |
      | an empty tasks list          |
      | text that is not valid JSON  |

  Scenario: a task filter naming no task in the set fails the plan
    Given a task set listing the tasks "trim-logs" and "pin-versions"
    When the engine plans a run filtered to the task "rotate-keys"
    Then it exits non-zero with a message listing "trim-logs" and "pin-versions"

  Scenario: a task filter limits the plan to that task
    Given a task set listing the tasks "trim-logs", "pin-versions", and "fix-typo"
    When the engine plans a run filtered to the task "pin-versions"
    Then the plan counts one task and lists only "pin-versions"

  Scenario: a harness with no adapter fails the plan
    Given a task set of 2 tasks
    When the engine plans a run for the harness "codex"
    Then it exits non-zero with a message that the harness has no adapter

  Scenario: a harness whose command is not on the path fails the plan
    Given a task set of 2 tasks
    And a PATH on which the claude command does not resolve
    When the engine plans a run for the harness "claude-code"
    Then it exits non-zero with a message naming the missing claude command
    And no plan file is written

  Scenario: a baseline cannot be planned with more than one arm
    Given a task set of 2 tasks
    When the engine plans a run with the arms "before" and "after" and the baseline flag
    Then it exits non-zero with a message that a suite records one baseline

  Scenario: a git-ref arm naming no commit fails the plan
    Given a task set of 2 tasks
    When the engine plans a run with the arm "after=git:no-such-branch"
    Then it exits non-zero with a message naming "no-such-branch"

  Scenario: a file arm whose source does not exist fails the plan
    Given a task set of 2 tasks
    When the engine plans a run with the arm "with=file:docs/GUIDE.md=path:drafts/missing.md"
    Then it exits non-zero with a message naming drafts/missing.md

  Scenario: a package arm naming a version the registry does not have fails the plan
    Given a package registry stub that lists the package "lantern-kit" at versions 1.0.0 and 1.1.0
    When the engine plans a run with the arm "after=package:lantern-kit@9.9.9"
    Then it exits non-zero with a message naming "lantern-kit" and "9.9.9"

  Scenario: a suite with uncommitted changes warns that the committed suite is what runs
    Given the suite's tasks.json has an uncommitted edit adding the task "rotate-keys"
    When the engine plans a run with a git-ref arm at HEAD
    Then the plan's warnings include that the committed suite is what runs
    And the plan does not list "rotate-keys"

  Scenario: a git-ref arm planned from a tree with uncommitted changes warns that they are not benched
    Given a modified tracked file src/app.txt outside the suite
    When the engine plans a run with a git-ref arm at HEAD
    Then the plan's warnings include that uncommitted changes are not benched

  Scenario: a git-ref arm planned from a clean tree carries no uncommitted-changes warning
    Given a working tree with no modified or untracked files
    When the engine plans a run with a git-ref arm at HEAD
    Then the plan's warnings do not include an uncommitted-changes warning

  Scenario: the plan's ceiling is arms times tasks times runs times the per-run cap
    Given a task set of 3 tasks with maxBudgetUsd 0.40
    When the engine plans 2 arms at 5 runs each
    Then the plan's ceiling is 12.00 dollars

  Scenario: a task with matching stored runs is estimated from their median cost
    Given stored runs of the task "trim-logs" on the plan's model, harness, and runner costing 0.05, 0.10, and 0.45 dollars
    And a task set with maxBudgetUsd 0.50
    When the engine plans 2 arms at 4 runs for that task
    Then the plan's estimate for "trim-logs" is 0.80 dollars

  Scenario: a task with no stored runs is estimated at its cap for every run
    Given a results directory holding no run record for the task "trim-logs"
    And a task set with maxBudgetUsd 0.40
    When the engine plans 2 arms at 4 runs for that task
    Then the plan's estimate for "trim-logs" is 3.20 dollars

  Scenario Outline: stored runs that differ in <field> are not used for the estimate
    Given stored runs of the task "trim-logs" costing 0.10 dollars each that match the plan except in <field>
    And a task set with maxBudgetUsd 0.40
    When the engine plans 1 arm at 4 runs for that task
    Then the plan's estimate for "trim-logs" is 1.60 dollars

    Examples:
      | field   |
      | model   |
      | harness |
      | runner  |

  Scenario: a run count that cannot reach significance is flagged too few to call
    Given a task set of 2 tasks
    When the engine plans 2 arms at 3 runs each
    Then the plan's warnings include that no single task's result can be called significant at that run count
    And the warning states that a pooled result across the 2 tasks still can

  Scenario: a run count that can reach significance carries no too-few warning
    Given a task set of 2 tasks
    When the engine plans 2 arms at 4 runs each
    Then the plan's warnings do not include a too-few-to-call warning

  Scenario: the plan names the permission mode and that it applies only inside the throwaway checkout
    Given a task set of 2 tasks that sets no permission mode
    When the engine plans a run
    Then the plan names the permission mode bypassPermissions
    And the plan states that the mode applies only inside the throwaway checkout

  # ── UC3 — run ──

  Scenario: run without consent launches no agent and writes no record
    Given a plan file of 1 arm, 2 tasks, and 2 runs
    When the engine runs that plan without the consent flag
    Then it exits non-zero
    And the stand-in harness log records no launch
    And the results directory holds no new file

  Scenario: run with consent executes every planned run
    Given a plan file of 2 arms, 2 tasks, and 3 runs
    When the engine runs that plan with the consent flag
    Then the stand-in harness log records 12 launches
    And each arm's record holds 6 runs

  Scenario: a plan whose suite changed since it was written is refused
    Given a plan file written for the suite "harbor.nightly"
    And a later commit that adds the task "rotate-keys" to that suite's tasks.json
    When the engine runs that plan with the consent flag
    Then it exits non-zero with a message that the suite changed since the plan
    And the stand-in harness log records no launch

  Scenario: a git-ref arm runs each task in a checkout of that commit
    Given a repository whose commit tagged "v-old" has a file VERSION reading "old"
    And HEAD's VERSION reads "new"
    And a task whose check exits zero exactly when VERSION reads "old"
    When the engine runs the arm "before=git:v-old" with consent
    Then every run of that task records a pass

  Scenario: a file arm sourced from a ref runs each task with that ref's content
    Given a commit tagged "v-old" whose docs/GUIDE.md reads "legacy guide"
    And HEAD's docs/GUIDE.md reads "current guide"
    And a task whose check exits zero exactly when docs/GUIDE.md reads "legacy guide"
    When the engine runs the arm "with=file:docs/GUIDE.md=ref:v-old" with consent
    Then every run of that task records a pass

  Scenario: a file arm sourced from a path runs each task with that path's content
    Given a file drafts/guide-v2.md reading "draft guide"
    And HEAD's docs/GUIDE.md reads "current guide"
    And a task whose check exits zero exactly when docs/GUIDE.md reads "draft guide"
    When the engine runs the arm "with=file:docs/GUIDE.md=path:drafts/guide-v2.md" with consent
    Then every run of that task records a pass

  Scenario: an absent file arm runs each task with that file deleted
    Given HEAD has a file docs/GUIDE.md
    And a task whose check exits zero exactly when docs/GUIDE.md does not exist
    When the engine runs the arm "without=file:docs/GUIDE.md=absent" with consent
    Then every run of that task records a pass

  Scenario: a package arm loads that exact version from a fresh harness config directory
    Given a package registry stub serving the plugin "lantern-kit" at versions 1.0.0 and 1.1.0
    When the engine runs the arm "after=package:lantern-kit@1.0.0" with consent
    Then the stand-in harness log shows a --plugin-dir whose package.json version is 1.0.0
    And it shows CLAUDE_CONFIG_DIR set to a directory inside the run's temp directory

  Scenario: the agent starts on a clean tree carrying the task-set commit's suite
    Given a task-set commit whose tasks.json lists the task "rotate-keys"
    And an older commit tagged "v-old" whose tasks.json does not list it
    When the engine runs the arm "before=git:v-old" with consent
    Then the stand-in harness log shows git status reported no changes at launch
    And it shows the checkout's tasks.json listing "rotate-keys"

  Scenario: a run whose setup fails is recorded as an error and the agent is not launched
    Given a task whose setup command exits 1
    When the engine runs that task with consent
    Then the run is recorded with an error and pass false
    And the stand-in harness log records no launch for that run

  Scenario: setup time is not counted in the run's wall time
    Given a task whose setup sleeps 3 seconds
    And a stand-in harness that exits immediately
    When the engine runs that task with consent
    Then the run's recorded wall time is under 3 seconds

  Scenario: every launch carries the plan's model, cap, and permission mode
    Given a task set with model "model-alpha", maxBudgetUsd 0.40, and permissionMode "acceptEdits"
    When the engine runs a plan of that suite with consent
    Then the stand-in harness log shows --model model-alpha, --max-budget-usd 0.4, --permission-mode acceptEdits, and --no-session-persistence

  Scenario: every run launches the harness on the checkout's own settings, never the operator's
    Given a git-ref arm at HEAD
    When the engine runs that arm with consent
    Then the stand-in harness log shows the arguments --setting-sources project and --strict-mcp-config

  Scenario: a checkout carrying an MCP config passes it to the harness
    Given an arm whose checkout carries a .mcp.json file
    When the engine runs that arm with consent
    Then the stand-in harness log shows the arguments --mcp-config .mcp.json

  Scenario: a checkout with no MCP config passes none to the harness
    Given an arm whose checkout carries no .mcp.json file
    When the engine runs that arm with consent
    Then the stand-in harness log shows no --mcp-config argument

  Scenario Outline: a run stopped by <stop> is recorded as capped
    Given a stand-in harness whose transcript ends by <stop>
    When the engine runs a task with consent
    Then the run is recorded with capped true
    And the task's check still ran for that run

    Examples:
      | stop                                         |
      | a result event reporting the budget cap       |
      | a result event marked as an error             |
      | running past timeoutMinutes with no result    |
      | the harness process exiting on a signal       |

  Scenario: a run that ends in a success result is not capped
    Given a stand-in harness whose transcript ends with a success result event
    When the engine runs a task with consent
    Then the run is recorded with capped false

  Scenario: a check that exits zero records a pass
    Given a task whose check is "test -f DONE"
    And a stand-in harness that creates DONE in the checkout
    When the engine runs that task with consent
    Then the run is recorded with pass true

  Scenario: a check that exits non-zero records a failure
    Given a task whose check is "test -f DONE"
    And a stand-in harness that creates no file
    When the engine runs that task with consent
    Then the run is recorded with pass false and no error

  Scenario: the worktree is removed even when the run throws
    Given a stand-in harness that exits with a signal mid-transcript
    When the engine runs a task with consent
    Then git worktree list shows no worktree left from that run

  Scenario: each arm's record carries the measured layer, suite, subject, arm, harness, adapter, runner, and task-set provenance
    Given a completed run of the arm "after=git:HEAD" for the suite "harbor.nightly"
    When the engine writes that arm's record
    Then the record has schemaVersion 3, layer "measured", suite "harbor.nightly", arm "after", harness "claude-code", runner "print", and an adapter name
    And its subject names the kind git-ref, the ref HEAD, and the resolved commit
    And it carries the task-set commit and the task-set hash

  Scenario: each arm's record and transcripts are written under the suite's bench results directory
    Given a completed run of the arm "after" for the suite "harbor.nightly"
    When the engine writes that arm's record
    Then a file matching .agents/aced/results/bench/harbor.nightly/<createdAt>.after.json exists
    And each run's transcript exists as a .jsonl.gz file in the folder named by that createdAt

  Scenario: the record's evaluated set hashes the task set, the checks, and the file arm's source
    Given a completed run of the arm "with=file:docs/GUIDE.md=path:drafts/guide-v2.md"
    When the engine writes that arm's record
    Then its evaluated set holds entries for tasks.json, each file under checks/, and drafts/guide-v2.md, each with a SHA-256 hash of its current content

  Scenario: a record names the model the transcript reports
    Given a task set with model "sonnet"
    And a stand-in harness whose transcript reports the model "model-alpha-2026"
    When the engine writes that arm's record
    Then the record's model is "sonnet" and its scoring_model is "model-alpha-2026"

  Scenario: a record whose transcript names no model records the launched model
    Given a task set with model "model-beta"
    And a stand-in harness whose transcript reports no model
    When the engine writes that arm's record
    Then the record's scoring_model is "model-beta"

  Scenario: an arm with no passing run reports no cost per success
    Given an arm whose 4 runs all record a failure at 0.20 dollars each
    When the engine summarizes that arm
    Then the summary has no costPerSuccessUsd value and its totalCostUsd is 0.80

  Scenario: cost per success is total cost over passes
    Given an arm of 4 runs at 0.20 dollars each, 2 of which pass
    When the engine summarizes that arm
    Then the summary's costPerSuccessUsd is 0.40

  Scenario: a baseline run writes the committed baseline with per-run metrics and no transcript references
    Given a one-arm plan file of 2 tasks and 3 runs carrying the baseline flag for the suite "harbor.nightly"
    When the engine runs that plan with consent
    Then .agents/aced/bench/harbor.nightly/baseline.json exists holding the metrics of 6 runs
    And baseline.json holds no transcript field

  Scenario: a run without the baseline flag leaves baseline.json untouched
    Given the suite "harbor.nightly" has a committed baseline.json
    And a one-arm plan file without the baseline flag
    When the engine runs that plan with consent
    Then baseline.json is byte-for-byte unchanged

  # ── UC4 — compare ──

  Scenario: a version 2 record is compared as a git-ref subject
    Given a before record with schemaVersion 2 naming a commit, the model "sonnet", and a reachable taskSetCommit
    And an after record with schemaVersion 3, layer measured, harness and adapter claude-code, runner print, model "sonnet", a git-ref subject, and the task-set hash of that taskSetCommit
    When the engine compares them
    Then the comparison carries per-task rows and no incomparable reason

  Scenario: a record with no schema version is read up and incomparable only for its unknown task set
    Given a before record with no schemaVersion field naming a commit and the model "sonnet"
    And an after record with schemaVersion 3, layer measured, harness and adapter claude-code, runner print, model "sonnet", and a git-ref subject
    When the engine compares them
    Then the comparison's only incomparable reason is that the before record's task set is unknown

  Scenario: a record of an unknown newer schema version is refused
    Given a before record with schemaVersion 99
    When the engine compares it with a schemaVersion 3 record
    Then it exits non-zero with a message naming schema version 99
    And no comparison record is written

  Scenario: comparing against a baseline the suite does not have is refused
    Given the suite "harbor.nightly" has no baseline.json
    When the engine compares the baseline with an after record of that suite
    Then it exits non-zero with a message that the suite has no baseline
    And no comparison record is written

  Scenario: a baseline carrying per-run metrics is compared without stored runs
    Given a committed baseline.json holding every run's metrics
    And a results directory holding no run record
    When the engine compares the baseline with a comparable after record
    Then the comparison carries per-task rows computed from the baseline's runs

  Scenario: a legacy baseline is compared using its stored run record
    Given a committed baseline.json written by bench with no per-run results
    And a results directory holding the run record with that baseline's createdAt
    When the engine compares the baseline with a comparable after record
    Then the comparison carries per-task rows computed from that stored run record

  Scenario: a legacy baseline whose run record is not stored is incomparable
    Given a committed baseline.json written by bench with no per-run results
    And a results directory holding no run record with that baseline's createdAt
    When the engine compares the baseline with an after record
    Then the comparison is incomparable with a reason that the baseline's runs are unavailable

  Scenario Outline: records that differ in <field> are incomparable
    Given two run records identical except in <field>
    When the engine compares them
    Then the comparison is incomparable with a reason naming <field>, carries no rows, and its verdict is incomparable

    Examples:
      | field         |
      | layer         |
      | model         |
      | harness       |
      | adapter       |
      | runner        |
      | subject kind  |
      | task-set hash |

  Scenario: records that differ in several fields list every reason
    Given two run records identical except in model and harness
    When the engine compares them
    Then the comparison's incomparable reasons name both model and harness

  Scenario: two records whose model is unknown on both sides are incomparable
    Given two run records identical except that both record the scoring model as unknown
    When the engine compares them
    Then the comparison is incomparable with a reason that the model is unknown

  Scenario: runs recorded as errors are excluded from the metrics
    Given a before arm of 4 runs, one of which is recorded as an error with 0 turns
    And each of the other 3 runs took 10 turns
    When the engine compares it with an after arm
    Then the before side's mean turns is 10

  Scenario: the comparison states how many error runs each side excluded
    Given a before arm of 4 runs, one of which is recorded as an error
    And an after arm of 4 runs, two of which are recorded as errors
    When the engine compares them
    Then the comparison states 1 error run excluded before and 2 excluded after

  Scenario: capped runs stay in the metrics
    Given a before arm of 4 runs, one of which is capped at 40 turns
    And each of the other 3 runs took 10 turns
    When the engine compares it with an after arm
    Then the before side's mean turns is 17.5

  Scenario: a task with no runs left on a side carries no p-value and is not a test
    Given two comparable records of 2 tasks at 4 runs per side
    And every before run of the task "trim-logs" is recorded as an error
    When the engine compares them
    Then every row for "trim-logs" carries no p-value
    And the footer's test count excludes those rows

  Scenario: tasks measured on only one side are listed as unmatched and not compared
    Given a before record measuring the tasks "trim-logs" and "pin-versions"
    And an after record of the same task set measuring only "pin-versions"
    When the engine compares them
    Then the comparison lists "trim-logs" as unmatched
    And it carries rows for "pin-versions" only

  Scenario: a comparison small enough to enumerate reports the exact permutation p-value
    Given 4 before runs of 10, 11, 12, 13 turns and 4 after runs of 20, 21, 22, 23 turns on one task
    When the engine compares them
    Then the turns row reports p equal to 2/70

  Scenario: a comparison too large to enumerate reports a seeded sampled p-value that repeats exactly
    Given 30 before runs and 30 after runs on one task
    When the engine compares them twice
    Then both comparisons report the same p for every row
    And each p equals (hits + 1) / 20001 for a whole number of hits

  Scenario: a row whose smallest attainable p-value is above 0.05 is flagged too few
    Given 3 before runs and 3 after runs on one task
    When the engine compares them
    Then every row for that task is flagged tooFew

  Scenario: a row whose smallest attainable p-value is at or below 0.05 is not flagged too few
    Given 4 before runs and 4 after runs on one task
    When the engine compares them
    Then no row for that task is flagged tooFew

  Scenario: pass rate is compared with its own p-value
    Given 6 before runs that all pass and 6 after runs that all fail on one task
    When the engine compares them
    Then the comparison holds a pass row for that task with p equal to 2/924

  Scenario: the pooled row is the geometric mean of the per-task after-over-before ratios
    Given a task whose mean turns go from 10 to 20 and a task whose mean turns go from 10 to 5
    When the engine compares them
    Then the pooled turns row reports a ratio of 1.0

  Scenario: a task with a non-positive value is dropped from the pooled row
    Given a task with one run of 0 tool calls among its before runs and a task whose every run's tool calls go from 5 to 10
    When the engine compares them
    Then the pooled tool-calls row reports a ratio of 2.0 and records 1 pooled task

  Scenario: the footer states the test count and the count chance alone would make significant
    Given a comparable pair of records covering 2 tasks at 4 runs per side
    And every run is positive in every metric other than pass
    When the engine compares them
    Then the footer states a test count of 23 and 1.15 rows expected significant by chance

  Scenario Outline: a significant wrong-way move in any gated metric makes the verdict regressed
    Given one task whose 4 before runs and 4 after runs are identical in every metric except <metric>
    And <metric> on the after runs is worse than on every before run
    When the engine compares them
    Then the verdict is regressed

    Examples:
      | metric       |
      | pass         |
      | turns        |
      | toolCalls    |
      | inputTokens  |
      | outputTokens |
      | wallMs       |

  Scenario: a significant pooled row makes the verdict regressed when no single task's row can
    Given 3 tasks whose 3 before runs and 3 after runs are identical in every metric except turns
    And in each task the after runs took 20, 21, 22 turns against 10, 11, 12 before
    When the engine compares them
    Then every per-task turns row is flagged tooFew
    And the pooled turns row reports p below 0.05
    And the verdict is regressed

  Scenario: a wrong-way move without significance makes the verdict inconclusive
    Given one task whose 4 before runs and 4 after runs are identical in every metric except turns
    And the before runs took 10, 12, 14, 16 turns and the after runs took 11, 13, 15, 17
    When the engine compares them
    Then the verdict is inconclusive

  Scenario: a significant improvement beside a non-significant wrong-way move is inconclusive
    Given one task whose 4 before runs and 4 after runs are identical in every metric except turns and output tokens
    And the before runs took 20, 21, 22, 23 turns and the after runs took 10, 11, 12, 13
    And the before runs produced 100, 120, 140, 160 output tokens and the after runs 110, 130, 150, 170
    When the engine compares them
    Then the verdict is inconclusive

  Scenario: a significant improvement with no wrong-way move makes the verdict improved
    Given one task whose 4 before runs and 4 after runs are identical in every metric except turns
    And the before runs took 20, 21, 22, 23 turns and the after runs took 10, 11, 12, 13
    When the engine compares them
    Then the verdict is improved

  Scenario: a comparison with no wrong-way move and no significant row is unchanged
    Given one task whose 4 before runs and 4 after runs are identical in every metric
    When the engine compares them
    Then the verdict is unchanged

  Scenario Outline: a significant move in an ungated metric alone does not change the verdict
    Given one task whose 4 before runs and 4 after runs are identical in every metric except <metric>
    And <metric> on the after runs is higher than on every before run
    When the engine compares them
    Then the verdict is unchanged
    And the comparison reports the <metric> row with p equal to 2/70

    Examples:
      | metric          |
      | costUsd         |
      | cacheReadTokens |

  Scenario: one significant wrong-way row makes the verdict regressed even when others improve significantly
    Given one task whose 4 before runs and 4 after runs differ in wall time, turns, tool calls, and output tokens
    And wall time on the after runs is higher than on every before run
    And turns, tool calls, and output tokens on the after runs are each lower than on every before run
    When the engine compares them
    Then the verdict is regressed

  Scenario: an incomparable comparison still writes its record with the reasons
    Given two run records of the suite "harbor.nightly" identical except in model
    When the engine compares them
    Then a file matching .agents/aced/results/bench/harbor.nightly/compare-<createdAt>.json exists
    And it holds the verdict incomparable and a reason naming model

  Scenario: comparison tags are copied verbatim into the comparison record
    Given a comparable pair of records
    When the engine compares them with the tags lever=Noise-Floor and owner=harbor
    Then the comparison record's tags are exactly lever "Noise-Floor" and owner "harbor"

  Scenario: a task's tags are copied into that task's rows
    Given a task set whose task "trim-logs" carries the tag area "logging"
    When the engine compares two records of that suite
    Then every row for "trim-logs" carries the tag area "logging"

  Scenario: compare writes a comparison record under the suite's bench results directory
    Given a comparable pair of records for the suite "harbor.nightly"
    When the engine compares them
    Then a file matching .agents/aced/results/bench/harbor.nightly/compare-<createdAt>.json exists holding the verdict and every row
