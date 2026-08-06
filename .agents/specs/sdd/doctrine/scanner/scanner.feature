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

  # ---- Idempotent Ship/Kill: detecting an already-distilled mission by parsing the ledger ----

  Scenario: a mission already distilled is detected and not re-drafted
    Given a shipped mission and a strategy entry whose distills field equals the mission's cr-ref
    When the Scanner fires on the mission's terminal transition
    Then it detects the mission as already distilled
    And it drafts no duplicate strategy for it

  Scenario: a pretty-printed distilling entry is still detected as distilled
    Given a distilling strategy entry written with a space after the distills key's colon
    When the Scanner checks whether that mission is already distilled
    Then it detects the mission as already distilled despite the whitespace
    And it drafts no duplicate strategy for it

  Scenario: a cr-ref appearing only in another entry's evidence is not treated as distilled
    Given a mission whose cr-ref appears only inside another strategy entry's evidence cross-references
    When the Scanner checks whether that mission is already distilled
    Then it treats the mission as not yet distilled
    And it does not suppress drafting strategy for it

  Scenario: an unratified distilling entry still counts as distilled
    Given a mission whose only distilling strategy entry is unratified
    When the Scanner checks whether that mission is already distilled
    Then it detects the mission as already distilled
    And it drafts no duplicate strategy for it

  Scenario: a malformed ledger line does not abort detection of a valid distilling entry
    Given a ledger shard holding a malformed line and a valid distilling strategy entry for the mission
    When the Scanner checks whether that mission is already distilled
    Then it skips the malformed line
    And it detects the mission as already distilled from the valid entry

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

  # ---- Cold-instrument doctrine — non-author evidence + ablation before a rule-level recommendation ----

  Scenario: a rule-level recommendation grounded only on the proposer's own instrument is withheld
    Given a candidate to adopt a rule, drop a rule, or set a threshold grounded only on a measurement the proposing party produced on its own generator or harness
    When the Scanner validates the candidate before drafting
    Then it does not draft the rule-level recommendation on that measurement alone
    And it records that the measurement needs non-author or fresh-adversarial evidence

  Scenario: a rule-level recommendation grounded on a measurement produced by a non-proposer is drafted
    Given a candidate to adopt a rule, drop a rule, or set a threshold grounded on a measurement produced by a party other than the proposer
    When the Scanner validates the candidate before drafting
    Then it drafts the rule-level recommendation

  Scenario: a rule-level recommendation grounded on a measurement independently reviewed by a non-proposer is drafted
    Given a candidate to adopt a rule, drop a rule, or set a threshold grounded on a measurement independently reviewed by a party other than the proposer
    When the Scanner validates the candidate before drafting
    Then it drafts the rule-level recommendation

  Scenario: a rule-level recommendation grounded on a fresh adversarial ablation is drafted
    Given a candidate to adopt a rule, drop a rule, or set a threshold grounded on a measurement ablated against a freshly and adversarially constructed case
    When the Scanner validates the candidate before drafting
    Then it drafts the rule-level recommendation

  Scenario: a measurement grounding no rule-level decision is not held to the non-author standard
    Given a combat log carrying a measurement that grounds no adopt, drop, or threshold-set decision
    When the Scanner drafts strategy from that log
    Then it does not require non-author or fresh-adversarial evidence for that measurement

  Scenario: a revived dimension shown loseable by ablation is drafted to land
    Given a candidate reviving a dead measurement dimension whose ablation against a control shows the dimension is loseable
    When the Scanner validates the candidate before drafting
    Then it drafts strategy to land the revived rule

  Scenario: a revived dimension whose ablation shows no effect is cut as dead weight
    Given a candidate reviving a dead measurement dimension whose ablation against a control shows no difference from the control
    When the Scanner validates the candidate before drafting
    Then it cuts the candidate as dead weight
    And it drafts no strategy to land the revived rule

  Scenario: a drafted revived-rule strategy states the rule abstractly and lifts no probe apparatus
    Given the Scanner drafts strategy reviving a dead measurement dimension
    When it states the revived rule in the strategy entry
    Then it states the rule abstractly without a worked example
    And it does not lift the apparatus of a probe scenario that grades the dimension into the rule

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

  # ---- Stale plan frontmatter ----

  Scenario: both retirement signals agree terminal, so the plan feeds the retirement clearance set
    Given a plan brief whose todos are all completed and whose declared source is closed
    When the Scanner computes the retirement clearance set
    Then it includes the brief's cr-ref in the clearance set it passes to plan-retirement
    And it writes no status value into the plan brief's frontmatter

  Scenario: neither retirement signal is terminal, so the plan is left alone
    Given a plan brief whose todos are still open and whose declared source is still open
    When the Scanner computes the retirement clearance set
    Then it excludes the brief's cr-ref from the clearance set
    And it drafts no flagged finding

  Scenario: the source is closed but the plan's own todos are still open, surfacing a flagged finding
    Given a plan brief whose declared source is closed but whose own todos are not all completed
    When the Scanner computes the retirement clearance set
    Then it excludes the brief's cr-ref from the clearance set
    And it names the brief's cr-ref and the disagreement in its pass summary to the invoking session
    And it does not autofix the plan brief's frontmatter
    And it writes no ledger entry for the disagreement

  Scenario: the plan's todos are all completed but the source is still open, surfacing a flagged finding
    Given a plan brief whose todos are all completed but whose declared source is still open
    When the Scanner computes the retirement clearance set
    Then it excludes the brief's cr-ref from the clearance set
    And it names the brief's cr-ref and the disagreement in its pass summary to the invoking session

  Scenario: a flagged finding is a different thing from a strategy-driven finding, and is never a kind report line
    Given a disagreement the Scanner surfaces in its pass summary
    When it composes that summary
    Then the disagreement is neither a kind strategy entry nor a kind report ledger line
    And it is distinct from the validated-open improvement that becomes a tracked issue

  Scenario: the retirement clearance set feeds plan-retirement's existing input, not a new mechanism
    Given the Scanner has computed a retirement clearance set
    When it hands the set to the plan-retirement step
    Then it passes the set as plan-retirement's existing retire clearance-set input
    And it introduces no new deletion mechanism

  Scenario: source-closed is queried the same way plan-retirement's own clearance check queries it
    Given a plan brief with a declared source
    When the Scanner checks whether the source is closed
    Then it queries the source natively, the same way plan-retirement's clearance check does

  Scenario: the Scanner never writes a terminal status value into a plan brief's frontmatter
    Given any outcome of the retirement clearance computation
    When the Scanner records what it found
    Then it writes no status field into the plan brief's frontmatter
    And retirement, a tracked deletion, remains the only terminal act on a plan brief

  # ---- Out-of-loop routing ----

  Scenario: an out-of-loop request is routed to its owning loop
    Given a request that is not about the process
    When the Scanner receives it
    Then a build-or-deprecate request routes to campaign
    And a structure observation routes to formation
    And a field correction routes to forge