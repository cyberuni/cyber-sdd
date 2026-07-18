@frozen
Feature: The gateway — classify a request and load the handling skill in-session
  Unit suite for the gateway unit (the sdd skill). Classification + loading the handling skill only
  — the gateway holds no production logic and writes no contract state. Cross-capability e2e
  scenarios live in ../workflows/.

  # ---- Activation and intake ----

  Scenario: explicit invocation activates the gateway
    Given the user invokes $sdd
    When the gateway handles the invocation
    Then SDD is activated for the current work

  Scenario: a bare invocation gathers intent before routing
    Given the user invokes $sdd with no work item, artifact, or action
    When the gateway conducts intake
    Then it does not begin work until the route is known

  Scenario: a fully specified request takes the fast path
    Given an invocation that names both the work and the action
    When the gateway classifies it
    Then it routes directly to the handling capability without a menu

  Scenario: a concrete change request takes the fast path to start-mission
    Given the user invokes "$sdd add a start-mission skill to sdd"
    When the gateway classifies it
    Then it loads start-mission in the current session without a menu

  Scenario: a source-URL request takes the fast path to start-mission
    Given the user invokes "$sdd work on a github issue url"
    When the gateway classifies it
    Then it loads start-mission in the current session without a menu

  Scenario: a partially-specified request asks only for the missing piece
    Given an invocation that names a change but not its target
    When the gateway conducts intake
    Then it resolves what it can and asks only for the missing piece within the four-option rule

  Scenario: an intake question never exceeds four options
    Given a derived list of more than four candidates
    When the gateway asks the user
    Then it presents at most four options and never truncates silently

  Scenario: bare intake is a two-level menu whose top level presents exactly four options
    Given the user invokes $sdd with no work item, artifact, or action
    When the gateway conducts intake
    Then it asks a two-level menu rather than a flat list
    And the top-level question presents exactly four options

  Scenario: pending strategy is surfaced on re-entry
    Given unratified strategy lines exist in the project's ledger
    When the Council re-enters through the gateway
    Then the gateway surfaces the count of pending strategy as an entry point
    And it neither drafts nor ratifies any strategy

  Scenario: no pending strategy surfaces nothing
    Given no unratified strategy lines exist in the project's ledger
    When the Council re-enters through the gateway
    Then the gateway surfaces no pending-strategy entry point

  Scenario: in-progress missions are surfaced on re-entry
    Given resumable mission plan briefs exist under the plans location
    When the user re-enters through the gateway
    Then the gateway surfaces the in-progress missions via the discover-plans engine as a resume entry point
    And it neither resumes nor retires any mission itself

  Scenario: no in-progress missions surfaces nothing
    Given no plan briefs exist under the plans location
    When the user re-enters through the gateway
    Then the gateway surfaces no resume entry point

  Scenario: the gateway scans statuses with the discover-specs engine
    Given the user asks the gateway to help choose the most-actionable spec
    When the gateway scans the project statuses
    Then it reads the specs' frontmatter via the discover-specs engine
    And it does not read any spec body

  Scenario: no spec found for a target offers manage-spec-anchors
    Given a request targets a project and the discover-specs engine finds no spec for it
    When the gateway classifies it
    Then it offers manage-spec-anchors alongside backfill-project-spec as entry points
    And it does not assume the project was never scaffolded

  # ---- Loading the handling skill ----

  Scenario: a resolved route loads the handling skill in-session and works directly
    Given the gateway resolves a route and a live user session hosts the conductor
    When it carries out the downstream work
    Then it loads the matched skill in the current session and works directly, spawning no agent itself

  Scenario: a request to change the project loads start-mission
    Given an invocation that asks to change the project or its spec
    When the gateway classifies it
    Then it loads start-mission in-session to run the mission loop over the project spec

  Scenario: a corpus-management request loads the manage skill
    Given an invocation that asks to manage the corpus rather than change the project
    When the gateway classifies it
    Then it loads manage in the current session to run the manage-level operation

  Scenario: the manage-the-corpus menu option loads the manage skill
    Given the user selects "Manage the corpus" from the bare two-level menu
    When the gateway routes the selection
    Then it loads manage in the current session

  Scenario: with no user channel the gateway spawns the automaton
    Given no user session is available to host the conductor
    When the gateway carries out the downstream work
    Then it spawns the automaton as the headless driver
    And the automaton self-asserts at the autonomy bar and batches needs-input rather than asking live

  Scenario: a request to run the approved missions enters the dispatch loop
    Given the user asks the gateway to run the approved missions
    When the gateway classifies it
    Then it enters the dispatch loop to run the approved-plan queue headless

  Scenario: a routed change writes no contract state
    Given the gateway resolves a request to change the project
    When it loads start-mission in-session
    Then it writes no status or approval itself

  Scenario: classification holds no production logic and loads no governance
    Given any request the gateway classifies
    When it routes the request to the handling skill
    Then it loads no governance and holds no production logic, only loading the matched skill

  # ---- Classification edges — ambiguity, escape, freeze ----

  Scenario: an ambiguous request routes into the lifecycle
    Given a request that may touch suite-relevant behavior but names no clear capability
    When the gateway classifies it
    Then it routes the request into the mission so the grill decides during explore

  Scenario: a task with no suite-relevant behavior escapes
    Given a request that is not a CR — no suite-relevant behavior
    When the gateway classifies it
    Then the work proceeds outside the lifecycle and the gateway writes no SDD record

  Scenario: a task confined to an ignored surface escapes even with real behavior
    Given a request whose touched artifact's tracking signal resolves ignored
    When the gateway classifies it
    Then the work proceeds outside the lifecycle the same as a task with no suite-relevant behavior
    And the gateway writes no SDD record

  Scenario: a mixed-tracking request carves the tracked part into a CR and escapes the rest
    Given a request touching several artifacts where some resolve tracked and some ignored
    When the gateway classifies it
    Then it carves the tracked artifacts into the mission and escapes the ignored ones
    And the gateway writes no SDD record for the escaped artifacts

  Scenario: a frozen feature is not edited in place
    Given an approved spec whose .feature is frozen
    When the user asks to change a scenario
    Then the gateway routes the change back through authoring rather than editing the frozen feature

  Scenario: a read-only question about the project escapes
    Given a request to explain how an existing capability works, with no suite-relevant behavior change
    When the gateway classifies it
    Then the work proceeds outside the lifecycle and the gateway writes no SDD record

  Scenario: reading a frozen scenario escapes while changing it re-opens
    Given a request to read or explain a frozen scenario without changing it
    When the gateway classifies it
    Then the work proceeds outside the lifecycle rather than loading start-mission