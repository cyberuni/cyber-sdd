Feature: The formation loop — keep the spec corpus structurally organized
  Unit suite for the formation (structure) outer loop run by the Warden. Loop, act, and
  verdict behaviors only — corpus-wide structure, never per-spec gate judgment. Cross-capability
  end-to-end outcomes (a split or dedupe carried through) live in ../acceptance/.

  # ── The three corpus-wide acts ──

  Scenario: a monolith that trips the granularity heuristic is split
    Given a spec that trips the spec-granularity heuristic
    When the formation pass runs
    Then it raises a split finding for that spec

  Scenario: a spec within the granularity heuristic is left alone
    Given a spec that sits within the granularity heuristic
    When the formation pass runs
    Then it raises no split finding for that spec

  Scenario: overlapping specs produce a dedupe finding that names them
    Given two specs that cover overlapping behavior
    When the formation pass runs
    Then it produces a dedupe finding naming the overlapping specs

  Scenario: specs that do not overlap produce no dedupe finding
    Given two specs whose behavior does not overlap
    When the formation pass runs
    Then it produces no dedupe finding for them

  Scenario: contradicting artifacts produce a reconcile finding that names them
    Given two governances that contradict each other
    When the formation pass runs
    Then it produces a reconcile finding naming the contradicting artifacts

  Scenario: artifacts that agree produce no reconcile finding
    Given two governances that agree with each other
    When the formation pass runs
    Then it produces no reconcile finding for them

  Scenario: contradicting specs produce a reconcile finding that names them
    Given two specs that contradict each other
    When the formation pass runs
    Then it produces a reconcile finding naming the contradicting specs

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

  Scenario: a narrowing dedupe escalates as a Clearance
    Given a dedupe that would drop scenarios
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

  Scenario: a destructive dedupe escalates regardless of contract impact
    Given a dedupe that deprecates a spec
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
