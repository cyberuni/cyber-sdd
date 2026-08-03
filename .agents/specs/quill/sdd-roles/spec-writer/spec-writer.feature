Feature: spec-writer — the Quill spec-producer role

  The conductor dispatches quill-spec-writer for a documentation artifact-type. It loads the
  three spec-gate actor bars forward, then writes the spec.md body and a boolean .feature for
  one document — or recuses when the target it was handed has no document surface.

  # ── UC1 — author ──

  @behavior
  Scenario: it declares the SDD-default bars it fell back to
    Given the conductor dispatches quill-spec-writer for a guide domain
    And the squad registry binds builder-spec to quill-builder-spec
    And the squad registry leaves the oracle-spec slot unbound
    And the squad registry leaves the architect-spec slot unbound
    When it returns its output packet
    Then the packet lists the governances it loaded
    And that list names quill-builder-spec
    And that list names the SDD-default oracle-spec bar
    And that list names the SDD-default architect-spec bar

  @behavior
  Scenario: it declares the bar bound to each slot
    Given the conductor dispatches quill-spec-writer for a reference domain
    And the squad registry binds a plugin bar to the oracle-spec slot
    And the squad registry binds a plugin bar to the builder-spec slot
    And the squad registry binds a plugin bar to the architect-spec slot
    When it returns its output packet
    Then the packet lists the governances it loaded
    And that list names the plugin bar bound to each of the three slots
    And that list names no SDD-default spec-gate bar

  @behavior
  Scenario: it authors a contract for a target with a document surface
    Given the command surface names docs/scanners/flashing.md as the target
    And that path holds a page with headings and paragraphs
    And the command surface names the reader and the reader's goal
    And the page resolves a problem no other page in the project resolves
    And no sibling spec node owns an entry point for flashing a scanner
    When quill-spec-writer runs to completion
    Then a spec.md body is written at SPEC_PATH
    And a .feature is written at DOMAIN_PATH
    And the output packet reports STATUS complete

  @behavior
  Scenario: it authors a fresh suite covering every key-points row
    Given the dispatch carries no gate findings
    And DOMAIN_PATH holds no .feature
    And the key-points table carries five rows
    When it writes the suite
    Then the .feature at DOMAIN_PATH carries at least one scenario per key-points row
    And each of the five rows is asserted by at least one scenario

  @behavior
  Scenario: it returns a gap for the audience instead of reading one out of the draft
    Given a draft page exists at docs/scanners/flashing.md
    And that draft addresses its reader in the second person as a field technician
    And the command surface names the target path and the purpose
    And no input names who the page is for
    When it writes the What elements
    Then the output packet reports STATUS needs-input
    And the output packet carries a CONTENT_GAP naming the audience
    And no spec.md at SPEC_PATH carries an audience row for a field technician

  @behavior
  Scenario: it returns complete with no content gap
    Given the command surface names the audience, the purpose, the facts the page must land, the excluded topics, and the assumed knowledge
    And the command surface states what the reader leaves able to do
    When it writes the What elements
    Then the spec.md at SPEC_PATH carries all seven What elements
    And the output packet carries no CONTENT_GAP
    And the output packet reports STATUS complete

  @behavior
  Scenario: it returns the scope finding for a document with no reason of its own
    Given the command surface asks for a page whose stated purpose is to explain the depot CLI
    And the parent page already explains the depot CLI
    And the parent page serves the same audience
    When it writes the reason-to-exist element
    Then the output packet reports that the page has no problem distinct from its parent
    And the output packet names the parent page
    And no key-points table is written at SPEC_PATH

  @behavior
  Scenario: it states the reason to exist in the domain's own terms
    Given the parent page documents the depot CLI flags
    And the command surface asks for a page on choosing between two deployment modes
    When it writes the reason-to-exist element
    Then the spec.md at SPEC_PATH states the problem the page resolves in deployment terms
    And that statement differs from the page title
    And the output packet reports STATUS complete

  @behavior
  Scenario: it defers an entry point a sibling node owns
    Given the project spec's install node specifies the entry point where a new operator installs the depot agent on a fresh host
    And the command surface asks for a quickstart covering that same entry point
    When it writes the Use Cases section
    Then the Use Cases section at SPEC_PATH carries no entry point for installing on a fresh host
    And the output packet carries an OBSERVATION whose owner is architect
    And that observation names the install node

  @behavior
  Scenario: it writes an entry point no sibling node owns
    Given no node in the project spec specifies an entry point for rotating a depot signing key
    And the command surface asks for a how-to on rotating a depot signing key
    When it writes the Use Cases section
    Then the Use Cases section at SPEC_PATH carries an entry point for rotating a signing key
    And the output packet carries no architect OBSERVATION about that entry point

  @behavior
  Scenario: each audience row names a role, its goal, and an entry point
    Given the command surface names a warehouse operator flashing a scanner for the first time
    And the command surface names a support engineer diagnosing a failed flash
    When it writes the audience table
    Then the audience table carries one row per named reader
    And each row names the role and what that role is trying to accomplish
    And each row has at least one entry point in the Use Cases section

  @behavior
  Scenario: it declares exactly one doc type
    Given the command surface describes a first-time walk-through of flashing a scanner
    When it writes the doc-type element
    Then the spec.md at SPEC_PATH declares exactly one of tutorial, how-to, reference, or explanation
    And the declared type is tutorial

  @behavior
  Scenario: the north star carries the state that would mean the document missed
    Given the command surface states the reader should leave able to flash a scanner unattended
    When it writes the north-star element
    Then the north star names what the reader leaves able to do
    And the north star names a concrete reader state under which the page has missed

  @behavior
  Scenario: each key-points row states a claim rather than naming a section
    Given the command surface names three facts the page must land
    When it writes the key-points table
    Then each row states a claim the page must land
    And no row names a heading or a section of the page
    And each row is settleable by inspecting the page

  @behavior
  Scenario: each non-goal names where the excluded topic lives
    Given the command surface excludes hardware provisioning from the page
    When it writes the non-goals element
    Then the non-goals name hardware provisioning as excluded
    And the non-goals name the document that covers hardware provisioning

  @behavior
  Scenario: each prerequisite names the document that supplies it
    Given the command surface states the page assumes the reader has paired a scanner to the depot
    When it writes the prerequisites element
    Then the prerequisites name pairing a scanner to the depot
    And the prerequisites name the document that teaches pairing

  @behavior
  Scenario: it declares self-containment explicitly
    Given the command surface states the page assumes no prior knowledge
    When it writes the prerequisites element
    Then the spec.md at SPEC_PATH declares the page self-contained
    And the prerequisites list no supplying document

  @behavior
  Scenario: the criterion becomes a decision node and each option its own outcome
    Given the reader must choose between flashing over USB and flashing over the network
    And the choice turns on whether the depot has line of sight to the scanner
    When it draws the reader path
    Then line of sight is a decision node in the graph
    And flashing over USB is its own outcome node
    And flashing over the network is its own outcome node
    And no outcome node in the graph offers both transports

  @behavior
  Scenario: the reader path routes to every enumerated member
    Given a key-points row names three supported flash transports: USB, network, and SD card
    And the page must serve a reader arriving with any of the three
    When it draws the reader path
    Then the graph routes to USB
    And the graph routes to network
    And the graph routes to SD card

  @behavior
  Scenario: a load-bearing claim is asserted on each routed path
    Given the reader path routes the warehouse operator to the claim that a failed flash leaves the scanner bootable
    And the reader path routes the support engineer to that same claim
    When it writes the suite scenarios
    Then a scenario asserts the bootable claim on the operator's path
    And a scenario asserts the bootable claim on the support engineer's path
    And no scenario asserts how many places the claim appears in

  @behavior
  Scenario: a routing scenario asserts the discriminator
    Given the reader path routes a scanner with line of sight to USB flashing
    And the reader path routes a scanner without line of sight to network flashing
    When it writes the suite scenario for that routing
    Then the scenario asserts that a scanner with line of sight is routed to USB flashing
    And the scenario asserts that network flashing is reserved for a scanner without line of sight

  @behavior
  Scenario: no scenario asserts the heading wording, the section order, or the tone
    Given the draft page heads its recovery section "When things go sideways"
    And that section is the third section in the draft
    When it writes the suite scenario for the recovery claim
    Then the scenario asserts that the page tells the reader how to recover a bricked scanner
    And no scenario asserts the heading text "When things go sideways"
    And no scenario asserts the position of the recovery section in the page
    And no scenario asserts the page's tone

  @behavior
  Scenario: each scenario names the path, the audience, and the observable reader outcome
    Given the target page is docs/scanners/flashing.md
    And its audience is a warehouse operator flashing a scanner for the first time
    When it writes the suite scenarios
    Then each scenario names docs/scanners/flashing.md
    And each scenario names the audience it serves
    And each scenario names what the reader can do after reading

  @behavior
  Scenario: it leaves the control frontmatter to the conductor and the gate
    Given the spec.md at SPEC_PATH carries the status field draft
    And the spec.md at SPEC_PATH carries the project-path field plugins/depot
    When it writes the spec.md body
    Then the status field still reads draft
    And the project-path field still reads plugins/depot
    And the spec.md at SPEC_PATH carries no approval entry
    And the spec.md at SPEC_PATH carries no produced-by entry

  # ── UC2 — revise ──

  @behavior
  Scenario: a revision touches only the scenarios the findings name
    Given a prior pass wrote nine scenarios into an unfrozen suite at DOMAIN_PATH
    And the gate findings name the second scenario and the seventh scenario
    When it is re-dispatched with those findings
    Then the second scenario differs from the prior pass
    And the seventh scenario differs from the prior pass
    And the other seven scenarios are identical to the prior pass

  @behavior
  Scenario: it folds the supplied answer into the gapped element
    Given a prior pass returned a CONTENT_GAP naming the audience
    And the user answers that the page is for a depot administrator auditing flash history
    When it is re-dispatched with that answer
    Then the audience table carries a row for a depot administrator auditing flash history
    And the output packet carries no CONTENT_GAP naming the audience

  @behavior
  Scenario: it blocks rather than narrowing a frozen suite
    Given the .feature at DOMAIN_PATH carries the frozen tag on its Feature
    And the gate finding requires removing a scenario from that suite
    When it is re-dispatched with that finding
    Then the output packet reports STATUS blocked
    And the output packet carries a BLOCKER naming the frozen suite
    And the .feature at DOMAIN_PATH is identical to the frozen version

  # ── UC3 — recuse ──

  @behavior
  Scenario: it recuses from a target with no document surface
    Given the command surface names plugins/depot/agents/depot-runner.md as the target
    And that path holds an agent definition with frontmatter and instructions
    When quill-spec-writer runs to completion
    Then the output packet reports a recusal
    And the recusal names the SDD-default production chain
    And no .feature is written at DOMAIN_PATH
    And no spec.md body is written at SPEC_PATH
