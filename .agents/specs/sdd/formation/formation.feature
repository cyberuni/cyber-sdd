@frozen
Feature: The formation loop — keep the spec corpus structurally organized
  Unit suite for the formation (structure) outer loop run by the Warden. Loop, act, and
  verdict behaviors only — corpus-wide structure, never per-spec gate judgment. Cross-capability
  end-to-end outcomes (a split or reconcile carried through) live in ../acceptance/.

  # ── The intra-spec structural acts ──

  Scenario: a node that trips the granularity heuristic is flagged for a split
    Given a node whose suite trips the granularity heuristic
    When the formation pass runs
    Then it raises an oversized-node split finding for that node

  Scenario: a node within the granularity heuristic is left alone
    Given a node whose suite sits within the granularity heuristic
    When the formation pass runs
    Then it raises no split finding for that node

  Scenario: an untagged node is flagged by the node-shape audit
    Given a spec-typed node that carries no concept tag
    When the formation pass runs
    Then it raises an untagged-node finding naming that node

  Scenario: a concept-tagged node raises no untagged finding
    Given a spec-typed node that carries a concept tag
    When the formation pass runs
    Then it raises no untagged-node finding for that node

  Scenario: contradicting nodes produce a reconcile finding that names them
    Given two nodes in the spec that contradict each other
    When the formation pass runs
    Then it produces a reconcile finding naming the contradicting nodes

  Scenario: nodes that agree produce no reconcile finding
    Given two nodes that agree with each other
    When the formation pass runs
    Then it produces no reconcile finding for them

  Scenario: contradicting governances produce a reconcile finding that names them
    Given two governances that contradict each other
    When the formation pass runs
    Then it produces a reconcile finding naming the contradicting governances

  # ── Corpus-wide, not the gate ──

  Scenario: a formation pass produces a finding set covering every spec
    Given a corpus of several specs
    When a formation pass runs
    Then its finding set covers every spec in the corpus

  Scenario: a run scoped to one spec is not a formation run
    Given a structural pass scoped to a single spec
    When it completes
    Then it produces no corpus-wide finding set

  Scenario: formation declines to act as the per-spec gate structural check
    Given a spec at its gate awaiting a structural verdict
    When formation is asked to run as that gate check
    Then it declines
    And it renders no per-spec gate verdict

  # ── The Warden's self-clear-vs-escalate verdict ──

  Scenario: a coverage-preserving split self-clears with a provisional marker
    Given a split that preserves every scenario verbatim
    When the Warden renders its verdict
    Then it self-clears the act in-session
    And it leaves a provisional agent-attributed marker

  Scenario: a low-blast consistency-fix reconcile self-clears
    Given a reconcile that is a low-blast, high-confidence consistency fix
    When the Warden renders its verdict
    Then it self-clears the act in-session
    And it leaves a provisional agent-attributed marker

  Scenario: a Council reject unwinds the provisional marker
    Given a self-cleared act carrying a provisional marker
    When the Council rejects the act
    Then the provisional marker is unwound

  Scenario: a narrowing reconcile escalates as a Clearance
    Given a reconcile that would drop scenarios
    When the Warden renders its verdict
    Then it escalates the act as a Clearance
    And the finding re-enters as a new CR

  Scenario: a contested reconciliation escalates as a Conflict
    Given a reconciliation whose winning claim is contested
    When the Warden renders its verdict
    Then it escalates the act as a Conflict

  Scenario: a class-exceeding structural change escalates as Compatibility
    Given a structural act whose semver class exceeds the ceiling
    When the Warden renders its verdict
    Then it escalates the act as Compatibility

  Scenario: a destructive act escalates regardless of contract impact
    Given a structural act that deprecates a node
    When the Warden renders its verdict
    Then it escalates the act regardless of its contract-impact class

  # ── The frozen-contract guard ──

  Scenario: a verbatim-preserving split self-clears even on a frozen feature
    Given a split target whose .feature is frozen
    And the split preserves every scenario verbatim
    When the Warden acts
    Then it self-clears without a freeze re-open

  Scenario: a scenario-altering split requires a ratified freeze re-open
    Given a split target whose .feature is frozen
    And the split alters or drops scenario truth
    When the Warden acts
    Then it requires a Council-ratified freeze re-open before sharding the contract

  # ── Input and write boundary ──

  Scenario: the Warden reads corpus structure, not the combat log
    Given a formation pass gathering its input
    When it reads
    Then it reads the corpus structure and discovery
    And it does not read the combat log or live subagent context

  Scenario: the Warden never writes a spec's status
    Given the Warden running its stations in-session
    When it completes an act
    Then it has not written any spec's status

  # ── Altitude routing ──

  Scenario: a build-or-deprecate request routes to campaign
    Given the Warden encounters a build-or-deprecate request
    When it routes the request
    Then it routes it to the campaign loop
    And it makes no build-or-deprecate decision itself

  Scenario: a process lesson routes to doctrine
    Given the Warden encounters a process lesson
    When it routes the request
    Then it routes it to the doctrine loop
    And it emits no process edit itself

  Scenario: a field correction routes to forge
    Given the Warden encounters a field correction
    When it routes the request
    Then it routes it to the forge loop
    And it makes no field correction itself
