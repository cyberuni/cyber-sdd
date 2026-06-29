@frozen
Feature: The discovery procedure — find specs at the SDD spec locations, named and resolvable
  Unit suite for the discovery tool (the discover-specs engine). Locating specs at the three SDD
  spec locations, confirming them by status shape, naming each project, and resolving a name over
  the list. Deterministic scenarios are node:test-verified; the two @rubric scenarios are agentic
  (judged by hand / by ACES when wired) because they assert agent behavior, not script output.
  Cross-capability e2e scenarios live in ../../acceptance/.

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

  # ── Project name and its source ──

  Scenario: a declared frontmatter name is authoritative
    Given a discovered spec whose frontmatter declares a name
    When discovery lists the specs
    Then the entry carries that name with name-source "declared"

  Scenario: the repo-root single project derives an assumable name
    Given a discovered .agents/spec/spec.md with no declared name
    When discovery lists the specs
    Then the entry carries an assumable repo-root name with name-source "derived"

  Scenario: a .agents/specs/<project> folder names itself
    Given a discovered .agents/specs/<project>/spec.md with no declared name
    When discovery lists the specs
    Then the entry carries the <project> folder as its name with name-source "derived"

  Scenario: a nested project with no declared name guesses its folder basename
    Given a discovered nested <project-path>/.agents/spec/spec.md with no declared name
    When discovery lists the specs
    Then the entry carries the folder basename as its name with name-source "guessed"

  # ── Output — frontmatter only, as TOON ──

  Scenario: each discovered spec carries its frontmatter and name in the list
    Given a set of discovered specs
    When discovery lists them
    Then each entry carries the folder slug, name, name-source, status, project-path, and gate approvals

  Scenario: the list is emitted as TOON
    Given a set of discovered specs
    When discovery emits the list
    Then it is rendered as a TOON table keyed by the spec columns

  Scenario: the output carries no spec body content
    Given a discovered spec.md with content below its frontmatter
    When discovery lists the specs
    Then no body content appears in any field of the output

  # ── Resolve a name — the deterministic half ──

  Scenario: a name resolves to the one spec whose name matches
    Given a set of discovered specs and a name that matches exactly one spec's name
    When discovery resolves the name
    Then it returns that spec

  Scenario: an ambiguous name returns the candidate set
    Given a name that matches more than one spec's name
    When discovery resolves the name
    Then it returns the matching specs as candidates
    And it does not pick one

  # ── No path registry — the locations are fixed conventions ──

  Scenario: discovery consults no path registry
    Given a spec that has moved between two spec locations
    When discovery lists the specs
    Then it finds the spec by scanning the fixed locations
    And it consults no registry, array, or index of paths

  # ── Agentic — judged by hand / by ACES (assert agent behavior, not script output) ──

  @rubric
  Scenario: an ambiguous name is disambiguated with the user
    Given an agent resolving a name that returns more than one candidate
    When the agent disambiguates the name
    Then the agent is judged against the rubric
      """
      dimension: presents the candidates to the user (max 1)
      dimension: does not silently pick one (max 1)
      threshold: 2
      """
    And the rubric score is at least the threshold

  @rubric
  Scenario: an agent using discovery never learns a spec body
    Given an agent that lists specs through discovery, where one spec hides a sentinel only in its body
    When the agent reports what it knows about that spec
    Then the agent is judged against the rubric
      """
      dimension: reports the spec's frontmatter facts (max 1)
      dimension: does not reveal the body sentinel (max 1)
      threshold: 2
      """
    And the rubric score is at least the threshold
