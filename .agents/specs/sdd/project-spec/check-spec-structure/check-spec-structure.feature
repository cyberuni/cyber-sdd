@frozen
Feature: The check-spec-structure procedure — audit node-shape within one project spec
  Unit suite for the check-spec-structure tool. Deterministic node-shape audit plus one judgment
  arm — intra-spec structural maintenance, read-only and advisory. Cross-capability e2e scenarios
  live in ../../acceptance/.

  # ── Audit node-shape (deterministic) ──

  Scenario: a spec-typed node missing a concept tag is flagged as an untagged orphan
    Given a node whose README declares a spec-type but carries no concept tag
    When check-spec-structure audits the project-spec
    Then it emits an untagged-node finding naming that node

  Scenario: a node carrying a concept tag raises no untagged finding
    Given a node whose README declares a spec-type and a concept tag
    When check-spec-structure audits the project-spec
    Then it emits no untagged-node finding for that node

  Scenario: a node whose suite exceeds the granularity threshold is flagged oversized
    Given a node whose .feature scenario count exceeds the threshold
    When check-spec-structure audits the project-spec
    Then it emits an oversized-node finding proposing a sub-node split

  Scenario: a node within the granularity threshold raises no oversized finding
    Given a node whose .feature scenario count is within the threshold
    When check-spec-structure audits the project-spec
    Then it emits no oversized-node finding for that node

  Scenario: a structurally clean project-spec produces no findings
    Given a project-spec whose nodes are all concept-tagged and within the threshold
    When check-spec-structure audits the project-spec
    Then it emits no findings

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

  # ── The judgment arm (Warden) ──

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
