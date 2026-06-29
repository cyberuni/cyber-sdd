@frozen
Feature: The discovery procedure — find specs at the SDD spec locations by status shape
  Unit suite for the discovery tool (the discover-specs engine). Derivation behaviors
  only — locating specs at the three SDD spec locations, confirming them by status shape, and
  name-resolving over the returned list. Cross-capability e2e scenarios live in ../../acceptance/.

  # ── List the specs — the three spec locations ──

  Scenario: a spec.md at the repo-root single-project location is discovered
    Given a git-tracked .agents/spec/spec.md whose frontmatter status is in the lifecycle enum
    When discovery lists the specs
    Then that spec is in the set

  Scenario: a spec.md at the repo-root multi-project location is discovered
    Given a git-tracked .agents/specs/<project>/spec.md whose frontmatter status is in the lifecycle enum
    When discovery lists the specs
    Then that spec is in the set

  Scenario: a nested project spec at <project-path>/.agents/spec is discovered
    Given a git-tracked spec.md at a nested <project-path>/.agents/spec whose frontmatter status is in the lifecycle enum
    When discovery lists the specs
    Then that spec is in the set

  # ── Shape filter — status confirms a candidate is really a spec ──

  Scenario: a spec.md at a spec location with no lifecycle status is not a spec
    Given a spec.md at a spec location whose frontmatter carries no lifecycle status
    When discovery lists the specs
    Then that file is excluded from the set

  Scenario: a status-bearing spec.md outside the three locations is not discovered
    Given a git-tracked spec.md carrying a lifecycle status that sits outside the three spec locations
    When discovery lists the specs
    Then that file is excluded from the set

  # ── Output — a TOON list of specs with their frontmatter, bodies unread ──

  Scenario: each discovered spec carries its frontmatter in the list
    Given a set of discovered specs
    When discovery lists them
    Then each entry carries the spec's folder slug, status, project-path, and gate approvals

  Scenario: discovery reads frontmatter only, never spec bodies
    Given a discovered spec.md with a body below its frontmatter
    When discovery lists the specs
    Then it parses only the frontmatter block and does not read the body

  Scenario: the list is emitted as TOON
    Given a set of discovered specs
    When discovery emits the list
    Then it is rendered as a TOON table keyed by the spec columns

  # ── Resolve a name — over the discovered list ──

  Scenario: a name resolves to the spec whose folder slug matches
    Given a set of discovered specs keyed by folder slug
    When discovery resolves a name that matches exactly one slug
    Then it returns that spec

  Scenario: an ambiguous name is disambiguated with the user
    Given a name that matches more than one folder slug
    When discovery resolves the name
    Then it asks the user to disambiguate
    And it does not guess a match

  # ── No path registry — the locations are fixed conventions, not a stored list ──

  Scenario: discovery consults no path registry
    Given a spec that has moved between two spec locations
    When discovery lists the specs
    Then it finds the spec by scanning the fixed locations
    And it consults no registry, array, or index of paths
