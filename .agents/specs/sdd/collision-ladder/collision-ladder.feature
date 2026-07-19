@frozen
Feature: The finer-than-node ladder — classify a node collision hard or soft by descending file → region → semantic
  Unit suite for the collision-ladder tool (an SDD engine). Derivation behaviors only, over per-scenario
  CONSTRUCTED pairwise touched-detail (each of two missions' files under one shared/colliding node, with
  artifact-type, touched line-hunks, and — for a .feature — changed scenarios) — never a live git diff or
  the live mission-graph store. Invoked ONLY at a known node-level collision (the mission-graph WAW-mutex
  found it); it descends the ladder to justify DOWNGRADING a suspected false-hard to soft — never to
  detect a collision. A code collision descends to the SYMBOL rung — produced/consumed symbols classify
  it disjoint(soft) / write-write(hard) / read-after-write(hard); when the symbols cannot be inferred it
  stays hard, flagged deferred. The ★ SSA-lowering doctrine (partitioning a change into missions,
  versioning a write-write into an ordered dependency) stays out of scope (issue #189 capstone). It never
  writes to the mission graph. Cross-capability e2e scenarios live in ../workflows/.

  # ── The ladder: descend only until classifiable, then stop ──

  Scenario: two missions touching different files under the colliding node classify soft at the file rung
    Given two missions colliding on a node but changing different files under it
    When the collision is classified
    Then the collision is soft and the decisive rung is file

  Scenario: the ladder stops at the file rung even when finer detail is absent
    Given two missions whose changed files under the node are disjoint and carry no line-hunk or scenario detail
    When the collision is classified
    Then the collision is soft at the file rung, because the file rung classifies it without needing any finer detail

  Scenario: a shared file changed in disjoint line-hunks classifies soft at the region rung
    Given two missions changing the same file under the node in disjoint line-hunks
    When the collision is classified
    Then the collision is soft and the decisive rung is region

  Scenario: a shared file changed in overlapping line-hunks descends past the region rung
    Given two missions changing the same file under the node in overlapping line-hunks
    When the collision is classified
    Then the region rung does not classify it soft and the ladder descends to the semantic rung

  Scenario: a shared .feature changed in different scenarios classifies soft at the semantic rung
    Given two missions changing the same .feature file under the node in different scenarios
    When the collision is classified
    Then the collision is soft and the decisive rung is semantic

  Scenario: a shared .feature changed in the same scenario classifies hard at the semantic rung
    Given two missions changing the same scenario of the same .feature file under the node
    When the collision is classified
    Then the collision is hard and the decisive rung is semantic

  # ── Conservative defaults: descend only to downgrade, never to over-relax ──

  Scenario: a node collision is hard if any one shared file is hard
    Given one shared file cleared soft and a second shared file that classifies hard
    When the collision is classified
    Then the node collision is hard

  Scenario: a shared file whose line-hunks are unknown is not cleared at the region rung
    Given two missions sharing a file for which one side records no line-hunk detail
    When the collision is classified
    Then the region rung does not classify that file soft, because disjointness cannot be proven

  Scenario: confidence decays down the ladder
    Given one collision cleared soft at the file rung and another cleared soft at the semantic rung
    When both collisions are classified
    Then the file-rung verdict carries higher confidence than the semantic-rung verdict

  # ── The semantic rung splits by artifact-type: prose has no anchor, code descends to symbols ──

  Scenario: a shared non-behavioral-prose file with overlapping hunks stays hard with no finer anchor
    Given two missions changing the same non-behavioral-prose file under the node in overlapping hunks
    When the collision is classified
    Then that file is hard and the reason is that non-behavioral prose has no finer anchor to descend to

  # ── The symbol rung: a code collision descends to produced/consumed symbols (★ #189, first half) ──

  Scenario: a shared code file changed in disjoint symbols classifies soft at the symbol rung
    Given two missions changing the same code file under the node that touch no symbol in common
    When the collision is classified
    Then the collision is soft and the decisive rung is symbol

  Scenario: a shared code file where both missions produce the same symbol classifies hard at the symbol rung
    Given two missions that both produce the same symbol in the same code file under the node
    When the collision is classified
    Then that file is hard at the symbol rung and the reason is a write-write clash on the shared symbol

  Scenario: a shared code file where one mission consumes a symbol the other produces classifies hard at the symbol rung
    Given two missions changing the same code file under the node where one consumes a symbol the other produces
    When the collision is classified
    Then that file is hard at the symbol rung and the reason is a read-after-write dependency on the shared symbol

  Scenario: a shared code file whose symbols cannot be inferred stays hard and flagged deferred
    Given two missions changing the same code file under the node whose symbol detail cannot be inferred
    When the collision is classified
    Then that file stays hard at the symbol rung and is flagged symbol-rung-deferred

  # ── Shared-thin file: the hard→soft downgrade that avoids over-serializing ──

  Scenario: a shared-thin file changed in disjoint regions downgrades hard to soft
    Given a shared-thin file that the two missions change in disjoint line-hunks
    When the collision is classified
    Then the collision downgrades to soft rather than serializing on the shared-thin file

  Scenario: a file touched by at least the shared-thin degree threshold is flagged and surfaced as a smell
    Given a shared file whose touching-mission degree is at least the shared-thin threshold
    When the collision is classified
    Then the file is flagged shared-thin and surfaced as an architectural smell to consider splitting

  Scenario: a shared-thin file changed in the same region stays hard
    Given a shared-thin file that both missions change in the same line-hunk
    When the collision is classified
    Then the collision stays hard, because the downgrade fires only when a finer grain proves disjoint

  # ── The verdict record — shape and read-only ──

  Scenario: the verdict records the collision, the decisive rung, and per-shared-file detail
    Given a classified collision over a node the two missions share
    When the verdict is read
    Then it carries the hard-or-soft collision, the decisive rung, the confidence, and each shared file's verdict

  Scenario: classifying a collision does not write to the mission graph
    Given any pair of touched details for a colliding node
    When the collision is classified
    Then the mission-graph store is not mutated

  Scenario: classification is deterministic and stably ordered for a fixed pair
    Given a fixed pair of touched details for a colliding node
    When the collision is classified twice
    Then both classifications return the same verdict with the same per-file lists in the same order

  Scenario: the verdict is emitted as TOON by default and as JSON on request
    Given a classified collision
    When it is emitted with no format flag and again with the json format
    Then the default rendering is TOON and the json rendering carries the same verdict
