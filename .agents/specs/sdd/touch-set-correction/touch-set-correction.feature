@frozen
Feature: The touch-set-correction engine — reconcile a declared touch-set against the real git diff
  Unit suite for the touch-set-correction tool (an SDD engine). Derivation behaviors only, over
  per-scenario CONSTRUCTED changed-file lists, project layouts, and declared touch-sets — never a live
  git diff or the live mission-graph store. It composes git diff (changed files), resolve-governances
  (each file's artifact-type), and gherkin-cli diff (a touched .feature's changed scenarios) into a
  read-only, post-hoc correction: the actual touched work areas, lined up against the guess, plus the
  corrected touch-set. The finer-than-node ladder, hard/soft classification, region tier, and SSA
  lowering are out of scope (issue #189 remainder). Cross-capability e2e scenarios live in ../workflows/.

  # ── Reconcile the declared prediction against the actual diff ──

  Scenario: a node touched in the diff but not declared is reported as missed
    Given a declared touch-set of A and an actual touched set of A and B
    When the touch-set is reconciled
    Then B is reported as missed

  Scenario: a node declared but not touched in the diff is reported as over-declared
    Given a declared touch-set of A and B and an actual touched set of A
    When the touch-set is reconciled
    Then B is reported as over-declared

  Scenario: a node both declared and touched is reported as confirmed
    Given a declared touch-set of A and an actual touched set of A
    When the touch-set is reconciled
    Then A is reported as confirmed

  Scenario: an exact prediction reports no missed and no over-declared nodes
    Given a declared touch-set equal to the actual touched set
    When the touch-set is reconciled
    Then no node is missed and no node is over-declared

  Scenario: the corrected touch-set is the actual touched set, not the declared set
    Given a declared touch-set of A and B and an actual touched set of A and C
    When the touch-set is reconciled
    Then the corrected touch-set is A and C

  Scenario: the reconciliation is deterministic and stably ordered for a fixed input
    Given a fixed declared touch-set and a fixed actual touched set
    When the touch-set is reconciled twice
    Then both reconciliations return the same lists in the same order

  # ── Recover the touched work area from a changed file (capability-first) ──

  Scenario: a changed file under a capability folder maps to its project-and-capability node
    Given a changed file under a project root whose next path segment names a capability
    When the actual touch-set is recovered
    Then the file maps to the project-and-capability node

  Scenario: a spec file and an impl file in the same capability collapse to one node
    Given two changed files under different roots of the same project sharing a capability segment
    When the actual touch-set is recovered
    Then both map to the one project-and-capability node

  Scenario: changed files in different capabilities yield distinct touched nodes
    Given two changed files under the same project root with different capability segments
    When the actual touch-set is recovered
    Then each maps to its own project-and-capability node

  Scenario: a changed file outside any known project root is surfaced as unmapped
    Given a changed file under no known project root
    When the actual touch-set is recovered
    Then the file is surfaced as unmapped and is not counted as a touched node

  # ── artifact-type per touched file (the semantic-rung gate) ──

  Scenario: each changed file carries the artifact-type resolved for it
    Given a changed file whose artifact-type resolves to a known kind
    When the correction is assembled
    Then the file entry carries that artifact-type

  Scenario: a changed file whose artifact-type does not resolve still counts as a touched node
    Given a changed file that maps to a node but whose artifact-type does not resolve
    When the correction is assembled
    Then the node is in the actual touch-set and the file entry carries an unknown artifact-type

  Scenario: the scenario rung is gated by the feature extension, not the resolved artifact-type
    Given a changed .feature file whose artifact-type did not resolve and a changed non-feature file
    When the correction is assembled
    Then the .feature file is eligible for scenario-level detail and the non-feature file is not

  # ── Finer detail: changed scenarios for a touched .feature (frozen or not) ──

  Scenario: a touched feature records the scenario names its diff changed
    Given a touched .feature whose diff added one scenario and modified another
    When the correction is assembled
    Then the node records both changed scenario names as detail

  Scenario: an unfrozen touched feature records its changed scenarios the same as a frozen one
    Given a touched .feature that is not yet frozen whose diff changed a scenario
    When the correction is assembled
    Then the node records that changed scenario name, because the gherkin diff reads any .feature regardless of freeze

  Scenario: a touched non-feature file records no scenario detail
    Given a touched node whose only changed file is not a .feature
    When the correction is assembled
    Then the node records no scenario detail

  Scenario: the recorded scenario detail does not reclassify the node collision
    Given a node carrying changed-scenario detail
    When the correction is read
    Then the node carries no hard-or-soft collision verdict and no region or hunk tier

  # ── The correction record — shape and read-only ──

  Scenario: the correction carries the corrected set, the three-way split, and per-node changed files
    Given a reconciled correction over a diff touching two nodes
    When the correction is read
    Then it carries the corrected touch-set, the confirmed, missed, and over-declared lists, and each node's changed files

  Scenario: computing a correction does not write to the mission graph
    Given any diff and declared touch-set
    When the correction is computed
    Then the mission-graph store is not mutated

  Scenario: the whole correction is deterministic and stably ordered for a fixed diff
    Given a fixed changed-file list, project layout, and declared touch-set
    When the correction is computed twice
    Then both computations return the same corrected set, three-way split, unmapped list, and per-node detail in the same order

  Scenario: the correction is emitted as TOON by default and as JSON on request
    Given a computed correction
    When it is emitted with no format flag and again with the json format
    Then the default rendering is TOON and the json rendering carries the same records
