@frozen
Feature: scaffold-project-spec — lay out a project's spec
  Unit suite for the project-level layout bootstrap. Layout/scaffold behaviors only — it does
  not author a node's ## Use Cases or .feature, render a gate verdict, or freeze (those are
  ../spec-producer/ and ../spec-gate/).

  # ---- Evidence mode ----

  Scenario: a project that has a source tree enters detection mode
    Given a project whose source tree exists and can be read
    When the bootstrap selects its evidence mode
    Then it enters detection mode and reads the project shape for its recommendations

  Scenario: a project that has no source tree enters intent mode
    Given a greenfield project with no source tree at all
    When the bootstrap selects its evidence mode
    Then it enters intent mode and reads no project shape

  Scenario: intent mode recommends a strategy from the capabilities the user states
    Given a greenfield project in intent mode and the capabilities the user states it will have
    When the bootstrap recommends a strategy
    Then it recommends from the stated capabilities rather than from a source layout

  Scenario: intent mode does not silently apply the capability-first default
    Given a greenfield project in intent mode whose intended capabilities are not yet stated
    When the bootstrap recommends a strategy
    Then it asks the user for the intended capabilities rather than assuming the default

  Scenario: intent mode asks for the spec location it cannot detect
    Given a greenfield project in intent mode with no source to classify as shippable
    When the bootstrap presents the location choice
    Then it asks whether the project will be shippable rather than detecting a plugin layout

  Scenario: both evidence modes converge on the same declared organization
    Given a strategy chosen in either evidence mode
    When the bootstrap records the organization
    Then it writes the same root spec.md envelope, project-path frontmatter, and placement map

  # ---- Detection ----

  Scenario: an agentic plugin is detected and the hoisted location is recommended
    Given an existing project that is an agentic plugin with .plugin/, skills/, and agents/
    When the bootstrap detects the project shape
    Then it recommends hoisting the spec to <repo>/.agents/specs/<plugin>/

  Scenario: a monorepo is detected and a repo-wide backfill is offered
    Given an existing repo with multiple package anchors
    When the bootstrap detects the project shape
    Then it offers to backfill every package plus the outer project

  Scenario: a plain repo-level project is recommended the colocated location
    Given an existing single project that is not a shippable plugin
    When the bootstrap detects the project shape
    Then it recommends colocating the spec at <project>/.agents/spec/

  Scenario: a project that already has a consolidated spec is not backfilled
    Given an existing project that already has a consolidated spec
    When the bootstrap is consulted
    Then it does not backfill and leaves the existing spec untouched

  # ---- Location choice ----

  Scenario: the recommended location is surfaced first and is overridable
    Given the bootstrap has a recommended spec location
    When it presents the location choice
    Then the recommended option is shown first and the user can choose another

  Scenario: the location is never silently assumed
    Given a project whose shape allows more than one valid location
    When the bootstrap proceeds
    Then it surfaces the location choice rather than assuming one

  # ---- Strategy choice ----

  Scenario: a project with a discernible capability decomposition is recommended capability-first
    Given a project whose capabilities can be derived
    When the bootstrap recommends a strategy
    Then it recommends the capability-first strategy

  Scenario: a feature-first code base navigated by code is offered mirror-source
    Given a project whose src/ is feature-organized and navigated by code
    When the bootstrap recommends a strategy
    Then it offers the mirror-source strategy

  Scenario: one recommendation and its alternative are presented for the user to choose
    Given the bootstrap has selected a recommended strategy
    When it presents the strategy choice
    Then it shows one recommended strategy with its rationale and the alternative

  Scenario: layering is never offered as the top-level body
    Given a strongly layered project
    When the bootstrap presents strategy options
    Then layered organization is not offered as a top-level strategy

  Scenario: ADR is not offered as a strategy
    Given any project
    When the bootstrap presents strategy options
    Then ADR is not among the strategies offered

  Scenario: a project with no discernible decomposition and no feature-first layout takes the default
    Given a project with no discernible capability decomposition and no feature-first source layout
    When the bootstrap recommends a strategy
    Then it recommends the capability-first default

  # ---- Scaffold ----

  Scenario: the shared envelope is scaffolded for every strategy
    Given a chosen strategy and location
    When the bootstrap scaffolds the tree
    Then it creates the root spec.md, design/, workflows/, a tooling home, and a glossary

  Scenario: the chosen strategy's top-level skeleton is written
    Given a chosen strategy
    When the bootstrap scaffolds the tree
    Then it writes the strategy's top-level node folders as stubs

  Scenario: every scaffolded node declares a legal spec-type
    Given the bootstrap scaffolds a node
    When it writes the node README
    Then the README declares a spec-type of behavioral, reference, or descriptive

  Scenario: mirror-source scaffolding stops at the unit boundary
    Given the mirror-source strategy and a source tree with nesting below a testable surface
    When the bootstrap scaffolds the mirrored nodes
    Then it creates no node below a behavioral leaf

  Scenario: the scaffolded skeleton respects the two-level depth cap for any strategy
    Given a chosen strategy and a project with a sub-grouping inside a capability
    When the bootstrap scaffolds the skeleton
    Then no node is created more than two levels deep, a capability folder and its leaf unit
    And the sub-grouping is expressed as a concept tag, not a third folder level

  Scenario: an ADR decisions home is created without organizing the spec by ADR
    Given the bootstrap scaffolds the envelope
    When it creates the decisions home
    Then a design/decisions/ log exists and no node is organized as an ADR body

  # ---- Declared organization ----

  Scenario: the project-path frontmatter is written on the root spec.md
    Given a chosen strategy and location
    When the bootstrap writes the root spec.md
    Then the root frontmatter carries project-path naming the governed source dir
    And the frontmatter carries no spec-layout block

  Scenario: a name that is not reliably derivable is confirmed with the user before writing
    Given a hoisted or nested project whose name is not reliably derivable
    When the bootstrap records the organization
    Then it asks the user and confirms the name before writing it to the root frontmatter

  Scenario: a colocated project with a correct repo-root name writes no name frontmatter
    Given a colocated project whose repo-root name is already correct
    When the bootstrap writes the root spec.md
    Then it writes no name frontmatter

  Scenario: the placement map naming the strategy is written into the root body
    Given the bootstrap writes the root spec.md
    When it records the organization
    Then the body contains the placement map naming the chosen strategy

  Scenario: the root spec.md reserves the generated by-concept index block
    Given the bootstrap writes the root spec.md
    When it records the organization
    Then the body reserves the generated by-concept index block beside the placement map
    And the block is left for project-spec/concept-index to generate from concept frontmatter

  Scenario: the produced root passes the static state check
    Given a tree the bootstrap has scaffolded
    When check-spec-state runs over it
    Then the root lifecycle tuple is legal

  # ---- Hand-back and boundary ----

  Scenario: the tree is left at draft
    Given the bootstrap has finished scaffolding
    When it completes
    Then the root spec.md status is draft

  Scenario: control frontmatter is not written
    Given the bootstrap writes the root spec.md
    When it records the layout
    Then it writes no approval, no produced-by, and renders no gate verdict

  Scenario: node Use Cases and feature suites are left to per-unit explore
    Given the bootstrap has scaffolded a behavioral node stub
    When it hands back
    Then the node has no authored Use Cases or .feature yet

  Scenario: concept tags are assigned during per-unit explore, not at scaffold
    Given the bootstrap has scaffolded a node stub declaring its spec-type
    When it hands back
    Then the stub carries no concept tag and the concept is left for per-unit explore to assign

  Scenario: placement is proposed for the Warden to confirm
    Given the bootstrap has placed the scaffolded nodes
    When it hands back
    Then it proposes the placement for the formation Warden to confirm or relocate

  Scenario: a monorepo run produces one draft tree per chosen project
    Given a monorepo and the user selects several packages
    When the bootstrap runs
    Then it produces one draft spec tree per selected project