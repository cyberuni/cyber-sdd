@frozen
Feature: The spec gate — judge a spec + suite diff and freeze on approve
  Unit suite for the spec-gate skill (the gate unit). Gate behaviors only — the
  producer's grilling/authoring behaviors live in ../spec-producer/spec-producer.feature; the
  cross-capability CR lifecycle lives in ../../acceptance/.

  # ---- Verdict ----

  Scenario: an in-leash diff self-asserts into the review queue
    Given a spec + suite diff whose assessment reads safe within the run leash
    When the spec gate runs
    Then the diff lands provisionally as an agent-asserted verdict
    And the spec joins the asynchronous review queue

  Scenario: a gated diff takes the human verdict with the digest shown first
    Given a spec + suite diff whose leash stops or whose hard floor fires
    When the spec gate runs
    Then it presents the gate digest before taking the human verdict

  Scenario: the gate never advances with a judge failure
    Given the spec-judge reports a failing scenario
    When the spec gate evaluates the diff
    Then it advances no status and reports the blocker

  Scenario: the gate never advances with an unresolved open marker
    Given the touched files still carry an open marker
    When the spec gate evaluates the diff
    Then it advances no status and reports the blocker

  Scenario: the gate never advances with a misaligned suite
    Given the spec prose contradicts a scenario in the suite
    When the spec gate evaluates the diff
    Then it advances no status and reports the blocker

  Scenario: producer and judge stay distinct actors
    Given a diff produced by the spec-producer
    When the spec gate verifies it
    Then a distinct judge actor renders the verdict
    And the judge does not edit the artifact it grades

  # ---- The three verbs and freeze ----

  Scenario: approve lands the diff and freezes each touched feature file
    Given an approved spec + suite diff
    When the gate records the approve verdict
    Then each touched .feature file is marked frozen
    And a durable per-CR gate verdict is recorded in the ledger

  Scenario: the gate verdict lands in the mission's own ledger shard
    Given the gate records an approve verdict
    When the durable gate line is written
    Then it is appended to the mission's own hash-suffixed shard file in the ledger directory
    And no shard file written by another mission is edited

  Scenario: change revises the diff and freezes nothing
    Given a spec + suite diff returned for changes
    When the gate records the change verdict
    Then no .feature file is frozen

  Scenario: reject drops the delta
    Given a spec + suite diff that fails the scope lens
    When the gate records the reject verdict
    Then the delta is dropped and nothing is frozen

  Scenario: an additive scenario folds into a frozen file without unfreezing it
    Given a frozen .feature file
    When an additive scenario is added to it
    Then the file stays frozen
    And the addition self-clears

  Scenario: a pure move or rename of a frozen file preserves its freeze
    Given a frozen .feature file
    When the file is relocated by a pure rename with no content change
    Then the file stays frozen
    And the gate raises no Clearance

  Scenario: a narrowing edit unfreezes its file and fires Clearance
    Given a frozen .feature file
    When a scenario in it is narrowed or rewritten
    Then the file is unfrozen
    And the gate escalates Clearance

  Scenario: spec.md is kept in sync and never frozen
    Given an approved spec
    When the gate freezes the touched suite files
    Then spec.md is not frozen
    And spec.md may be reworded as long as it contradicts no frozen scenario

  Scenario: an untouched feature file keeps its freeze state
    Given a CR that does not touch a given .feature file
    When the gate records its verdict
    Then that file keeps whatever freeze state it held

  # ---- The gate digest ----

  Scenario: the digest summarizes only the files the CR touched
    Given a CR that touched a subset of the project's files
    When the gate assembles the digest
    Then the digest covers only the touched files, not the whole tree

  Scenario: a touched area with no feature file reports zero scenarios
    Given a touched capability folder that has no .feature file
    When the gate assembles the digest
    Then it reports zero scenarios for that area, not an error

  Scenario: the digest renders no verdict and writes nothing
    Given the gate assembles the digest
    When the digest is produced
    Then it writes no frontmatter and renders no verdict

  Scenario: scenario changes are classified mechanically from the committed baseline
    Given a touched .feature file changed against its committed baseline
    When the gate classifies its scenario changes for the digest
    Then the added, modified, and removed scenario names come from a mechanical diff of the file
    And a purely additive change is confirmed as additive without spawning a judge round
    And a modified or removed scenario is flagged for semantic narrowing review

  # ---- Provenance and alignment ----

  Scenario: a malformed produced-by entry fails the gate closed
    Given a produced-by entry that is not a well-formed plugin-qualified name
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing

  Scenario: an uninstalled but valid recorded producer is flagged, not blocked
    Given a produced-by entry naming a producer whose plugin is uninstalled
    When the gate applies its structural checks
    Then the entry is flagged as unavailable
    And the gate is not blocked by it

  Scenario: a role with no resolvable producer fails the gate closed
    Given a required production role that resolves to no producer and no SDD default
    When the gate runs
    Then the gate fails closed and advances nothing

  # ---- Spec-type reconcile ----

  Scenario: a reference node carrying a .feature fails the gate closed
    Given a node README marked spec-type reference with a sibling .feature file
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing

  Scenario: a reference node with no Subject section fails the gate closed
    Given a node README marked spec-type reference with no Subject section
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing

  Scenario: a behavioral node with no Use Cases section fails the gate closed
    Given a node README marked spec-type behavioral with no Use Cases section
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing

  Scenario: a descriptive node raises no spec-type violation
    Given a node README with no spec-type marker
    When the gate applies its structural checks
    Then the gate raises no spec-type violation for that node

  # ---- Feature-form pre-filter ----

  Scenario: an invalid feature form fails the gate closed before the judge runs
    Given a touched .feature whose Then step is not a boolean assertion
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing
    And it does not spawn the cold judge

  Scenario: a touched feature missing a Then fails the gate closed
    Given a touched .feature with a scenario that has no Then step
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing
    And it does not spawn the cold judge

  Scenario: the feature-form check scopes to the CR's touched feature files
    Given a CR that touched a subset of the project's .feature files
    When the gate runs the feature-form check
    Then the check covers only the touched files, not the whole tree

  Scenario: a well-formed touched feature passes the pre-filter and the judge runs
    Given every touched .feature is well formed
    When the gate applies its structural checks
    Then the feature-form check raises no violation
    And the gate spawns the cold judge

  Scenario: a touched feature the Gherkin parser rejects fails the gate closed
    Given a touched .feature the pinned Gherkin parser cannot parse
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing
    And it does not spawn the cold judge

  Scenario: a parse failure is reported with the line it occurred on
    Given a touched .feature the pinned Gherkin parser cannot parse
    When the gate runs the feature-form check
    Then the check reports the parse failure and the line it occurred on

  Scenario: a parse failure replaces the form findings rather than joining them
    Given a touched .feature the pinned Gherkin parser cannot parse
    When the gate runs the feature-form check
    Then the check reports the parse failure for that file
    And it reports no form finding read from that file

  Scenario: the corpus sweep fails closed on an unparseable suite
    Given a .feature in the corpus the pinned Gherkin parser cannot parse
    When the feature-form check runs over the whole corpus
    Then the check fails closed and names the unparseable file

  Scenario: the corpus sweep raises no parse violation when every suite parses
    Given every .feature in the corpus parses
    When the feature-form check runs over the whole corpus
    Then the check raises no parse violation
    And the check does not fail closed

  Scenario: a touched feature that parses raises no parse violation
    Given a touched .feature the pinned Gherkin parser parses
    When the gate runs the feature-form check
    Then the check raises no parse violation for that file

  # ---- Referenced-artifact-exists pre-filter ----

  Scenario: an unresolved reference the CR introduces is surfaced for judgment, not hard-blocked
    Given a touched spec.md or README whose CR-introduced backtick path does not resolve on disk
    When the gate applies its structural checks
    Then the gate surfaces the unresolved introduced reference as a judgment finding
    And it does not fail the gate closed on that reference alone
    And it still spawns the cold judge

  Scenario: a pre-existing unresolved reference in a file touched for other reasons is not gated
    Given a touched spec.md or README carrying a pre-existing backtick path, unchanged by the CR, that does not resolve on disk
    When the gate applies its structural checks
    Then the referenced-artifact check raises no finding for that pre-existing path

  Scenario: a template placeholder or glob in an introduced path is not a finding
    Given a touched spec.md or README whose CR-introduced path contains a template placeholder or a glob
    When the gate applies its structural checks
    Then the referenced-artifact check raises no finding for that path

  Scenario: the referenced-artifact check scopes to the paths the CR introduced
    Given a touched spec.md or README carrying both pre-existing and CR-introduced backtick paths
    When the gate runs the referenced-artifact check
    Then the check covers only the CR-introduced paths, not every path in the touched files

  Scenario: every introduced reference resolving raises no finding and the judge runs
    Given every backtick path the CR introduced in the touched spec.md and README files resolves on disk
    When the gate applies its structural checks
    Then the referenced-artifact check raises no finding
    And the gate spawns the cold judge

  # ---- Referenced-artifact-exists: sibling-prose sweep ----

  Scenario: an unresolved reference the CR introduces in a design or nested node doc is surfaced for judgment
    Given a touched prose .md under the spec tree other than spec.md or README whose CR-introduced backtick path does not resolve on disk
    When the gate applies its structural checks
    Then the gate surfaces the unresolved introduced reference as a judgment finding
    And it does not fail the gate closed on that reference alone
    And it still spawns the cold judge

  Scenario: an introduced reference resolving in a design or nested node doc raises no finding
    Given a touched prose .md under the spec tree other than spec.md or README whose CR-introduced backtick path resolves on disk
    When the gate applies its structural checks
    Then the referenced-artifact check raises no finding for that file
    And the gate spawns the cold judge

  Scenario: the referenced-artifact sweep covers every touched prose .md under the spec tree
    Given a CR that touched prose .md files beyond spec.md and README under the spec tree
    When the gate runs the referenced-artifact check
    Then every touched prose .md file is covered by the check

  Scenario: the sibling-prose sweep stays scoped to the touched files and never the whole tree
    Given a CR that touched a subset of the prose .md files under the spec tree
    When the gate runs the referenced-artifact check
    Then the check covers only the touched files, not the whole tree

  Scenario: a touched prose .md outside the spec tree is not swept
    Given a prose .md file the CR touched that lies outside the spec tree
    When the gate runs the referenced-artifact check
    Then that file is not covered by the sibling-prose sweep

  # ---- Use-case coverage pre-filter ----

  Scenario: a Use Cases table row naming a scenario absent from the sibling feature fails the gate closed
    Given a touched behavioral spec.md whose Use Cases table row names a scenario that does not resolve in the sibling .feature
    When the gate applies its structural checks
    Then the gate fails closed and advances nothing
    And it does not spawn the cold judge

  Scenario: a Use Cases table whose every row resolves to a real scenario raises no violation
    Given a touched behavioral spec.md whose every Use Cases table row names a scenario present in the sibling .feature
    When the gate applies its structural checks
    Then the use-case-coverage check raises no violation

  Scenario: a spec.md with no Use Cases section raises no use-case-coverage violation
    Given a touched reference or descriptive spec.md that carries no Use Cases section
    When the gate applies its structural checks
    Then the use-case-coverage check raises no violation for that file

  Scenario: prose or EARS use cases carry no row to link and stay judge-checked
    Given a touched behavioral spec.md whose Use Cases are written as prose or EARS with no Scenario cell
    When the gate applies its structural checks
    Then the use-case-coverage check raises no mechanical violation for that file

  Scenario: the use-case-coverage check scopes to the CR's touched behavioral spec.md files
    Given a CR that touched a subset of the project's behavioral spec.md files
    When the gate runs the use-case-coverage check
    Then the check covers only the touched files, not the whole tree

  # ---- Structural edit-class classification (freeze integrity) ----

  Scenario: the edit class of a touched frozen file comes from a per-scenario structural diff, not a raw line diff
    Given a touched frozen .feature changed against its committed baseline
    When the gate classifies its edit class
    Then the added, modified, and removed scenarios come from a per-named-scenario structural diff
    And the classification does not rely on the raw line diff

  Scenario: a step reassigned off a frozen scenario onto a new scenario is classified as a narrowing
    Given a frozen .feature whose baseline scenario loses a step reassigned onto a newly added adjacent scenario
    When the gate classifies its edit class
    Then the losing baseline scenario is classified as modified
    And the change is not classified as purely additive

  Scenario: a rewritten step DocString is classified as a narrowing
    Given a touched frozen .feature whose baseline scenario has only a step's DocString content rewritten
    When the gate classifies its edit class
    Then that baseline scenario is classified as modified
    And the change is not classified as purely additive

  Scenario: a rewritten step DataTable is classified as a narrowing
    Given a touched frozen .feature whose baseline scenario has only a step's DataTable cell values rewritten
    When the gate classifies its edit class
    Then that baseline scenario is classified as modified
    And the change is not classified as purely additive

  Scenario: a rewritten step DocString media type is classified as a narrowing
    Given a touched frozen .feature whose baseline scenario has only a step's DocString media type rewritten
    When the gate classifies its edit class
    Then that baseline scenario is classified as modified
    And the change is not classified as purely additive

  Scenario: a re-indented step DocString is classified as no content change
    Given a touched frozen .feature whose baseline scenario has a step's DocString re-indented with its content intact
    When the gate classifies its edit class
    Then that baseline scenario is classified as unchanged

  Scenario: a swapped step DocString delimiter is classified as no content change
    Given a touched frozen .feature whose baseline scenario has a step's DocString delimiter swapped with its content intact
    When the gate classifies its edit class
    Then that baseline scenario is classified as unchanged

  Scenario: a realigned step DataTable is classified as no content change
    Given a touched frozen .feature whose baseline scenario has a step's DataTable column padding realigned with its cell values intact
    When the gate classifies its edit class
    Then that baseline scenario is classified as unchanged

  Scenario: a frozen scenario pushed down the file by an insertion above it is classified as no content change
    Given a touched frozen .feature whose baseline scenario is pushed down the file by a whole scenario added above it, its own steps and arguments intact
    When the gate classifies its edit class
    Then that baseline scenario is classified as unchanged
    And the change is classified as purely additive

  Scenario: a narrowing detected on a frozen file fires Clearance rather than self-clearing
    Given the edit class of a touched frozen file is a narrowing of a baseline scenario
    When the gate evaluates the diff
    Then the gate unfreezes the file and fires Clearance for the narrowing
    And the narrowing does not self-clear as an additive change

  Scenario: a narrowing the CR pre-authorized for Clearance self-clears within the leash
    Given a narrowing of a frozen scenario that the CR pre-authorized for Clearance
    When the gate evaluates the diff
    Then the narrowing self-clears within the run leash
    And the gate escalates no hard floor for it

  Scenario: a whole additive scenario on a frozen file is classified as additive and self-clears
    Given a frozen .feature whose only change is whole added scenarios
    When the gate classifies its edit class
    Then the change is classified as purely additive
    And it self-clears without firing Clearance

  Scenario: a pure rename of a frozen file is classified as no content change
    Given a touched frozen .feature relocated by a pure rename with no content delta
    When the gate classifies its edit class
    Then the change is classified as no content change
    And the file stays frozen and fires no Clearance

  Scenario: the structural edit-class classification scopes to the CR's touched feature files
    Given a CR that touched a subset of the project's .feature files
    When the gate classifies edit classes
    Then it classifies only the touched files, not the whole tree

  # ---- Structural edit-class: an input it cannot classify ----

  Scenario: a touched frozen file the structural differ cannot parse is classified unclassifiable
    Given a touched frozen .feature whose structural diff reports a parse error for it
    When the gate classifies its edit class
    Then the change is classified as unclassifiable
    And the gate escalates it to Clearance rather than self-clearing

  Scenario: a parse error is never read as an absence of change
    Given a touched frozen .feature whose structural diff reports a parse error for it
    When the gate classifies its edit class
    Then the change is not classified as no content change
    And the change is not classified as additive

  Scenario: the classifier does not trust addOnly when the differ reports a parse error
    Given a structural diff reporting addOnly true and a parse error for the same file
    When the gate classifies its edit class
    Then the classification comes from the parse error and not from addOnly

  Scenario: a file the structural differ returns no result for is classified unclassifiable
    Given a touched frozen .feature the structural differ returns no per-file result for
    When the gate classifies its edit class
    Then the change is classified as unclassifiable
    And the gate escalates it rather than self-clearing

  Scenario: a structural differ that produces no readable result is classified unclassifiable
    Given the structural differ exits without producing a readable result for a touched frozen .feature
    When the gate classifies its edit class
    Then the change is classified as unclassifiable
    And the gate escalates it rather than self-clearing

  Scenario: an unclassifiable edit class advances no status
    Given a touched frozen .feature whose edit class is unclassifiable
    When the gate evaluates the diff
    Then the gate advances no status

  Scenario: a pure rename of an unparseable frozen file stays no content change
    Given a touched frozen .feature the parser cannot parse, relocated by a pure rename with no content delta
    When the gate classifies its edit class
    Then the change is classified as no content change
    And the classification comes from the rename detection and not from the structural differ

  Scenario: an unparseable file carrying no frozen tag is skipped by the edit-class routing
    Given a touched .feature the parser cannot parse that carries no frozen tag in either version
    When the gate classifies its edit class
    Then the file is skipped by the edit-class routing
    And the feature-form check still fails the gate closed on it
