@frozen
Feature: The SSA-lowering doctrine — cut a change request into one owning mission per spec-node
  Behavior suite for the SSA-lowering doctrine (a skill the coordinator runs during intake/Explore) — the
  reasoning front-end that lowers one-or-more change requests into a partitioned set of Missions. It applies
  two judgment lenses (Oracle: should we do this? / Architect: where does each piece belong, is it a
  barrier?) and cuts the write-set toward SSA — one owning Mission per spec-node — resolving same-node
  contention by versioning it into an ordered RAW dependency, and lowering only the frontier deeply.
  The judgment CANNOT be unit-tested (it is a call, not a pure function), so the graded behaviors
  are rubric-tagged scenarios; the structural invariants a valid cut must never break (single-writer,
  a killed CR lowers to nothing, a barrier is never a normal node, coupled work in one node stays in
  one mission, the decision-evidence record accompanies the partition) are plain boolean guards over
  the produced partition. Each graded
  scenario carries two-or-more independently-loseable dimensions and a threshold one point below
  their combined max, so losing a whole dimension fails the scenario.
  It DECIDES the cut; it does not build the missions (the mission loop does), record the plan (the
  mission-graph store does), classify a collision (collision-ladder does), or emit its decision-evidence
  automatically (SQ-F5 #194, deferred). Working node name only — the final name is SQ-name #195.

  # ── Activation is NOT frozen here ──
  # Activation is owned by (description prose x harness x sibling set) and this node controls one of
  # the three, so it is a co-owned seam and out of scope for a per-node frozen suite
  # (`sdd:suite-format-governance`, "the node's own decisions"). The @trigger Scenario Outline that
  # sat here froze a property the node cannot honour alone. Trigger accuracy is measured by its own
  # instrument — a labeled query corpus run N times for a trigger rate — not by a frozen example
  # table. Issue #304.

  # ── Oracle gate: judge legitimacy before lowering ──

  @behavior @rubric
  Scenario: a stale change request is killed or reshaped before any lowering
    Given a change request filed months ago asking to add a bulk re-invite flow that chases users who never confirmed their email address
    And a shipped change has since made accounts fully usable without confirmation, which is now asked for only at the point a user first adds a billing method
    And a user who declines to confirm at that point is never followed up
    When the coordinator applies the SSA-lowering doctrine to the change request
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: catches-staleness
          max: 3          # derives that the shipped change dissolved the problem the re-invite flow existed to solve; no step of the situation states that the CR's goal is covered
        - name: kill-or-reshape
          max: 3          # acts correctly on the verdict, and emits no mission that builds the superseded bulk re-invite flow. 3 = reshapes the CR down to the one remnant the situation leaves genuinely uncovered (the billing-method decliners who are never followed up); 1 = kills the CR whole, discarding that live remnant; 0 = partitions the dead bulk-chase as filed
      threshold: 5
      """
    And the rubric score is at least the threshold

  @behavior @rubric
  Scenario: a misaligned change request is reshaped or killed before any lowering
    Given a change request asking to add an autofix mode that rewrites the user's source files in place to clear findings
    And the tool ships as a read-only CI check that runs with no write credentials, and its README promises it will never open a pull request or touch a branch
    When the coordinator applies the SSA-lowering doctrine to the change request
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: catches-misalignment
          max: 3          # infers the product's non-mutating direction from how the tool ships (read-only, no write credentials, the no-PR promise) and finds the CR contradicts it, on direction-fit rather than supersession; no step declares the direction as a slogan, and nothing in the situation supersedes the CR
        - name: reshape-or-kill
          max: 3          # acts on the verdict: reshapes the CR toward the product direction or kills it, rather than partitioning it as filed
      threshold: 5
      """
    And the rubric score is at least the threshold

  # Deliberately titled for the SITUATION, not the graded verdict — unlike its Oracle siblings, whose
  # titles ("a stale change request is…", "a misaligned change request is…") name the branch they grade.
  # aced-case-judge receives the scenario's NAME and simulates the agent from it, so a title stating the
  # per-part branch mapping would hand the simulator the answer this scenario exists to withhold. The
  # sibling titles carry the same leak against a single branch; retitling them is a frozen-scenario edit
  # (a re-open), out of scope here. The simulator is also handed this rubric itself — see #252.
  @behavior @rubric
  Scenario: the Oracle gate judges a change request that carries two separate asks
    Given a change request filed last year against a music-engraving library, asking for a single place to set staff spacing and page margins for a score and for the instrument parts extracted from it
    And the same change request also asks for a playback cursor that highlights each note as the score is played back
    And a house-style document has shipped since the change request was filed, carrying staff spacing, page margins, and beam angles, and passed to the engrave call for a whole score
    And the instrument parts are produced by a separate extract path that assembles its own score document and takes no house-style argument
    And the library ships as one synchronous call that takes a score and returns an SVG string, holds no state between calls, reads no clock, and publishes the contract that the same score returns the same bytes on every machine and every run
    When the coordinator applies the SSA-lowering doctrine to the change request
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: spacing-part-on-supersession
          max: 3          # derives that the shipped house-style document already delivers the score-wide spacing and margins this part of the request was filed to get, so this part fails on supersession and not on direction-fit; no step of the situation states that any goal is covered. 3 = reshapes this part down to the one remnant the situation leaves genuinely uncovered — the extract path that assembles its own score document and takes no house-style argument; 1 = drops the spacing request whole as covered, discarding that live remnant; 0 = cuts a mission to build the score-wide spacing option the house-style document already delivers, or rejects this part on direction-fit
        - name: cursor-part-on-direction-fit
          max: 3          # infers the library's stateless, deterministic direction from how it ships (one synchronous call, no state between calls, no clock, the same score returning the same bytes on every run) and finds the playback cursor contradicts it on direction-fit — nothing in the situation supersedes the cursor, and no step declares the direction as a slogan. 3 = kills this part or reshapes it toward the direction, emitting no mission that builds the cursor as filed; 1 = records the direction concern but lowers it as filed anyway; 0 = treats the cursor as live work merely left uncovered by the house-style document and partitions it as filed, or calls it stale
      threshold: 5
      """
    And the rubric score is at least the threshold

  Scenario: a killed change request lowers to zero missions
    Given a change request whose goal a shipped change has fully superseded
    When the coordinator applies the SSA-lowering doctrine and kills the change request
    Then the produced partition contains no missions

  @behavior @rubric
  Scenario: a far-horizon change request is re-validated when it reaches the frontier
    Given a change request judged legitimate at filing and parked on the far horizon
    And the ground has shifted while it was parked so its goal may no longer improve the product
    When the change request reaches the frontier and the coordinator applies the SSA-lowering doctrine
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: re-checked-not-trusted
          max: 3          # re-runs the Oracle legitimacy check on frontier arrival rather than trusting the filing-time verdict
        - name: verdict-reflects-current-state
          max: 3          # the re-confirm or newly-kill decision reflects the shifted ground, not the stale filing verdict
      threshold: 5
      """
    And the rubric score is at least the threshold

  @behavior @rubric
  Scenario: a change request that fits the product direction clears the Oracle gate and is lowered
    Given a change request asking that the read-only CI check also report, per finding, which config file enabled the rule that produced it
    And the tool ships as a read-only CI check that runs with no write credentials, and its README promises it will never open a pull request or touch a branch
    And no shipped change supersedes the ask, and the request was filed against the current release
    When the coordinator applies the SSA-lowering doctrine to the change request
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: clears-the-gate
          max: 3          # finds the CR consistent with how the tool ships (reporting more about findings is still read-only) and neither reshapes nor kills it; a coordinator that reshapes or kills anyway scores 0
        - name: lowers-the-work
          max: 3          # carries the cleared CR into the partition — the produced plan contains at least one mission owning the reporting work, rather than an empty partition
      threshold: 5
      """
    And the rubric score is at least the threshold

  # ── Architect's say: placement and barriers ──

  @behavior @rubric
  Scenario: a project-wide refactor is recognized as a barrier and hoisted early
    Given a change request that renames a core type used across every capability of the project
    And several unrelated feature change requests are also waiting to be lowered
    When the coordinator applies the SSA-lowering doctrine across all the change requests
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: barrier-detected
          max: 3          # recognizes the rename cross-cuts the whole project and owns no single node, so it is not modeled as one node-owning mission among peers
        - name: hoisted-early
          max: 3          # schedules the barrier before the feature missions that would rebase onto it
      threshold: 5
      """
    And the rubric score is at least the threshold

  Scenario: a barrier mission is not scheduled as a normal node-owning mission
    Given a change request that is a project-wide refactor cross-cutting most capabilities
    When the coordinator applies the SSA-lowering doctrine and lowers it
    Then the produced partition marks the refactor as a barrier
    And no other lowered mission is scheduled to start before the barrier retires
    And the produced partition's decision-evidence records that the fleet rebases onto the new world after the fence, then fans out

  @behavior @rubric
  Scenario: the cut places each new capability in its own node
    Given a change request that introduces both a scheduled CSV export and outbound webhook delivery, two distinct new capabilities that both sit on the product's outbound edge
    When the coordinator applies the SSA-lowering doctrine to the change request
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: distinct-nodes
          max: 3          # the scheduled export and the webhook delivery land in separate spec-nodes, neither fused into one mission nor pooled into a single node named for the outbound edge they share
        - name: screaming-placement
          max: 3          # each node's placement reflects the capability it owns, not a layer — the shared outbound edge is not a placement
      threshold: 5
      """
    And the rubric score is at least the threshold

  # ── The SSA cut: one owning mission per spec-node ──

  Scenario: every spec-node in the write-set is owned by exactly one mission
    Given a change request whose write-set touches four distinct spec-nodes
    When the coordinator applies the SSA-lowering doctrine and lowers it
    Then each spec-node in the write-set is owned by exactly one mission in the produced partition
    And no spec-node is assigned to two missions at the same time

  # A boolean guard, not a rubric: this situation confines the work to ONE spec-node, and single-writer
  # already guarantees one node lands in exactly one mission — so the assertion is entailed and cannot
  # register a miss. Graded, it scored 3/3 even with the doctrine's cohesion rule deleted whole.
  # Cohesion's miss is OVER-SPLIT — scattering one node into fragments. An over-merge temptation would
  # not de-entail it — single-writer still forces the coupled node into one mission however many other
  # nodes exist.
  # CORRECTION (#241 ablation): this comment used to add "and over-merge is already graded by
  # disjoint-nodes-not-fused". That is measured FALSE — ablating step 2's anti-fuse rule and screaming
  # placement whole left that dimension at 3/3, Delta = 0. It is unloseable; it grades over-merge only
  # in its wording. The over-merge temptation #250 asks for belongs on the regroup scenario, not here.
  # Cohesion stays boolean on independent grounds: it is NON-SUBSTITUTABLE (no strength elsewhere pays
  # for scattering a coupled node), so per suite-format-governance's selection rule it is a boolean
  # Then at any max and any threshold. De-entailing it would not make a rubric legal. See README.
  Scenario: coupled work in one spec-node stays in a single cohesive mission
    Given a change request whose changes to one spec-node are tightly coupled and cannot be verified apart
    When the coordinator applies the SSA-lowering doctrine to the change request
    Then the coupled work is owned by a single mission in the produced partition
    And that spec-node is not scattered into thin fragments across several missions

  @behavior @rubric
  Scenario: two change requests regroup by ownership into missions that cross CR boundaries
    Given a change request that touches the authentication spec-node and the billing spec-node
    And a second change request that touches the authentication spec-node and the search spec-node
    When the coordinator applies the SSA-lowering doctrine across both change requests together
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: regroup-by-ownership
          max: 3          # the shared authentication node is owned by one mission drawing on both CRs rather than split per CR — missions cut by ownership (N CRs to M missions), not one-per-CR
        - name: disjoint-nodes-not-fused
          max: 3          # billing and search — each touched by only one CR — stay their own missions; regrouping the shared authentication node does not pull them in, which would trade the under-merge error for an over-merge that serializes independent writes
      threshold: 5
      """
    And the rubric score is at least the threshold

  Scenario: a mission drawn from two change requests records both as provenance and mints its ref locally
    Given two change requests that both write the shared billing spec-node
    When the coordinator applies the SSA-lowering doctrine and cuts one owning mission for that node
    Then that mission records both originating change requests as provenance
    And that mission carries a locally-minted mission-ref rather than a tracker ticket ref

  # ── Contention: resolve write-after-write by versioning into an ordered dependency ──

  @behavior @rubric
  Scenario: a same-node contention is resolved by imposing an order into a versioned-RAW edge
    Given two concerns that both need to write the same reporting spec-node
    And one concern can sensibly go first with the other rebasing onto its result
    When the coordinator applies the SSA-lowering doctrine to the two concerns
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: order-imposed
          max: 3          # picks a do-first concern and a rebase/rework-second concern
        - name: versioned-raw-edge
          max: 3          # encodes that order as a RAW dependency between them, rather than as two concurrent writers or as an irreducible hard collision
      threshold: 5
      """
    And the rubric score is at least the threshold

  Scenario: an order-imposable contention does not emit two concurrent writers of one node
    Given two concerns writing the same spec-node where one can go first and the other rebase onto it
    When the coordinator applies the SSA-lowering doctrine and resolves the contention
    Then the produced partition does not contain two missions writing that spec-node concurrently
    And it contains a RAW edge ordering the second mission after the first

  @behavior @rubric
  Scenario: an order-less concurrent co-write is left as an irreducible hard collision
    Given two concerns that must both write the same spec-node with no order that avoids rework either way
    When the coordinator applies the SSA-lowering doctrine to the two concerns
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: irreducible-recognized
          max: 3          # recognizes no clean order exists so a versioned-RAW would not resolve it, and serializes the two writes rather than starting them concurrently
        - name: rework-flagged
          max: 2          # flags that the second write needs real rework because the first moved the ground, not a clean replay
      threshold: 4
      """
    And the rubric score is at least the threshold

  # ── Monadic lowering and conservative-first defaults ──

  @behavior @rubric
  Scenario: only the frontier is deeply lowered while far work is left coarse
    Given a change request with a knowable near-term frontier and a fuzzy far horizon of speculative work
    When the coordinator applies the SSA-lowering doctrine to the change request
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: frontier-lowered-deeply
          max: 3          # the frontier is cut into concrete, verifiable missions
        - name: far-work-left-coarse
          max: 3          # far work is left as coarse Operations, neither prematurely partitioned nor scheduled
      threshold: 5
      """
    And the rubric score is at least the threshold

  @behavior @rubric
  Scenario: a low-confidence touch-set is treated as a hard collision
    Given two missions whose predicted touch-sets overlap on a node but the overlap is only partially known
    When the coordinator applies the SSA-lowering doctrine and there is no finer evidence of disjointness
    Then the judge evaluates the produced plan against the rubric
      """
      dimensions:
        - name: conservative-default
          max: 3          # treats the unproven overlap as a hard collision and serializes, rather than optimistically parallelizing the two missions on a guess
        - name: relax-on-evidence
          max: 2          # gets the relaxation condition right — parallel becomes available only once finer evidence proves the writes disjoint, not on elapsed time, mission size, or a re-guess
      threshold: 4
      """
    And the rubric score is at least the threshold

  # ── Guard against over-serializing a clean split ──

  Scenario: independent spec-nodes are lowered without a fabricated dependency between them
    Given a change request whose write-set is a set of genuinely independent spec-nodes with no shared writes
    When the coordinator applies the SSA-lowering doctrine and lowers it
    Then the produced partition contains no RAW or collision edge between the independent missions
    And those missions are allowed to run in parallel

  # ── Decision-evidence: the shown-work that accompanies the partition ──

  Scenario: the produced partition is accompanied by a decision-evidence record
    Given one change request the coordinator kills and a second the coordinator lowers across three spec-nodes, one of them a barrier
    When the coordinator applies the SSA-lowering doctrine across both change requests
    Then a decision-evidence record accompanies the produced partition
    And that record states an Oracle verdict of ship, reshape, or kill for each change request, with the cause of that verdict
    And that record states an Architect verdict for each spec-node in the partition, naming its placement and the barrier's fence reasoning
    And that record names the sources the cut drew on
