Feature: doc-writer — the Quill impl-producer role
  The role the SDD conductor dispatches to write documentation against a behavior contract it may not
  change, and to record — per frozen scenario — the acceptance checks a judge that never saw the writing
  will run. Its bar set is a union: the Quill impl bar plus the SDD bars that bar unions onto.

  Fit is partial: the conductor dispatches this role by name, so it makes no activation decision and this
  suite freezes no trigger case. Its conduct is model-run, so one scenario is graded against an inline
  rubric and the rest are boolean.

  # ── U1 — dispatch(MODE: implement) ──

  @behavior
  Scenario: the bar set names the plugin bar and the SDD bars it unions onto
    Given the conductor dispatches quill-doc-writer with MODE implement
    And DOMAIN_PATH is apps/site/.agents/spec/content/docs/payments/refunds
    When it returns its output packet
    Then GOVERNANCES_APPLIED names quill:quill-builder-impl
    And GOVERNANCES_APPLIED names sdd:builder-impl-governance
    And GOVERNANCES_APPLIED names sdd:architect-impl-governance
    And GOVERNANCES_APPLIED names sdd:ownership-governance

  @behavior
  Scenario: each document is written at the path its scenario declares
    Given a frozen refunds.feature carrying two scenarios
    And the first scenario declares the target apps/site/docs/payments/refunds.md with a section headed "Refund window"
    And the second scenario declares the target apps/site/docs/payments/chargebacks.md with a section headed "Evidence you must file"
    When it runs in MODE implement
    Then apps/site/docs/payments/refunds.md exists and carries a section headed "Refund window"
    And apps/site/docs/payments/chargebacks.md exists and carries a section headed "Evidence you must file"
    And neither file contains the strings TBD, TODO, or FIXME
    And in neither file is a heading followed immediately by the next heading or by the end of the file

  @behavior
  Scenario: the verification carries one check block per frozen scenario, keyed by name
    Given a frozen refunds.feature carrying three scenarios named "the page states the refund window", "the page names who initiates a chargeback", and "the page links the disputes reference"
    When it runs in MODE implement
    Then apps/site/.agents/spec/content/docs/payments/refunds/verification.md exists
    And it carries a heading naming "the page states the refund window"
    And it carries a heading naming "the page names who initiates a chargeback"
    And it carries a heading naming "the page links the disputes reference"
    And each of those three headings is followed by at least one check naming the target document path

  @quality @rubric
  Scenario: the recorded check settles a claim the judge must decide by reading
    Given a frozen scenario named "the page distinguishes a refund from a chargeback by who initiates it"
    And the page states that a merchant initiates a refund and a cardholder initiates a chargeback
    And no single literal string in the page settles whether that distinction was drawn
    When it records that scenario's acceptance check in verification.md
    Then the judge evaluates the scenario against the rubric
      """
      dimensions:
        - name: settleability
          max: 3          # the check names the document state that settles it, so two judges reading only the check and the page reach the same verdict. 3 = names the passage and the observable condition (which party each of the two acts is attributed to); 1 = names a condition each judge resolves for themselves ("the distinction is drawn clearly"); 0 = names no condition at all
        - name: claim_reach
          max: 3          # the check decides the whole claim, not a proxy for part of it. 3 = fails unless BOTH attributions are present and attributed to different parties; 1 = a proxy that passes on one half, or on the mere co-occurrence of the words refund and chargeback; 0 = restates the scenario name as the check
      threshold: 5
      """
    And the rubric score is at least the threshold

  @behavior
  Scenario: a scenario it cannot check is reported unverified rather than given a passing check
    Given a frozen refunds.feature carrying a scenario named "the page reads well to a first-time merchant"
    And no inspection of apps/site/docs/payments/refunds.md settles that scenario
    When it runs in MODE implement
    Then verification.md carries no check block asserting that scenario passes
    And CONTENT_GAPS carries an entry naming that scenario as unverified

  @behavior
  Scenario: a behavior the frozen contract omits is escalated, not written in
    Given a frozen refunds.feature with no scenario covering partial refunds
    And the spec.md What section states the page must tell a merchant how a partial refund is issued
    When it runs in MODE implement
    Then it returns STATUS blocked
    And the returned BLOCKER names partial refunds as the missing behavior
    And refunds.feature is byte-identical to the file it was dispatched with
    And spec.md is byte-identical to the file it was dispatched with

  @behavior
  Scenario: a route that skips an option the document enumerated is extended to reach it
    Given the written page enumerates four refund states — requested, approved, settled, and reversed
    And a later section routes a merchant's next step for requested, approved, and settled only
    When it reads the page whole with the scenario list set aside
    Then the routing section names a next step for reversed
    And the enumeration still names all four states

  @behavior
  Scenario: a term predicated of a second subject class is returned to the class it was coined for
    Given the written page introduces "carries" for what a settlement file holds
    And a later sentence says the approval step carries the refund amount
    When it reads the page whole with the scenario list set aside
    Then the sentence about the approval step no longer predicates "carries" of a step
    And the sentence about the settlement file still predicates "carries" of the file

  @behavior
  Scenario: a claim reached by two reader paths is left in both places
    Given the written page states the refund window is thirty days in the section headed "Refund window"
    And it states the same thirty-day window again in the section headed "Disputes"
    And the sidebar links both sections directly
    When it reads the page whole with the scenario list set aside
    Then the section headed "Disputes" still states the thirty-day window in full
    And the section headed "Disputes" contains no cross-reference standing in place of that statement

  @behavior
  Scenario: a deliberate violation with a reader-benefit rationale is declared as a row
    Given the written page repeats the chargeback deadline in three sections
    And the writer keeps the repetition so a merchant landing on any one section reads the deadline without leaving
    When it records the verification
    Then verification.md carries a section headed "Deliberate violations"
    And that section carries a row naming the catalog entry
    And that row names the section headings where the repetition sits
    And that row states what a merchant landing on one section gains from it

  @behavior
  Scenario: a rationale that only asserts deliberateness is not filed; the passage is repaired
    Given the written page uses "settlement" for two different subjects — the bank transfer and the dispute outcome
    And the only reason the writer can give is that the reuse was a deliberate choice
    When it records the verification
    Then verification.md carries no Deliberate violations row for that passage
    And the page uses "settlement" for one of the two subjects only

  @behavior
  Scenario: the artifacts table gains one impl row per document written
    Given it wrote apps/site/docs/payments/refunds.md and apps/site/docs/payments/chargebacks.md
    When it returns its output packet
    Then the Artifacts table carries a row for apps/site/docs/payments/refunds.md with layer impl
    And the Artifacts table carries a row for apps/site/docs/payments/chargebacks.md with layer impl

  # ── U2 — dispatch(MODE: explore) ──

  @behavior
  Scenario: a spike run records its acceptance checks like a delivery run does
    Given a draft refunds.feature carrying no @frozen tag
    And it carries two scenarios named "the page states the refund window" and "the page links the disputes reference"
    When it runs in MODE explore
    Then apps/site/.agents/spec/content/docs/payments/refunds/verification.md exists
    And it carries a heading naming "the page states the refund window"
    And it carries a heading naming "the page links the disputes reference"

  @behavior
  Scenario: in explore mode a content need the draft omits is returned as a gap, not a block
    Given a draft refunds.feature carrying no @frozen tag
    And it carries no scenario covering partial refunds
    And the spec.md What section states the page must tell a merchant how a partial refund is issued
    When it runs in MODE explore
    Then it returns STATUS complete
    And CONTENT_GAPS carries an entry naming partial refunds
    And refunds.feature is byte-identical to the file it was dispatched with
    And spec.md is byte-identical to the file it was dispatched with
