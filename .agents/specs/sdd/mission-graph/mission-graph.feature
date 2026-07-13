Feature: The mission-graph kernel — the git-tracked store and the ready/cycles fold
  Unit suite for the mission-graph engine: the append-only store (nodes, edges, status, tombstones,
  schema v:1), the read-only ready frontier fold (RAW satisfaction + the node-level WAW-mutex), the
  cycles write-guard and fold-time quarantine, and the Operation deliverability check. Derivation
  behaviors only, over per-scenario CONSTRUCTED graphs — never the live store, which mutates on every
  retirement. The #135/#136/#137 worked example is distilled into one fixture. Cross-capability
  end-to-end scenarios live in ../acceptance/.

  # ── The store — schema, nodes, edges ──

  Scenario: a node carries the v1 schema version
    Given a mission node appended to the store
    When the store is read
    Then the node carries schema version 1

  Scenario: a node records its kind, status, and declared touch-set
    Given a Mission node with status open and a declared node-level touch-set
    When the store is read
    Then the node carries its kind, its status, and its declared touch-set

  Scenario: an edge records its kind
    Given a RAW edge, a parent-child edge, and a discovered-from edge appended to the store
    When the store is read
    Then each edge carries its kind

  Scenario: WAW and WAR relationships are not stored as edges
    Given two missions with intersecting declared touch-sets
    When the store is read
    Then no WAW or WAR edge is present, because the mutex is computed from touch-sets at fold time

  Scenario: the fold tolerates a node carrying a later additive schema field
    Given a store holding a v1 node and a node carrying an unknown later-version field
    When the graph is folded
    Then both nodes fold without migration and the unknown field is ignored

  # ── The write path — append-only, single writer, tombstone ──

  Scenario: a status change appends a new event and the latest status wins
    Given a node whose status changed from open to retired
    When the graph is folded
    Then both the open and the retired events are present in the store and the folded node is retired

  Scenario: a tombstone event retracts an edge from the fold
    Given a RAW edge A to B and a later tombstone event retracting it
    When the graph is folded
    Then the fold skips the retracted edge

  Scenario: a tombstone event retracts a node from the fold
    Given a node and a later tombstone event retracting it
    When the graph is folded
    Then the retracted node is absent from the folded graph

  Scenario: the write path rejects an edge that closes a cycle
    Given a graph with a RAW path A to B to C
    When an edge C to A is offered to the write path
    Then the write-time guard rejects it as cycle-closing

  Scenario: the write-time cycle guard is overridable for a discovered mutual dependency
    Given a cycle-closing edge and an explicit override to record a discovered mutual dependency
    When the edge is offered to the write path with the override
    Then the edge is appended

  # ── ready — the RAW frontier ──

  Scenario: a mission with no RAW predecessor is in the frontier
    Given a graph with a mission that has no RAW predecessor
    When ready is folded
    Then that mission is in the frontier

  Scenario: a mission whose RAW predecessor is retired is in the frontier
    Given a RAW edge A to B where A is retired
    When ready is folded
    Then B is in the frontier

  Scenario: a mission whose RAW predecessor is not retired is held back
    Given a RAW edge A to B where A is not retired
    When ready is folded
    Then B is not in the frontier

  Scenario: a mission transitively blocked by an unretired predecessor is held back
    Given a RAW chain A to B to C where A is not retired
    When ready is folded
    Then neither B nor C is in the frontier

  Scenario: a discovered-from edge does not block the fold
    Given a mission B with only a discovered-from edge from A and no RAW predecessor
    When ready is folded
    Then B is in the frontier

  # ── ready — the node-level WAW-mutex ──

  Scenario: a candidate whose touch-set intersects an in-flight mission is held back
    Given an in-flight mission and a candidate whose declared touch-set intersects it
    When ready is folded
    Then the candidate is not in the frontier

  Scenario: a candidate whose touch-set is disjoint from all in-flight missions is not WAW-held
    Given an in-flight mission and a candidate whose declared touch-set is disjoint from it
    When ready is folded
    Then the candidate is in the frontier

  Scenario: two WAW-paired frontier missions never both surface
    Given two RAW-satisfied missions whose declared touch-sets intersect and neither is in-flight
    When ready is folded
    Then at most one of them is in the frontier

  # ── ready — determinism and read-only ──

  Scenario: the fold is deterministic given a snapshot
    Given a fixed partial graph snapshot
    When ready is folded twice
    Then both folds return the same frontier in the same order

  Scenario: a WAW tie is broken by the pinned mission ref, not at random
    Given two WAW-paired frontier missions
    When ready is folded
    Then the surfaced one is chosen by the pinned mission-ref tie-break

  Scenario: each frontier entry carries its scheduling attributes
    Given a ready mission
    When ready is folded
    Then its entry carries id, node, operation, blast, hitl-or-afk, model tier, brief-pointer, and why-ready

  Scenario: ready derives with no side effects
    Given any mission graph
    When ready is folded
    Then the store is not mutated

  # ── cycles — write-guard, quarantine, repair ──

  Scenario: the fold quarantines a cycle instead of failing
    Given a graph containing a RAW cycle A to B to A
    When the graph is folded
    Then the fold returns without error and the cycle members are quarantined

  Scenario: a mission on a cycle is excluded from the frontier
    Given a graph containing a RAW cycle A to B to A
    When ready is folded
    Then neither A nor B is in the frontier

  Scenario: a dependent of a quarantined cycle is transitively blocked
    Given a cycle A to B to A and a mission C with a RAW edge B to C
    When ready is folded
    Then C is not in the frontier

  Scenario: cycles reports each strongly-connected component as a repair item
    Given a graph containing a RAW cycle A to B to A
    When cycles is folded
    Then it reports the strongly-connected component of A and B as a repair item

  Scenario: an acyclic graph surfaces no repair items
    Given an acyclic graph
    When cycles is folded
    Then it reports no repair items

  Scenario: retracting the offending edge repairs a cycle
    Given a cycle A to B to A and a later tombstone retracting the edge B to A
    When cycles is folded
    Then the graph is acyclic and no repair item is reported

  # ── Operations — declared set, capstone closure, progress ──

  Scenario: an Operation whose capstone closure is within the declared set is dependency-closed
    Given an Operation declaring M1 and M3 with capstone M3 whose closure is M1 and M3
    When the Operation is checked
    Then it is reported dependency-closed

  Scenario: an Operation whose capstone closure exceeds the declared set is flagged
    Given an Operation declaring only M3 with capstone M3 whose closure needs M1
    When the Operation is checked
    Then the missing prerequisite M1 is flagged

  Scenario: a declared support member outside the capstone closure is legal
    Given an Operation declaring M1, M3, and M5 with capstone M3 whose closure is M1 and M3
    When the Operation is checked
    Then M5 is legal support and the Operation is dependency-closed

  Scenario: the release floor is the capstone closure, not the full declared set
    Given an Operation declaring M1, M3, and M5 with capstone closure M1 and M3
    When the release floor is computed
    Then it is M1 and M3 and M5 does not gate release

  Scenario: Operation progress is the ratio of completed to total declared missions
    Given an Operation declaring three missions of which one is retired
    When progress is read
    Then it reports one of three complete

  # ── Status authority — the graph, not the brief ──

  Scenario: scheduling state is read from the graph, not the brief
    Given a mission retired in the graph whose plan brief still exists
    When ready is folded
    Then the mission is treated as retired

  # ── The worked example — the #135/#136/#137 fixture ──

  Scenario: the worked-example fixture surfaces one WAW-paired mission at a time
    Given the #135/#136/#137 fixture with #135 retired, a RAW edge #135 to #136, and #137 WAW-paired with #136
    When ready is folded
    Then exactly one of #136 and #137 is in the frontier by the pinned tie-break
    And the withheld mission is in the frontier after the other retires

  Scenario: the worked example groups #135 and #136 into one Operation
    Given the #135/#136/#137 fixture
    When the Operations are read
    Then #135 and #136 form one Operation with capstone #136 and #137 is its own Mission
