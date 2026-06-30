@frozen
Feature: The concept-index procedure — render the by-concept view of one corpus from frontmatter
  Unit suite for the concept-index tool. Scanning a spec corpus for concept: frontmatter, grouping
  nodes by concern, annotating each with its facet kind, and maintaining the generated block in the
  root spec.md. Deterministic scenarios are node:test-verified. Cross-capability e2e scenarios live
  in ../../acceptance/.

  # ── Scan and group — concept: tags are the source ──

  Scenario: a node's concept tag places it under that concept
    Given a corpus node whose frontmatter declares concept "resolution"
    When concept-index renders the corpus
    Then the node appears under the "resolution" concept

  Scenario: a node tagged with several concepts appears under each
    Given a corpus node whose frontmatter declares concept [governance, resolution]
    When concept-index renders the corpus
    Then the node appears under "governance"
    And the node appears under "resolution"

  Scenario: a node with no concept tag is omitted
    Given a corpus node whose frontmatter declares no concept
    When concept-index renders the corpus
    Then the node appears under no concept in the index

  # ── Facet kind — derived mechanically from location + spec-type ──

  Scenario: a design/ node is annotated as a rule
    Given a node under design/ tagged with a concept
    When concept-index renders the corpus
    Then the node's facet kind is "rule"

  Scenario: an acceptance/ node is annotated as e2e
    Given a node under acceptance/ tagged with a concept
    When concept-index renders the corpus
    Then the node's facet kind is "e2e"

  Scenario: a reference node is annotated as reference
    Given a node with spec-type reference tagged with a concept, outside design/ and acceptance/
    When concept-index renders the corpus
    Then the node's facet kind is "reference"

  Scenario: a behavioral node is annotated as behavior
    Given a node with spec-type behavioral tagged with a concept, outside design/ and acceptance/
    When concept-index renders the corpus
    Then the node's facet kind is "behavior"

  # ── Determinism — pure derivation ──

  Scenario: rendering twice is byte-identical
    Given a fixed corpus of tagged nodes
    When concept-index renders the corpus twice
    Then the two rendered tables are byte-identical

  Scenario: concepts and nodes are emitted in a stable order
    Given a corpus of tagged nodes
    When concept-index renders the corpus
    Then the concepts are ordered deterministically
    And the nodes under each concept are ordered deterministically

  Scenario: the output carries no node body content
    Given a corpus node with a sentinel only in its body, below its frontmatter
    When concept-index renders the corpus
    Then the sentinel appears nowhere in the rendered table

  # ── Write boundary — only the generated block changes ──

  Scenario: writing replaces only the delimited block in spec.md
    Given a root spec.md containing the generated-block markers and other prose
    When concept-index writes the index
    Then the content between the markers equals the freshly rendered table
    And every line outside the markers is unchanged

  Scenario: writing is idempotent
    Given a root spec.md whose generated block is already current
    When concept-index writes the index again
    Then spec.md is unchanged

  Scenario: writing inserts the block at the anchor when the markers are absent
    Given a root spec.md with no generated-block markers
    When concept-index writes the index
    Then the block is inserted once at the declared anchor

  # ── Check mode — the no-drift guard ──

  Scenario: check succeeds when the block is current
    Given a root spec.md whose generated block equals the freshly rendered table
    When concept-index checks the corpus
    Then it reports no drift

  Scenario: check fails when the block is stale
    Given a root spec.md whose generated block differs from the freshly rendered table
    When concept-index checks the corpus
    Then it reports drift and exits non-zero
