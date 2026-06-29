Feature: The digest procedure — a read-only, fixed-section summary of one spec
  Unit suite for the digest tool. Read-only summarization behaviors only — it never writes,
  ranks, or judges. Cross-capability e2e scenarios live in ../../acceptance/.

  # ── Digest a spec ──

  Scenario: the digest returns the five fixed sections
    Given a spec folder with a spec.md and a sibling .feature
    When the digest runs over it
    Then it returns a What, a Status, a Scenarios, a Key decisions, and an Open items section

  Scenario: the digest counts and names the scenarios in the suite
    Given a spec folder whose .feature holds three named scenarios
    When the digest runs over it
    Then the Scenarios section reports a count of three
    And it lists each scenario name

  Scenario: the digest reads the status from the spec frontmatter
    Given a spec folder whose root spec.md frontmatter status is approved
    When the digest runs over it
    Then the Status section reports approved

  Scenario: the digest lists every open marker under Open items
    Given a spec folder whose spec carries two open markers
    When the digest runs over it
    Then the Open items section lists both markers

  Scenario: the digest extracts the design-decision headings as key decisions
    Given a spec folder whose body has design-decision headings
    When the digest runs over it
    Then the Key decisions section lists those headings

  # ── Digest a spec with no suite ──

  Scenario: a missing suite reports zero scenarios rather than an error
    Given a spec folder that has no sibling .feature
    When the digest runs over it
    Then the Scenarios section reports a count of zero
    And it does not report an error

  Scenario: a spec missing a body subject still digests without erroring
    Given a spec folder whose spec.md has no body subject line
    When the digest runs over it
    Then the What section is reported as empty
    And it does not report an error

  # ── The read-only boundary ──

  Scenario: the digest writes nothing
    Given the digest summarizing a spec
    When it completes
    Then it has not written status, approval, a freeze, or any edit to an artifact
    And it has rendered no verdict
