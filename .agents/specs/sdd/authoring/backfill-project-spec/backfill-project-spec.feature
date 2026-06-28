Feature: backfill-project-spec — lay out an existing project's spec
  Unit suite for the project-level layout bootstrap. Layout/scaffold behaviors only — it does
  not author a node's ## Use Cases or .feature, render a gate verdict, or freeze (those are
  ../spec-producer/ and ../validate-spec/).

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

  # ---- Scaffold ----

  Scenario: the shared envelope is scaffolded for every strategy
    Given a chosen strategy and location
    When the bootstrap scaffolds the tree
    Then it creates the root spec.md, design/, acceptance/, a tooling home, and a glossary

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

  Scenario: an ADR decisions home is created without organizing the spec by ADR
    Given the bootstrap scaffolds the envelope
    When it creates the decisions home
    Then a design/decisions/ log exists and no node is organized as an ADR body

  # ---- Declared organization ----

  Scenario: the spec-layout frontmatter is written on the root spec.md
    Given a chosen strategy and location
    When the bootstrap writes the root spec.md
    Then the root frontmatter carries a spec-layout block with the strategy and location

  Scenario: the placement map is written into the root body
    Given the bootstrap writes the root spec.md
    When it records the organization
    Then the body contains the placement map

  Scenario: the produced root passes the static state check
    Given a tree the bootstrap has scaffolded
    When check-spec-state runs over it
    Then the root spec-layout block and lifecycle tuple are legal

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

  Scenario: placement is proposed for the Warden to confirm
    Given the bootstrap has placed the scaffolded nodes
    When it hands back
    Then it proposes the placement for the formation Warden to confirm or relocate

  Scenario: a monorepo run produces one draft tree per chosen project
    Given a monorepo and the user selects several packages
    When the bootstrap runs
    Then it produces one draft spec tree per selected project
