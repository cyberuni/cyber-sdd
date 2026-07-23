@frozen
Feature: The impl-producer procedure — build the implementation + its verification
  Unit suite for the impl-producer-governance procedure (the deliver-phase builder). Producer
  behaviors only — no gate verdict (that is ../impl-judge/ and ../conductor/), no contract
  edits. Cross-capability e2e scenarios live in ../../workflows/.

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

  Scenario: implement mode against a non-frozen feature does not build to keep
    Given a feature that is not frozen
    When implement mode is requested
    Then the impl-producer does not build to keep against it
    And it does not treat the unfrozen feature as the fixed bar

  Scenario: an explore discovery returns as a content gap, not a contract edit
    Given the impl-producer spiking in explore mode
    When it finds the chosen solution needs a behavior the feature omits
    Then it returns the discovery as a content gap
    And it writes nothing into spec.md or the feature

  Scenario: an explore discovery that contradicts the contract returns as a content gap
    Given the impl-producer spiking in explore mode
    When it finds the chosen solution contradicts a behavior the feature specifies
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

  Scenario: a deterministic verification is authored to bind to its scenario via the bridge convention
    Given the impl-producer authoring a deterministic verification a scenario bridge will read
    When it names the test
    Then it places the test under a spec-node describe namespace and titles it with the verbatim scenario name
    And a report of that test binds back to the frozen scenario

  Scenario: a frozen scenario may be left without a verification only as a reported gap
    Given a frozen scenario the build cannot yet verify
    When the impl-producer completes
    Then it reports the missing verification rather than fabricating a passing check

  Scenario: a partially-verifiable frozen scenario reports the unverified part as a gap
    Given a frozen scenario only part of which the build can verify
    When the impl-producer completes
    Then it reports the unverified part as a gap rather than claiming full verification

  Scenario: an authored illustration does not reuse a scenario's Given
    Given a frozen scenario whose Given sets up a domain to probe the rule
    When the impl-producer authors an illustration or worked example in the artifact
    Then the illustration does not reuse that Given's domain, entities, names, or framing
    And it is drawn from a domain the suite does not probe

  Scenario: the implementation conforms to the Then and not to the Given's apparatus
    Given a frozen scenario the impl-producer must satisfy
    When it builds against that scenario
    Then the implementation conforms to the scenario's Then
    And substituting that scenario's apparatus for an unrelated domain leaves the implementation unchanged

  Scenario: a Given's precondition is contract the implementation must handle
    Given a frozen scenario whose Given fixes a precondition the implementation runs under
    When the impl-producer builds against that scenario
    Then the implementation handles that precondition

  Scenario: the test-vector rule does not stop the producer reading the Given
    Given a frozen feature whose scenarios carry Givens
    When the impl-producer builds against it
    Then it reads every scenario including its Given as the contract
    And it excludes no Given from what it reads

  Scenario: the implementation does not special-case a Given's literal input
    Given a frozen scenario whose Given names a literal input
    When the impl-producer builds the implementation
    Then the implementation contains no branch special-casing that literal

  Scenario: a rubric or threshold stays out of the feature
    Given a scenario whose verification uses a rubric or threshold
    When the impl-producer authors that verification
    Then the rubric or threshold never appears in the feature
    And it lives in the verification only

  # ---- Test levels — acceptance boundary + inner-rule units ----

  Scenario: the acceptance verification is authored at the inner boundary
    Given a deterministic domain whose only external dependency sits behind an interface seam
    When the impl-producer authors the verification for a frozen scenario
    Then it exercises the behavior against a substitute at that interface seam
    And it does not require reaching the real external dependency or running the shipped artifact end to end

  Scenario: inner-rule combinatorics are covered by unit tests the producer authors
    Given a deterministic domain whose inner rules form a combinatorial space the acceptance feature does not enumerate
    When the impl-producer builds
    Then it authors unit tests that cover that inner-rule combinatorial space
    And that coverage is separate from the one verification per frozen scenario

  Scenario: the inner-rule unit tests are drawn from the rules, not the frozen scenarios
    Given the impl-producer choosing which inner-rule cases to cover
    When it authors the inner-rule unit tests
    Then the cases are derived from the inner rules the implementation composes
    And they are not produced by enumerating the frozen acceptance scenarios

  Scenario: each inner rule has a single home in the implementation
    Given an inner rule that several operations depend on
    When the impl-producer builds the implementation
    Then the rule is implemented in one place the operations share
    And it is not duplicated across the operation handlers

  Scenario: a domain with no deterministic inner layer gets no manufactured inner-rule unit tests
    Given a domain whose behavior is a graded non-deterministic subject with no deterministic inner layer
    When the impl-producer builds
    Then it does not manufacture inner-rule unit tests for a deterministic layer that does not exist
    And it authors only the one verification per frozen scenario at the boundary

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

  Scenario: a plugin impl-producer runs at its own model and effort
    Given a plugin-bound impl-producer role
    When the conductor runs it
    Then it runs in a spawned builder at the plugin's own model and effort