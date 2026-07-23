@frozen
Feature: The manage-scenario-bridge procedure — scaffold and curate a project's scenario-bridge config
  Unit suite for the manage-scenario-bridge tool. Curation behaviors only — list, scaffold, add —
  over <project-path>/.agents/sdd/scenario-bridge.toml, the one-time per-project wiring the
  verify-scenarios bridge and the impl-judge step-0 consumption both read. It writes only that one
  config file, never spec content, and never runs the bridge or a test.

  # ── List ──

  Scenario: listing a project with a configured bridge returns its sources
    Given a project whose project-path carries a scenario-bridge.toml with one or more sources
    When manage-scenario-bridge lists that project's sources
    Then it returns every configured source block in order

  Scenario: listing a project with no configured bridge returns no sources without error
    Given a project whose project-path carries no scenario-bridge.toml
    When manage-scenario-bridge lists that project's sources
    Then it returns no sources and raises no error

  # ── Scaffold ──

  Scenario: scaffolding a project's first source creates the config under its project-path
    Given a project whose project-path carries no scenario-bridge.toml
    When manage-scenario-bridge scaffolds a source with an adapter, a command, and a reportPath
    Then it creates scenario-bridge.toml under the project's project-path with that one source block

  Scenario: a colocated project's config lands at the familiar repo-root path
    Given a colocated project whose project-path is its own repo root
    When manage-scenario-bridge scaffolds a source
    Then the config is created at .agents/sdd/scenario-bridge.toml, unchanged from before this tool existed

  Scenario: scaffolding over an existing config is refused
    Given a project whose project-path already carries a scenario-bridge.toml
    When manage-scenario-bridge is asked to scaffold a first source for that project
    Then it refuses rather than overwriting the existing config

  # ── Add ──

  Scenario: adding a source to an existing config appends without disturbing the others
    Given a project whose project-path carries a scenario-bridge.toml with one source
    When manage-scenario-bridge adds a second source
    Then the config carries both sources and the first source's fields are unchanged

  Scenario: adding a source to a project with no config yet is refused
    Given a project whose project-path carries no scenario-bridge.toml
    When manage-scenario-bridge is asked to add a source for that project
    Then it refuses rather than creating the config implicitly, and names scaffold as the entry point

  Scenario: a scaffold or add missing a required field is refused
    Given a scaffold or add request missing its adapter or reportPath
    When manage-scenario-bridge validates the request
    Then it refuses and writes no source block rather than persisting a malformed one

  # ── Boundaries ──

  Scenario: the tool writes only the scenario-bridge config
    Given manage-scenario-bridge scaffolding or adding a source for a project
    When it completes the operation
    Then it writes only that project's scenario-bridge.toml and no spec.md, status, approval, or freeze

  Scenario: the tool never authors a binding test
    Given a newly scaffolded source naming a command and a reportPath
    When manage-scenario-bridge completes scaffolding
    Then no test file is created or modified — binding tests remain the impl-producer's own act
