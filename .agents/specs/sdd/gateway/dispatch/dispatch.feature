@frozen
Feature: The dispatch loop — run the approved-plan queue headless, one at a time
  Unit suite for the gateway/dispatch unit (the sdd skill's fan-out path). Selecting the approved
  queue and running each mission in a fresh automaton, sequentially, relaying what needs a human —
  it spawns and relays, holds no production logic, and writes no contract state. Cross-capability
  e2e scenarios live in ../../workflows/.

  # ---- Select the queue ----

  Scenario: the queue is the approved briefs
    Given plan briefs with mixed statuses under the plans location
    When dispatch builds the queue
    Then it selects the briefs whose status is approved via discover-plans filtered to status approved

  Scenario: an active brief is not dispatched
    Given a plan brief whose status is active or unset
    When dispatch builds the queue
    Then that brief is not in the queue

  Scenario: an approved brief with no remaining work is skipped
    Given an approved brief whose todos are all completed
    When dispatch runs the queue
    Then that brief is skipped and no automaton is spawned for it

  Scenario: an empty queue is a no-op
    Given no approved briefs exist under the plans location
    When dispatch runs the queue
    Then it spawns nothing and writes nothing

  # ---- Run the queue ----

  Scenario: missions run one at a time
    Given a queue of two approved briefs
    When dispatch runs the queue
    Then it starts the second mission only after the first mission finishes

  Scenario: each mission runs in a freshly spawned automaton
    Given a queue of approved briefs
    When dispatch runs the queue
    Then each mission is run by a newly spawned automaton with a cold context, not a reused session

  Scenario: nothing carries from one mission to the next
    Given one mission has finished in its own automaton
    When dispatch spawns the automaton for the next mission
    Then that automaton reads only its own brief and the on-disk artifacts, carrying no prior-mission context

  Scenario: missions run sequentially, never in parallel on the shared tree
    Given a queue of approved briefs
    When dispatch runs the queue
    Then it never runs two missions in parallel on the shared working tree

  # ---- Relay and write-ownership ----

  Scenario: an attended dispatch relays needs-input to the user, not guessed past
    Given dispatch was entered by an attended request and a mission returns needs-input
    When dispatch receives the verdict packet
    Then it relays the batched questions to the user rather than auto-accepting past them

  Scenario: an unattended dispatch batches needs-input up its relay
    Given dispatch was entered by an unattended trigger and a mission returns needs-input
    When dispatch receives the verdict packet
    Then it batches the questions up its own relay rather than asking live or guessing past them

  Scenario: an automaton returning a halt stops that mission and relays it
    Given a dispatched mission whose automaton returns a halt
    When dispatch receives the verdict packet
    Then it relays the halt rather than continuing that mission

  Scenario: dispatch writes no contract state
    Given dispatch runs the approved queue
    When each mission's automaton self-asserts and writes its own ledger lines
    Then dispatch itself writes no status and no approval

  Scenario: dispatch does not set the approved flag it selects on
    Given dispatch selects the approved queue
    When it runs the queue
    Then it never writes a brief's status, which is owned by mission/checkpoint
