@frozen
Feature: spec-floor — run every project-spec's deterministic checks across the corpus
  Unit suite for the harness that runs the project-spec-tier engines over the corpus. Scope
  selection, the two composing sub-checks of the corpus scope (the engine sweep and the coverage
  guard), the single-project scope, and the repo's own check chain. Every scenario is boolean and
  node:test-verified against the harness's own fixtures.

  # ── UC1 — --corpus: check the whole corpus ──

  Scenario: the corpus scope runs the engine set and the coverage guard together
    Given a repo whose every project-spec passes every engine
    When the harness runs at corpus scope
    Then the report names each project-spec it swept
    And the report states that every spec is covered
    And it exits 0

  Scenario: every project-spec in the corpus is swept, not only the first
    Given a repo holding three project-specs, each governing its own project
    When the harness runs at corpus scope
    Then the report names all three project-specs

  Scenario: a damaged spec node fails the corpus scope
    Given a repo whose one project-spec holds a node missing a section its node type requires
    When the harness runs at corpus scope
    Then the report names the engine that rejected it
    And it exits non-zero

  Scenario: a deleted spec node fails the corpus scope
    Given a repo whose one project-spec references a node whose folder was removed
    When the harness runs at corpus scope
    Then the report names the engine that rejected it
    And it exits non-zero

  Scenario: a spec the sweep cannot see is caught by the coverage guard
    Given a repo holding a spec file at a spec location whose status is not in the lifecycle enum
    When the harness runs at corpus scope
    Then the report names that spec file as a coverage gap
    And it exits non-zero

  Scenario: a spec no project would check is caught by the coverage guard
    Given a repo holding a spec file whose status is in the lifecycle enum
    And that spec declares a project-path naming a directory that holds no package manifest
    When the harness runs at corpus scope
    Then the report names that spec file as a coverage gap
    And the report states that nothing reaches it
    And it exits non-zero

  Scenario: a coverage gap does not stop the sweep
    Given a spec file at a spec location carrying a status outside the lifecycle enum
    And a separate project-spec whose node is missing a section its node type requires
    When the harness runs at corpus scope
    Then the report names the coverage gap
    And the report names the engine that rejected the project-spec

  Scenario: a failing project-spec does not stop the ones after it
    Given a repo holding two project-specs, the first of which fails an engine
    When the harness runs at corpus scope
    Then the report names the second project-spec as swept

  Scenario: an empty corpus passes
    Given a repo carrying a workspace marker and no project-spec
    When the harness runs at corpus scope
    Then the report states that the corpus holds no project-spec
    And it exits 0

  Scenario: a clean corpus exits 0
    Given a repo whose every project-spec passes every engine
    And a repo whose every spec file is covered by a project that checks it
    When the harness runs at corpus scope
    Then it exits 0

  # ── UC2 — --project <dir>: check one project-spec ──

  Scenario: the project scope runs the engine set against the one spec that governs it
    Given a project whose spec declares that project's directory and passes every engine
    When the harness runs at project scope against that directory
    Then the report names that project and the spec governing it
    And it exits 0

  Scenario: a damaged spec node fails the project scope
    Given a project whose spec holds a node missing a section its node type requires
    When the harness runs at project scope against that directory
    Then the report names the engine that rejected it
    And it exits non-zero

  Scenario: a project with no spec is skipped
    Given a workspace member holding a package manifest and no .agents/spec folder
    And a corpus whose every spec declares a project-path naming some other directory
    When the harness runs at project scope against that member
    Then the report states that no spec governs it
    And it exits 0

  Scenario: a spec that cannot be classified is escalated, not exempted
    Given a spec file at a spec location declaring a project and carrying a status outside the lifecycle enum
    When the harness runs at project scope against that project's directory
    Then the report names that status as outside the lifecycle enum
    And it exits non-zero

  Scenario: a project claimed by two specs fails
    Given two spec files declaring the same project directory as their project-path
    When the harness runs at project scope against that directory
    Then the report names both claiming specs
    And it exits non-zero

  Scenario: with no scope flag the working directory is the project
    Given an invocation carrying no flag at all
    And a working directory that is the directory of a project one spec governs
    When the harness runs
    Then the report names that working directory's project as the one it checked
    And it exits 0

  # ── The shared path — scope selection, the repo root, and the engine set ──

  Scenario: an unrecognized flag fails loudly instead of choosing a scope
    Given an invocation carrying a flag the harness does not define
    When the harness runs
    Then the report names that flag as unrecognized
    And it exits non-zero

  Scenario: the retired coverage-only flag fails instead of reporting a green empty run
    Given an invocation at a repo root carrying the retired --check-coverage flag
    When the harness runs
    Then the report names that flag as unrecognized
    And it exits non-zero

  Scenario: the two scopes cannot be asked for at once
    Given an invocation carrying both the corpus scope flag and the project scope flag
    When the harness runs
    Then the report names the two scopes as contradictory
    And it exits non-zero

  Scenario: neither scope runs without a repo root
    Given a working directory with no workspace marker in it or above it
    When the harness runs there at either scope
    Then the report names the missing workspace marker whichever scope was asked for
    And it exits non-zero

  Scenario: a failing engine does not stop the engines after it
    Given a project-spec that two engines of the set each reject
    When the harness runs the engine set against it at either scope
    Then the report names both failing engines whichever scope was asked for
    And it exits non-zero

  # ── The repo's own chain ──

  Scenario: the root check chain runs the floor at corpus scope
    Given the repo's root package manifest
    When its check:specs script is read
    Then the script invokes the harness at corpus scope
