@frozen
Feature: check-plugin-manifests — no manifest declares a component the package does not ship
  Unit suite for the manifest guard. Whether a declared pointer will arrive on an installer's
  machine — resolved against disk, and against the publish allowlist for a package that
  publishes. Never whether the component works once loaded, and never the manifest's schema.

  # ── UC1 — check every plugin manifest in the tree ──

  Scenario: a manifest pointer that resolves to nothing fails the check
    Given a canonical manifest that declares a component pointer
    And the directory that pointer names does not exist
    When the guard runs over the tree
    Then it names the manifest, the key, and the unresolved pointer
    And the run exits non-zero

  Scenario: a dead pointer in a generated vendor manifest is caught too
    Given a generated vendor manifest that declares a component pointer
    And the directory that pointer names does not exist
    When the guard runs over the tree
    Then it names the vendor manifest as carrying the unresolved pointer
    And the run exits non-zero

  Scenario: a pointer under a component key the guard does not know is checked the same way
    Given a canonical manifest that declares a "./"-prefixed path under the key "prompts"
    And the directory that path names does not exist
    When the guard runs over the tree
    Then it names the manifest, the key, and the unresolved pointer
    And the run exits non-zero

  Scenario: pointers that resolve pass, whichever manifest location they sit at
    Given a tree whose only manifests are one canonical and one generated vendor manifest
    And every pointer they declare names a directory that exists
    And each also declares a homepage whose value is an absolute URL
    When the guard runs over the tree
    Then it reports no finding against either manifest
    And the run exits zero

  Scenario: a package marked private has its files allowlist left unread
    Given a tree whose only manifest belongs to a package that declares private
    And that manifest declares a component pointer naming a directory that exists
    And the package's files allowlist omits that directory
    When the guard runs over the tree
    Then it reports no finding against that manifest
    And the run exits zero

  Scenario: a package that declares no files allowlist has its publish check skipped
    Given a tree whose only manifest belongs to a package that does not declare private
    And that package declares no files allowlist
    And that manifest declares a component pointer naming a directory that exists
    When the guard runs over the tree
    Then it reports no finding against that manifest
    And the run exits zero

  Scenario: a package that publishes and will not ship a declared component fails
    Given a package that does not declare private
    And it declares a files allowlist
    And its manifest declares a component pointer naming a directory that exists
    And the files allowlist omits that directory
    When the guard runs over the tree
    Then it names the pointer as declared but unpublished
    And the run exits non-zero

  Scenario: a package that publishes everything it declares passes
    Given a tree whose only manifest belongs to a package that does not declare private
    And that manifest declares a component pointer naming a directory that exists
    And the package's files allowlist names that directory
    When the guard runs over the tree
    Then it reports no finding against that manifest
    And the run exits zero

  Scenario: a pointer dead on disk is reported once, not again as unpublished
    Given a package that does not declare private
    And it declares a files allowlist
    And its manifest declares a component pointer naming a directory that does not exist
    And the files allowlist omits that directory
    When the guard runs over the tree
    Then it names that pointer once, as unresolved
    And it reports no separate unpublished finding for that pointer
    And the run exits non-zero

  Scenario: an unparseable manifest fails instead of being skipped
    Given a manifest file whose contents are not valid JSON
    When the guard runs over the tree
    Then it names that manifest as unreadable
    And the run exits non-zero

  Scenario: every dead pointer within one manifest is reported
    Given a canonical manifest that declares two component pointers
    And neither directory those pointers name exists
    When the guard runs over the tree
    Then it names both unresolved pointers
    And the run exits non-zero

  Scenario: every dead pointer is reported, not only the first
    Given two manifests in the tree
    And each declares a component pointer naming a directory that does not exist
    When the guard runs over the tree
    Then it names the unresolved pointer in both manifests
    And the run exits non-zero

  Scenario: the sweep continues past an unparseable manifest
    Given a manifest file whose contents are not valid JSON
    And a second manifest that sorts after it by path
    And that second manifest declares a component pointer naming a directory that does not exist
    When the guard runs over the tree
    Then it names the unreadable manifest
    And it names the unresolved pointer in the second manifest
    And the run exits non-zero

  Scenario: a tree with no plugin manifest passes
    Given a tree holding a package manifest at its root
    And no manifest at any conventional plugin-manifest location
    When the guard runs over the tree
    Then it reports that it found no manifest
    And the run exits zero

  Scenario: the guard checks the tree it is pointed at, not the working directory
    Given a tree holding a manifest whose pointer names a directory that does not exist
    And a working directory outside that tree
    When the guard runs with the root flag naming that tree
    Then it names the manifest, the key, and the unresolved pointer
    And the run exits non-zero

  Scenario: an unrecognized flag fails loudly instead of being ignored
    Given an invocation carrying a flag the guard does not define
    When the guard runs
    Then it names the unrecognized flag
    And the run exits non-zero without checking any manifest

  # ── The repo's own chain ──

  Scenario: the root check chain runs the manifest guard
    Given the repository's root package manifest
    When its verify chain is read
    Then the chain invokes the manifest guard
