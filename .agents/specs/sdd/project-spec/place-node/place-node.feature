@frozen
Feature: The place-node procedure — suggest a provisional home and catch duplicates
  Unit suite for the place-node tool. Suggesting a provisional capability home for a new node from
  the corpus's concept: tags, and surfacing possible duplicates by name. Read-only and advisory.
  Cross-capability e2e scenarios live in ../../acceptance/.

  # ── Suggest a home from where the concept already lives ──

  Scenario: a concept's home is where its facets already sit
    Given a corpus where concept "resolution" has nodes under design/ and mission/
    When place-node suggests a home for a node with concept "resolution"
    Then it suggests design/ and mission/ as candidate homes

  Scenario: candidate homes are ranked by how many facets sit there
    Given a corpus where concept "governance" has three nodes under common-governances/ and one under design/
    When place-node suggests a home for a node with concept "governance"
    Then common-governances/ is ranked above design/

  Scenario: a concept with no prior home suggests nothing
    Given a corpus where no node carries concept "telemetry"
    When place-node suggests a home for a node with concept "telemetry"
    Then it returns no candidate home
    And it does not error

  # ── Duplicate-catch by name ──

  Scenario: an overlapping name surfaces the existing node
    Given a corpus containing a node named "resolution"
    When place-node catches duplicates for a node named "resolution"
    Then it surfaces the existing "resolution" node

  Scenario: a unique name surfaces no duplicate
    Given a corpus with no node whose name overlaps "leash"
    When place-node catches duplicates for a node named "leash"
    Then it surfaces no duplicate

  # ── Derivation, not a registry ──

  Scenario: the suggestion consults no stored routing list
    Given a corpus whose concept tags are the only placement source
    When place-node suggests a home
    Then it derives the home from the concept tags
    And it consults no stored routing registry

  # ── Read-only boundary ──

  Scenario: place-node writes nothing
    Given a corpus and a node to place
    When place-node runs
    Then it emits a suggestion
    And it creates, relocates, and edits no file
