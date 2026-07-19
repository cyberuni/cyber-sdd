@frozen
Feature: read-check — did the role actually load and read its governance
  Unit suite for the read-attestation a spawned role returns. Honesty about loading, not a
  comprehension grade: presence and parroting are linted, meaning is judged (../../authoring/suite-format/).

  # ── The attestation ──

  Scenario: a role that attests nothing fails the read-check
    Given a spawned role that returns its work without a read-attestation
    When the read-check runs
    Then it fails the role
    And it reports that no attestation was returned

  Scenario: a role that attests what it loaded proceeds to the lint
    Given a spawned role that returns its work with a read-attestation naming the governances it loaded
    When the read-check runs
    Then it does not fail for absence
    And it lints the attestation

  # ── What must be restated ──

  Scenario: a governance with no key points is satisfied by naming it
    Given a role whose attestation names a governance that carries no key-points section
    When the read-check lints the attestation
    Then naming that governance satisfies the check for it
    And no restatement is required for it

  Scenario: a governance with key points requires a restatement
    Given a role whose attestation names a governance that carries a key-points section
    When the read-check lints the attestation
    Then a restatement is required for that governance

  Scenario: an omitted restatement fails even when the others are present
    Given a role bound by two governances that each carry key points
    And an attestation restating the first and omitting the second
    When the read-check lints the attestation
    Then it fails the role
    And it names the governance whose restatement is missing

  Scenario: an attestation covering every bound governance clears the lint
    Given a role bound by two governances that each carry key points
    And an attestation restating both in the role's own words
    When the read-check lints the attestation
    Then the attestation clears the lint

  # ── Parroting ──

  Scenario: a parroted restatement fails the lint
    Given an attestation whose restatement reproduces the governance's key-points text
    When the read-check lints the attestation
    Then it fails the role
    And it reports the restatement as copied rather than read

  Scenario: an own-words restatement clears the lint
    Given an attestation whose restatement expresses the governance's key points in different wording
    When the read-check lints the attestation
    Then it does not fail the restatement as copied

  # ── Meaning ──

  Scenario: a restatement that misses the directive's meaning fails the judge
    Given a lint-clean attestation whose restatement contradicts the directive it restates
    When the cold judge grades the attestation
    Then it fails the role
    And it names the directive the restatement misses

  Scenario: an accurate restatement clears the read-check
    Given a lint-clean attestation whose restatement tracks the directive it restates
    When the cold judge grades the attestation
    Then the read-check clears

  # ── Boundaries ──

  Scenario: only the governances actually loaded are attested
    Given a role declaring five governance bars that loaded two of them for the decisions it made
    When the read-check runs
    Then it requires an attestation for the two that were loaded
    And it requires no attestation for the three that were never loaded

  Scenario: a green lint renders no verdict on honesty
    Given an attestation that clears the lint
    When the read-check reports the lint result
    Then it reports that the judged question remains open
