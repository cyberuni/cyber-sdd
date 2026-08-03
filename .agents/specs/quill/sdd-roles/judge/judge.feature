Feature: judge — run the two doc-eval instruments at the impl gate
  Unit suite for the Quill impl-judge (`quill-judge`) the SDD conductor spawns cold at the impl gate:
  run the four scenario-scoped inspection checks against each frozen scenario, run the document-scoped
  enumeration rule once per document, run the defect catalog as a judged pass whose reader simulation is
  dispatched to a separate blind context, and roll the whole thing up to one gate verdict. Authoring the
  document and its acceptance checks is `doc-writer`; the catalog and the enumeration rule live in the
  frozen impl bar; the cross-capability flow (spec -> write -> verify) lives in ../../workflows/.

  # ── Cold dispatch ──

  @behavior
  Scenario: it applies the SDD default impl-gate bars alongside the Quill bar
    Given the conductor spawns quill-judge cold at the impl gate for a guide domain
    And the Quill plugin binds its own bar to the builder-impl slot
    When quill-judge composes the governance set for the run
    Then its report declares every governance it applied
    And that declared set contains the Quill document-integrity bar
    And that declared set contains every SDD default impl-gate bar the governance matcher resolves for the touched files

  @behavior
  Scenario: it runs the acceptance checks the producer recorded
    Given the domain folder carries a verification.md recording one acceptance check per frozen scenario
    When quill-judge prepares the per-scenario inspection
    Then it runs the recorded check for every frozen scenario
    And it reports that the recorded verification was run rather than produced

  @behavior
  Scenario: a missing verification file falls back to the frozen feature
    Given the domain folder carries exactly two files, README.md and the frozen judge.feature
    When quill-judge prepares the per-scenario inspection
    Then it derives each scenario's verifiable conditions from the frozen .feature
    And it reports no acceptance criterion beyond the conditions those scenarios state

  @behavior
  Scenario: a declared document path resolves against the project root
    Given the domain folder is .agents/specs/quill/guides/setup
    And a frozen scenario names the document path docs/setup.md
    When quill-judge resolves the document target
    Then it checks the project root's docs/setup.md
    And it does not check .agents/specs/quill/guides/setup/docs/setup.md

  # ── Scenario inspection ──

  @behavior
  Scenario: a missing document fails the scenario with a blocker
    Given a frozen scenario names the document path docs/setup.md
    And the project's docs/ directory carries one file, docs/install.md
    When quill-judge runs the existence check for that scenario
    Then it reports that scenario FAIL
    And it records a blocker naming docs/setup.md as the path it did not find

  @behavior
  Scenario: a heading differing only in case satisfies the structure check
    Given a frozen scenario requires a "## What" section in docs/setup.md
    And docs/setup.md exists at the project root and opens with the heading "## what"
    When quill-judge runs the structure check for that scenario
    Then it treats the required section as present

  @behavior
  Scenario: a required section absent from the document fails the scenario
    Given a frozen scenario requires a "## Prerequisites" section in docs/setup.md
    And docs/setup.md exists at the project root and carries the headings "## What" and "## Steps"
    When quill-judge runs the structure check for that scenario
    Then it reports that scenario FAIL
    And it records a blocker naming "## Prerequisites" as the missing heading

  @behavior
  Scenario: placeholder text fails the completeness check
    Given docs/setup.md exists at the project root and carries every heading its frozen scenario requires
    And the line "TODO: write the rollback step" stands under its "## Steps" heading
    When quill-judge runs the completeness check for that scenario
    Then it reports that scenario FAIL
    And it records a blocker quoting the placeholder line and naming the "## Steps" heading

  @behavior
  Scenario: an empty section fails the completeness check
    Given docs/setup.md exists at the project root and carries every heading its frozen scenario requires
    And its "## Rollback" heading is immediately followed by its "## See also" heading
    When quill-judge runs the completeness check for that scenario
    Then it reports that scenario FAIL
    And it records a blocker naming "## Rollback" as the empty section

  @behavior
  Scenario: a step naming an undeclared prerequisite fails the reader-path check
    Given a frozen scenario states that a reader follows the steps of docs/setup.md in order
    And the "## Before you start" section of docs/setup.md names a Node runtime as its one prerequisite
    And step 3 tells the reader to configure the tunnel as described in the network runbook
    When quill-judge runs the reader-path check for that scenario
    Then it reports that scenario FAIL
    And it records a blocker naming the network runbook as an undeclared prerequisite

  @behavior
  Scenario: an unsettleable reader-path condition is reported SKIP
    Given a frozen scenario states that a reader completes the setup in under ten minutes
    And docs/setup.md exists at the project root with prose under every heading
    When quill-judge runs the reader-path check for that scenario
    Then it reports that scenario SKIP
    And its report names the condition it could not settle by static inspection

  @behavior
  Scenario: a document satisfying all four checks passes the scenario
    Given a frozen scenario names docs/setup.md and requires a "## Steps" section
    And docs/setup.md exists at the project root with a paragraph of prose under every heading
    And its "## Steps" heading is followed by three numbered steps of prose
    And its "## Before you start" section names every prerequisite those steps rely on
    And its closing section describes the outcome the frozen scenario states
    When quill-judge runs the four scenario-scoped checks for that scenario
    Then it reports that scenario PASS

  # ── Document inspection ──

  @behavior
  Scenario: the document-scoped pass runs once for the document
    Given three frozen scenarios each name docs/setup.md
    When quill-judge runs the document-scoped inspection
    Then it reports one set of integrity findings for docs/setup.md
    And it reports no integrity findings keyed to an individual scenario

  @behavior
  Scenario: a routing that skips an enumerated option is a blocker
    Given the "## Mechanisms" section of docs/setup.md enumerates the npm, the git, and the tarball install
    And its later "## Choosing" section routes the reader across the npm and the tarball install
    When quill-judge runs the enumeration rule over docs/setup.md
    Then it reports a blocker quoting the "## Mechanisms" enumeration and the "## Choosing" routing
    And each of those two quotes carries its own heading

  @behavior
  Scenario: a routing that reaches every enumerated option raises no inspection finding
    Given the "## Mechanisms" section of docs/setup.md enumerates the npm, the git, and the tarball install
    And its later "## Choosing" section routes the reader across all three of those installs
    When quill-judge runs the enumeration rule over docs/setup.md
    Then it reports no inspection finding for that pair of sections

  # ── Blind reader simulation ──

  @behavior
  Scenario: the reader simulation is dispatched to a separate context
    Given quill-judge holds the frozen defect catalog for the judged pass
    When quill-judge runs the judged pass over docs/setup.md
    Then it dispatches the reader simulation to a separate context
    And it does not produce the reader transcript in its own context

  @behavior
  Scenario: the blind brief carries the document, the declared path, and the audience row
    Given the spec declares one control-flow path through docs/setup.md
    And the spec's audience table carries one row naming a role and that role's goal
    When quill-judge composes the reader-simulation brief
    Then the brief carries the text of docs/setup.md
    And the brief carries that declared control-flow path
    And the brief carries that audience row

  @behavior
  Scenario: the blind brief names no defect
    Given quill-judge holds the frozen defect catalog, the spec's coverage table, and a verification.md carrying a "## Deliberate violations" record
    When quill-judge composes the reader-simulation brief
    Then the brief carries none of the catalog's entries
    And the brief carries none of the catalog's entry names
    And the brief carries neither the coverage table nor the deliberate-violation record

  @behavior
  Scenario: a reader simulation that returns no transcript is a blocker
    Given the dispatched reader-simulation context returns an empty result
    When quill-judge continues the judged pass
    Then it reports a blocker naming the failed dispatch
    And it does not read docs/setup.md itself to stand in for the transcript

  @behavior
  Scenario: a returned transcript is scored by quill-judge itself
    Given the dispatched reader-simulation context returns a reader transcript for docs/setup.md
    When quill-judge continues the judged pass
    Then it scores that transcript against the frozen defect catalog in its own context

  # ── Transcript scoring ──

  @behavior
  Scenario: the deliberate-violation record is read while scoring
    Given verification.md carries a "## Deliberate violations" row naming a catalog entry, the "## Choosing" heading, and a rationale
    And the returned transcript reports a reader stumbling at that same heading
    When quill-judge scores the transcript
    Then it records that rationale as the defense on the candidate finding for the "## Choosing" heading

  @behavior
  Scenario: a defense that only asserts deliberateness does not clear the finding
    Given the recorded rationale for the "## Choosing" heading reads "this phrasing is intentional"
    And the candidate finding for that heading carries two quotes at two distinct headings
    When quill-judge weighs that rationale
    Then it reports that finding
    And the reported finding carries the recorded rationale as its defense

  @behavior
  Scenario: a defense naming what the violation buys its reader clears the finding
    Given the recorded rationale for the "## Choosing" heading names the audience row and what the terse phrasing buys that reader
    And the candidate finding for that heading carries two quotes at two distinct headings
    When quill-judge weighs that rationale
    Then it reports no finding for the "## Choosing" heading

  @behavior
  Scenario: a group A finding shows the absence over the declared path
    Given the returned transcript reports that the "## Choosing" passage treats the term "mechanism" as already known
    And the declared path traverses "## What" and then "## Before you start" before reaching "## Choosing"
    And neither of those two earlier sections glosses "mechanism"
    When quill-judge scores that candidate
    Then it reports a finding quoting the "## Choosing" passage
    And the reported finding names the declared path and lists the two sections that path traverses before "## Choosing"

  @behavior
  Scenario: a group A candidate evidenced only as a document-wide absence is not reported
    Given the returned transcript reports that it did not find a definition of "mechanism" anywhere in docs/setup.md
    And the transcript names no path and no section it traversed
    When quill-judge scores that candidate
    Then it reports no finding for it

  @behavior
  Scenario: a group C finding quotes the spec line it disagrees with
    Given the returned transcript reports that the "## Choosing" passage tells the reader to apply the network runbook first
    And the spec's prerequisite line names a Node runtime as the one prerequisite
    When quill-judge scores that candidate
    Then it reports a finding quoting the "## Choosing" passage with its heading
    And the reported finding quotes that prerequisite line with its location in the spec

  @behavior
  Scenario: a group C candidate carrying no spec quote is not reported
    Given a candidate group C finding carries one quote from the "## Choosing" section of docs/setup.md
    And that candidate carries no quote from the spec
    When quill-judge scores that candidate
    Then it reports no finding for it

  @behavior
  Scenario: two citations resolving to one location are not a finding
    Given a candidate finding carries two quotes that both resolve to the "## Choosing" heading at line 42
    When quill-judge confirms the citation locations of that candidate
    Then it reports no finding for it

  @behavior
  Scenario: a passage firing two entries yields the finding whose repair subsumes the other
    Given the returned transcript's evidence for the "## Choosing" passage matches the undefined-term entry
    And that same evidence matches the bare-cross-reference entry
    When quill-judge scores that passage
    Then it reports exactly one finding for the "## Choosing" passage
    And the reported finding is the one whose repair also repairs the other entry

  @behavior
  Scenario: an impression matching no anchor is not reported
    Given the returned transcript states that docs/setup.md would serve its reader better with a summary table
    And that criterion appears in no frozen scenario, in neither the enumeration rule nor the defect catalog
    When quill-judge scores the transcript
    Then it reports no finding for that criterion

  @behavior
  Scenario: tone, register, length, and word choice are not reported
    Given the returned transcript states that the "## Steps" section runs long and that its register is informal
    When quill-judge scores the transcript
    Then it reports no finding for the length of that section
    And it reports no finding for the register of that section

  @behavior
  Scenario: a catalog entry colliding with a frozen scenario yields an architect observation
    Given a frozen scenario requires docs/setup.md to use the term "mechanism" in its "## Choosing" section
    And a catalog entry fires on that same use of "mechanism"
    When quill-judge scores that candidate
    Then it reports an observation owned by the architect naming the collision
    And it reports no blocker for that collision

  # ── Aggregation ──

  @behavior
  Scenario: an advisory judged finding leaves the implementation passing
    Given every frozen scenario is reported PASS
    And the enumeration rule holds for every routing in docs/setup.md
    And the judged pass produced one confirmed and undefended finding
    And the calibration row of that finding's catalog entry reads advisory
    When quill-judge aggregates the results
    Then it reports the implementation passing
    And it reports that finding marked advisory

  @behavior
  Scenario: a scenario reported SKIP does not fail the implementation
    Given four frozen scenarios are reported PASS and one is reported SKIP
    And the enumeration rule holds for every routing in docs/setup.md
    When quill-judge aggregates the results
    Then it reports the implementation passing

  @behavior
  Scenario: an evidenced inspection finding fails the implementation
    Given every frozen scenario is reported PASS
    And the enumeration rule found a routing in docs/setup.md that skips an enumerated member
    And that inspection finding carries its two quotes at two distinct headings
    When quill-judge aggregates the results
    Then it reports the implementation failing
    And it reports that inspection finding as a blocker

  @behavior
  Scenario: a scenario reported FAIL fails the implementation and blocks
    Given one frozen scenario is reported FAIL for the missing heading "## Prerequisites"
    And every other frozen scenario is reported PASS
    When quill-judge aggregates the results
    Then it reports the implementation failing
    And it names that scenario together with its blocker

  @behavior
  Scenario: it does not author the document to clear a failing scenario
    Given one frozen scenario is reported FAIL because "## Prerequisites" is absent from docs/setup.md
    When quill-judge reports the result
    Then it leaves docs/setup.md as the impl-producer wrote it
    And it returns the failure for the conductor to re-run the doc-writer

  @behavior
  Scenario: a behavior-changing gap is a blocker, not an edit
    Given quill-judge finds that a frozen scenario requires a section the spec's audience row rules out
    When quill-judge records that gap
    Then it reports a blocker naming the gap
    And it leaves spec.md and the .feature unmodified
