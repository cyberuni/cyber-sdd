@frozen
Feature: The skill-dirs config — declare and curate the extra locations the validate engine scans
  Unit suite for the skill-dirs config and its curation engine (manage-skill-dirs). The config format,
  listing fixed + custom skill-dir patterns, CRUD over the custom ones, inducing a pattern from a
  sample skill directory, and previewing a pattern's effect. Deterministic scenarios are
  node:test-verified; the one @rubric scenario is agentic (the manage skill confirming before it
  persists). Cross-capability e2e scenarios live in ../../workflows/.

  # ── The config format ──

  Scenario: the config declares extra skill-dir patterns under a single anchors key
    Given a .agents/aced/skill-dirs.toml with an anchors array of repo-relative directory patterns
    When the engine reads the config
    Then each array entry is loaded as one extra skill-scan location

  Scenario: a skill-dir pattern names a directory whose children are scanned for a SKILL.md
    Given a skill-dir pattern naming a directory
    When the validate engine scans that location
    Then it looks one level below the matched directory for <child>/SKILL.md, mirroring the built-in defaults

  Scenario: a ** segment in a skill-dir pattern globs zero or more directory levels
    Given a skill-dir pattern containing a ** segment
    When the engine expands the pattern
    Then it matches every directory reachable at that position, at any depth including zero

  Scenario: an absent config yields no extra skill-scan locations
    Given a repo with no .agents/aced/skill-dirs.toml
    When the engine reads the config
    Then it yields an empty extra-location set and the defaults are unchanged

  # ── List the skill-dir patterns ──

  Scenario: list shows the two fixed default roots with an explanation each
    Given any repo
    When the engine lists the skill-dir patterns
    Then the two fixed default roots appear, each flagged fixed with a one-line explanation of what it matches

  Scenario: list shows the custom patterns from the config
    Given a config declaring one or more custom skill-dir patterns
    When the engine lists the skill-dir patterns
    Then each custom pattern appears, flagged custom, alongside the fixed defaults

  # ── CRUD over the custom patterns ──

  Scenario: add writes a new custom pattern to the config
    Given a custom skill-dir pattern to add
    When the engine adds it
    Then the pattern is present in .agents/aced/skill-dirs.toml

  Scenario: add creates the config file when none exists
    Given a repo with no skill-dirs config and a pattern to add
    When the engine adds it
    Then the config file is created carrying that pattern

  Scenario: remove deletes a custom pattern from the config
    Given a config containing a custom pattern
    When the engine removes that pattern
    Then the pattern is absent from the config

  Scenario: edit replaces one custom pattern with another
    Given a config containing a custom pattern
    When the engine edits that pattern to a new one
    Then the old pattern is absent and the new pattern is present

  Scenario: a fixed default root cannot be added, edited, or removed
    Given a curation request targeting one of the two fixed default roots
    When the engine handles it
    Then it rejects the change and the config's fixed defaults stay implicit and unwritten

  Scenario: adding an invalid pattern is rejected before it is persisted
    Given a malformed skill-dir pattern
    When the engine validates it
    Then it is rejected and the config on disk is unchanged

  Scenario: adding a pattern already present changes nothing
    Given a config that already contains a given custom pattern
    When the engine adds that same pattern again
    Then it reports that nothing was added and the config on disk is unchanged with no duplicate

  Scenario: removing a pattern absent from the config changes nothing
    Given a config that does not contain a given pattern
    When the engine removes that pattern
    Then it reports that nothing was removed and the config on disk is unchanged

  Scenario: editing a pattern absent from the config changes nothing
    Given a config that does not contain a given pattern
    When the engine edits that absent pattern to a new one
    Then it reports that nothing was edited and the config on disk is unchanged

  Scenario: editing a custom pattern to a malformed one is rejected
    Given a config containing a custom pattern
    When the engine edits it to a malformed pattern
    Then the edit is rejected and the config on disk is unchanged

  Scenario: editing a custom pattern to a fixed default root is rejected
    Given a config containing a custom pattern
    When the engine edits it to one of the two fixed default roots
    Then the edit is rejected and the fixed default stays implicit and unwritten in the config

  # ── Induce a pattern from a sample path ──

  Scenario: induce offers a literal directory candidate for a sample path
    Given a repo-relative sample path to a directory that contains skill subdirectories
    When the engine induces skill-dir patterns
    Then a literal-directory candidate matching that exact path is offered

  Scenario: induce offers a glob generalization for a sample path
    Given a repo-relative sample path with a variable segment such as a plugin name
    When the engine induces skill-dir patterns
    Then a candidate replacing that segment with a * glob is offered

  Scenario: induce offers only the literal candidate when the sample path has no variable segment
    Given a repo-relative single-segment sample path with no parent segment to generalize
    When the engine induces skill-dir patterns
    Then only the literal-directory candidate is offered and no glob generalization is proposed

  Scenario: induce rejects a sample path that does not resolve inside the repo
    Given a sample path that does not exist under the repo root
    When the engine induces skill-dir patterns
    Then it reports the path as unusable and offers no candidate

  Scenario: induce rejects a sample path that escapes the repo via ..
    Given a sample path that uses .. to point at a real directory outside the repo root
    When the engine induces skill-dir patterns
    Then it reports the path as unusable and offers no candidate

  # ── Preview a pattern's effect ──

  Scenario: preview lists the skills a candidate pattern would discover
    Given a candidate skill-dir pattern and SKILL.md files on disk under it
    When the engine previews the pattern
    Then it lists the SKILL.md file(s) that pattern would add to the scan

  Scenario: preview does not persist the candidate pattern
    Given a candidate skill-dir pattern being previewed
    When the engine previews it
    Then the config on disk is unchanged

  Scenario: preview of a pattern that matches no skill reports an empty match
    Given a candidate skill-dir pattern that matches no SKILL.md on disk
    When the engine previews the pattern
    Then it reports that the pattern matches no skill

  Scenario: preview rejects a malformed candidate pattern
    Given a malformed candidate skill-dir pattern
    When the engine previews it
    Then it reports the pattern as invalid and lists no matches

  # ── Boundaries — writes only the config, never skill or spec content ──

  Scenario: curation writes only the skill-dirs config
    Given any curation operation
    When the engine carries it out
    Then it writes only .agents/aced/skill-dirs.toml and no skill, spec.md, status, approval, or freeze

  # ── Agentic — judged by hand / by ACED (asserts the skill's behavior, not script output) ──

  @rubric
  Scenario: the manage skill previews the effect and confirms before it persists a new pattern
    Given a user supplying a sample path to add as a skill-dir pattern
    When the skill curates the pattern
    Then the skill is judged against the rubric
      """
      dimensions:
        - name: induces_and_previews_matched_skills
          max: 1
        - name: confirms_before_writing_config
          max: 1
      threshold: 2
      """
    And the rubric score is at least the threshold
