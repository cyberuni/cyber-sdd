@frozen
Feature: The discovery procedure — find specs at the SDD spec locations, named and resolvable
  Unit suite for the discovery tool (the discover-specs engine). Locating specs at the three fixed
  SDD spec locations PLUS any extra anchors declared in the project's spec-anchors config, confirming
  them by status shape, naming each project, and resolving a name over the list. Deterministic
  scenarios are node:test-verified; the two @rubric scenarios are agentic (judged by hand / by ACED
  when wired) because they assert agent behavior, not script output. Cross-capability e2e scenarios
  live in ../../workflows/.

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

  Scenario: a status-bearing spec.md at neither a fixed convention nor a declared extra anchor is not discovered
    Given a git-tracked spec.md carrying a lifecycle status at a path that is neither one of the three fixed conventions nor a declared extra anchor
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

  # ── Extra anchors — the spec-anchors config adds locations on top of the fixed conventions ──

  Scenario: the three fixed conventions are always scanned regardless of config
    Given a repo with no spec-anchors config file
    When discovery lists the specs
    Then it scans the three fixed conventions and finds every spec at them

  Scenario: an absent spec-anchors config leaves discovery scanning only the fixed conventions
    Given a git-tracked spec.md carrying a lifecycle status at a non-standard path and no spec-anchors config
    When discovery lists the specs
    Then that spec is excluded from the set

  Scenario: a declared extra anchor adds a location to the scan
    Given a spec-anchors config declaring an extra anchor and a git-tracked spec.md with a lifecycle status at that anchor
    When discovery lists the specs
    Then that spec is in the set

  Scenario: a spec at an extra anchor is still shape-confirmed by status
    Given a spec-anchors config declaring an extra anchor and a spec.md at that anchor carrying no lifecycle status
    When discovery lists the specs
    Then that file is excluded from the set

  Scenario: an anchor pattern with a project token names the spec from the captured segment
    Given an extra anchor whose pattern captures a project segment and a discovered spec.md at it with no declared name
    When discovery lists the specs
    Then the entry carries the captured segment as its name with name-source "derived"

  Scenario: an extra-anchor spec with no project token and no declared name guesses its folder basename
    Given a discovered spec.md at an extra anchor with neither a project-token capture nor a declared name
    When discovery lists the specs
    Then the entry carries the folder basename as its name with name-source "guessed"

  Scenario: a declared frontmatter name is authoritative for an extra-anchor spec too
    Given a discovered spec.md at an extra anchor whose frontmatter declares a name
    When discovery lists the specs
    Then the entry carries that name with name-source "declared"

  Scenario: an unreadable or malformed spec-anchors config is ignored and discovery falls back to the fixed conventions
    Given an unreadable or malformed .agents/sdd/spec-anchors.toml
    When discovery lists the specs
    Then it yields no extra anchors and still finds the specs at the three fixed conventions

  # ── Agentic — judged by hand / by ACED (assert agent behavior, not script output) ──

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
