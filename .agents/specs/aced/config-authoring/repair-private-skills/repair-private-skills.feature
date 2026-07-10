@frozen
Feature: repair-private-skills — validate and repair repo-private skill hygiene
  Unit suite for the repair-private-skills engine: an internal, non-invokable skill loaded by the
  manage gateway that checks repo-private skills under .agents/skills for a stray public-tree
  symlink or a missing metadata.internal: true flag. validate-private is read-only and reports
  issues; repair-private writes fixes, deleting the stray symlink and inserting the missing
  metadata, and never writes outside .agents/skills. Discovering skills across all sources is
  list-skills; maintaining the runner-def family is manage-model-runners.
  Cross-capability e2e scenarios live in ../../acceptance/.

  # ---- Reach ----

  Scenario: the engine is reached via the manage gateway, not a bare user invocation
    Given a user request to check or fix repo-private skill hygiene
    When ACED routes the request
    Then the manage gateway loads repair-private-skills and the engine does not self-trigger from a bare user invocation

  # ---- validate-private (read-only) ----

  Scenario: validate flags a repo-private entry that symlinks into the public skills tree
    Given a repo-private skill directory that is a symlink resolving into the public skills tree
    When validate-private checks it
    Then it reports a public_skill_symlink issue for that entry

  Scenario: validate flags a repo-private entry with no SKILL.md and no augmentation file
    Given a repo-private skill directory with no SKILL.md, SKILL.local.md, or SKILL.project.md
    When validate-private checks it
    Then it reports a missing_skill_file issue for that entry

  Scenario: validate allows an augmentation-only directory with no SKILL.md
    Given a repo-private skill directory containing only a SKILL.local.md or SKILL.project.md
    When validate-private checks it
    Then it reports no issue for that entry

  Scenario: validate flags a SKILL.md missing YAML frontmatter
    Given a repo-private SKILL.md whose first line is not a frontmatter delimiter
    When validate-private checks it
    Then it reports a missing_frontmatter issue for that entry

  Scenario: validate flags a SKILL.md missing metadata.internal true
    Given a repo-private SKILL.md whose frontmatter has no metadata.internal true
    When validate-private checks it
    Then it reports a missing_metadata_internal issue for that entry

  Scenario: validate reports ok when every entry passes all checks
    Given a set of repo-private skills that all pass every check
    When validate-private checks them
    Then it reports an ok result with no issues

  Scenario: validate makes no filesystem changes
    Given a repo-private skill tree containing every kind of issue
    When validate-private runs
    Then no file on disk is created, modified, or deleted

  # ---- repair-private (writes) ----

  Scenario: repair deletes a stray symlink resolving into the public skills tree
    Given a repo-private skill directory that is a symlink resolving into the public skills tree
    When repair-private runs
    Then it deletes that symlink and records a removed_public_symlink action

  Scenario: repair inserts metadata.internal true into a SKILL.md missing it
    Given a repo-private SKILL.md whose frontmatter has no metadata.internal true
    When repair-private runs
    Then it writes metadata.internal true into that SKILL.md's frontmatter and records an updated_metadata action

  Scenario: repair leaves a SKILL.md that already declares metadata.internal true unchanged
    Given a repo-private SKILL.md whose frontmatter already has metadata.internal true
    When repair-private runs
    Then it makes no write to that file and records an already_internal action

  Scenario: repair skips an augmentation-only directory with no SKILL.md
    Given a repo-private skill directory containing only a SKILL.local.md or SKILL.project.md
    When repair-private runs
    Then it makes no write to that directory and records a local_augmentation_only action

  Scenario: repair skips a SKILL.md missing frontmatter
    Given a repo-private SKILL.md whose first line is not a frontmatter delimiter
    When repair-private runs
    Then it makes no write to that file and records a skipped_no_frontmatter action

  Scenario: repair's writes are confined to .agents/skills
    Given a repo-private skill tree with a stray symlink and a SKILL.md missing internal metadata
    When repair-private runs
    Then every write it makes — the symlink delete and the SKILL.md rewrite — is under .agents/skills, and no file under the public skills tree is created, modified, or deleted