@frozen
Feature: add-scenario — add a test case to the frozen .feature suite
  Unit suite for the add-scenario skill: capture a failure, edge, or gap, resolve its layer, scaffold
  it in its layer's shape (a trigger Examples row, a boolean scenario, or a graded scenario with its
  scoring guide inline), and append it to the frozen .feature, which stays frozen because adding a
  scenario self-clears. Fixing the config when cases fail is improve; scoring is run; diffing is
  compare. Cross-capability e2e scenarios live in ../../workflows/.

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
    Given the user asks to score the configuration against its suite
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

  Scenario: a skipped-step input is inferred as a behavior case
    Given an input describing the agent invoking correctly but skipping a step
    When add-scenario determines the layer
    Then it assigns the case to the behavior layer

  Scenario: a poor-output input is inferred as a quality case
    Given an input describing the agent doing the step but producing poor output
    When add-scenario determines the layer
    Then it assigns the case to the quality layer

  Scenario: an ambiguous input prompts the user for the layer
    Given an input that fits more than one layer
    When add-scenario determines the layer
    Then it asks the user which layer the case belongs to

  Scenario: a layer absent from the suite config is flagged
    Given the user describes a case whose layer the suite config does not enable
    When add-scenario determines the layer
    Then it warns that the layer is not enabled in the suite and the case will not be exercised until it is

  # ---- Scaffolding and writing ----

  Scenario: the draft is a Gherkin scenario tagged with its resolved layer
    Given a captured input and a resolved layer
    When add-scenario scaffolds the test case
    Then the draft is a single Gherkin scenario tagged with that layer

  Scenario: a trigger case is scaffolded as a trigger Examples row
    Given a captured input resolved to the trigger layer
    When add-scenario scaffolds the test case
    Then the draft adds a row to the trigger Scenario Outline Examples, starting the outline if the suite has none

  Scenario: a deterministic behavior case is scaffolded as a boolean scenario
    Given a captured input resolved to the behavior layer with an observable action
    When add-scenario scaffolds the test case
    Then the draft is a boolean scenario whose Then asserts the observable action

  Scenario: a graded case is scaffolded with its scoring guide inline
    Given a captured input resolved to a graded behavior or quality case
    When add-scenario scaffolds the test case
    Then the draft is a graded scenario carrying its scoring guide inline

  Scenario: the draft is shown before anything is written
    Given a scaffolded draft
    When add-scenario presents the draft
    Then it asks the user to confirm and writes no file until the user confirms

  Scenario: a rejected draft is revised instead of written
    Given the user rejects the presented draft and asks for changes
    When add-scenario handles the rejection
    Then it revises the draft and still writes no file

  Scenario: a confirmed case is appended to the frozen .feature in its lifecycle section
    Given the user confirms the draft
    When add-scenario writes the case
    Then it appends the scenario to the feature file, sorted into its lifecycle-stage section

  Scenario: appending a scenario keeps the suite frozen
    Given a confirmed draft appended to an already-frozen suite
    When add-scenario writes the case
    Then it keeps the suite's frozen tag because adding a scenario self-clears

  Scenario: the suite is checked for well-formedness after the write
    Given a scenario has just been appended
    When add-scenario finishes the write
    Then it runs the suite check to confirm the feature is still well-formed

  Scenario: the written case reports the added scenario and points to scoring
    Given a case has just been written
    When add-scenario finishes
    Then it reports the added scenario name and suggests running run against it
