Feature: The gateway — classify and route a request, hand work to the conductor
  Unit suite for the gateway unit (the sdd skill). Classification + routing + handoff only — the
  gateway holds no production logic and writes no contract state. Cross-capability e2e scenarios
  live in ../acceptance/.

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

  # ---- Handoff to the conductor ----

  Scenario: a resolved route hands off to the in-session conductor by default
    Given the gateway resolves a route and a live session hosts the conductor
    When it carries out the downstream work
    Then it runs the conductor in-session and spawns no agent itself

  Scenario: the headless fallback spawns the operator and relays escalations
    Given no live session hosts the conductor
    When the gateway carries out the downstream work
    Then it spawns the operator as a subagent
    And when the operator returns needs-input with batched questions it asks the Council and resumes the operator with the answers

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
