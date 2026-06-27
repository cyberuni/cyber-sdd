Feature: Authoring — grill a CR into a spec + suite diff, then gate it
  The shared authoring capability: pressure-test a CR's intent into spec prose plus
  boolean scenarios, then take the spec-gate verdict on that diff. Unit behaviors only;
  the cross-capability CR lifecycle lives in ../acceptance/.

  # ---- Grilling — create / revise / backfill ----

  Scenario: create scaffolds prose and scenarios for new capability content
    Given a CR for capability content that does not exist yet
    When authoring grills it in create mode
    Then it scaffolds the spec prose and an initial set of boolean scenarios

  Scenario: revise tightens existing prose without scaffolding
    Given a CR that touches a capability whose prose and scenarios already exist
    When authoring grills it in revise mode
    Then it interrogates the existing content and tightens what is weak or stale
    And it scaffolds no new capability skeleton

  Scenario: backfill skips the up-front grill and reads the existing implementation
    Given a CR whose behavior already exists in code
    When authoring grills it in backfill mode
    Then it infers the what, why, and decisions from source, tests, and history
    And it does not ask the up-front grill questions

  Scenario: grilling settles the prose before editing the suite
    Given a CR under grilling
    When the prose contract is still unsettled
    Then no scenario edits are made until the prose is settled

  Scenario: grilling takes one issue to resolution before the next
    Given grilling has summarized several issues in the CR
    When it works them
    Then it resolves the single most important issue before starting another

  # ---- Grilling — gaps and contradictions ----

  Scenario: a missing required input becomes an open marker, not an invention
    Given grilling needs an input that is missing and cannot be inferred
    When it cannot recover the input
    Then it records the gap as an open marker in the body
    And it does not invent a value

  Scenario: a contradiction is reconciled toward the corroborated side
    Given two statements in the spec conflict
    And one side is the canonical definition corroborated by other sources and the implementation
    When grilling reconciles them
    Then it edits the outlier to match the corroborated side
    And it does not reword the corroborated rule to fit the outlier

  Scenario: an unclear authority is raised rather than guessed
    Given two statements conflict and neither side is clearly authoritative
    When grilling cannot establish which is the source of truth
    Then it raises the conflict as an open marker
    And it picks no reconciliation direction

  # ---- The spec gate — verdict ----

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

  # ---- The spec gate — the three verbs and freeze ----

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

  Scenario: spec.md is kept aligned and never frozen
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

  # ---- Provenance and alignment at the gate ----

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
