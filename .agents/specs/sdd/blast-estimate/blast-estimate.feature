@frozen
Feature: blast-estimate — compute a Mission's blast from its touch-set instead of hand-asserting it
  Unit suite for the blast estimator: the count × centrality × sensitivity computation, the line-up of
  the computed level against the hand-declared one (agrees / under-called / over-called), the two
  exclusions the rubric fixes (NOT compatibility, NOT surface location), declared-never-inferred
  sensitivity, and the read-only reports-never-writes boundary. Derivation behaviors only, over
  per-scenario CONSTRUCTED corpora and touch-sets — never the project's live store or live corpus.

  # ── The computation — count × centrality × sensitivity ──

  Scenario: a broad, central touch-set computes high blast
    Given a constructed corpus and a touch-set naming many work areas with high fan-in
    When the blast is estimated
    Then the computed blast is high

  Scenario: a single peripheral work area computes low blast
    Given a constructed corpus and a touch-set naming one work area with no fan-in and no sensitive marking
    When the blast is estimated
    Then the computed blast is low

  Scenario: a single central work area outranks a single peripheral one
    Given a constructed corpus holding one hub work area with high fan-in and one leaf with none
    When the blast is estimated for a touch-set of each at equal count
    Then the hub's computed blast is higher than the leaf's, because centrality is reach

  Scenario: a marked-sensitive work area raises the computed blast
    Given a constructed corpus whose sensitive-paths file marks one work area
    When the blast is estimated for a touch-set naming only that area
    Then the computed blast is higher than the same area unmarked

  Scenario: the estimate names the reasons behind the computed level
    Given a constructed corpus and a touch-set
    When the blast is estimated
    Then the report names the count, the centrality, and the sensitivity that drove the level

  # ── The line-up — declared against computed ──

  Scenario: a declared blast matching the computed level is reported agrees
    Given a touch-set whose computed blast is medium and a declared blast of medium
    When the two are lined up
    Then the line-up reports agrees

  Scenario: a declared blast below the computed level is reported under-called
    Given a touch-set whose computed blast is high and a declared blast of low
    When the two are lined up
    Then the line-up reports under-called naming the declared and the computed level

  Scenario: a declared blast above the computed level is reported over-called
    Given a touch-set whose computed blast is low and a declared blast of high
    When the two are lined up
    Then the line-up reports over-called naming the declared and the computed level

  Scenario: an under-called line-up is not an error
    Given a touch-set reported under-called
    When the report is read
    Then it is a finding to surface and the estimate still returns its computed level

  Scenario: a Mission carrying no declared blast still computes a level
    Given a touch-set and a Mission whose declared blast is unknown
    When the blast is estimated
    Then the computed level is returned and the line-up reports no declared level to compare

  # ── The two exclusions the rubric fixes ──

  Scenario: a breaking change is not high blast for being breaking
    Given a touch-set naming one peripheral work area whose change is a breaking semver class
    When the blast is estimated
    Then the computed blast is low, because compatibility is a separate dimension

  Scenario: surface location alone does not raise the computed blast
    Given a constructed corpus holding a work area named as public with no fan-in
    When the blast is estimated for a touch-set naming only that area
    Then the computed blast is low, because a name is not measured reach

  # ── Sensitivity is declared, never inferred ──

  Scenario: an absent sensitive-paths file is not an error
    Given a constructed corpus with no sensitive-paths file
    When the blast is estimated
    Then no work area is treated as sensitive and the estimate returns on count and centrality alone

  Scenario: a malformed sensitive-paths file fails loud rather than reading as no markings
    Given a constructed corpus whose sensitive-paths file cannot be parsed
    When the blast is estimated
    Then the estimate reports the file as unreadable and computes no level, because an unreadable marking is not evidence of no markings

  Scenario: a sensitive-sounding name is not treated as sensitive without a marking
    Given a constructed corpus whose sensitive-paths file is empty and a work area named secrets
    When the blast is estimated for a touch-set naming that area
    Then the area is not treated as sensitive, because sensitivity is declared and never inferred

  # ── Determinism and the read-only boundary ──

  Scenario: the estimate is deterministic for a fixed input
    Given a fixed constructed corpus and a fixed touch-set
    When the blast is estimated twice
    Then both estimates return the same computed level and the same reasons

  Scenario: the estimate writes nothing
    Given any constructed corpus and touch-set
    When the blast is estimated
    Then no file is written, no store is mutated, and the declared blast is left unchanged

  Scenario: the estimate records the level rather than deciding the verdict
    Given an estimate computing high blast
    When the report is read
    Then it renders no self-clear-or-escalate verdict, because blast modulates a conductor's judgment

  # ── Unresolved input is surfaced, never dropped ──

  Scenario: a touch-set area that resolves to no known work area is surfaced
    Given a touch-set naming an area that exists in no known project or capability
    When the blast is estimated
    Then the unresolved area is surfaced in the report and is not silently dropped

  Scenario: an empty touch-set computes no level rather than defaulting to low
    Given a touch-set naming no work areas
    When the blast is estimated
    Then the computed blast is unknown, because nothing touched is not evidence of low reach

  # ── The barrier agreement ──

  Scenario: a project-wide touch-set computes high blast
    Given a constructed corpus and a touch-set reaching across every work area of its project
    When the blast is estimated
    Then the computed blast is high, so a called-out barrier and the estimate agree by construction
