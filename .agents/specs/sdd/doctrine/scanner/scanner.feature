@frozen
Feature: The Scanner detect-and-draft loop — draft unratified strategy at lifecycle granularity
  Unit suite for the Scanner (sdd-scanner), the detect-and-draft half of the Doctrine loop. The
  Scanner reads persisted artifacts post-hoc, drafts unratified strategy to the durable ledger,
  and surfaces it episodically; it never ratifies, never writes status, and never blocks a mission.
  Cross-capability e2e scenarios (a ratified strategy re-tuning doctrine end-to-end) live in
  ../../workflows/.

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

  # ---- Validate before drafting: a plan or log is a hypothesis, not present truth ----

  Scenario: a plan-surfaced gap already resolved in current code is cut, not drafted
    Given a plan surfaces a candidate improvement whose gap current code already resolves
    When the Scanner validates the candidate before drafting
    Then it records the candidate as resolved
    And it drafts no strategy to build or fix it

  Scenario: a plan-surfaced gap still open in current code is drafted
    Given a plan surfaces a candidate improvement whose gap current code does not resolve
    When the Scanner validates the candidate before drafting
    Then it drafts strategy for the still-open improvement

  Scenario: validation reads current code, not the plan's assertion
    Given a plan asserts a gap as present
    When the Scanner validates the candidate
    Then it checks the current codebase for the gap
    And it does not treat the plan's assertion as present truth

  Scenario: a log-surfaced defect since fixed or superseded is cut as resolved
    Given a combat log surfaces a candidate defect that current code has since fixed or superseded
    When the Scanner validates the candidate before drafting
    Then it records the candidate as resolved
    And it drafts no strategy to fix it

  Scenario: a log-surfaced defect still present in current code is drafted
    Given a combat log surfaces a candidate defect that current code still exhibits
    When the Scanner validates the candidate before drafting
    Then it drafts strategy for the still-open defect

  Scenario: a distilled retro lesson is drafted without a current-code gap check
    Given a candidate that distills a retro lesson rather than asserting an unmet gap
    When the Scanner drafts strategy from it
    Then it drafts the lesson without validating a gap against current code

  # ---- The cut disposition: a resolved candidate is recorded durably, not silently dropped ----

  Scenario: a cut candidate is recorded as a resolved-disposition strategy line
    Given a candidate the Scanner validated as already resolved
    When it records the cut
    Then it appends a strategy entry marked disposition resolved
    And the entry carries the current-code evidence that resolved the candidate

  Scenario: a resolved-disposition entry does not count toward pending strategy
    Given a strategy entry the Scanner marked disposition resolved
    When the Scanner records it
    Then the entry does not count toward pending strategy

  Scenario: a drafted still-open strategy is disposition open and counts as pending
    Given the Scanner drafts strategy for a validated still-open improvement
    When it records the entry
    Then the entry is disposition open
    And it counts toward pending strategy

  # ---- Improvement output: a validated-open finding becomes a tracked issue ----

  Scenario: a validated-open improvement is emitted as a tracked issue
    Given an improvement the Scanner validated as still open against current code
    When the Scanner records it
    Then it emits a new tracked issue for the improvement
    And the issue cross-links the evidence that drove it

  Scenario: a candidate cut as resolved emits no tracked issue
    Given a candidate the Scanner validated as already resolved
    When the Scanner records it
    Then it emits no tracked issue for it

  Scenario: issue emission dedupes against existing issues before filing
    Given a validated-open improvement that matches an existing open or closed issue
    When the Scanner would emit its issue
    Then it files no duplicate issue

  Scenario: emitting an issue neither ratifies the strategy nor dispatches work
    Given the Scanner emits an issue for a validated-open improvement
    When it records the strategy
    Then the strategy entry stays unratified
    And the Scanner neither ratifies it nor dispatches a mission for it

  Scenario: an emitted issue meets the outward-publish floor
    Given the Scanner emits an issue for a validated-open improvement
    When it composes the issue body
    Then the body is self-contained
    And it carries no production-internal artifact reference
    And it carries an agent-filed marker

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

  Scenario: a Ship or Kill distillation records the mission it distills
    Given the Scanner drafts strategy from a mission that shipped or was killed
    When it is recorded
    Then the entry records the distilled mission's cr-ref as what it distills
    And that field is distinct from any cross-referenced cr-refs in its evidence

  Scenario: a distillation's subject is the one mission it was drafted from, not its cross-refs
    Given a distillation whose evidence cross-references other missions' cr-refs
    When it is recorded
    Then only the mission it was drafted from is recorded as what it distills
    And the cross-referenced cr-refs stay in evidence and are never recorded as distilled

  Scenario: a strategy with no single subject mission records no distilled cr-ref
    Given the Scanner drafts milestone, drift, or token-waste strategy with no single subject mission
    When it is recorded
    Then the entry records no distilled cr-ref
    And only a Ship or Kill distillation gates a plan's retirement

  Scenario: strategy lands append-only in the Scanner's own ledger shard
    Given a strategy entry
    When the Scanner records it
    Then it appends to the Scanner's own shard file in the project ledger directory
    And the entry carries the next seq within that shard
    And it never edits a prior entry

  Scenario: two concurrent Scanner runs never contend for one ledger file
    Given two Scanner runs record strategy at the same time
    When each appends its entry
    Then each writes to a distinct hash-suffixed shard file
    And neither edits a file the other writes, so the appends never conflict

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