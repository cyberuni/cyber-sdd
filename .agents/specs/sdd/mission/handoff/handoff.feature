@frozen
Feature: The handoff phase — land the verified result in the declared delivery shape
  Unit suite for the handoff phase (step 4). Handoff consumes the verified result and lands it;
  it does not re-verify, touch the contract, or introduce a new hard floor. Cross-capability
  e2e scenarios that run a CR end-to-end through handoff live in ../../acceptance/.

  # ---- Land in the project-declared delivery shape ----

  Scenario: handoff lands the result in the project's declared shape
    Given a project that declares a single delivery shape
    When handoff lands the verified result
    Then it produces the outcome of that declared shape

  Scenario: a PR-flow project lands a branch and a pull request
    Given a project whose declared shape is the PR flow
    When handoff lands the verified result
    Then it pushes a branch and opens a pull request

  Scenario: a commit-to-main project lands commits on main
    Given a project whose declared shape is commit-to-main
    When handoff lands the verified result
    Then it commits the work to main

  Scenario: handoff does not re-verify or touch the contract
    Given a verified result from the deliver phase
    When handoff runs
    Then it does not re-run the verification
    And it does not modify spec.md or the feature

  # ---- Finalize placement (the scoped Warden pass) ----

  Scenario: handoff relocates a provisionally-placed node to its blessed home
    Given a node explore placed in a provisional home
    And the placement-map routing table names a different blessed home
    When handoff finalizes placement
    Then it relocates the node to the blessed home by renaming its files
    And the relocation lands in the same change as the work

  Scenario: relocating a node is a pure rename that preserves freeze
    Given a frozen .feature among the mission's touched nodes
    When handoff relocates its node
    Then the move changes the path with no change to the file content
    And the .feature stays frozen

  Scenario: placement finalization is scoped to the mission's touched nodes
    Given a project-spec with nodes unrelated to this mission
    When handoff finalizes placement
    Then it relocates only the mission's touched nodes
    And it does not reorganize the unrelated nodes

  Scenario: a correctly-placed node is not relocated
    Given a node explore already placed in its blessed home
    When handoff finalizes placement
    Then the node is not relocated

  Scenario: a relocation is logged and keyed by node name
    Given handoff relocates a node
    When it records the relocation
    Then the relocation is logged as a detail-adjustment
    And the node is referenced by its stable name

  # ---- Decompose by unit of work ----

  Scenario: a multi-unit cycle lands as multiple units
    Given a cycle whose work spans several units of work
    When handoff lands it
    Then it lands one outcome per unit of work
    And it does not land the work as one undifferentiated blob

  Scenario: two unrelated concerns are not landed together
    Given a cycle containing two unrelated concerns
    When handoff lands the work
    Then the two concerns land as separate units

  # ---- Conditional status write-back ----

  Scenario: a merged PR closes the source without a separate close
    Given handoff delivered the work as a pull request
    When the pull request merges
    Then the source is closed by the merge
    And handoff adds no separate close

  Scenario: an unmerged pull request leaves the source open
    Given handoff delivered the work as a pull request that has not yet merged
    When handoff completes
    Then the source stays open
    And handoff writes no status transition for it

  Scenario: direct-to-main work transitions the source to done on push
    Given handoff delivered the work directly to main
    When the work is pushed
    Then the source is transitioned to done

  Scenario: a distilled public summary is written back to the source
    Given a completed cycle
    When handoff writes the conclusion back
    Then it appends an outward public summary of what shipped to the source
    And the summary is not the internal combat log

  Scenario: a reported follow-up becomes a new CR
    Given handoff records a follow-up task in the conclusion
    When the follow-up is filed
    Then it re-enters SDD as a new change request

  # ---- No new floor, and the plan ----

  Scenario: handoff introduces no new mandatory escalation
    Given an in-scope narrowing or breaking change-class already cleared earlier in the loop
    When handoff lands the result
    Then it raises no new mandatory human escalation

  Scenario: the plan is kept in the delivery but not landed as a delivery artifact
    Given the mission plan committed with the work
    When handoff lands the verified result
    Then the plan stays in the delivery as scratch
    And handoff does not land the plan as a declared-shape delivery artifact

  Scenario: handoff does not retire the plan early
    Given a completed handoff
    When the outcome is delivered
    Then handoff leaves the plan in place for the doctrine loop to delete later