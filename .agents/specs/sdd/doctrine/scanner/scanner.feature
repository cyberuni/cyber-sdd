@frozen
Feature: The Scanner detect-and-draft loop — draft unratified strategy at lifecycle granularity
  Unit suite for the Scanner (sdd-scanner), the detect-and-draft half of the Doctrine loop. The
  Scanner reads persisted artifacts post-hoc, drafts unratified strategy to the durable ledger,
  and surfaces it episodically; it never ratifies, never writes status, and never blocks a mission.
  Cross-capability e2e scenarios (a ratified strategy re-tuning doctrine end-to-end) live in
  ../../acceptance/.

  # ---- The six lifecycle triggers ----

  Scenario: a shipped mission drafts strategy from its combat log
    Given a mission whose status transitioned to implemented
    When the Scanner fires
    Then it drafts strategy from the concluded mission's combat log

  Scenario: a killed mission drafts strategy from why it failed
    Given a mission whose status transitioned to deprecated
    When the Scanner fires
    Then it drafts strategy from why the mission failed

  Scenario: a milestone retro drafts strategy across the milestone
    Given a human-held milestone retro
    When the Scanner fires
    Then it drafts strategy across the milestone's concluded combat logs

  Scenario: a recurring cause is codified from its distilled count
    Given a cause exhibited by a rising count of distinct CRs
    When the Scanner fires
    Then it drafts a strategy to codify the recurring pattern
    And it reads the distilled recurrence count, not many missions' raw logs

  Scenario: a cause seen once does not codify a pattern
    Given a cause exhibited below the rising recurrence count
    When the Scanner fires
    Then it drafts no strategy to codify a pattern

  Scenario: a now-false convention drafts a PRUNE strategy
    Given a convention in the corpus that is now false
    When the Scanner fires
    Then it drafts a PRUNE strategy to remove the stale convention

  Scenario: a convention that still holds drafts no PRUNE
    Given a convention in the corpus that still holds
    When the Scanner fires
    Then it drafts no PRUNE strategy

  Scenario: notable token-waste drafts efficiency strategy
    Given a flagged-waste correction in the committed log
    When the Scanner fires
    Then it drafts efficiency strategy from the categorical efficiency class

  Scenario: an ordinary correction that is not flagged-waste drafts no efficiency strategy
    Given a correction in the committed log that is not flagged as token-waste
    When the Scanner fires
    Then it drafts no efficiency strategy

  # ---- Not a per-gate loop ----

  Scenario: a single gate passing is not a trigger
    Given a gate passed without a terminal lifecycle transition
    When the Scanner observes it
    Then it drafts no strategy

  Scenario: a non-terminal status move is not a trigger
    Given a status transition that is not terminal, such as draft to approved
    When the Scanner observes it
    Then it drafts no strategy

  Scenario: token-waste under the bound without a request does not run the heavy analysis
    Given token-waste below the configured bound and no explicit request
    When the Scanner observes it
    Then it does not run the numeric token-waste analysis

  # ---- Write boundaries ----

  Scenario: the Scanner is the sole writer of strategy
    Given a drafted strategy recommendation
    When it is appended to the ledger
    Then the Scanner is the writer
    And the conductor and producers never write strategy

  Scenario: the conductor's run-start leash block is kind leash, not strategy
    Given the conductor's run-start block carrying the leash and the approach
    When it is appended to the ledger
    Then it is kind leash, not kind strategy
    And it does not collide with the Scanner's strategy nor count toward pending strategy

  Scenario: the Scanner observes a terminal transition but never writes status
    Given a terminal lifecycle transition written by the impl gate or the deprecation path
    When the Scanner reacts to it
    Then it never writes the spec's status itself

  Scenario: the Scanner reads only persisted artifacts post-hoc
    Given a mission that has ended
    When the Scanner drafts strategy
    Then it reads persisted files
    And it never reads live subagent context

  # ---- Inputs: the combat log is the contract ----

  Scenario: strategy is draftable from the combat log alone
    Given a concluded mission's combat log
    When the Scanner drafts strategy for any categorical dimension
    Then the combat log alone is sufficient
    And raw transcripts are additive, not required

  Scenario: numeric token-waste depth stays transcript-only and pre-merge
    Given a request for the numeric token-waste breakdown
    When the Scanner runs the heavy efficiency analysis
    Then it reads the numeric depth only from raw transcripts pre-merge
    And it writes no raw token-cost number to the committed log

  # ---- The ledger entry ----

  Scenario: every strategy entry is unratified and carries its evidence
    Given a strategy the Scanner drafts
    When it is recorded
    Then the entry is unratified
    And it carries the driving evidence that drove it

  Scenario: strategy lands append-only in the one project ledger
    Given a strategy entry
    When the Scanner records it
    Then it appends to the project ledger with the next seq
    And it never edits a prior entry

  # ---- Surfacing ----

  Scenario: strategy is surfaced episodically, never blocking a mission
    Given accumulated unratified strategy
    When a mission is in progress
    Then the Scanner does not block the mission
    And the pending strategy is surfaced episodically through the gateway count

  # ---- Out-of-loop routing ----

  Scenario: an out-of-loop request is routed to its owning loop
    Given a request that is not about the process
    When the Scanner receives it
    Then a build-or-deprecate request routes to campaign
    And a structure observation routes to formation
    And a field correction routes to forge