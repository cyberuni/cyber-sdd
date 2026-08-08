@frozen
Feature: retired-terms — flag survivors of a retired path or convention, corpus-wide
  Unit suite for the retired-term registry and its verify-time sweep. The registry format, the
  corpus-wide scan over the git-tracked files, the three narrowing devices (built-in exclusions,
  per-entry scope, two-form allow list), and the listing of what is registered. Every scenario is
  boolean and node:test-verified against the engine's own fixtures.

  # ── check-retired-terms — the sweep ──

  Scenario: the registry loads one registered term per entry
    Given a .agents/sdd/retired-terms.toml holding one [[retired]] entry with a term, a since, and a replacement
    When the engine reads the registry
    Then it holds one registered term carrying that term text, since, and replacement

  Scenario: an absent registry sweeps clean
    Given a repo with no .agents/sdd/retired-terms.toml
    When the sweep runs
    Then it reports a clean corpus and exits 0

  Scenario: a malformed registry fails the check loudly
    Given a .agents/sdd/retired-terms.toml whose contents are not parseable as the registry format
    When the sweep runs
    Then it names the parse error and exits non-zero
    And it does not report a clean corpus

  Scenario: a survivor is reported with its location and replacement
    Given a registered term
    And a tracked file inside that term's scope carrying the term on one line
    When the sweep runs
    Then the report carries that file, that line number, and the term
    And the report carries the replacement declared for that term
    And the sweep exits non-zero

  Scenario: a corpus with no survivor passes
    Given a registered term
    And no tracked file carries that term
    When the sweep runs
    Then it reports a clean corpus and exits 0

  Scenario: every survivor is reported, not the first
    Given a registered term
    And three tracked files inside that term's scope each carrying the term
    When the sweep runs
    Then the report carries a violation for each of the three files

  Scenario: provenance is never flagged
    Given a registered term
    And a ledger shard under a spec's ledger directory carrying the term
    When the sweep runs
    Then that shard contributes no violation

  Scenario: the guard's own defining document passes the guard
    Given a registered term
    And this node's own spec README, which states that term as the text it registers
    When the sweep runs
    Then that README contributes no violation

  Scenario: a file outside the entry's scope is not scanned
    Given a registered term whose scope lists one directory prefix
    And a tracked file outside that prefix carrying the term
    When the sweep runs
    Then that file contributes no violation

  Scenario: an entry with no scope scans the whole tracked tree
    Given a registered term declaring no scope
    And a tracked file at any path carrying the term
    When the sweep runs
    Then that file is reported as a violation

  Scenario: a file-only allow sanctions the whole file
    Given a registered term whose allow list names one file by path alone
    And that file carries the term on two separate lines
    When the sweep runs
    Then that file contributes no violation

  Scenario: a substring allow sanctions the lines that match it
    Given a registered term whose allow list names one file and a substring
    And a line in that file carries both the term and that substring
    When the sweep runs
    Then that line contributes no violation

  Scenario: a substring allow leaves the rest of its file guarded
    Given a registered term whose allow list names one file and a substring
    And a different line in that file carries the term without that substring
    When the sweep runs
    Then that line is reported as a violation

  Scenario: an untracked file is outside the sweep
    Given a registered term
    And a file carrying the term that git does not track
    When the sweep runs
    Then that file contributes no violation

  Scenario: the root check chain runs the sweep
    Given the repo's root package manifest
    When its check:specs script is read
    Then the script invokes the retired-terms check

  # ── check-retired-terms --list ──

  Scenario: list shows each registered term with its replacement
    Given a registry holding two registered terms
    When the engine is run with --list
    Then each term is printed with the CR that retired it and its replacement
    And it exits 0

  Scenario: list states plainly that nothing is registered
    Given a repo with no .agents/sdd/retired-terms.toml
    When the engine is run with --list
    Then it states that no term is registered
    And it exits 0
