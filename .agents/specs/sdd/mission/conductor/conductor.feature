Feature: The conductor — running one mission segment
  Unit suite for the conductor unit (the conductor / spawned automaton). Covers resolution,
  the five-role production chain, explore orchestration, segment mechanics, the impl gate, and
  stop-provenance. The grilling workflow and the spec gate are ../../authoring/'s; the
  impl-producer build and impl-judge run colocate under ../deliver/; cross-capability e2e
  scenarios live in ../../acceptance/.

  # ---- Classification — a file's artifact-type ----

  Scenario: an unambiguous file is classified by convention
    Given a file whose location and kind make its artifact-type obvious
    When the conductor classifies it
    Then it assigns the artifact-type by convention
    And it does not consult the tiebreaker map

  Scenario: an ambiguous file is resolved by the tiebreaker map
    Given a file whose artifact-type convention cannot settle
    And a tiebreaker map binding a matching path glob to an artifact-type
    When the conductor classifies it
    Then it assigns the most-specific matching binding's artifact-type

  Scenario: an unresolved ambiguity is confirmed and recorded, never guessed
    Given a file whose artifact-type neither convention nor the tiebreaker map settles
    When the conductor classifies it
    Then it asks the user to confirm the artifact-type rather than guessing
    And it writes the confirmed binding back to the tiebreaker map

  Scenario: a user-flagged path is recorded and decisive on resume
    Given the user flags a path as a given artifact-type
    When the conductor classifies that path
    Then it records the binding in the tiebreaker map
    And a later classification of that path resolves without asking

  # ---- Resolution — the registry READ ----

  Scenario: resolution reads only the registry lockfile
    Given a segment starting against a project registry
    When the conductor resolves its delegates
    Then it reads the resolved lockfile only
    And it does not scan plugin directories

  Scenario: an absent registry resolves to the SDD defaults
    Given a segment starting against a project with no registry lockfile
    When the conductor resolves its delegates
    Then it resolves zero plugins and every role falls to its SDD default
    And it does not halt or report an error

  Scenario: a malformed registry fails closed
    Given a registry lockfile that is not valid JSON or omits the plugins array
    When the conductor reads it to resolve delegates
    Then the conductor halts with a structural error
    And it resolves no delegate from the unreadable registry

  Scenario: resolution matches artifact-type per file
    Given a CR that touches files of more than one artifact-type
    When the conductor resolves delegates
    Then it resolves a squad for each artifact-type present
    And resolution is keyed on each file's artifact-type rather than one spec type

  Scenario: a spec-producer resolves to an in-session surface
    Given a resolved spec-producer role
    When the conductor prepares to run it
    Then the role runs inline in the conductor's session
    And it is not spawned as a separate agent

  Scenario: an impl-producer resolves to a spawned builder
    Given a resolved impl-producer role
    When the conductor prepares to run it
    Then the conductor spawns a builder to run it

  Scenario: a judge resolves to a spawned cold agent
    Given a resolved judge role
    When the conductor prepares to run it
    Then the conductor spawns a cold agent in a fresh context for it
    And the judge is never run inline regardless of naming

  Scenario: a required role with no delegate fails closed
    Given a required production-chain role that resolves to no delegate
    When the conductor attempts to run the chain
    Then the conductor halts with a structural error
    And it records no inline sentinel for the missing role

  Scenario: a domain claimed by two plugins asks before proceeding
    Given an artifact-type claimed by two plugins
    When the conductor resolves that role
    Then it returns needs-input for a disambiguation choice
    And the recorded choice makes a later resume decisive

  # ---- The production chain — producers write, cold judges grade ----

  Scenario: a producer writes its artifact and a judge only advises
    Given the conductor runs a production-chain act
    When the act is a judge role
    Then the judge writes neither spec.md nor the .feature
    And it returns advice only

  Scenario: the conductor authors the spec-producer inline
    Given an SDD-default spec-producer role
    When the conductor runs it
    Then the conductor loads the producer governance and authors the contract in-session
    And the artifact is recorded as produced by the conductor

  Scenario: every judge runs in a context the author cannot reach
    Given the conductor has authored an artifact
    When that artifact is judged
    Then the judge runs in a separate cold context
    And the hand that wrote the artifact does not sign off on it

  Scenario: the five artifacts co-deliver rather than running as gated phases
    Given a production chain for a unit
    When the conductor runs the chain
    Then the producers' artifacts are produced together
    And only the .feature and the implementation are gated

  Scenario: the solution stays out of the spec-judge's view
    Given a unit that has a solution record
    When the spec-judge runs at the spec gate
    Then the solution is not part of what the spec-judge reads
    And no separate gate judges the solution

  Scenario: a gate-review segment that runs no producer writes nothing
    Given a segment that only reviews a gate and runs no producer
    When the segment completes
    Then the conductor writes no frontmatter, marker, provenance map, or ledger line
    And it emits only the gate report

  Scenario: the conductor never writes a strategy ledger line
    Given the conductor records provenance as a side effect of dispatch
    When it appends to the sibling log ledger
    Then it appends only report and correction lines
    And it writes no strategy line

  Scenario: the conductor never writes status
    Given the conductor runs the production chain
    When it writes the artifacts it owns
    Then it does not write the status frontmatter field

  # ---- Explore — build to learn (step 2) ----

  Scenario: explore spikes the impl-producer against the non-frozen suite
    Given the conductor runs explore in-session
    When it spikes the impl-producer to learn
    Then the spike runs against the non-frozen suite
    And the spike's learnings steer the live spec-and-suite grill

  Scenario: a spike is thrown away after it has informed the grill
    Given a spike run during explore
    When the spike has yielded its learning
    Then the spike output is discarded
    And the contract is steered by what the spike revealed

  Scenario: a discovery is judged before it can enter the contract
    Given a spike reveals a behavior the .feature omits
    When the conductor routes the discovery back
    Then it re-runs the spec-producer for the new behavior
    And the change is judged before it enters the contract

  Scenario: the impl-judge does not run during explore
    Given the conductor is in the explore phase
    When it iterates the contract
    Then the ship-quality impl-judge does not run
    And the phase ends at the spec gate

  # ---- Segment — one autonomous sitting ----

  Scenario: position is derived from artifacts, not a stored cursor
    Given a later segment resuming a cycle
    When the conductor reconstructs its position
    Then it derives position by reading the artifacts and the plan
    And it relies on no stored cursor

  Scenario: questions are batched at a checkpoint
    Given the conductor reaches a user-input checkpoint
    When it needs answers to proceed
    Then it batches the questions rather than asking one at a time

  Scenario: a content gap is recorded as a durable open marker
    Given the conductor finds a content gap while authoring
    When it records the gap
    Then it writes a durable open marker rather than a transient question
    And the open marker blocks the draft-to-approved transition

  Scenario: the iteration cap blocks and asks rather than auto-accepting
    Given the explore iteration cap is reached
    When the conductor cannot yet converge
    Then it blocks and asks rather than auto-accepting the contract

  Scenario: observations are surfaced without being acted on
    Given the conductor produces a non-blocking observation
    When the segment continues
    Then the observation is routed to the plan
    And it is not folded into the contract

  # ---- The impl gate — Approved to Implemented ----

  Scenario: approve at the impl gate advances to implemented
    Given an implementation that passes the impl gate
    When the conductor approves it
    Then the status advances to implemented

  Scenario: change at the impl gate fixes code without touching the feature
    Given the impl gate returns a change action
    When the conductor acts on it
    Then it fixes the code against the frozen feature
    And the frozen feature is not modified

  Scenario: a Director-lens revert unfreezes the feature back to draft
    Given building proves a frozen scenario fatal
    When the conductor takes a Director-lens revert at the impl gate
    Then the frozen feature is unfrozen
    And the spec returns to draft

  Scenario: status advances to implemented only when every impl-judge passes
    Given the impl gate has run its judges
    When any impl-judge reports a failure
    Then status does not advance to implemented

  Scenario: a frozen scenario with no verification blocks the impl gate
    Given a frozen scenario that has no verification
    When the cold impl-judge runs
    Then it reports that scenario failing
    And status does not advance to implemented

  Scenario: the impl layer is not checked at the spec gate
    Given the conductor is at the spec gate
    When it judges that gate
    Then it does not check the impl layer

  # ---- In-flight service and the hard floor ----

  Scenario: a detail-adjustment is served in-session, not escalated
    Given the conductor makes a minor in-flight fix while running a segment
    When it records the adjustment
    Then it appends a combat-log entry surfaced as a detail-adjustment view
    And it does not escalate the adjustment to the human

  Scenario: a narrowing fires the Clearance floor
    Given a diff that weakens or deletes a frozen or e2e scenario
    When the conductor reaches a gate
    Then it fires the Clearance floor and escalates for human clearance to narrow

  Scenario: a pre-authorized narrowing does not halt mid-flight
    Given a narrowing whose Clearance was pre-authorized in the CR
    When the conductor reaches the gate
    Then the Clearance floor self-clears
    And the mission does not halt for the narrowing

  Scenario: a semver class over the ceiling fires the Compatibility floor
    Given a change whose semver class exceeds the authorized change-class ceiling
    When the conductor reaches a gate
    Then it fires the Compatibility floor and escalates to authorize the class

  Scenario: a change at or under the ceiling self-clears
    Given a change whose semver class is at or under the authorized ceiling
    When the conductor reaches the gate
    Then the Compatibility floor does not fire
    And the change self-clears

  Scenario: a genuine contradiction fires Conflict resolution
    Given two suite scenarios that contradict each other with no intended winner
    When the conductor reaches the impl gate
    Then it fires the Conflict-resolution floor and halts for the human to pick the intended scenario

  Scenario: a stale-mistake contradiction is served, not escalated
    Given a suite contradiction that is an obvious stale mistake
    When the conductor encounters it
    Then it serves the fix in-session as a minor correction
    And it does not fire the Conflict-resolution floor

  Scenario: Consent is not a mission floor
    Given the conductor runs a mission segment
    When it checks the hard floor
    Then it does not fire a Consent floor
    And egress consent is left to the forge loop

  # ---- Stop-provenance — why I halted, not just why I went ----

  Scenario: a run emits a durable strategy block at the start
    Given a run starting before any exploration
    When the conductor evaluates the initial strategy
    Then it writes a run-level strategy block carrying the leash and the approach
    And the strategy block does not record the ceiling

  Scenario: the leash is re-checked at each gate against discovered state
    Given a run-level leash set at the start
    When the conductor reaches a gate
    Then it re-checks the leash against the discovered state
    And the effective reach is the lesser of the ceiling and the derived reach

  Scenario: a self-asserted approval within leash records by agent and a why
    Given a gate the conductor self-asserts within leash
    When it writes the verdict
    Then the entry carries verdict approve, by agent, and a why

  Scenario: a pause omits by and still carries a durable why
    Given the conductor halts at a gate
    When it writes the pause verdict
    Then the entry carries no by field
    And it carries a durable why for the halt

  Scenario: a paused gate later passed overwrites in place
    Given a gate previously recorded as paused
    When the gate later passes
    Then the verdict entry is overwritten in place

  Scenario: a headless automaton emits a verdict packet even when approval is relayed
    Given a spawned headless automaton with no user channel
    When a coordinator relays that the user approved
    Then the automaton emits a verdict packet and stops
    And it does not write a human ratification verdict

  Scenario: the in-session conductor writes the human ratification directly
    Given the conductor running in the main session with the user channel
    When the human ratifies a gate
    Then the conductor writes the human verdict directly

  Scenario: a mid-flight halt is recorded as a halt entry, not just a gate pause
    Given the conductor stops mid-phase, not at a gate
    When it halts
    Then it appends a halt entry to the plan's combat log
    And the halt entry carries the phase and a categorical why block
    And the why block carries no raw blocker content

  # ---- Combat-log telemetry — safe-to-publish, captured live ----

  Scenario: every combat-log line carries a write-time UTC timestamp
    Given the conductor appends a report, correction, or halt line
    When the line is written
    Then it carries a write-time UTC ts

  Scenario: a combat-log line carries the configured handle
    Given SDD_HANDLE is set
    When the conductor appends a combat-log line
    Then the line carries that handle

  Scenario: an unset handle is omitted rather than read from git config
    Given SDD_HANDLE is unset
    When the conductor appends a combat-log line
    Then the line omits the handle
    And no handle is read from git config

  Scenario: the committed combat log carries no email or raw identifiers
    Given the conductor writes any combat-log line
    When the line is committed
    Then it carries no email, absolute path, hostname, or session id
    And it carries no raw token or cost number

  Scenario: mid-flight telemetry is flushed during the mission, not at the end
    Given a mission still in flight
    When the conductor records a report, correction, or halt
    Then the line is flushed to the committed combat log during the mission
