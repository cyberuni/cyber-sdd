@frozen
Feature: SDD acceptance — CR lifecycle (intake → authoring → mission → handoff)
  Cross-capability e2e outcomes for a change request carried end-to-end. Outcome-level only;
  single-capability behavior lives as a unit scenario in its own folder.

  # ── End-to-end — intake to delivered outcome ──

  Scenario: a prompt-raised CR runs end-to-end to a delivered outcome
    Given a human raises a change request as a prompt
    When SDD intakes it, grills it to a spec and suite diff, passes the spec gate, implements against the frozen feature, and passes the impl gate
    Then the verified result is landed in the project-declared delivery shape

  # ── Intake — a CR enters, and its project spec is located ──

  Scenario: a GitHub or Asana CR routes through the same single intake
    Given a change request raised from a GitHub issue or an Asana task
    When SDD intakes it
    Then it enters through the same single intake as a prompt-raised CR
    And it reaches a delivered outcome through the same loop

  Scenario: intake locates the target's project spec by discovery
    Given a change request naming a target project
    When SDD intakes it
    Then it locates the project spec by discovering specs at the spec locations
    And it resolves the target to the one spec, disambiguating an ambiguous match with the user

  Scenario: a CR whose target project has no spec routes to backfill
    Given a change request whose target project has no spec at any spec location
    When SDD intakes it
    Then it routes to backfill-project-spec to lay out the project spec before the mission proceeds

  Scenario: an outer-loop finding re-enters only as a new CR
    Given an outer loop produces a finding
    When the finding is carried back into the system
    Then it re-enters only as a new change request
    And nothing changes the system through any side channel

  # ── Escape hatch — durability, a second escape trigger ──

  Scenario: a behavioral change confined to a non-durable surface escapes intake entirely
    Given a change with real suite-relevant behavior whose artifact's durability signal resolves non-durable
    When SDD intakes it
    Then it never becomes a change request
    And it reaches no gate and leaves no combat-log record

  Scenario: an explicit durability declaration in the request overrides its artifact's location default
    Given a request that explicitly declares durability opposite to its artifact's location default
    When SDD intakes it
    Then the explicit declaration, not the location default, decides whether it escapes

  Scenario: durability with no resolvable signal defaults to a change request
    Given a change whose artifact-type has neither an explicit durability declaration nor a project-declared convention
    When SDD intakes it
    Then it is treated as durable and proceeds as a change request

  Scenario: a project-declared durability override beats an artifact-type's fixed-location default
    Given an artifact whose location default and project-declared durability.toml disagree
    When SDD intakes it
    Then the project's declaration decides, not the location default

  Scenario: a mixed request carves its durable artifacts into a CR and escapes the non-durable ones
    Given a single request touching multiple artifacts whose durability signals resolve differently — some durable, some non-durable
    When SDD intakes it
    Then only the durable artifacts are carved into the change request
    And the non-durable artifacts proceed outside the lifecycle, reaching no gate and leaving no combat-log record

  # ── Explore, gates, and lifecycle independence ──

  Scenario: a confidently-diffable CR self-clears the grill without a human
    Given a CR the agent can confidently turn into a spec and suite diff
    When the explore phase runs
    Then the grill step self-clears without a human stop

  Scenario: a CR's status is independent of the target spec's lifecycle status
    Given a CR moving through open, accepted, and done
    When the target spec advances through its own lifecycle status
    Then the CR status and the spec lifecycle status stay independent

  Scenario: a CR that fails a gate does not reach a delivered outcome
    Given a CR whose spec is rejected at the spec gate
    When the mission cannot pass the gate
    Then the CR does not reach a delivered outcome
    And no implementation is landed