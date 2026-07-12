@frozen
Feature: manage — classify an ACED manage-level request and load the engine in-session
  Unit suite for the ACED manage dispatcher (the manage skill). Classification + loading the matching
  engine only — manage holds no production logic, opens no CR, invokes no gate, and writes no contract
  state. Authoring a config is define-agent/define-skill; scoring is run. Cross-capability e2e
  scenarios live in ../acceptance/.

  # ---- Intake ----

  Scenario: a request naming an operation takes the fast path
    Given an invocation that names a manage operation
    When manage classifies it
    Then it loads the matching engine in the current session without a menu

  Scenario: a bare invocation gathers intent via a menu
    Given the user invokes manage with no operation named
    When manage conducts intake
    Then it asks the user to pick the operation rather than guessing

  Scenario: an intake question never exceeds four options
    Given a derived list of more than four candidate operations
    When manage asks the user
    Then it presents at most four options and never truncates silently

  # ---- Route ----

  Scenario: a model-runners request loads the manage-model-runners engine
    Given a request to set up, list, or remove per-model runner agents
    When manage classifies it
    Then it loads the manage-model-runners engine in the current session

  Scenario: a skill-inventory request loads the list-skills engine
    Given a request to list or inventory the installed skills
    When manage classifies it
    Then it loads the list-skills engine in the current session

  Scenario: a private-skill repair request loads the repair-private-skills engine
    Given a request to validate or repair repo-private skill metadata under .agents/skills
    When manage classifies it
    Then it loads the repair-private-skills engine in the current session

  Scenario: a skill-dirs curation request loads the manage-skill-dirs engine
    Given a request to list, add, or preview the extra skill-scan locations the validate engine uses
    When manage classifies it
    Then it loads the manage-skill-dirs engine in the current session

  # ---- Loading the engine ----

  Scenario: a resolved route loads the engine in-session and runs directly
    Given manage resolves a route in a live user session
    When it carries out the operation
    Then it loads the matched engine in the current session and runs it directly, spawning no agent itself

  Scenario: manage picks no model
    Given manage resolves a route to an engine
    When it loads the engine
    Then it selects no model itself and defers the model choice to the loaded engine

  # ---- Boundaries — non-mission, ownership, thin classifier, redirect ----

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

  Scenario: an authoring request is not a manage operation
    Given a request to create an agent definition or a workflow skill
    When manage classifies it
    Then it redirects the request to define-agent or define-skill rather than handling it as a manage operation

  Scenario: a request to score a config is not a manage operation
    Given a request to run or score a config's eval suite
    When manage classifies it
    Then it defers to the eval-run skills rather than handling it as a manage operation

  Scenario: a request to change what ACED specifies is redirected to start-mission
    Given a request to add or revise ACED's specified behavior
    When manage classifies it
    Then it redirects the request to start-mission rather than handling it as a manage operation
