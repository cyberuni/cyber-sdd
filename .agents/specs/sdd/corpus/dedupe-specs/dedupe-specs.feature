Feature: The dedupe-specs procedure — propose collapsing overlapping scope
  Unit suite for the dedupe-specs tool. Overlap-analysis and proposal behaviors only — it
  executes nothing and writes nothing. Cross-capability e2e scenarios live in ../../acceptance/.

  # ── Dedupe a candidate set ──

  Scenario: substantial overlap is found across the candidate set
    Given a candidate set whose specs share the same What and asserted behavior
    When dedupe-specs analyzes the set
    Then it reports the substantial overlap between them

  Scenario: incidental shared vocabulary is not treated as overlap
    Given two specs that share only vocabulary but assert different behavior
    When dedupe-specs analyzes the set
    Then it does not propose merging them

  Scenario: the plan names a survivor and the specs that fold in
    Given a candidate set with substantial overlap
    When dedupe-specs proposes a plan
    Then the plan names the surviving spec
    And it names each spec that folds into the survivor
    And it gives a rationale for the survivor choice

  Scenario: peers with no clear winner are handed to the user
    Given a candidate set whose specs overlap with no clear survivor
    When dedupe-specs proposes a plan
    Then it hands the choice of survivor to the user
    And it does not guess a survivor

  Scenario: a candidate set with fewer than two specs yields no proposal
    Given a candidate set holding a single spec or no specs
    When dedupe-specs analyzes the set
    Then it proposes no dedupe plan
    And it reports that there is nothing to dedupe

  # ── The write-free and freeze boundary ──

  Scenario: the tool writes nothing and requires approval before any change
    Given dedupe-specs has produced a dedupe plan
    When it completes
    Then it has written no artifact, status, approval, or freeze
    And no structural change is applied without explicit approval

  Scenario: a frozen survivor routes through the draft re-open path
    Given a proposed survivor whose status is approved and whose .feature is frozen
    When the plan would move scenarios into it
    Then the tool requires the draft re-open before any scenario moves
    And it does not rewrite the frozen .feature without the ratified re-open
