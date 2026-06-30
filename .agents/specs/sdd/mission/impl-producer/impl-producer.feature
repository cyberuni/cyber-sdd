@frozen
Feature: The impl-producer procedure — build the implementation + its verification
  Unit suite for the impl-producer-governance procedure (the deliver-phase builder). Producer
  behaviors only — no gate verdict (that is ../impl-judge/ and ../conductor/), no contract
  edits. Cross-capability e2e scenarios live in ../../acceptance/.

  # ---- Modes — explore (draft) vs implement (frozen) ----

  Scenario: implement mode builds to keep against the frozen feature
    Given an approved spec whose feature is frozen
    When the impl-producer runs in implement mode
    Then it builds the implementation against the frozen feature as the fixed bar

  Scenario: explore mode spikes against the non-frozen feature
    Given a draft spec whose feature is not frozen
    When the impl-producer runs in explore mode
    Then it spikes against the draft feature to probe the contract
    And the ship-quality impl-judge does not run

  Scenario: an explore discovery returns as a content gap, not a contract edit
    Given the impl-producer spiking in explore mode
    When it finds the chosen solution needs a behavior the feature omits
    Then it returns the discovery as a content gap
    And it writes nothing into spec.md or the feature

  # ---- The build ----

  Scenario: the build applies the builder and architect lenses
    Given the impl-producer building against the frozen feature
    When it produces the implementation
    Then it self-aligns to the builder and architect bars

  Scenario: one verification is authored per frozen scenario
    Given a frozen feature with several scenarios
    When the impl-producer builds
    Then it authors one verification per frozen scenario

  Scenario: the verification is anchored to the frozen scenarios
    Given the impl-producer authoring verification
    When it writes a check
    Then the check is anchored to a frozen scenario
    And it is not free-authored from the builder's own sense of done

  Scenario: direct execution of the frozen scenario is preferred over a hand-written mapping
    Given a frozen scenario the runner can execute directly
    When the impl-producer authors its verification
    Then it executes the frozen scenario directly rather than mapping it to a hand-written unit test
    And only the glue is producer-authored while the oracle stays owned by the frozen scenario

  Scenario: a mapped check takes its oracle from the frozen scenario
    Given a frozen scenario the impl-producer must map to a unit test
    When it writes the assertion
    Then the assertion's expected outcome is derived from the frozen scenario
    And it is not derived from the builder's own sense of done

  Scenario: a frozen scenario may be left without a verification only as a reported gap
    Given a frozen scenario the build cannot yet verify
    When the impl-producer completes
    Then it reports the missing verification rather than fabricating a passing check

  Scenario: a rubric or threshold stays out of the feature
    Given a scenario whose verification uses a rubric or threshold
    When the impl-producer authors that verification
    Then the rubric or threshold never appears in the feature
    And it lives in the verification only

  # ---- Boundaries ----

  Scenario: the impl-producer never edits the contract
    Given the impl-producer building against the frozen feature
    When it would change specified behavior
    Then it raises a content gap or blocker
    And it does not edit spec.md or the feature

  Scenario: the impl-producer does not declare its own pass verdict
    Given the impl-producer has built the implementation and its verification
    When the build completes
    Then it does not declare an implementation-pass verdict
    And a separate cold impl-judge runs the verification

  # ---- Producer surface ----

  Scenario: the impl-producer runs in a spawned builder
    Given an SDD-default impl-producer role
    When the conductor runs it
    Then it runs in a spawned builder that loads the governance
    And the artifact is recorded as produced by the conductor