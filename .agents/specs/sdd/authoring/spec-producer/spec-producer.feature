@frozen
Feature: The spec-producer procedure — grill a CR into spec prose + a boolean suite
  Unit suite for the spec-producer-governance procedure (the producer unit). Producer
  behaviors only — no gate verdict, freeze, or digest scenarios (those are
  ../spec-gate/spec-gate.feature's).

  # ---- Modes — create / revise / backfill ----

  Scenario: create scaffolds prose and scenarios for new capability content
    Given a CR for capability content that does not exist yet
    When the spec-producer runs in create mode
    Then it scaffolds the spec prose and an initial set of boolean scenarios

  Scenario: revise tightens existing prose without scaffolding
    Given a CR that touches a capability whose prose and scenarios already exist
    When the spec-producer runs in revise mode
    Then it interrogates the existing content and tightens what is weak or stale
    And it scaffolds no new capability skeleton

  Scenario: revise adds scenarios for new behavior and retires them for removed behavior
    Given a revise that adds some behavior and removes other behavior
    When the spec-producer updates the suite
    Then it adds scenarios for the new behavior
    And it retires the scenarios for the removed behavior

  Scenario: backfill skips the up-front grill and reads the existing implementation
    Given a CR whose behavior already exists in code
    When the spec-producer runs in backfill mode
    Then it infers the what, why, and decisions from source, tests, and history
    And it does not ask the up-front grill questions

  # ---- Grilling discipline ----

  Scenario: the producer settles the prose before editing the suite
    Given a CR under grilling
    When the prose contract is still unsettled
    Then the producer makes no scenario edits until the prose is settled

  Scenario: the producer scans all issues and summarizes them before resolving any
    Given a CR with several distinct issues
    When the producer begins grilling
    Then it scans the issues holistically and summarizes them before resolving any single one

  Scenario: the producer takes one issue to resolution before the next
    Given the producer has summarized several issues in the CR
    When it works them
    Then it resolves the single most important issue before starting another

  Scenario: grilling that reveals a bundle of several recommends a split
    Given a CR under grilling that reveals a bundle of several distinct units
    When the producer recognizes the bundle
    Then it recommends a split rather than growing one node into a monolith

  Scenario: a missing required input becomes an open marker, not an invention
    Given the producer needs an input that is missing and cannot be inferred
    When it cannot recover the input
    Then it records the gap as an open marker in the body
    And it does not invent a value

  Scenario: a contradiction is reconciled toward the correct answer
    Given two statements in the spec conflict
    And one reading is coherent with the design's intent and the implementation
    When the producer reconciles them
    Then it edits the side that conflicts with the design's intent
    And it does not adopt a reading merely because more files repeat it

  Scenario: an unclear authority is raised rather than guessed
    Given two statements conflict and the correct reading cannot be established
    When the producer cannot determine the right answer
    Then it raises the conflict as an open marker
    And it picks no reconciliation direction

  # ---- Output — what the producer writes ----

  Scenario: the producer writes the spec body and the feature, not the control frontmatter
    Given the spec-producer authoring a diff
    When it writes its output
    Then it writes the spec.md body and the .feature scenarios
    And it does not write the status, project-path, approval, or produced-by frontmatter

  Scenario: the producer leaves no placeholder in its output
    Given the spec-producer authoring a diff
    When it writes its output
    Then it leaves no TBD, TODO, or empty section

  Scenario: scoring lingo is confined to a tagged rubric scenario
    Given the producer writes a gradient behavior that needs a rubric
    When it authors the scenario
    Then the rubric form never appears in an untagged scenario
    And every untagged scenario stays a pure boolean assertion

  Scenario: a revise-mode Given does not reuse the existing artifact's worked examples
    Given a revise CR whose artifact already carries worked examples
    When the spec-producer authors a scenario's Given
    Then the Given's apparatus does not reuse those worked examples
    And the apparatus is drawn from a domain the artifact does not illustrate

  Scenario: a backfill-mode Given does not reuse the illustrations read from source
    Given a backfill CR whose implementation carries illustrations the producer read from source
    When the spec-producer authors a scenario's Given
    Then the Given's apparatus does not reuse those illustrations

  Scenario: the test-vector rule does not stop the producer reading the artifact
    Given a backfill CR whose behavior already exists in code
    When the spec-producer infers the specification from source
    Then it reads the artifact's worked examples as evidence of the behavior
    And it excludes them only from the apparatus it authors into a Given

  Scenario: a green mechanical form check does not clear an entangled Given
    Given the spec-producer has authored a .feature whose Given reuses the artifact's worked examples
    When it runs the mechanical feature-form check
    Then the check reports no form violation
    And the producer rewrites the Given's apparatus before returning

  Scenario: the producer self-checks the authored feature form before returning
    Given the spec-producer has authored a .feature
    When it finishes writing the suite
    Then it runs the mechanical feature-form check over the authored file
    And it does not report complete while a form violation remains

  Scenario: the producer fixes a hedge word the self-check flags
    Given the producer's authored .feature has a hedge adverb in a Then step
    When the mechanical form check flags the non-boolean step
    Then the producer rewrites the step to a boolean assertion before returning

  Scenario: the producer reports complete when the self-check finds no violation
    Given the producer's authored .feature is well formed, carries no entangled Given, and carries no scenario or dimension that cannot register a miss
    When the mechanical form check runs over it
    Then the check reports no violation
    And the producer reports complete

  # ---- Selection — which form a criterion goes in ----

  Scenario: a criterion no strength elsewhere pays for is never written as a dimension
    Given the producer is authoring a scenario for a schema migration and holds criteria for row preservation, column naming, and comment coverage
    When it selects the form of each criterion
    Then it writes row preservation as a boolean Then step
    And it writes no scored dimension for row preservation

  Scenario: criteria a reviewer would genuinely trade are written as dimensions
    Given the producer is authoring a scenario for a schema migration and holds criteria for column naming and comment coverage
    When it selects the form of each criterion
    Then it writes both criteria as scored dimensions

  Scenario: a criterion covering two concerns is split and each half takes its own form
    Given the producer is authoring one criterion covering both that a migration is reversible and how thoroughly it is documented
    When it selects the form of that criterion
    Then it writes reversibility as a boolean Then step
    And it writes documentation thoroughness as a scored dimension

  Scenario: the producer records the trade it accepts beside a dimension it authors
    Given the producer is authoring a @rubric for an incident postmortem and holds criteria for how thoroughly the contributing factors are traced and how actionable the follow-ups are
    When it selects the form of each criterion
    Then it writes both criteria as scored dimensions
    And it records the trade it accepts and what pays for it

  Scenario: a dimension authored with no recorded trade is not left unrecorded
    Given the producer has authored a @rubric dimension whose trade it accepts and recorded no trade for it
    When it applies the selection rule
    Then it records the trade it accepts and what pays for it before returning

  Scenario: revising an existing dimension binds the recording duty to it
    Given a revise CR that rewrites an already-frozen @rubric dimension whose trade the producer accepts and which records no trade
    When the producer applies the selection rule to it
    Then it records the trade it accepts and what pays for it before returning

  Scenario: a standing dimension recording no trade is not reported by the authoring duty
    Given a revise CR whose already-frozen @rubric carries a dimension whose trade the producer accepts and which records no trade, and which the CR does not touch
    When the producer applies the selection rule to it
    Then it does not report that dimension

  Scenario: correcting an existing summed non-substitutable criterion is raised, not silently stripped
    Given a revise CR whose already-frozen @rubric sums a criterion no strength elsewhere pays for
    When the producer applies the selection rule to it
    Then it reports the correction as an edit needing clearance
    And it does not remove that dimension without the clearance

  # ---- Correction — removing a dimension re-derives the cut ----

  Scenario: removing a dimension re-derives the cut in the same edit
    Given a cleared correction removing a scored dimension from a frozen @rubric
    When the producer applies the correction
    Then it re-derives the cut as a fresh policy call in that same edit
    And it records the reason for the new cut naming the new attainable maximum

  Scenario: a correction leaving the old cut in place is not returned
    Given a cleared correction whose removal leaves the surviving dimensions unable to reach the unchanged cut
    When the producer applies the correction and leaves the cut where it stood
    Then it reports that no subject can reach the cut
    And it does not return the correction with that cut

  Scenario: a surviving cut the arithmetic clears is still re-derived
    Given a cleared correction whose removal leaves the surviving dimensions totaling exactly the unchanged cut
    When the producer applies the correction
    Then it re-derives the cut as a fresh policy call
    And it does not treat the surviving dimensions reaching the cut as evidence the cut was chosen

  Scenario: the producer corrects one graded scenario per clearance rather than in a batch
    Given a revise CR whose frozen suites carry four @rubric scenarios each summing a criterion no strength elsewhere pays for
    When the producer scopes the correction
    Then it raises one clearance for each corrected scenario
    And it records a separate re-derived cut and reason for each corrected scenario

  Scenario: a blanket approval over several corrections does not discharge each one's decision
    Given a revise CR carrying one owner approval covering four @rubric corrections at once
    When the producer applies the corrections
    Then it does not treat the single approval as ratifying each corrected scenario's cut
    And it raises the cut decisions that the approval left unexamined

  Scenario: the correction queue is scoped by the selection rule rather than by dimension name
    Given a revise CR whose frozen @rubric carries a dimension named for one concern that covers two, and a dimension whose name reads conjunctive but names one disjunctive subject
    When the producer scopes the correction queue
    Then it includes the dimension covering two concerns
    And it excludes the dimension naming one disjunctive subject

  Scenario: a correction that adds its boolean Then to the same scenario still takes the clearance
    Given a cleared correction that removes a dimension from a frozen @rubric and asserts the criterion as a boolean Then in that same scenario
    When the producer classifies the edit
    Then it routes the correction to clearance
    And it does not treat the edit as self-clearing

  # ---- Discrimination — the authored scenario must be able to register a miss ----

  Scenario: a green mechanical form check does not clear an unloseable rubric dimension
    Given the spec-producer has authored a @rubric scenario whose every dimension a memorizer scores at max
    When it runs the mechanical feature-form check
    Then the check reports no form violation
    And the producer rewrites the unloseable dimensions before returning

  Scenario: the producer applies the miss test to each authored scenario before returning
    Given the spec-producer has authored a boolean scenario
    When it applies the miss test
    Then it names a plausible wrong subject that fails the scenario
    And it does not report complete while it can name no such subject

  Scenario: the producer checks every stated outcome has a scenario before returning
    Given the spec-producer has authored a node whose Use Cases or README names an outcome or carve-out with no scenario
    When it reviews coverage before returning
    Then it adds a scenario for the uncovered outcome
    And it does not report complete while a stated outcome or carve-out has no scenario

  Scenario: a duty specified on one node of a mirrored pair is mirrored on the counterpart
    Given the producer has specified a duty on one node of a producer-and-judge pair with no matching scenario on the counterpart node
    When it reviews coverage before returning
    Then it specifies the mirrored duty on the counterpart node
    And it does not report complete while only one side carries the duty

  Scenario: a strawman does not satisfy the miss test
    Given the only subject the producer can name that fails an authored scenario is an empty artifact
    When it applies the miss test
    Then it treats the scenario as inert and rewrites it before returning

  Scenario: a rubric floor reaching the bar on free dimensions alone is rewritten
    Given an authored @rubric whose memorizer scores every dimension but one at max, and needs a single point of the remaining dimension to reach the threshold
    When the producer applies the miss test
    Then it rewrites the free dimensions before returning

  Scenario: a dimension grading that a line is emitted is rewritten
    Given an authored @rubric dimension that scores whether the subject emits a line the doctrine already names
    When the producer applies the miss test
    Then it rewrites the dimension before returning

  Scenario: a dimension grading that the steps were followed in order is rewritten
    Given an authored @rubric dimension that scores whether the subject executed the doctrine's steps in order, where the judgment those steps serve is what the scenario tests
    When the producer applies the miss test
    Then it rewrites the dimension before returning

  Scenario: a scenario a single-brancher subject always passes is rewritten
    Given the producer has authored a scenario that a subject always taking the same branch of the decision passes
    When it applies the miss test
    Then it rewrites the scenario before returning

  Scenario: a Then asserting a finding is raised without its consequence is rewritten
    Given the producer has authored a scenario whose Then asserts a finding is raised but not that it withholds the pass or changes the outcome
    When it applies the miss test
    Then it names a wrong subject that raises the finding and acts on nothing
    And it rewrites the scenario to assert the finding's binding consequence before returning

  Scenario: a Then asserting how the artifact was produced rather than its behavior is rewritten
    Given the producer has authored a scenario whose Then asserts the production process such as tests being co-developed or written first rather than an observable behavior
    When it reviews the authored scenario
    Then it treats the process assertion as unobservable
    And it rewrites the Then to assert the artifact's observable behavior before returning

  Scenario: an already-loseable dimension is left alone
    Given an authored @rubric dimension a memorizer scores below max, whose free dimensions do not reach the threshold without it
    When the producer applies the miss test
    Then it does not rewrite the dimension

  Scenario: the producer scores a wrong subject at what that subject banks
    Given an authored @rubric carrying a live dimension a memorizer partly satisfies
    When the producer applies the miss test
    Then it scores the live dimension at what the memorizer's own answer earns
    And it does not score the live dimension at zero

  Scenario: a wrong subject that ties the threshold is treated as clearing it
    Given an authored @rubric whose memorizer banks a sum equal to the threshold
    When the producer applies the miss test
    Then it treats the memorizer as passing the scenario
    And it does not report the dimensions loseable
    And it does not report complete while the memorizer passes the scenario

  # ---- Pairwise consistency — the authored scenarios read against each other ----

  Scenario: two authored scenarios contradicting on one snapshot are reconciled before returning
    Given the producer has authored two scenarios sharing a When
    And one constructible snapshot satisfies both of their Givens
    And their Thens demand opposite verdicts
    When it reviews the suite before returning
    Then it narrows one Given to exclude the overlap before returning

  Scenario: an overlapping Given whose Thens agree raises no contradiction
    Given the producer has authored two scenarios sharing a When whose Givens both hold of one snapshot
    And their Thens assert different compatible aspects of it
    When it reviews the suite
    Then it raises no contradiction and narrows neither Given

  Scenario: two scenarios naming different operations raise no contradiction
    Given the producer has authored two scenarios whose Givens both hold of one snapshot
    And their Whens name different operations
    When it reviews the suite
    Then it raises no contradiction and narrows neither Given

  Scenario: a specific scenario carving an exception from a general sibling raises no contradiction
    Given the producer has authored a general scenario and a specific sibling sharing a When, whose narrower Given carves out an exception and gives the other verdict
    And the general Given does not itself exclude that exception
    When it reviews the suite
    Then it raises no contradiction and narrows neither Given