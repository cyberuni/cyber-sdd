@frozen
Feature: The check-spec-structure procedure — audit node-shape within one project spec
  Unit suite for the check-spec-structure tool. Deterministic node-shape audit plus judgment
  arms — intra-spec structural maintenance, read-only and advisory. Cross-capability e2e scenarios
  live in ../../workflows/.

  # ── Audit node-shape (deterministic) ──

  Scenario: a spec-typed node missing a concept tag is flagged as an untagged orphan
    Given a node whose README declares a spec-type but carries no concept tag
    When check-spec-structure audits the project-spec
    Then it emits an untagged-node finding naming that node

  Scenario: a node carrying a concept tag raises no untagged finding
    Given a node whose README declares a spec-type and a concept tag
    When check-spec-structure audits the project-spec
    Then it emits no untagged-node finding for that node

  Scenario: a node whose suite exceeds the granularity threshold is flagged oversized with a shape profile
    Given a node whose .feature scenario count exceeds the threshold
    When check-spec-structure audits the project-spec
    Then it emits an oversized-node finding carrying the node's shape profile

  Scenario: a node within the granularity threshold raises no oversized finding
    Given a node whose .feature scenario count is within the threshold
    When check-spec-structure audits the project-spec
    Then it emits no oversized-node finding for that node

  Scenario: a project-spec with no root glossary is flagged missing-glossary
    Given a project-spec with no glossary.md beside its root spec.md
    When check-spec-structure audits the project-spec
    Then it emits an advisory missing-glossary finding

  Scenario: a project-spec carrying a root glossary raises no missing-glossary finding
    Given a project-spec with a glossary.md beside its root spec.md
    When check-spec-structure audits the project-spec
    Then it emits no missing-glossary finding

  Scenario: a glossary folder does not satisfy the root-file mandate
    Given a project-spec whose glossary is a folder rather than a root glossary.md
    When check-spec-structure audits the project-spec
    Then it emits a missing-glossary finding

  Scenario: a missing glossary never fails the check gate
    Given a project-spec whose only finding is a missing glossary
    When check-spec-structure runs in check mode
    Then it reports no blocking findings and exits zero

  Scenario: a structurally clean project-spec produces no findings
    Given a project-spec whose nodes are all concept-tagged and within the threshold
    When check-spec-structure audits the project-spec
    Then it emits no findings

  # ── The shape profile — the deterministic breadth-vs-depth signal ──

  Scenario: the shape profile reports the plain and tagged scenario counts
    Given an oversized node whose suite mixes plain and tagged scenarios
    When check-spec-structure audits the project-spec
    Then the oversized-node finding reports the plain scenario count and the tagged scenario count

  Scenario: the shape profile reports the section-cluster count as a soft breadth hint
    Given an oversized node whose suite groups scenarios under section-comment headers
    When check-spec-structure audits the project-spec
    Then the oversized-node finding reports the section-cluster count

  Scenario: section clusters are counted across both comment header styles
    Given a suite that groups scenarios under both box-drawing and dashed section headers
    When check-spec-structure computes the shape profile
    Then both header styles are counted as clusters

  Scenario: a suite with no section headers reports zero clusters
    Given an oversized node whose suite carries no section-comment headers
    When check-spec-structure computes the shape profile
    Then the shape profile reports zero clusters

  Scenario: the oversized finding prescribes no route
    Given an oversized node
    When check-spec-structure audits the project-spec
    Then the oversized-node finding carries the shape profile only
    And it prescribes no split, down-level, or redesign route

  # ── Severity & check mode (CI) ──

  Scenario: an untagged orphan is a blocking finding
    Given an audit that emitted an untagged-node finding
    When the finding's severity is read
    Then the untagged-node finding is blocking

  Scenario: an oversized node is an advisory finding
    Given an audit that emitted an oversized-node finding
    When the finding's severity is read
    Then the oversized-node finding is advisory

  Scenario: check mode exits non-zero on a blocking finding and writes nothing
    Given a project-spec with an untagged-node finding
    When check-spec-structure runs with the check flag
    Then it exits non-zero
    And it writes no artifact

  Scenario: check mode exits zero when only advisory findings exist
    Given a project-spec whose only finding is an oversized-node advisory
    When check-spec-structure runs with the check flag
    Then it exits zero

  Scenario: check mode exits zero on a clean project-spec
    Given a project-spec with no findings
    When check-spec-structure runs with the check flag
    Then it exits zero

  # ── The judgment arms (Warden) ──

  @rubric
  Scenario: an oversized node is routed by breadth vs depth for the Warden's judgment
    Given an oversized-node finding carrying a shape profile
    When the Warden judges the breadth-vs-depth route
    Then the judge evaluates the route against the rubric
      """
      dimensions:
        - name: reads-breadth-vs-depth-from-the-profile
          max: 3
        - name: routes-breadth-overflow-to-a-node-split
          max: 2
        - name: routes-depth-overflow-to-down-level-when-deterministic-else-redesign
          max: 3
      threshold: 6
      """
    And the rubric score is at least the threshold

  @rubric
  Scenario: two contradicting nodes are escalated for the Warden's judgment
    Given two nodes in the same spec whose behavior conflicts
    When the Warden judges the intra-spec contradiction
    Then the judge evaluates the contradiction against the rubric
      """
      dimensions:
        - name: contradiction-is-real
          max: 3
        - name: names-both-nodes
          max: 2
      threshold: 4
      """
    And the rubric score is at least the threshold

  # ── The write boundary ──

  Scenario: the audit writes nothing
    Given check-spec-structure auditing a project-spec
    When it emits its finding set
    Then it writes no file
    And it writes no status, approval, or freeze

  Scenario: frontmatter only — no node body reaches a deterministic finding
    Given a node whose body prose differs from its frontmatter
    When check-spec-structure audits the project-spec
    Then no deterministic finding is derived from the node body
