@frozen
Feature: The check-scenario-overlap procedure — detect one behavior in two owning nodes
  Unit suite for the check-scenario-overlap tool. Deterministic cross-node overlap detection plus a
  Warden judgment arm — intra-project spec-level SSA, read-only and advisory. It surfaces where the
  same behavior lives in more than one node's .feature; the Warden confirms and dedups. Cross-capability
  e2e scenarios live in ../../workflows/.

  # ── Detect cross-node overlap (deterministic) ──

  Scenario: two nodes carrying a scenario with the same step fingerprint are flagged as an exact-duplicate
    Given two nodes whose suites each carry a scenario with an identical normalized step fingerprint
    When check-scenario-overlap audits the project-spec
    Then it emits an exact-duplicate candidate naming both nodes and the overlapping scenario

  Scenario: two nodes with no shared step fingerprint raise no candidate
    Given two nodes whose suites share no scenario step fingerprint
    When check-scenario-overlap audits the project-spec
    Then it emits no overlap candidate for those nodes

  Scenario: two nodes sharing a scenario title but differing steps are flagged as a title-overlap
    Given two nodes carrying a scenario with the same normalized title but differing step fingerprints
    When check-scenario-overlap audits the project-spec
    Then it emits a title-overlap candidate naming both nodes and the scenario

  Scenario: a scenario duplicated within a single node raises no cross-node candidate
    Given one node whose suite carries the same scenario fingerprint twice
    When check-scenario-overlap audits the project-spec
    Then it emits no overlap candidate for that node

  Scenario: a scenario appearing once across the corpus raises no candidate
    Given a scenario whose step fingerprint appears in exactly one node
    When check-scenario-overlap audits the project-spec
    Then it emits no overlap candidate for that scenario

  Scenario: a project-spec with no cross-node overlap produces no candidates
    Given a project-spec whose nodes share no scenario fingerprint or title
    When check-scenario-overlap audits the project-spec
    Then it emits no candidates

  # ── The step fingerprint — behavior-shaped, not cosmetic ──

  Scenario: the fingerprint is computed from step bodies only
    Given two scenarios with identical steps but different titles, tags, and comments
    When check-scenario-overlap computes their fingerprints
    Then the two fingerprints are equal

  Scenario: the fingerprint normalizes whitespace and case
    Given two scenarios whose steps differ only in whitespace and letter case
    When check-scenario-overlap computes their fingerprints
    Then the two fingerprints are equal

  Scenario: step order is part of the fingerprint
    Given two scenarios with the same step set in a different order
    When check-scenario-overlap computes their fingerprints
    Then the two fingerprints differ

  Scenario: two Scenario Outlines with identical steps but differing Examples rows are not an exact-duplicate
    Given two Scenario Outlines with byte-identical steps whose Examples tables carry different rows
    When check-scenario-overlap audits the project-spec
    Then it emits no exact-duplicate candidate for those outlines

  Scenario: two Scenario Outlines with identical steps and identical Examples rows are still an exact-duplicate
    Given two Scenario Outlines with byte-identical steps whose Examples tables carry the same header and rows
    When check-scenario-overlap audits the project-spec
    Then it emits an exact-duplicate candidate naming both nodes and the overlapping scenario

  # ── Severity & check mode (CI) ──

  Scenario: an exact-duplicate is a blocking candidate
    Given an audit that emitted an exact-duplicate candidate
    When the candidate's severity is read
    Then the exact-duplicate candidate is blocking

  Scenario: a title-overlap is an advisory candidate
    Given an audit that emitted a title-overlap candidate
    When the candidate's severity is read
    Then the title-overlap candidate is advisory

  Scenario: check mode exits non-zero on an exact-duplicate and writes nothing
    Given a project-spec with an exact-duplicate candidate
    When check-scenario-overlap runs with the check flag
    Then it exits non-zero
    And it writes no artifact

  Scenario: check mode exits zero when only title-overlap advisories exist
    Given a project-spec whose only candidate is a title-overlap advisory
    When check-scenario-overlap runs with the check flag
    Then it exits zero

  Scenario: check mode exits zero on a project-spec with no overlap
    Given a project-spec with no cross-node overlap
    When check-scenario-overlap runs with the check flag
    Then it exits zero

  # ── The judgment arm (Warden) ──

  @rubric
  Scenario: an overlap candidate is judged for real behavioral overlap and an owning node
    Given an exact-duplicate or title-overlap candidate naming two nodes and a scenario
    When the Warden judges the candidate
    Then the judge evaluates the candidate against the rubric
      """
      dimensions:
        - name: overlap-is-the-same-behavior-not-a-coincidental-text-match
          max: 3
        - name: names-both-nodes-and-the-overlapping-scenario
          max: 2
        - name: assigns-a-single-owning-node-for-the-dedup
          max: 3
      threshold: 6
      """
    And the rubric score is at least the threshold

  # ── The write boundary ──

  Scenario: the audit writes nothing
    Given check-scenario-overlap auditing a project-spec
    When it emits its candidate set
    Then it writes no file
    And it writes no status, approval, or freeze

  Scenario: no scenario title or prose reaches the fingerprint
    Given two scenarios whose titles and prose differ but whose steps are identical
    When check-scenario-overlap computes the candidate set
    Then the two scenarios are flagged as an exact-duplicate
    And no title or prose difference suppresses the candidate
