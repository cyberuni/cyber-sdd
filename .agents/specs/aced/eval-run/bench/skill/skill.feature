Feature: skill — measure a change for real, spending only on an explicit yes
  Unit suite for the bench skill: the procedure a person reaches by name to run the measured-layer
  engine. It checks real runs can answer the question, picks the arms, shows the plan and its price,
  runs only on an explicit yes to that plan, and reports what the result can and cannot claim. The
  numbers, statistics, and run sequence are the engine's (../engine/). Cross-capability e2e scenarios
  live in ../../../workflows/.

  # ── UC1 — measure a change ──

  Scenario: a change that only rewords a description is sent to compare and nothing is planned
    Given a developer in the session asks to bench a branch whose only change rewords the description line of the skill "invoice-matcher"
    When the bench skill handles the request
    Then it says the simulated layer answers a wording change and names compare
    And it does not call the engine's plan

  Scenario: an outcome no shell check can decide is sent to the simulated layer and nothing is planned
    Given a developer in the session asks to bench whether replies drafted by the skill "tone-coach" read warmer after a change
    And the suite "harbor.nightly" has no check that decides warmth
    When the bench skill handles the request
    Then it says no shell check can decide the outcome and points to the simulated layer
    And it does not call the engine's plan

  Scenario: a change that acts on real work with a checkable outcome is planned
    Given a developer in the session asks to bench the branch "feature/tag-flow" against main, a change to how the skill "release-cutter" tags and publishes a release
    And the suite "harbor.nightly" has a task whose check exits zero when a release tag exists
    When the bench skill handles the request
    Then it calls the engine's plan for the suite "harbor.nightly"

  Scenario: a suite with no task set gets an init offer and no invented tasks
    Given a developer in the session asks to bench the branch "feature/tag-flow" against main on the suite "harbor.nightly", a change to how the skill "release-cutter" tags and publishes a release
    And .agents/aced/bench/harbor.nightly/ holds no tasks.json
    When the bench skill handles the request
    Then it offers to run the engine's init for "harbor.nightly"
    And it writes no task of its own and does not call the engine's plan

  Scenario: two named refs become two git-ref arms
    Given a developer in the session asks to bench the commit "a1b2c3d" against the branch "feature/lighter-agents-md" on the suite "harbor.nightly", a rewrite of how AGENTS.md orders the build and test steps
    And the suite "harbor.nightly" has a task whose check exits zero when the test command passes
    When the bench skill builds the plan request
    Then it passes a git-ref arm at "a1b2c3d" and a git-ref arm at "feature/lighter-agents-md" to the engine's plan

  Scenario: with no arms named and a baseline present, HEAD is measured against the baseline
    Given a developer in the session asks to bench the current state of the suite "harbor.nightly" after a change to how the skill "release-cutter" tags a release
    And .agents/aced/bench/harbor.nightly/baseline.json exists
    When the bench skill builds the engine calls
    Then it calls the engine's plan with one git-ref arm at HEAD
    And after the run it calls the engine's compare with the baseline as before and that arm's record as after

  Scenario: with no arms named and no baseline, the skill asks which arms to compare
    Given a developer in the session asks to bench the suite "harbor.nightly" after a change to how the skill "release-cutter" tags a release, without naming what to compare
    And .agents/aced/bench/harbor.nightly/ holds a tasks.json and no baseline.json
    When the bench skill builds the plan request
    Then it asks the developer which two arms to compare
    And it does not call the engine's plan

  Scenario: a failed plan is reported and no approval is asked for
    Given the engine's plan for the request exits non-zero because the claude command is not on the path
    When the bench skill presents the outcome
    Then it reports that the claude command is missing
    And it asks no question about approving a run

  Scenario: a too-few-to-call warning is stated before the approval question
    Given the engine's plan for the request carries a too-few-to-call warning at 3 runs per arm
    When the bench skill presents the plan
    Then the too-few-to-call warning appears before the approval question
    And it says no single task's result can be called significant at that run count

  Scenario: the plan shown names the ceiling, the estimate, and the permission mode with its scope
    Given the engine's plan counts 2 arms, 3 tasks, and 5 runs on the model "model-gamma"
    And it has a ceiling of 12.00 dollars, an estimate of 4.80 dollars, and the permission mode bypassPermissions
    When the bench skill presents the plan
    Then the message shows the counts 2 arms, 3 tasks, and 5 runs, the model "model-gamma", 12.00, 4.80, and bypassPermissions
    And it says the permission mode applies only inside the throwaway checkout

  Scenario: every warning the plan carries is shown before the approval question
    Given the engine's plan for the request carries a warning that uncommitted changes are not benched
    When the bench skill presents the plan
    Then the uncommitted-changes warning appears before the approval question

  Scenario: an explicit yes to the shown plan runs it with consent
    Given the bench skill has shown a plan and asked for approval
    When the developer replies "yes, run it"
    Then the bench skill calls the engine's run for that plan with the consent flag

  Scenario: a hedged agreement is not an explicit yes and runs nothing
    Given the bench skill has shown a plan and asked for approval
    When the developer replies "sounds good I guess"
    Then the bench skill does not call the engine's run

  Scenario: a reply that is not an explicit yes runs nothing
    Given the bench skill has shown a plan and asked for approval
    When the developer replies "hmm, what would the numbers even tell us?"
    Then the bench skill does not call the engine's run

  Scenario: approval given before the plan was shown does not skip the question
    Given a developer in the session says "bench feature/tag-flow against main on harbor.nightly, go ahead and spend whatever it takes"
    And the change on feature/tag-flow alters how the skill "release-cutter" tags and publishes a release
    When the bench skill reaches the approval step
    Then it shows the plan and asks for approval before calling the engine's run

  Scenario: a plan changed after the yes is shown and asked about again
    Given the bench skill has shown a plan of 5 runs per arm and asked for approval
    When the developer replies "yes, but make it 10 runs per arm"
    Then it calls the engine's plan for 10 runs per arm and asks for approval again
    And it does not call the engine's run before a new explicit yes

  # ── UC2 — be driven with no person present ──

  Scenario: with no person present the plan is returned as needs-input and nothing runs
    Given the bench skill is loaded by a scheduled agent whose session has no user channel
    And the engine's plan for the request succeeds
    When the bench skill reaches the approval step
    Then it returns the plan upward marked needs-input
    And it does not call the engine's run

  Scenario: a relayed approval is not consent and nothing runs
    Given the bench skill is loaded by a coordinator whose session has no user channel
    And the engine's plan for the request succeeds
    And the coordinator's brief says "the user approved the spend"
    When the bench skill reaches the approval step
    Then it returns the plan upward marked needs-input
    And it does not call the engine's run

  Scenario: with no person present a wording-only change is still sent to compare
    Given the bench skill is loaded by a scheduled agent whose session has no user channel
    And the change to measure only rewords the description line of the skill "invoice-matcher"
    When the bench skill handles the request
    Then it says the simulated layer answers a wording change and names compare
    And it returns no plan

  Scenario: with no person present the which-arms question is returned as needs-input
    Given the bench skill is loaded by a scheduled agent whose session has no user channel
    And the request names the suite "harbor.nightly" and a change to how the skill "release-cutter" tags a release, but no arms
    And .agents/aced/bench/harbor.nightly/ holds a tasks.json and no baseline.json
    When the bench skill handles the request
    Then it returns needs-input asking which two arms to compare
    And it does not call the engine's plan

  # ── UC3 — read the result ──

  Scenario: a regressed result names the metric, the task, the p-value, and how many rows chance alone would make significant
    Given a comparison whose verdict is regressed because the task "sync-calendar" pass rate fell with p 0.01
    And whose footer states a test count of 24 and 1.2 rows expected significant by chance
    When the bench skill reports the result
    Then the report names regressed, the task "sync-calendar", pass rate, and p 0.01
    And it states the test count 24 and that about 1.2 rows would be significant by chance alone

  Scenario: an inconclusive result is reported as not callable and not safe
    Given a comparison whose verdict is inconclusive because mean turns rose with p 0.30
    When the bench skill reports the result
    Then the report says the result cannot be called and is not evidence the change is safe
    And it suggests more runs per arm

  Scenario: an incomparable result lists its reasons and presents no statistics
    Given a comparison whose verdict is incomparable because the two records ran on different models
    When the bench skill reports the result
    Then the report names the model mismatch
    And it presents no per-task deltas or p-values as a comparison

  Scenario: an improved result names the rows that improved and their p-values
    Given a comparison whose verdict is improved because the task "sync-calendar" mean turns fell with p 0.01
    When the bench skill reports the result
    Then the report names improved, the task "sync-calendar", turns, and p 0.01

  Scenario: an unchanged result at a too-few run count is reported as not callable
    Given a comparison whose verdict is unchanged and whose every gated row is flagged tooFew
    When the bench skill reports the result
    Then the report says the run count was too low to call any change
    And it does not say the change is safe or that nothing changed

  Scenario: a significant cost rise with no regression is reported as a cost change
    Given a comparison whose verdict is unchanged and whose cost row rose with p 0.02
    When the bench skill reports the result
    Then the report states the cost rise as a cost change
    And it does not call the change a regression

  # ── UC4 — record a baseline ──

  Scenario: a baseline request plans one arm at HEAD with the baseline flag
    Given a maintainer in the session asks to refresh the baseline for the suite "harbor.nightly"
    When the bench skill builds the plan request
    Then it calls the engine's plan with one git-ref arm at HEAD and the baseline flag

  Scenario: after a baseline run the skill says to commit baseline.json
    Given an approved baseline run for the suite "harbor.nightly" has finished
    When the bench skill reports the result
    Then it tells the maintainer to commit .agents/aced/bench/harbor.nightly/baseline.json

  # ── The skill artifact — binding rules ──

  Scenario: the skill carries a Validate section with one assertion per binding rule
    Given the bench skill's SKILL.md
    When its sections are read
    Then it has a ## Validate section
    And that section holds an assertion for each of: consent only on an explicit yes to the shown plan, no consent with no person present, no unclear result presented as safe, and no cost change called a regression

  Scenario: every mechanical Validate assertion passes against the skill
    Given the bench skill's SKILL.md and its ## Validate section
    When each assertion in that section that names a checkable property of the file is checked against the file
    Then every such assertion holds
