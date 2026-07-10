@frozen
Feature: list-skills — discover and summarize installed skills
  Unit suite for the list-skills engine: an internal, non-invokable skill loaded by the manage
  gateway that scans the four fixed skill sources (repo-private, repo-public, user-global, and
  the cyberplace package's shipped skills dir), dedupes by name with repo taking precedence, applies
  an optional glob-style name filter, and reports each surviving skill's name, foundIn source,
  description, and package-managed status. Read-only — validating or repairing skill content is
  repair-private-skills; maintaining the per-model runner family is manage-model-runners.
  Cross-capability e2e scenarios live in ../../acceptance/.

  # ---- Reach ----

  Scenario: the engine is reached via the manage gateway, not a bare user invocation
    Given a user request to see what skills are installed
    When ACED routes the request
    Then the manage gateway loads list-skills and the engine does not self-trigger from a bare user invocation

  # ---- source scan ----

  Scenario: discovery scans the repo-private skills directory
    Given a skill directory under the repo's .agents/skills
    When list-skills scans for skills
    Then the skill is reported with foundIn repo

  Scenario: discovery scans the repo-public skills directory
    Given a skill directory under the repo's skills directory
    When list-skills scans for skills
    Then the skill is reported with foundIn repo

  Scenario: discovery scans the user-global skills directory
    Given a skill directory under the user's global .agents/skills
    When list-skills scans for skills
    Then the skill is reported with foundIn global

  Scenario: discovery scans the cyberplace package's shipped skills directory
    Given a skill directory under the cyberplace package's skills directory
    When list-skills scans for skills
    Then the skill is reported with foundIn package

  Scenario: only a directory containing a SKILL.md is reported as a skill
    Given a directory under a scanned source with no SKILL.md file
    When list-skills scans that source
    Then the directory is not reported as a skill

  # ---- dedupe ----

  Scenario: a name found in more than one source is reported once, repo taking precedence
    Given the same skill name present under both a repo source and the global source
    When list-skills scans all sources
    Then only the repo copy is reported and the global copy is dropped

  # ---- filter ----

  Scenario: a glob-style name filter restricts the report to matching skills
    Given a --grep pattern using * and ? glob syntax
    When list-skills applies the filter
    Then only skills whose name matches the pattern are reported

  Scenario: omitting the name filter reports every discovered skill
    Given no --grep pattern is supplied
    When list-skills reports skills
    Then every discovered skill across all sources is included

  # ---- reported fields ----

  Scenario: each reported skill carries name, foundIn, and description
    Given a discovered skill with frontmatter name and description
    When list-skills builds its summary
    Then the summary includes that name, its foundIn source, and its description

  Scenario: a skill with no frontmatter name falls back to its directory name
    Given a SKILL.md whose frontmatter omits the name field
    When list-skills builds its summary
    Then the summary reports the skill under its directory name

  Scenario: a skill declaring package-manager distribution is reported as package-managed
    Given a skill directory with a skill.json whose distribution.install_via is package_manager
    When list-skills builds its summary
    Then the summary reports that skill as package-managed

  Scenario: a skill with no manifest or a non-package install path is not package-managed
    Given a skill directory with no skill.json or a skill.json not declaring package_manager
    When list-skills builds its summary
    Then the summary reports that skill as not package-managed

  # ---- output order ----

  Scenario: the reported skill list is sorted alphabetically by name
    Given a set of discovered skills in scan order
    When list-skills returns its report
    Then the skills are ordered alphabetically by name