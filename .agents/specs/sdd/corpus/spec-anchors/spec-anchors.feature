@frozen
Feature: The spec-anchors config — declare and curate the extra anchors discovery scans
  Unit suite for the spec-anchors config and its curation engine (manage-spec-anchors). The config
  format, listing fixed + custom anchors, CRUD over the custom ones, inducing a pattern from a sample
  path, and previewing a pattern's effect. Deterministic scenarios are node:test-verified; the one
  @rubric scenario is agentic (the manage skill confirming before it persists). Cross-capability e2e
  scenarios live in ../../acceptance/.

  # ── The config format ──

  Scenario: the config declares extra anchors under a single anchors key
    Given a .agents/sdd/spec-anchors.toml with an anchors array of repo-relative patterns
    When the engine reads the config
    Then each array entry is loaded as one extra anchor pattern

  Scenario: an anchor pattern probes for spec.md under the named directory
    Given an anchor pattern naming a directory
    When discovery scans that anchor
    Then it probes <pattern>/spec.md, mirroring the fixed conventions

  Scenario: a ** segment in an anchor pattern globs zero or more directory levels
    Given an anchor pattern containing a ** segment
    When discovery scans that anchor
    Then it matches every dir reachable at that position, at any depth including zero

  Scenario: an absent config yields no extra anchors
    Given a repo with no .agents/sdd/spec-anchors.toml
    When the engine reads the config
    Then it yields an empty extra-anchor set

  # ── List the anchors ──

  Scenario: list shows the three fixed anchors with an explanation each
    Given any repo
    When the engine lists the anchors
    Then the three fixed anchors appear, each flagged fixed with a one-line explanation of what it matches

  Scenario: list shows the custom anchors from the config
    Given a config declaring one or more custom anchors
    When the engine lists the anchors
    Then each custom anchor appears, flagged custom, alongside the fixed anchors

  # ── CRUD over the custom anchors ──

  Scenario: add writes a new custom anchor to the config
    Given a custom anchor pattern to add
    When the engine adds it
    Then the pattern is present in .agents/sdd/spec-anchors.toml

  Scenario: add creates the config file when none exists
    Given a repo with no spec-anchors config and a pattern to add
    When the engine adds it
    Then the config file is created carrying that pattern

  Scenario: remove deletes a custom anchor from the config
    Given a config containing a custom anchor
    When the engine removes that anchor
    Then the pattern is absent from the config

  Scenario: edit replaces one custom anchor pattern with another
    Given a config containing a custom anchor
    When the engine edits that anchor to a new pattern
    Then the old pattern is absent and the new pattern is present

  Scenario: a fixed anchor cannot be added, edited, or removed
    Given a curation request targeting one of the three fixed conventions
    When the engine handles it
    Then it rejects the change and the config's fixed conventions stay implicit and unwritten

  Scenario: adding an invalid pattern is rejected before it is persisted
    Given a malformed anchor pattern
    When the engine validates it
    Then it is rejected and the config on disk is unchanged

  Scenario: removing an anchor absent from the config changes nothing
    Given a config that does not contain a given anchor
    When the engine removes that anchor
    Then it reports that nothing was removed and the config on disk is unchanged

  Scenario: editing a custom anchor to a malformed pattern is rejected
    Given a config containing a custom anchor
    When the engine edits it to a malformed pattern
    Then the edit is rejected and the config on disk is unchanged

  # ── Induce a pattern from a sample path ──

  Scenario: induce offers a literal directory candidate for a sample path
    Given a repo-relative sample path to a spec's directory
    When the engine induces anchor patterns
    Then a literal-directory candidate matching that exact path is offered

  Scenario: induce offers a project-token generalization for a sample path
    Given a repo-relative sample path whose deepest segment is the spec's own directory
    When the engine induces anchor patterns
    Then a candidate replacing that segment with a <project> capture token is offered

  Scenario: induce rejects a sample path that does not resolve inside the repo
    Given a sample path that does not exist under the repo root
    When the engine induces anchor patterns
    Then it reports the path as unusable and offers no candidate

  # ── Preview a pattern's effect ──

  Scenario: preview lists the projects a candidate pattern would match
    Given a candidate anchor pattern and specs on disk under it
    When the engine previews the pattern
    Then it lists the project(s)/spec(s) that pattern would discover

  Scenario: preview does not persist the candidate pattern
    Given a candidate anchor pattern being previewed
    When the engine previews it
    Then the config on disk is unchanged

  Scenario: preview of a pattern that matches no spec reports an empty match
    Given a candidate anchor pattern that matches no spec on disk
    When the engine previews the pattern
    Then it reports that the pattern matches no project

  Scenario: preview rejects a malformed candidate pattern
    Given a malformed candidate anchor pattern
    When the engine previews it
    Then it reports the pattern as invalid and lists no matches

  # ── Boundaries — writes only the config, never spec content ──

  Scenario: curation writes only the spec-anchors config
    Given any curation operation
    When the engine carries it out
    Then it writes only .agents/sdd/spec-anchors.toml and no spec.md, status, approval, or freeze

  # ── Agentic — judged by hand / by ACED (asserts the skill's behavior, not script output) ──

  @rubric
  Scenario: the manage skill previews the effect and confirms before it persists a new anchor
    Given a user supplying a sample path to add as an anchor
    When the skill curates the anchor
    Then the skill is judged against the rubric
      """
      dimension: induces a pattern and previews the matched projects to the user (max 1)
      dimension: confirms with the user before writing the config (max 1)
      threshold: 2
      """
    And the rubric score is at least the threshold
