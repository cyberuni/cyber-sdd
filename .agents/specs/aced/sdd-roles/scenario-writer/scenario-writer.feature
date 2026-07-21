@frozen
Feature: scenario-writer — the spec-producer role
  Unit suite for the ACED spec-producer the conductor dispatches in explore: write the spec.md body
  and the .feature for one agent-config artifact — boolean scenarios, @rubric for graded behavior, and
  a @trigger Scenario Outline for activation, with the rubric authored inline (no separate golden set).
  Grading the suite is spec-validator; running the evals is implementer; scoring one case is judge.
  Cross-capability e2e (a full explore→deliver pass over a real skill) lives in ../../workflows/, not here.

  # ---- Role boundary ----

  Scenario: dispatched as the spec-producer it writes both artifacts
    Given the conductor dispatches scenario-writer in explore for a skill named "commit-work"
    When it runs the spec-producer role
    Then it writes the spec.md body and a sibling commit-work.feature

  Scenario: it does not write the control frontmatter
    Given the conductor dispatches scenario-writer for an artifact
    When it authors the spec.md
    Then it does not write the status or project-path frontmatter fields

  Scenario: it does not grade the suite it produced
    Given scenario-writer has just written a .feature
    When it completes the spec-producer role
    Then it does not emit a pass or fail verdict on that suite

  Scenario: it authors the rubric inline in the .feature, not a separate golden set
    Given the conductor dispatches scenario-writer for a graded-behavior artifact
    When it produces the .feature
    Then it writes the rubric and threshold inline in a @rubric scenario and authors no separate golden-set file

  # ---- Fit (classified first) ----

  Scenario: the fit tier is classified and declared before scenarios are authored
    Given the conductor dispatches scenario-writer for a subject
    When it begins the spec-producer role
    Then it classifies the subject's fit tier and declares it in the spec.md Use Cases before authoring scenarios

  Scenario: a wrong-squad subject is recused with no feature
    Given a subject that is a deterministic engine whose output is assertable rather than graded
    When scenario-writer classifies its fit
    Then it recuses and authors no .feature
    And it recommends the SDD-default builder with a script harness

  # ---- Producing the spec.md ----

  Scenario: the spec carries a Use Cases section
    Given a subject whose trigger surface and rules are readable
    When scenario-writer writes the spec.md body
    Then the spec.md contains a Use Cases section with a Subject line and a Non-goals line

  Scenario: the spec is enriched for the gate reader
    Given a subject with a multi-step workflow
    When scenario-writer writes the spec.md body
    Then it uses headings and tables rather than a single wall of prose

  Scenario: a backfilled spec carries all four sections
    Given an existing subject being backfilled rather than authored new
    When scenario-writer writes the spec.md body
    Then the spec.md contains a Control Flow section with a CFG and a Scenario map, not only a Use Cases section

  # ---- Producing the .feature ----

  Scenario: every scenario it writes carries concrete trigger context
    Given a subject whose situations — who the user is, what they said, the state of the tree — are readable
    When scenario-writer writes the behavior scenarios
    Then every scenario it writes carries a concrete situation sufficient to simulate the agent without ambiguity

  Scenario: two scenarios sharing a When never demand opposite verdicts
    Given scenario-writer has drafted two scenarios that share a When
    When it reads the scenarios against each other before returning
    Then it does not return two scenarios demanding opposite verdicts on one constructible snapshot, and narrows one Given instead

  Scenario: on a backfill the scenario set is re-derived from the CFG
    Given an existing subject whose standing .feature and any retired golden set are available
    When scenario-writer authors the suite as a backfill
    Then it re-derives the scenario set from the configuration's control-flow edges and treats the standing .feature as reference only, not the baseline to patch

  Scenario: a strong-fit subject covers triggering both ways
    Given a strong-fit skill that fires only when the user asks to stage and commit work
    When scenario-writer writes the trigger scenarios
    Then the .feature contains a should-trigger scenario and a same-keyword near-miss should-not-trigger scenario

  Scenario: trigger cases are authored as a @trigger Scenario Outline
    Given a strong-fit subject with several representative should-trigger and should-not-trigger queries
    When scenario-writer writes the trigger cases
    Then it writes a @trigger Scenario Outline whose Examples table carries one row per query with its should_trigger value

  Scenario: a partial-fit subject gets no fabricated near-miss
    Given a partial-fit subject that runs a mechanical procedure with graded behavior but no activation decision
    When scenario-writer writes the .feature
    Then it writes no fabricated should-not-trigger near-miss

  Scenario: every major rule gets a behavior scenario
    Given a subject whose body lists three distinct rules
    When scenario-writer writes the behavior scenarios
    Then each of the three rules has at least one behavior scenario

  Scenario: a prohibited behavior gets a must-not-do guard
    Given a subject that explicitly forbids using "git add -A"
    When scenario-writer writes the behavior scenarios
    Then the .feature contains a scenario asserting the agent does not run "git add -A"

  Scenario: a graded subject uses @rubric while a deterministic one stays boolean
    Given a non-deterministic subject whose quality is graded over many runs
    When scenario-writer writes the .feature
    Then it tags the graded scenarios @rubric with named dimensions and a threshold in the Then docstring and leaves every untagged scenario carrying only boolean assertions

  Scenario: a prohibited behavior is asserted as a boolean Then
    Given a subject that forbids a specific action
    When scenario-writer writes the must-not-do guard
    Then it asserts the prohibition as a boolean Then step rather than a separate golden-set must-not list

  Scenario: a property a boolean scenario in the suite decides is kept out of the rubric
    Given the scenario-writer authoring a @rubric for a subject whose suite already carries a boolean scenario deciding a property
    When it selects the form of each criterion
    Then it does not add a dimension re-grading that property to the rubric
    And it leaves the property to its boolean scenario rather than smuggling it into the compensatory sum

  Scenario: a double-barreled dimension is split before it is selected
    Given a candidate dimension whose name bundles two distinct properties
    When scenario-writer selects the form of each criterion
    Then it splits the double-barreled dimension into its two properties before selecting a form for each

  Scenario: a non-substitutable rule stays a boolean not a dimension
    Given a subject rule nobody would trade strength elsewhere for, such as shipping no npx dependency
    When scenario-writer selects the form of that criterion
    Then it authors the rule as a boolean Then step and not as a rubric dimension

  Scenario: every dimension can register a miss
    Given scenario-writer authoring a @rubric for a graded subject
    When it selects each dimension
    Then every dimension it authors can register a miss, and it authors no dimension grading mere presence, restatement, or procedure of the config

  # ---- Gaps and guards ----

  Scenario: uninferable intent returns a content gap
    Given a subject that omits when it should fire and the trigger cannot be inferred
    When scenario-writer reaches that gap
    Then it returns a content gap for the missing trigger and does not invent one

  Scenario: ambiguous input returns batched questions
    Given user input that is too ambiguous to author against
    When scenario-writer cannot proceed
    Then it returns a needs-input status with its questions batched

  Scenario: judge feedback revises only the named scenarios
    Given spec-judge feedback naming two failing scenarios from a prior pass
    When scenario-writer revises the suite
    Then it edits those two scenarios and leaves the passing scenarios unchanged
