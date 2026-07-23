@frozen
Feature: The handoff phase — land the verified result in the declared delivery shape
  Unit suite for the handoff phase (step 4). Handoff consumes the verified result and lands it;
  it does not re-verify, touch the contract, or introduce a new hard floor. Cross-capability
  e2e scenarios that run a CR end-to-end through handoff live in ../../workflows/.

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

  # ---- Nudge the post-mission formation loop ----

  Scenario: handoff nudges a formation pass after landing, without spawning
    Given a mission has landed in the declared delivery shape
    When handoff completes
    Then it surfaces a reminder that a corpus-wide formation pass is due, pointing to manage
    And it spawns no Warden

  # ---- Reset the mission's warm units ----

  Scenario: handoff resets the mission's warm units
    Given a mission that dispatched warm units
    When the mission hands off
    Then each warm unit is reset to a fresh context or torn down
    And no warm unit carries this mission's context into the next

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

  Scenario: a PR-flow handoff writes the source's auto-close reference into the PR
    Given a CR whose source supports closing by reference
    When handoff opens the pull request
    Then the pull request body includes a closing reference naming the source

  Scenario: a CR with no close-by-reference source gets no closing reference
    Given a CR whose source does not support closing by reference
    When handoff opens the pull request
    Then the pull request body includes no closing reference

  Scenario: a merged PR closes the source without a separate close
    Given handoff delivered the work as a pull request whose source supports closing by reference
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

  # ---- Follow-ups: record, unconditionally ----

  Scenario: every identified follow-up is recorded durably before anything else
    Given a mission that identified follow-up work at handoff
    When handoff processes the follow-ups
    Then each follow-up is appended as a followup line to the CR's own ledger shard
    And the record is written before any filing is attempted

  Scenario: recording a follow-up needs no permission, no forge, and no human
    Given a mission running with no human present and no issue forge
    When handoff records an identified follow-up
    Then the follow-up is still recorded in the ledger shard

  Scenario: the follow-up record outlives the mission
    Given handoff recorded a follow-up
    When the mission plan is retired later
    Then the follow-up record survives in the ledger
    And it was not written only to the combat log

  # ---- Follow-ups: classify as a proposal ----

  Scenario: a follow-up contradicting a completion claim is classified blocking
    Given an identified follow-up that contradicts a completion claim the mission already made
    When handoff classifies it
    Then it is recorded with the blocking classification
    And the record names the completion claim it contradicts

  Scenario: a follow-up on genuinely new territory is classified backlog
    Given an identified follow-up that contradicts no completion claim
    When handoff classifies it
    Then it is recorded with the backlog classification

  Scenario: a finding that the frozen contract was wrong is not a follow-up
    Given a finding that the mission's own frozen contract was wrong
    When handoff processes the mission's findings
    Then the finding is routed to an Oracle-lens revert inside this mission
    And it is not recorded as a follow-up

  # ---- Follow-ups: propose, never admit ----

  Scenario: a classified follow-up is emitted as a proposal carrying its evidence
    Given handoff classified a follow-up as blocking
    When handoff completes
    Then the proposal it emits carries the classification and the evidence for it
    And the proposal is not recorded as admitted to the mission graph

  Scenario: handoff never writes the mission graph
    Given handoff classified follow-ups for this mission
    When handoff completes
    Then it appends no node or edge to the mission graph
    And admission is left to the graph's single writer

  Scenario: handoff dispatches no follow-up work
    Given handoff recorded a blocking follow-up
    When handoff completes
    Then it spawns no mission for the follow-up

  Scenario: a filed follow-up re-enters SDD only through a later mission
    Given handoff filed a follow-up issue
    When handoff completes
    Then handoff opens no change request for the follow-up
    And the follow-up re-enters SDD only when a later mission is started from it

  # ---- Follow-ups: drain the record to the forge ----

  Scenario: the drain files one issue per unmatched follow-up
    Given several recorded follow-ups that no open issue covers
    When handoff drains the record to the forge
    Then it files one issue per follow-up

  Scenario: a mixed follow-up set files only the unmatched follow-ups
    Given several recorded follow-ups where some match existing issues and some do not
    When handoff drains the record to the forge
    Then it files an issue only for the follow-ups with no match
    And it files no duplicate for the matched ones

  Scenario: a blocking follow-up is filed like any other
    Given a recorded follow-up classified blocking that no existing issue covers
    When handoff drains the record to the forge
    Then it files an issue for the follow-up
    And the classification does not exempt it from the drain

  Scenario: a project with no issue forge files nothing and keeps the record
    Given a project whose source has no issue forge
    When handoff drains the record
    Then it files no issue
    And the follow-up records still stand

  Scenario: the record carries no filed-state, so a later drain re-derives it
    Given a recorded follow-up
    When handoff drains the record
    Then the followup line is not edited to mark it filed
    And a later drain re-derives what is outstanding by deduping against the forge's existing issues

  Scenario: a follow-up whose filed issue was later closed is not filed again
    Given a recorded follow-up whose filed issue has since been closed
    When handoff drains the record again
    Then it files no duplicate for that follow-up
    And the follow-up record still stands

  # ---- Follow-ups: the drain can be refused ----

  Scenario: a refused drain leaves the record standing and fails loudly
    Given handoff recorded its follow-ups
    When the filing act is refused
    Then the ledger records still stand
    And handoff reports the refusal
    And it does not report the follow-ups as filed

  Scenario: a refused drain is retryable from the durable record
    Given a drain that was refused
    When the drain runs again with filing permitted
    Then the outstanding follow-ups are filed from the durable record

  # ---- Follow-ups: the outward-publish floor and the agent-filed marker ----

  Scenario: a filed follow-up body meets the outward-publish floor
    Given a follow-up to be filed
    When handoff composes the issue body
    Then the body states the finding in terms a reader outside the mission can act on
    And it carries no ledger shard filename, combat-log reference, or plan-brief path

  Scenario: the outward floor excludes a reference the committed-record floor permits
    Given a production-artifact reference the committed-record floor permits because it is repo-relative
    When handoff composes the issue body
    Then the reference is excluded from the body

  Scenario: a filed follow-up is marked as agent-filed
    Given handoff files a follow-up issue
    When the issue is created
    Then it carries a marker identifying it as agent-filed
    And it names the mission it was discovered from

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