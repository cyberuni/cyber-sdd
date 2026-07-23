@frozen
Feature: The resolution procedure — match governance bars for an artifact-type, bucketed by tier
  Unit suite for the resolution matcher (the resolve-governances engine). Matching the resolved-actor
  bars across the caller-passed project anchors, the plugin squad, and the sdd defaults, and naming
  each role's agent — returned bucketed by tier, never ordered or composed. Deterministic scenarios,
  node:test-verified. The agent's composition by precedence is asserted in the conductor / cold-judge
  suites, not here. Cross-capability e2e scenarios live in ../../workflows/resolve-squad.feature.

  # ── Match the resolved-actor bars for an artifact-type ──

  Scenario: a project bar matching the artifact-type, actor, and gate is matched
    Given a project governance whose frontmatter matches the file's artifact-type, actor, and gate
    When the matcher resolves that bar
    Then the governance's path is in the bar's project bucket

  Scenario: a typeless project bar matches every artifact-type
    Given a project governance whose frontmatter declares no artifact-type for an actor and gate
    When the matcher resolves that bar for any artifact-type
    Then the governance's path is in the bar's project bucket

  Scenario: a project bar for a different gate is not matched
    Given a project governance for an actor at the impl gate
    When the matcher resolves that actor's spec-gate bar
    Then the governance's path is absent from the bar's project bucket

  Scenario: the plugin bar is named from the matched squad
    Given a registry whose matched squad names a bar for the actor and gate
    When the matcher resolves that bar
    Then the bar's plugin slot carries the plugin's harness-load ref

  Scenario: a bar floors to the sdd default when nothing overrides
    Given no project governance and no plugin bar for an actor and gate
    When the matcher resolves that bar
    Then the bar's sdd slot carries the sdd-default harness-load ref
    And its project, project-root, and plugin slots are empty

  # ── Bucket by tier, never compose — the boundary ──

  Scenario: candidates come back bucketed by tier
    Given matching governances from the project anchor, the plugin squad, and the sdd default
    When the matcher resolves the bar
    Then the candidates are keyed by tier as project, project-root, plugin, and sdd

  Scenario: a project replace candidate is returned, never collapsed
    Given a project governance whose frontmatter carries compose replace for a bar
    When the matcher resolves that bar
    Then the project bucket carries that candidate
    And the plugin and sdd slots are still populated

  Scenario: the matcher emits no compose field
    Given any resolved bar
    When the matcher returns its candidates
    Then no candidate carries a compose field

  Scenario: project and project-root matches land in their own buckets
    Given a matching governance under the project anchor and another under the project-root anchor
    When the matcher resolves the bar
    Then the project bucket carries the project anchor's candidate
    And the project-root bucket carries the project-root anchor's candidate

  # ── Caller-passed anchors — never discovered ──

  Scenario: the matcher reads only the anchors it is passed
    Given a set of caller-passed project anchors
    When the matcher collects project governances
    Then it reads the .agents/governances of each passed anchor only
    And it walks no other directory to find anchors

  Scenario: an anchor with no governances contributes nothing
    Given a passed anchor that has no .agents/governances directory
    When the matcher collects project governances
    Then that anchor adds no candidate

  # ── Resolved-actor bars only ──

  Scenario: a role plan carries only its resolved-actor bars
    Given a production-chain role being resolved
    When the matcher returns that role's plan
    Then the plan carries the role's resolved-actor bars and its agent
    And it carries no fixed-universal governance

  # ── Name the agent that runs each role ──

  Scenario: a role with a named plugin delegate resolves to that agent
    Given a matched squad that names an agent for a role
    When the matcher resolves that role
    Then the role's agent is that plugin delegate

  Scenario: a role explicitly set to null resolves to the sdd-default agent
    Given a matched squad that sets a role to null
    When the matcher resolves that role
    Then the role's agent is the sdd-default agent

  Scenario: a role omitted from the squad resolves by the plugin-role convention
    Given a matched squad that omits a role key
    When the matcher resolves that role
    Then the role's agent is the convention name for that plugin and role

  # ── Disambiguate / validate the registry ──

  Scenario: an artifact-type claimed by two plugins returns needs-input
    Given a registry where two plugins each claim the same artifact-type
    When the matcher resolves that artifact-type
    Then it returns needs-input naming the competing plugins
    And it resolves no role

  Scenario: a clean registry with no artifact-type validates as well-formed
    Given a well-formed, unambiguous registry and no artifact-type
    When the matcher validates the registry
    Then it reports the registry is OK

  Scenario: an absent registry resolves to the sdd defaults
    Given a project with no registry file
    When the matcher resolves a bar
    Then it binds no plugin
    And the bar floors to its sdd default

  Scenario: a present registry with no squad for the artifact-type resolves to the sdd defaults
    Given a registry that is present but whose squads claim none of the artifact-type
    When the matcher resolves that artifact-type
    Then it binds no plugin
    And every role floors to its sdd default
    And it does not return needs-input
