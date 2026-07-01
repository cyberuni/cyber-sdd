@frozen
Feature: The plan-discovery procedure — find resumable missions by their plan briefs
  Unit suite for the plan-discovery tool (the discover-plans engine). Derivation behaviors
  only — locating the mission plan briefs under the SDD plans location, treating each present
  brief as an unretired/resumable mission, reporting its todo tally and resume lead, and
  resolving a CR ref over the returned list. Cross-capability e2e scenarios live in ../../acceptance/.

  # ── List the plans — the plans location ──

  Scenario: a plan brief under the plans location is discovered
    Given a git-tracked .agents/plans/<cr-ref>.plan.md carrying a frontmatter block
    When plan-discovery lists the plans
    Then that plan is in the set keyed by its <cr-ref>

  Scenario: a present plan brief is treated as a resumable mission
    Given a plan brief that still exists under the plans location
    When plan-discovery lists the plans
    Then it is reported as resumable

  Scenario: a plan whose todos are all completed is still listed until it is retired
    Given a plan brief whose every todo is completed but which has not been retired
    When plan-discovery lists the plans
    Then it remains in the set

  # ── Shape filter — a brief is a *.plan.md carrying frontmatter ──

  Scenario: a *.plan.md with no frontmatter block is not a brief
    Given a *.plan.md under the plans location whose content carries no frontmatter block
    When plan-discovery lists the plans
    Then that file is excluded from the set

  Scenario: a non-plan sibling file is not a brief
    Given a sibling file under the plans location that does not end in .plan.md
    When plan-discovery lists the plans
    Then that file is excluded from the set

  Scenario: discovery yields the empty set when there is no plans location
    Given a repo with no .agents/plans directory
    When plan-discovery lists the plans
    Then the set is empty

  # ── Output — a TOON list with the todo tally and resume lead ──

  Scenario: each discovered plan carries its cr ref, name, and todo tally
    Given a set of discovered plans
    When plan-discovery lists them
    Then each entry carries the cr ref, the frontmatter name, and the todo counts total, completed, and in-progress

  Scenario: each discovered plan carries the lead line of its NEXT anchor
    Given a plan brief whose body holds a ## NEXT resume anchor with a lead line
    When plan-discovery lists the plans
    Then the entry carries that lead line as the resume hint

  Scenario: plan-discovery reads the frontmatter and the NEXT section only
    Given a plan brief with sections below its NEXT anchor
    When plan-discovery lists the plans
    Then it parses only the frontmatter block and the NEXT section and does not read the rest of the body

  Scenario: the list is emitted as TOON
    Given a set of discovered plans
    When plan-discovery emits the list
    Then it is rendered as a TOON table keyed by the plan columns

  # ── Status — the plan-level dispatch flag ──

  Scenario: each discovered plan carries its status
    Given a plan brief whose frontmatter declares a top-level status
    When plan-discovery lists the plans
    Then the entry carries that status

  Scenario: a plan brief with no status is reported as active
    Given a plan brief whose frontmatter declares no top-level status
    When plan-discovery lists the plans
    Then the entry's status is active

  Scenario: the default listing applies no status filter
    Given a set of discovered plans with mixed statuses
    When plan-discovery lists the plans with no status filter requested
    Then every discovered plan is in the set regardless of its status

  Scenario: an explicit status filter narrows the set to that status
    Given a set of discovered plans with mixed statuses
    When plan-discovery lists the plans filtered to status approved
    Then only the plans whose status is approved are in the set

  Scenario: the status filter treats an unset status as active
    Given a plan brief with no top-level status and a filter to status active
    When plan-discovery lists the plans
    Then that plan is in the set

  Scenario: a status filter that matches no brief yields the empty set
    Given a set of discovered plans none of whose status is the requested value
    When plan-discovery lists the plans filtered to that status
    Then the set is empty

  # ── Resolve a ref — over the discovered list ──

  Scenario: a cr ref resolves to the plan whose filename slug matches
    Given a set of discovered plans keyed by cr ref
    When plan-discovery resolves a ref that matches exactly one slug
    Then it returns that plan

  # ── No path registry — the plans location is a fixed convention ──

  Scenario: plan-discovery consults no path registry
    Given the plan briefs under the plans location
    When plan-discovery lists the plans
    Then it finds them by scanning the fixed .agents/plans location
    And it consults no registry, array, or index of paths
