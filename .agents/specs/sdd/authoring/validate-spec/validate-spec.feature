Feature: The spec gate — judge a spec + suite diff and freeze on approve
  Unit suite for the validate-spec gate skill (the gate unit). Gate behaviors only — the
  producer's grilling/authoring behaviors live in ../spec-producer/spec-producer.feature; the
  cross-capability CR lifecycle lives in ../../acceptance/.

  # ---- Verdict ----

  Scenario: an in-leash diff self-asserts into the review queue
    Given a spec + suite diff whose assessment reads safe within the run leash
    When the spec gate runs
    Then the diff lands provisionally as an agent-asserted verdict
    And the spec joins the asynchronous review queue

  Scenario: a gated diff takes the human verdict with the digest shown first
    Given a spec + suite diff whose leash stops or whose hard floor fires
    When the spec gate runs
    Then it presents the gate digest before taking the human verdict

  Scenario: the gate never advances with a judge failure
    Given the spec-judge reports a failing scenario
    When the spec gate evaluates the diff
    Then it advances no status and reports the blocker

  Scenario: the gate never advances with an unresolved open marker
    Given the touched files still carry an open marker
    When the spec gate evaluates the diff
    Then it advances no status and reports the blocker

  Scenario: the gate never advances with a misaligned suite
    Given the spec prose contradicts a scenario in the suite
    When the spec gate evaluates the diff
    Then it advances no status and reports the blocker

  Scenario: producer and judge stay distinct actors
    Given a diff produced by the spec-producer
    When the spec gate verifies it
    Then a distinct judge actor renders the verdict
    And the judge does not edit the artifact it grades

  # ---- The three verbs and freeze ----

  Scenario: approve lands the diff and freezes each touched feature file
    Given an approved spec + suite diff
    When the gate records the approve verdict
    Then each touched .feature file is marked frozen
    And a durable per-CR gate verdict is recorded in the ledger

  Scenario: change revises the diff and freezes nothing
    Given a spec + suite diff returned for changes
    When the gate records the change verdict
    Then no .feature file is frozen

  Scenario: reject drops the delta
    Given a spec + suite diff that fails the scope lens
    When the gate records the reject verdict
    Then the delta is dropped and nothing is frozen

  Scenario: an additive scenario folds into a frozen file without unfreezing it
    Given a frozen .feature file
    When an additive scenario is added to it
    Then the file stays frozen
    And the addition self-clears

  Scenario: a narrowing edit unfreezes its file and fires Clearance
    Given a frozen .feature file
    When a scenario in it is narrowed or rewritten
    Then the file is unfrozen
    And the gate escalates Clearance

  Scenario: spec.md is kept in sync and never frozen
    Given an approved spec
    When the gate freezes the touched suite files
    Then spec.md is not frozen
    And spec.md may be reworded as long as it contradicts no frozen scenario

  Scenario: an untouched feature file keeps its freeze state
    Given a CR that does not touch a given .feature file
    When the gate records its verdict
    Then that file keeps whatever freeze state it held

  # ---- The gate digest ----

  Scenario: the digest summarizes only the files the CR touched
    Given a CR that touched a subset of the project's files
    When the gate assembles the digest
    Then the digest covers only the touched files, not the whole tree

  Scenario: a touched area with no feature file reports zero scenarios
    Given a touched capability folder that has no .feature file
    When the gate assembles the digest
    Then it reports zero scenarios for that area, not an error

  Scenario: the digest renders no verdict and writes nothing
    Given the gate assembles the digest
    When the digest is produced
    Then it writes no frontmatter and renders no verdict

  # ---- Provenance and alignment ----

  Scenario: a malformed produced-by entry fails the gate closed
    Given a produced-by entry that is not a well-formed plugin-qualified name
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing

  Scenario: an uninstalled but valid recorded producer is flagged, not blocked
    Given a produced-by entry naming a producer whose plugin is uninstalled
    When the gate applies its structural checks
    Then the entry is flagged as unavailable
    And the gate is not blocked by it

  Scenario: a role with no resolvable producer fails the gate closed
    Given a required production role that resolves to no producer and no SDD default
    When the gate runs
    Then the gate fails closed and advances nothing

  # ---- Spec-type reconcile ----

  Scenario: a reference node carrying a .feature fails the gate closed
    Given a node README marked spec-type reference with a sibling .feature file
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing

  Scenario: a reference node with no Subject section fails the gate closed
    Given a node README marked spec-type reference with no Subject section
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing

  Scenario: a behavioral node with no Use Cases section fails the gate closed
    Given a node README marked spec-type behavioral with no Use Cases section
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing

  Scenario: a descriptive node raises no spec-type violation
    Given a node README with no spec-type marker
    When the gate applies its structural checks
    Then the gate raises no spec-type violation for that node
