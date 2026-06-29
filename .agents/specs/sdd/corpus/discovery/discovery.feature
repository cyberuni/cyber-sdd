@frozen
Feature: The discovery procedure — find specs by shape, not location
  Unit suite for the discovery tool. Derivation behaviors only — locating and name-resolving
  specs from frontmatter shape. Cross-capability e2e scenarios live in ../../acceptance/.

  # ── List the specs ──

  Scenario: a spec.md carrying a lifecycle status is discovered
    Given a repo with a git-tracked spec.md whose frontmatter status is in the lifecycle enum
    When discovery lists the specs
    Then that spec.md is in the set

  Scenario: a spec.md with no lifecycle status is not a spec
    Given a git-tracked spec.md whose frontmatter carries no lifecycle status
    When discovery lists the specs
    Then that file is excluded from the set

  Scenario: a spec in a non-conventional location is still found
    Given a spec.md carrying a lifecycle status outside any specs/<domain>/ directory
    When discovery lists the specs
    Then that spec is in the set

  Scenario: a nested project spec is discovered too
    Given a project spec.md nested inside another project's tree, each carrying a lifecycle status
    When discovery lists the specs
    Then both the outer and the nested spec are in the set

  # ── Resolve a name ──

  Scenario: a name resolves to the spec whose folder slug matches
    Given a set of discovered specs keyed by folder slug
    When discovery resolves a name that matches exactly one slug
    Then it returns that spec

  Scenario: an ambiguous name is disambiguated with the user
    Given a name that matches more than one folder slug
    When discovery resolves the name
    Then it asks the user to disambiguate
    And it does not guess a match

  Scenario: discovery consults no path registry
    Given a spec that has moved to a new folder slug
    When discovery resolves its name
    Then it finds the spec by shape at the new location
    And it consults no registry, array, or index of paths