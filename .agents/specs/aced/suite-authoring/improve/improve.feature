@frozen
Feature: improve — diagnose failures and propose config fixes
  Unit suite for the improve skill: load the latest results, collect failing cases, group them by
  failure pattern, propose before/after config diffs, and auto-run compare after edits. Capturing a
  new case is add; scoring is run; on-demand diffing is compare. Cross-capability e2e scenarios live
  in ../../workflows/.

  # ---- Triggering ----

  Scenario: failing evals the user wants the config diagnosed for triggers improve
    Given the user reports failing cases and asks why the configuration is wrong
    When ACED routes the request
    Then improve handles it

  Scenario: a fresh failure the user wants captured as a case defers to add
    Given the user describes a new failure they want recorded as a test case
    When ACED routes the request
    Then improve does not handle it and add does

  Scenario: a request to score the suite defers to run
    Given the user asks to score the configuration against its golden set
    When ACED routes the request
    Then improve does not handle it and run does

  Scenario: a request to diff two versions defers to compare
    Given the user asks to compare two versions of the configuration
    When ACED routes the request
    Then improve does not handle it and compare does

  Scenario: scaffolding a brand-new config defers to define
    Given the user asks to create a new skill from scratch
    When ACED routes the request
    Then improve does not handle it and define-skill does

  Scenario: auditing a SKILL file's structure defers to improve-skill
    Given the user asks to check a SKILL file's structure and compliance
    When ACED routes the request
    Then improve does not handle it and improve-skill does

  # ---- Loading context ----

  Scenario: the target and latest results are read together
    Given a suite with an eval config and at least one results record
    When improve loads the context
    Then it reads the target configuration in full and the most recent results record

  Scenario: no results yet points the user at run
    Given a suite that has never been run and has no results record
    When improve loads the context
    Then it tells the user to run first and proposes no edits

  Scenario: the artifact type is identified and the config read in full
    Given a target that may be a skill, subagent, command, or AGENTS.md section
    When improve locates the target
    Then it identifies the artifact type and reads the configuration in full

  Scenario: an untracked config gets a general review instead of a failure diagnosis
    Given a target with no eval suite in the project spec
    When improve determines how to proceed
    Then it reviews the configuration against the fit classifier and the matching builder bar rather than diagnosing failing cases

  # ---- Identifying and grouping failures ----

  Scenario: only the failing cases are collected
    Given a latest results record mixing passing and failing cases
    When improve identifies the failures
    Then it collects only the cases marked failing

  Scenario: an all-passing run has nothing to propose
    Given a latest results record in which every case passes
    When improve identifies the failures
    Then it reports there is nothing to propose and edits nothing

  Scenario: failures are grouped by pattern before any fix
    Given a set of collected failing cases
    When improve groups the failures
    Then it classifies each failure into a failure pattern and reports the groupings before proposing any edit

  # ---- Proposing edits ----

  Scenario: each pattern yields a concrete before/after diff
    Given a grouping of failures under one pattern
    When improve proposes a fix
    Then it shows an exact before-and-after diff of the configuration rather than a prose description

  Scenario: a fix never removes a test case
    Given a failing case that would pass if it were deleted
    When improve proposes a fix
    Then it never proposes removing the test case to make the evals pass

  Scenario: no clean fix yields a recommendation instead
    Given failures caused by high variance across similar cases with no clear edit
    When improve proposes a fix
    Then it recommends adding examples, relaxing the layer's bar, or splitting the configuration

  # ---- Applying and verifying ----

  Scenario: nothing is applied before the user approves
    Given a set of proposed edits shown to the user
    When the user has not yet approved
    Then improve writes no changes to the configuration

  Scenario: approved edits are applied and compare auto-runs
    Given the user approves the proposed edits
    When improve applies them
    Then it edits the configuration and then runs compare over the before and after revisions

  Scenario: an untracked config is not given a fabricated verdict
    Given an untracked target that has been reviewed and has no suite to run
    When improve verifies the outcome
    Then it offers to author a suite rather than asserting a pass or fail verdict
