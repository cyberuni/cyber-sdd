@frozen
Feature: The gateway — classify a request and load the handling skill in-session
  Unit suite for the gateway unit (the sdd skill). Classification + loading the handling skill only
  — the gateway holds no production logic and writes no contract state. Cross-capability e2e
  scenarios live in ../acceptance/.

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

  Scenario: an intake question never exceeds four options
    Given a derived list of more than four candidates
    When the gateway asks the user
    Then it presents at most four options and never truncates silently

  Scenario: pending strategy is surfaced on re-entry
    Given unratified strategy lines exist in the project's ledger
    When the Council re-enters through the gateway
    Then the gateway surfaces the count of pending strategy as an entry point
    And it neither drafts nor ratifies any strategy

  # ---- Loading the handling skill ----

  Scenario: a resolved route loads the handling skill in-session and works directly
    Given the gateway resolves a route and a live user session hosts the conductor
    When it carries out the downstream work
    Then it loads the matched skill in the current session and works directly, spawning no agent itself

  Scenario: a request to change the project loads start-mission
    Given an invocation that asks to change the project or its spec
    When the gateway classifies it
    Then it loads start-mission in-session to run the mission loop over the project spec

  Scenario: with no user channel the gateway spawns the automaton
    Given no user session is available to host the conductor
    When the gateway carries out the downstream work
    Then it spawns the automaton as the headless driver
    And the automaton self-asserts at the autonomy bar and batches needs-input rather than asking live

  # ---- Classification edges — ambiguity, escape, freeze ----

  Scenario: an ambiguous request routes into the lifecycle
    Given a request that may touch suite-relevant behavior but names no clear capability
    When the gateway classifies it
    Then it routes the request into the mission so the grill decides during explore

  Scenario: a task with no suite-relevant behavior escapes
    Given a request that is not a CR — no suite-relevant behavior
    When the gateway classifies it
    Then the work proceeds outside the lifecycle and the gateway writes no SDD record

  Scenario: a frozen feature is not edited in place
    Given an approved spec whose .feature is frozen
    When the user asks to change a scenario
    Then the gateway routes the change back through authoring rather than editing the frozen feature