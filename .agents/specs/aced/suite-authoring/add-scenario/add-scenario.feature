@frozen
Feature: add-scenario — add a test case to the golden set
  Unit suite for the add-scenario skill: capture a failure, edge, or gap as one golden-set case with a
  scenario, expected behaviors, must-not-do guards, and a scoring guide. Fixing the config when
  cases fail is improve; scoring is run; diffing is compare. Cross-capability e2e scenarios live
  in ../../acceptance/.

  # ---- Triggering ----

  Scenario: a failure the user wants captured as a new case triggers add-scenario
    Given the user describes a production failure they want recorded as a new test case
    When ACED routes the request
    Then add-scenario handles it

  Scenario: failing evals the user wants the config fixed for defers to improve
    Given the user reports that existing cases are failing and asks why the configuration is wrong
    When ACED routes the request
    Then add-scenario does not handle it and improve does

  Scenario: a request to score the suite defers to run
    Given the user asks to score the configuration against its golden set
    When ACED routes the request
    Then add-scenario does not handle it and run does

  Scenario: a request to diff two versions defers to compare
    Given the user asks to compare two versions of the configuration
    When ACED routes the request
    Then add-scenario does not handle it and compare does

  # ---- Locating the suite ----

  Scenario: an existing suite is read for its target and bar
    Given the user names a feature whose eval config exists
    When add-scenario locates the suite
    Then it reads the suite's target configuration and scoring bar

  Scenario: no suite found asks the user where it lives
    Given the user names no feature and no eval config can be found
    When add-scenario locates the suite
    Then it asks the user which feature suite to add to and does not write a case

  # ---- Capturing the input ----

  Scenario: a pasted transcript is decomposed
    Given the user pastes an agent transcript showing incorrect behavior
    When add-scenario captures the input
    Then it records what the user said, the state of the tree, what the agent did, and what it should have done instead

  Scenario: a must-not-do behavior becomes a guard
    Given the user names a behavior the agent must never do
    When add-scenario captures the input
    Then the draft carries that behavior as a must-not-do guard

  # ---- Determining the layer ----

  Scenario: the layer is inferred from the input type
    Given an input describing the agent firing when it should not have
    When add-scenario determines the layer
    Then it assigns the case to the trigger layer

  Scenario: an ambiguous input prompts the user for the layer
    Given an input that fits more than one layer
    When add-scenario determines the layer
    Then it asks the user which layer the case belongs to

  Scenario: a layer absent from the suite config is flagged
    Given the user describes a case whose layer the suite config does not enable
    When add-scenario determines the layer
    Then it warns that the layer is not enabled in the suite and the case will not be exercised until it is

  # ---- Scaffolding and writing ----

  Scenario: the draft carries every required section
    Given a captured input and a resolved layer
    When add-scenario scaffolds the test case
    Then the draft contains a scenario, an expected-behaviors list, a must-not-do list, and a scoring guide

  Scenario: the draft is shown before anything is written
    Given a scaffolded draft
    When add-scenario presents the draft
    Then it asks the user to confirm and writes no file until the user confirms

  Scenario: a rejected draft is revised instead of written
    Given the user rejects the presented draft and asks for changes
    When add-scenario handles the rejection
    Then it revises the draft and still writes no file

  Scenario: a confirmed case is written with the next sequence number
    Given the user confirms the draft and the golden set already holds numbered cases
    When add-scenario writes the case
    Then it writes the file as the next NNN-slug under the golden-set directory

  Scenario: the first case in an empty golden set starts the sequence
    Given the user confirms the draft and the golden set holds no numbered cases yet
    When add-scenario writes the case
    Then it writes the file as the first 001-slug under the golden-set directory

  Scenario: the written case reports its path and points to scoring
    Given a case has just been written
    When add-scenario finishes
    Then it reports the file path and suggests running run against the new case
