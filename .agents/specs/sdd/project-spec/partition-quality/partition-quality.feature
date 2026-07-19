@frozen
Feature: check-partition-quality — does this layout permit parallel work
  Unit suite for the co-change partition measurement. Measurement and reporting only — it moves no
  file, renders no verdict, and gates nothing (layout is the owner's call, ../../common-governances/).

  # ── Reading history ──

  Scenario: only multi-file changes inform the measurement
    Given a repository whose history contains single-file commits and multi-file commits
    When check-partition-quality reads the history
    Then it measures over the multi-file commits
    And a single-file commit contributes no pair, because one file can collide with nothing

  Scenario: history below the usable floor is reported rather than scored
    Given a repository with fewer usable multi-file commits than the floor
    When check-partition-quality runs
    Then it reports the history as too thin to measure
    And it emits no collision rate

  Scenario: history at or above the floor is measured
    Given a repository with at least the floor of usable multi-file commits
    When check-partition-quality runs
    Then it emits a collision rate over that history

  Scenario: paths outside the measured scope are excluded
    Given a run scoped to a source directory and a commit touching files inside and outside it
    When check-partition-quality reads that commit
    Then only the in-scope files of that commit are considered

  # ── The metric ──

  Scenario: the collision rate is the share of change pairs sharing a node
    Given two changes drawn from the measured history
    When check-partition-quality computes the metric
    Then the collision rate is the share of change pairs that touch at least one node in common

  Scenario: the parallelizable share is reported as the headline
    Given a computed collision rate
    When check-partition-quality reports
    Then the headline is the parallelizable share, which is one minus the collision rate

  Scenario: a partition of one node collides with itself on every pair
    Given a partition that places every file in a single node
    When check-partition-quality computes the metric
    Then the collision rate is total
    And the report names it as permitting no parallel work

  # ── The control ──

  Scenario: every run reports a shuffled control alongside the measurement
    Given a partition under measurement
    When check-partition-quality reports
    Then it reports the same metric over a shuffled partition of identical node sizes

  Scenario: a partition no better than its control is flagged as explaining nothing
    Given a partition whose collision rate is no better than its shuffled control
    When check-partition-quality reports
    Then it flags that the partition explains no more than chance

  Scenario: a partition better than its control reports the margin
    Given a partition whose collision rate is better than its shuffled control
    When check-partition-quality reports
    Then it reports the margin over the control

  # ── Comparing candidate partitions ──

  Scenario: two candidate partitions are compared on the same history
    Given two candidate partitions over one repository
    When check-partition-quality compares them
    Then both are measured over the same commits and the same scope

  Scenario: the comparison reports the parallelizable share of each candidate
    Given a completed comparison of two candidate partitions
    When check-partition-quality reports
    Then each candidate carries its own parallelizable share

  # ── Confounded diagnostics are labelled, never headlined ──

  Scenario: the confounded diagnostics are labelled as confounded
    Given a report carrying the within-node co-change ratio and the mean nodes touched
    When check-partition-quality reports
    Then each is labelled as confounded by node count
    And neither is presented as the headline

  Scenario: a coarser partition does not win on the headline by being coarser
    Given a coarse partition and a fine partition over one history
    When check-partition-quality reports each headline
    Then the headline reflects the parallel work each permits rather than rewarding fewer nodes

  # The read-only and no-verdict properties hold on every path, so they sit on no edge the
  # ## Logic graph draws: invariants, not decisions. Acceptance-only-strict leaves them to the
  # engine's own unit suite, which covers both (`sdd:suite-format-governance`).
