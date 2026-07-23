@frozen
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

  Scenario: a node records that it is a barrier and the project it fences
    Given a barrier node appended with the project it fences
    When the store is read
    Then the node carries its barrier marking and the project it fences

  Scenario: a node appended without a barrier marking is a normal mission
    Given a mission node appended with no barrier marking
    When the store is read
    Then the node is not a barrier

  Scenario: the write path rejects a barrier marking on a node that is not a mission
    Given an operation node carrying a barrier marking
    When the node is offered to the write path
    Then the write-time guard rejects it, because only a mission is ever scheduled and a barrier that could never surface would fence its project forever

  Scenario: a later event cannot fold a barrier onto a node that is not a mission
    Given a folded mission barrier and a later event re-appending that same id as an operation
    When the later event is offered to the write path
    Then the write-time guard rejects it, because the guard checks the node the events fold to rather than each event alone

  Scenario: the write path rejects marking a node a barrier when it already has a RAW predecessor that is an operation
    Given a mission that already carries a RAW edge into it from an operation, and a later event marking that mission a barrier
    When the later event is offered to the write path
    Then the write-time guard rejects it, because an operation is never scheduled to retire, so the barrier would never be RAW-satisfied and would fence its project forever under a clean cycles report

  Scenario: the write path rejects a RAW edge from an operation into a barrier
    Given a barrier and a later event adding a RAW edge into it from an operation
    When the edge is offered to the write path
    Then the write-time guard rejects it, because the guard checks the node the events fold to, so either append order that would leave a barrier permanently un-RAW-satisfied is refused

  Scenario: the write path rejects a claim that would put two barriers of one project in-flight at once
    Given a claimed barrier fencing a project and a later event claiming a second barrier fencing that same project
    When the later claim is offered to the write path
    Then the write-time guard rejects it, because at most one barrier of a project is ever active and ready never offers a second while one is claimed

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

  # ── ready — the barrier fence ──
  # A barrier is a project-wide mission the fleet must rebase onto before fanning out again;
  # `formation/` declares it and names the project it fences, `ssa-lowering/` detects one at
  # lowering time, and THIS node honors the fence in the `ready` fold. The fence is a fold-time
  # rule, never a stored edge (see `WAW and WAR relationships are not stored as edges` and
  # `ready derives with no side effects`).
  #
  # The fence is EXPLICIT — it does NOT lean on the WAW-mutex or on any touch-set the barrier
  # declares. (A barrier may declare an empty touch-set; `intersects` is false on an empty set, so a
  # mutex-delegated fence would let a project's work run beside such a barrier. The fold holds it
  # outright instead.) Three clauses over a snapshot, applied before the WAW-mutex:
  #   1. EXEMPT — a NON-barrier mission in the strict RAW-predecessor closure of ANY un-retired
  #      barrier of ANY project is lifted from every fence. Graph-global. Barriers are NEVER exempt.
  #   2. AT-MOST-ONE-BARRIER — among the barriers of a fenced project, at most one is offered: a
  #      claimed barrier of the project fills the slot (every open barrier of the project is held);
  #      otherwise the lowest-id RAW-satisfied open barrier is offered and the rest held. The cap
  #      counts open AND claimed barriers, so it is never blind to an in-flight barrier.
  #   3. HOLD — every OTHER mission of a fenced project (non-barrier, non-exempt) is held outright.
  #
  # Clause 1 is graph-global rather than per-project because RAW closure is not project-scoped: a
  # project-scoped exemption lets one project's barrier wait on a mission another project's fence
  # holds, and symmetrically — an acyclic deadlock the `cycles` view cannot see. Barriers are excluded
  # from EXEMPT so a barrier that RAW-precedes another project's barrier cannot escape its own
  # project's at-most-one cap (that escape surfaces two barriers of one project at once).
  # Exemption lifts the FENCE only. RAW satisfaction, cycle quarantine and the WAW-mutex still apply
  # to an exempt mission, so "exempt" never means "surfaces".
  # A barrier is itself never held by clause 3; only its at-most-one cap and its own RAW satisfaction
  # and the WAW-mutex decide it. So a barrier may surface alongside its project's EXEMPT work when
  # their touch-sets are disjoint — a bounded, accepted residual: that work is let through only
  # because another project's barrier is waiting on it and must run.
  # The write path guarantees no un-retired barrier is RAW-behind an operation (an operation never
  # retires, so such a barrier would fence its project forever under a clean `cycles`), and that no
  # two barriers of one project are ever claimed at once.
  # "Un-retired" covers open and claimed alike.

  Scenario: an un-retired barrier holds the other missions of the project it fences
    Given an un-retired barrier and a RAW-satisfied mission in the project it fences that is in no un-retired barrier's RAW-predecessor closure and whose id sorts before the barrier's
    When ready is folded
    Then that mission is not in the frontier

  Scenario: a barrier with an empty declared touch-set still holds its project
    Given an un-retired barrier whose declared touch-set is empty and a RAW-satisfied mission in the project it fences that is in no un-retired barrier's RAW-predecessor closure, with nothing in-flight
    When ready is folded
    Then that mission is not in the frontier, because the fence holds the project outright rather than through the barrier's touch-set, which an empty set could never do

  Scenario: a barrier does not fence a project it does not fence
    Given an un-retired barrier fencing one project and a RAW-satisfied mission in a different project that is in no un-retired barrier's RAW-predecessor closure
    When ready is folded
    Then the mission in the other project is in the frontier

  Scenario: a graph holding no barrier is not fenced at all
    Given a graph of RAW-satisfied missions and no barrier node
    When ready is folded
    Then the frontier is exactly the one the RAW and WAW folds admit on their own

  Scenario: a barrier fences the default project of a store that declares no projects
    Given a store whose nodes declare no project, an un-retired barrier among them, and a RAW-satisfied mission whose id sorts before it
    When ready is folded
    Then that mission is not in the frontier, because work naming no project sits in one default project together

  Scenario: the default project is a project of its own, not a wildcard
    Given an un-retired barrier fencing the default project and a RAW-satisfied mission declaring a named project that is in no un-retired barrier's RAW-predecessor closure
    When ready is folded
    Then the mission declaring the named project is in the frontier

  Scenario: an in-flight barrier still fences its project
    Given a barrier that is claimed rather than retired and a RAW-satisfied mission in the project it fences that is in no un-retired barrier's RAW-predecessor closure
    When ready is folded
    Then that mission is not in the frontier

  Scenario: a retired barrier no longer fences its project
    Given a project whose only barrier is retired and a RAW-satisfied mission in that project
    When ready is folded
    Then that mission is in the frontier

  Scenario: the fence holds a RAW-satisfied mission downstream of the exempt closure
    Given an un-retired barrier, a retired mission in its RAW-predecessor closure, and a mission in the project it fences whose only RAW predecessor is that retired mission and which is in no un-retired barrier's RAW-predecessor closure, with nothing in-flight
    When ready is folded
    Then that mission is not in the frontier, so the fence is proved to hold what it does not exempt rather than only to stay live

  Scenario: a RAW predecessor of an un-retired barrier is exempt from the fence
    Given an un-retired barrier and its RAW-satisfied direct RAW predecessor in the project it fences
    When ready is folded
    Then the predecessor is in the frontier

  Scenario: exemption reaches the whole RAW-predecessor closure but never lifts RAW satisfaction
    Given an un-retired RAW chain from a mission to a second mission to an un-retired barrier in the project it fences
    When ready is folded
    Then the mission at the head of the chain is in the frontier and the second mission is not, because exemption lifts the fence but never RAW satisfaction

  Scenario: a predecessor of one project's barrier is exempt from another project's fence
    Given an un-retired barrier fencing project Q, and a RAW-satisfied mission in Q that is a RAW predecessor of an un-retired barrier fencing project P and is in no RAW-predecessor closure of any barrier fencing Q
    When ready is folded
    Then that mission is in the frontier, because exemption is graph-global rather than scoped to the fences of the project the mission sits in

  Scenario: retiring a barrier withdraws the exemption it granted
    Given a retired barrier, an un-retired barrier fencing a second project, and a RAW-satisfied mission in that second project that lies in the retired barrier's RAW-predecessor closure, in no un-retired barrier's, and whose id sorts before that second barrier's
    When ready is folded
    Then that mission is not in the frontier, because only an un-retired barrier grants exemption

  Scenario: a barrier is not held by the fence of the project it fences
    Given a RAW-satisfied un-retired barrier and another un-retired mission in the project it fences
    When ready is folded
    Then the barrier is in the frontier, because the fence decides the order of a project's other work and never holds the barrier itself

  Scenario: two barriers fencing one project never both surface
    Given two RAW-satisfied open barriers fencing one project, each with an empty declared touch-set, with nothing in-flight
    When ready is folded
    Then at most one of them is in the frontier, because the at-most-one-barrier cap offers only the lowest-id barrier of a project regardless of touch-sets

  Scenario: an open barrier is not offered while another barrier of its project is in-flight
    Given a claimed barrier fencing a project and a second RAW-satisfied open barrier fencing that same project, both with empty declared touch-sets
    When ready is folded
    Then the open barrier is not in the frontier, because the claimed barrier already fills the project's single barrier slot and the cap counts in-flight barriers, not only open ones

  Scenario: a quarantined lower-id barrier does not hold a ready barrier of its project
    Given two open barriers fencing one project where the lower-id barrier sits on a RAW cycle and the higher-id barrier is RAW-satisfied, with nothing in-flight
    When ready is folded
    Then the RAW-satisfied barrier is in the frontier, because the at-most-one cap ranks only RAW-satisfied barriers and a quarantined one never fills the slot

  Scenario: a barrier that RAW-precedes another project's barrier is still capped by its own project
    Given two RAW-satisfied open barriers fencing one project and a barrier fencing a second project, where the higher-id barrier of the first project RAW-precedes the second project's barrier, with nothing in-flight
    When ready is folded
    Then the higher-id barrier of the first project is not in the frontier, because a barrier is never exempt and so is never lifted past its own project's at-most-one cap, even when another project's barrier is waiting on it

  Scenario: a barrier surfaces alongside its project's exempt work when their touch-sets are disjoint
    Given a RAW-satisfied open barrier and a RAW-satisfied non-barrier mission of the project it fences that is exempt by way of a barrier fencing another project, their declared touch-sets disjoint, with nothing in-flight
    When ready is folded
    Then both are in the frontier, because exemption lifts the fence for the sibling, the barrier is never held by clause 3, and disjoint touch-sets leave the WAW-mutex nothing to hold

  Scenario: a barrier waits behind its project's exempt sibling when their touch-sets collide
    Given a RAW-satisfied open barrier whose id sorts after a RAW-satisfied non-barrier mission of the project it fences that is exempt by way of a barrier fencing another project, their declared touch-sets intersecting, with nothing in-flight
    When ready is folded
    Then the exempt sibling is in the frontier and the barrier is not, because the WAW-mutex admits the lower-id sibling and holds the barrier until it retires — a bounded, transient residual, not the fence

  Scenario: a barrier predecessor does not stop its project's barrier surfacing
    Given two un-retired barriers fencing one project, with a RAW edge from the second to the first, the second having no RAW predecessor and nothing in-flight
    When ready is folded
    Then the second barrier is in the frontier and the first is not

  Scenario: a fenced mission does not consume the WAW tie-break slot from an exempt one
    Given an un-retired barrier, a held mission in the project it fences that is in no un-retired barrier's RAW-predecessor closure, and an exempt RAW predecessor of the barrier whose declared touch-set intersects the held mission and whose id sorts after it
    When ready is folded
    Then the exempt predecessor is in the frontier, because the fence is applied before the WAW tie-break rather than after it

  Scenario: exemption lifts the fence but not the WAW-mutex against in-flight work
    Given an in-flight mission and an exempt RAW predecessor of an un-retired barrier whose declared touch-set intersects that in-flight mission
    When ready is folded
    Then the exempt predecessor is not in the frontier

  Scenario: two exempt missions that are WAW-paired never both surface
    Given two RAW-satisfied RAW predecessors of one un-retired barrier whose declared touch-sets intersect and neither in-flight
    When ready is folded
    Then at most one of them is in the frontier

  Scenario: two projects whose barriers each wait on the other's work still offer progress
    Given an acyclic graph holding an un-retired barrier in each of two projects, each barrier having a RAW predecessor that sits in the other project, with nothing in-flight
    When ready is folded
    Then the frontier is not empty, because a fold-time fence leaves the graph acyclic and a wedge would present as an empty frontier with a clean cycles report

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

  # ── The store home — the orphan ref (F3, branch-independent) ──
  # These exercise the store-IO SEAM over a CONSTRUCTED temporary git repository (git init in a
  # temp dir), never the project's live store — the same constructed-fixture discipline the
  # derivation scenarios above follow. F3 moves the store off the branch-coupled in-tree file onto
  # the orphan ref refs/sdd/mission-graph, read/written by git plumbing behind the same seam, so
  # the fold/ready/cycles derivations never change.

  Scenario: an append to the orphan-ref store leaves the working tree clean
    Given a git repository using the orphan-ref store
    When a mission node is appended
    Then the event is readable back from the store and the working tree has no uncommitted change

  Scenario: an event appended on one branch is visible when read from another branch
    Given a mission node appended to the orphan-ref store while one branch is checked out
    When the store is read after a different branch is checked out
    Then the appended event is present, because the orphan ref is branch-independent

  Scenario: an absent orphan ref reads as the empty log
    Given a git repository whose orphan ref has not yet been written
    When the store is read
    Then the log is empty

  Scenario: a write against a stale ref value is rejected
    Given an orphan-ref store whose ref advanced after a writer captured its value
    When that writer appends against the stale ref value
    Then the compare-and-swap update is rejected and the ref is left unchanged

  Scenario: migrate seeds the orphan ref from an existing in-tree store
    Given an in-tree store holding events and no orphan ref
    When the store is migrated
    Then the orphan ref holds the same events in the same order

  Scenario: migrate is idempotent when the orphan ref is already seeded
    Given an orphan ref already seeded from an in-tree store
    When migrate is run a second time
    Then the orphan ref is left unchanged and no events are duplicated

  Scenario: migrate with no in-tree store to seed from creates no ref
    Given a git work-tree with no in-tree store and no orphan ref
    When the store is migrated
    Then no orphan ref is created, because there is nothing to seed

  # ── Backend selection behind the seam ──

  Scenario: a git work-tree with no in-tree store selects the orphan-ref backend
    Given a git work-tree with no in-tree store and no override
    When the store backend is resolved
    Then the orphan-ref backend is selected

  Scenario: an existing orphan ref selects the orphan-ref backend
    Given a git work-tree whose orphan ref already exists and no override
    When the store backend is resolved
    Then the orphan-ref backend is selected

  Scenario: an in-tree store with no orphan ref keeps the in-tree backend before migration
    Given a git work-tree holding an in-tree store, no orphan ref, and no override
    When the store backend is resolved
    Then the in-tree backend is selected, so an unmigrated store is never silently orphaned

  Scenario: an explicit store override selects the named backend
    Given the store override names the in-tree backend
    When the store backend is resolved inside a git work-tree
    Then the in-tree backend is selected
