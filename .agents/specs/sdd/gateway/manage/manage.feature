@frozen
Feature: The manage dispatcher — classify a manage-level request and load the engine in-session
  Unit suite for the manage unit (the manage skill). Classification + loading the matching
  engine only — manage holds no production logic, opens no CR, invokes no gate, and writes no
  contract state. Cross-capability e2e scenarios live in ../../acceptance/.

  # ---- Intake ----

  Scenario: a request naming an operation takes the fast path
    Given an invocation that names a manage operation
    When manage classifies it
    Then it loads the matching engine in the current session without a menu

  Scenario: a bare invocation gathers intent as a two-level menu
    Given the user invokes manage with no operation named
    When manage conducts intake
    Then it asks a two-level menu rather than a flat list
    And the top-level question presents the four operation groups

  Scenario: an intake question never exceeds four options
    Given a derived list of more than four candidate operations
    When manage asks the user
    Then it presents at most four options and never truncates silently

  # ---- Group routes ----

  Scenario: a setup request loads backfill-project-spec
    Given a request to set up the project's spec for the first time
    When manage classifies it
    Then it loads backfill-project-spec in the current session

  Scenario: a setup request to curate the spec anchors loads manage-spec-anchors
    Given a request to list or change discovery's extra spec anchors
    When manage classifies it
    Then it loads the manage-spec-anchors engine in the current session

  Scenario: a setup request to configure the statusline loads init
    Given a request to set up or configure the mission statusline
    When manage classifies it
    Then it loads the init skill in the current session

  Scenario: a setup request to wire a project's scenario bridge loads manage-scenario-bridge
    Given a request to scaffold or curate a project's scenario-bridge config
    When manage classifies it
    Then it loads the manage-scenario-bridge engine in the current session

  Scenario: an inspect request loads the matching read-only engine
    Given a request to list the project's specs and their statuses
    When manage classifies it
    Then it loads the discover-specs engine in the current session

  Scenario: an audit request loads the matching engine
    Given a request to audit the project-spec node-shape
    When manage classifies it
    Then it loads the check-spec-structure engine in the current session

  Scenario: a housekeeping request loads the matching engine
    Given a request to retire completed mission plans
    When manage classifies it
    Then it loads the plan-retirement engine in the current session

  # ---- Loading the engine ----

  Scenario: a resolved route loads the engine in-session and runs directly
    Given manage resolves a route in a live user session
    When it carries out the operation
    Then it loads the matched engine in the current session and runs it directly, spawning no agent itself

  Scenario: manage picks no model
    Given manage resolves a route to an engine
    When it loads the engine
    Then it selects no model itself and defers the model choice to the loaded engine

  # ---- Boundaries — non-mission, hand-off, ownership, thin classifier ----

  Scenario: an operation that needs a behavior change hands off to start-mission
    Given an operation surfaces a needed change to the project's specified behavior
    When manage handles the outcome
    Then it hands the change off to start-mission rather than editing the spec or suite

  Scenario: manage opens no change request and invokes no gate
    Given any request manage classifies
    When it routes the request to an engine
    Then it opens no change request and invokes no gate

  Scenario: a routed operation writes no contract state
    Given manage resolves a manage-level operation
    When it loads the engine in-session
    Then it writes no status or approval itself

  Scenario: classification holds no production logic and loads no governance
    Given any request manage classifies
    When it routes the request to the engine
    Then it loads no governance and holds no production logic, only loading the matched engine

  Scenario: a request to change the project is redirected to start-mission
    Given a request to add or revise the project's specified behavior
    When manage classifies it
    Then it redirects the request to start-mission rather than handling it as a manage operation
