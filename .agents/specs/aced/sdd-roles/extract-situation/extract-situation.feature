@frozen
Feature: extract-situation — the blind-brief extractor
  Unit suite for the deterministic engine judge invokes to compose a simulating context's brief: read
  one scenario out of a frozen .feature and emit only its Given and When steps. Withholding is
  structural — the engine never judges whether a step reveals the verdict, it withholds by keyword.
  Every Given below names the apparatus that DISCRIMINATES: a rubric whose lines cannot open with a
  step keyword, or a scenario whose steps never interleave, leaves the Then unable to fail. Simulating
  and scoring are judge's; authoring the rubric is scenario-writer's. Cross-capability e2e lives in
  ../../workflows/, not here.

  # ---- Emit the situation ----

  Scenario: the emitted steps keep the order the file lists them
    Given a scenario that interleaves its Given and When steps rather than grouping them
    When the engine is asked for that scenario
    Then it emits those steps verbatim, still interleaved in the file's order, and regroups nothing

  Scenario: an And under a Given is emitted
    Given a scenario whose Given step is followed by an And step
    When the engine is asked for that scenario
    Then that And step appears in the output

  Scenario: a But under a Given is emitted
    Given a scenario whose Given step is followed by a But step
    When the engine is asked for that scenario
    Then that But step appears in the output

  Scenario: a docstring under a Given or When is emitted with its step
    Given a scenario whose Given step carries a docstring holding the prompt under test
    When the engine is asked for that scenario
    Then that docstring is emitted with its step, fences and all

  Scenario: a docstring's lines are content rather than steps
    Given a scenario whose Given step carries a docstring whose lines open with the words Given or When
    When the engine is asked for that scenario
    Then those lines are emitted as that step's content, and none of them captures the steps below the docstring

  # ---- Withhold the answer key ----

  Scenario: the scenario name is withheld
    Given a scenario whose name states the verdict
    When the engine is asked for that scenario
    Then that name appears nowhere in the output

  Scenario: every Then step is withheld
    Given a scenario carrying a Then step that states the expected outcome
    When the engine is asked for that scenario
    Then that Then step appears nowhere in the output

  Scenario: an And under a Then is withheld
    Given a scenario whose Then step is followed by an And step
    When the engine is asked for that scenario
    Then that And step appears nowhere in the output

  Scenario: a But under a Then is withheld
    Given a scenario whose Then step is followed by a But step
    When the engine is asked for that scenario
    Then that But step appears nowhere in the output

  Scenario: a docstring under a Then is withheld with its step
    Given a scenario whose Then step carries a docstring
    When the engine is asked for that scenario
    Then no line of that docstring appears in the output

  Scenario: a rubric line opening with a step keyword is withheld
    Given a scenario whose inline rubric docstring carries a scoring ladder whose lines open with the words Given or When
    When the engine is asked for that scenario
    Then no line of that docstring appears in the output

  Scenario: a rubric line opening with a step keyword does not capture the steps below it
    Given a scenario whose inline rubric docstring carries a ladder line opening with the word When, followed after the docstring by an And step under the Then
    When the engine is asked for that scenario
    Then that trailing And step still appears nowhere in the output

  Scenario: a backtick-fenced docstring is withheld like a quoted one
    Given a scenario whose docstring is fenced with backticks rather than quotes
    When the engine is asked for that scenario
    Then no line of that docstring appears in the output

  Scenario: the neighbors are withheld
    Given a .feature holding tags, a Feature description, and scenarios besides the one requested
    When the engine is asked for that scenario
    Then no tag, no line of the Feature description, and no step of a sibling scenario appears in the output

  # ---- Scenario Outline ----

  Scenario: an outline keeps the placeholders its situation references
    Given a Scenario Outline whose Given and When steps carry placeholder tokens
    When the engine is asked for that outline
    Then those tokens are emitted intact and each Examples column they reference is emitted with them

  Scenario: a requested row selects exactly that Examples row
    Given a Scenario Outline whose Examples hold several rows, and a request naming one of them
    When the engine is asked for that outline and that row
    Then only that row's values are emitted, so one row is one case

  Scenario: a row outside the Examples table fails closed
    Given a request naming a row the Examples table does not hold
    When the engine is asked for that outline and that row
    Then it exits non-zero and emits no brief

  Scenario: a commented-out Examples row is not data
    Given a Scenario Outline whose Examples hold a commented-out row between two live ones
    When the engine is asked for that outline
    Then that row is neither emitted nor counted, so it shifts no row index and inflates no row count

  Scenario: an Examples column only a Then references is withheld
    Given a Scenario Outline whose Examples carry a column referenced only by its Then step
    When the engine is asked for that outline
    Then that column and its values appear nowhere in the output

  # ---- Fail closed ----

  Scenario: a scenario with no situation fails closed
    Given a scenario the .feature holds which carries a Then but no Given and no When
    When the engine is asked for it
    Then it exits non-zero and emits no brief, rather than emitting an empty one

  Scenario: an And with no step above it is withheld
    Given a scenario opening with an And step that has no Given, When, or Then above it to inherit
    When the engine is asked for that scenario
    Then that And step appears nowhere in the output

  Scenario: an absent scenario name fails closed
    Given a scenario name that the .feature does not hold
    When the engine is asked for it
    Then it exits non-zero, names the scenario it could not find, and emits no brief

  Scenario: an ambiguous scenario name fails closed
    Given a .feature holding two scenarios under the same name
    When the engine is asked for that name
    Then it exits non-zero and emits no brief

  Scenario: an unreadable .feature fails closed
    Given a .feature path that cannot be read
    When the engine is asked for a scenario in it
    Then it exits non-zero, names the file, and emits no brief

  Scenario: text carrying no Feature line fails closed
    Given text whose every mention of a Feature line falls mid-line rather than opening one
    When the engine is asked for a scenario in it
    Then it exits non-zero, names the file, and emits no brief

  Scenario: the scenario name is matched exactly
    Given a scenario name differing from a held one only by case, or forming part of it
    When the engine is asked for that name
    Then it exits non-zero rather than emitting a different scenario's situation

  Scenario: a missing argument fails closed
    Given an invocation omitting either the .feature path or the scenario name
    When the engine runs
    Then it exits non-zero with a usage error and emits no brief

  # ---- Read-only ----

  Scenario: it writes nothing
    Given any invocation of the engine
    When it finishes
    Then it has written no .feature, no brief file, and no other file
