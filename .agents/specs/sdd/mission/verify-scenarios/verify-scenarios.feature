@frozen
Feature: The verify-scenarios procedure — bridge frozen scenarios to test reports
  Unit suite for the verify-scenarios engine. Deterministic scenario→test-report bridge: derive a
  frozen .feature's scenario set, union the configured sources' results, and classify each scenario
  PASS / FAIL / UNBOUND so the impl-judge reasons by hand only over the UNBOUND set. Read-only and
  advisory. Cross-capability e2e scenarios live in ../../acceptance/.

  # ── Read the source set ──

  Scenario: a source block parses into an adapter, command, and report path
    Given a bridge config with one source block declaring an adapter, command, and report path
    When verify-scenarios reads the source set
    Then it yields one source carrying that adapter, command, and report path

  Scenario: multiple source blocks parse into multiple sources
    Given a bridge config with two source blocks
    When verify-scenarios reads the source set
    Then it yields both sources in declaration order

  Scenario: a source block missing a required field is dropped
    Given a bridge config with a source block missing its adapter or its report path
    When verify-scenarios reads the source set
    Then that block yields no source

  Scenario: an absent or malformed config yields no sources without throwing
    Given a bridge config that is absent or malformed
    When verify-scenarios reads the source set
    Then it yields no sources and does not throw

  # ── Derive the scenario keys ──

  Scenario: a plain scenario is keyed on its verbatim name
    Given a frozen scenario with no id tag
    When verify-scenarios derives its key
    Then the key is the scenario's verbatim name

  Scenario: an id tag overrides the scenario name as its key
    Given a frozen scenario carrying an id tag
    When verify-scenarios derives its key
    Then the key is the id tag's slug rather than the name

  Scenario: a Scenario Outline is one key, not one per Examples row
    Given a frozen Scenario Outline with several Examples rows
    When verify-scenarios derives its keys
    Then it yields one key, the outline's name

  Scenario: a tag that is not an id tag does not become the key
    Given a frozen scenario carrying a tag that is not an id tag
    When verify-scenarios derives its key
    Then the key is the scenario's verbatim name

  # ── The junit adapter ──

  Scenario: a testcase binds to the node named by its spec segment at any depth
    Given a junit testcase whose name carries a spec:<node> segment nested at any depth
    When the junit adapter maps the testcase
    Then the result's node is that spec segment's node

  Scenario: a testcase whose name carries no spec segment binds to no node
    Given a junit testcase whose name carries no spec:<node> segment
    When the junit adapter maps the testcase
    Then it produces no bound result

  Scenario: a testcase leaf's id tag overrides the leaf name as its key
    Given a junit testcase whose leaf segment is an id tag
    When the junit adapter maps the testcase
    Then the result's key is the id tag's slug rather than the leaf name

  Scenario: a testcase outcome is failure, skipped, or pass from its child element
    Given a junit testcase with a failure child, a skipped child, or neither
    When the junit adapter reads its outcome
    Then the outcome is fail, skip, or pass respectively

  Scenario: a testcase classname and name are read by attribute name and unescaped
    Given a junit testcase whose classname and name carry XML entities
    When the junit adapter reads them
    Then it reads them by attribute name, not position, and unescapes the entities

  Scenario: a testcase name carrying a literal greater-than is not truncated
    Given a junit testcase whose name embeds a literal greater-than from a " > "-joined title
    When the junit adapter parses the opening tag
    Then the full name is captured rather than truncated at the greater-than

  # ── Union and fold ──

  Scenario: results from every configured source are unioned before the fold
    Given two sources each contributing a result for the node
    When verify-scenarios folds the run
    Then both sources' results are unioned before classification

  Scenario: a scenario with no bound result is UNBOUND
    Given a frozen scenario with no result bound to its key
    When verify-scenarios folds the run
    Then that scenario is UNBOUND

  Scenario: a scenario with a passing result and no failure is PASS
    Given a frozen scenario with at least one passing result and no failing result for its key
    When verify-scenarios folds the run
    Then that scenario is PASS

  Scenario: a scenario key with any failing result is FAIL
    Given a frozen scenario whose key has any failing result
    When verify-scenarios folds the run
    Then that scenario is FAIL

  Scenario: a result bound to another node is excluded from this node's fold
    Given a result whose node differs from the node under verification
    When verify-scenarios folds the run
    Then that result is excluded from this node's fold

  Scenario: a bound result matching no scenario key is an EXTRA, not a failure
    Given a bound result whose key matches no frozen scenario
    When verify-scenarios folds the run
    Then it is reported as an EXTRA and does not fail the run

  # ── Exit status ──

  Scenario: the tool exits non-zero when any scenario is UNBOUND or FAIL
    Given a run where at least one scenario is UNBOUND or FAIL
    When verify-scenarios finishes
    Then it exits non-zero

  Scenario: the tool exits zero only when every scenario is bound and passing
    Given a run where every scenario is bound and passing
    When verify-scenarios finishes
    Then it exits zero

  # ── The CLI surface ──

  Scenario: a report path given directly bypasses the configured sources
    Given a single junit report path given directly on the command line
    When verify-scenarios runs
    Then it reads that one ad-hoc junit source and does not read the bridge config

  Scenario: the run flag executes each source's command before reading its report
    Given a source carrying a command
    When verify-scenarios runs with the run flag
    Then it executes the command before reading the report

  Scenario: without the run flag an existing report is read as-is
    Given a source carrying a command and an already-produced report
    When verify-scenarios runs without the run flag
    Then it reads the existing report without executing the command

  Scenario: the report renders in the requested format, defaulting to text
    Given a completed fold report
    When verify-scenarios renders it with no format flag, or with json or toon requested
    Then it emits text by default and the requested format otherwise

  Scenario: a missing feature or node argument prints usage and exits non-zero
    Given a run missing its required feature or node argument
    When verify-scenarios runs
    Then it prints usage and exits non-zero

  # ── Path resolution ──

  Scenario: an absolute path argument is used verbatim, not double-prefixed under root
    Given a --feature, --report, or --config given as an absolute path
    When verify-scenarios resolves it against --root
    Then the absolute path is used as-is rather than joined beneath --root

  Scenario: a relative path argument resolves beneath root
    Given a --feature, --report, or --config given as a path relative to --root
    When verify-scenarios resolves it against --root
    Then it resolves beneath --root, which defaults to the current directory

  # ── Monorepo rooting (feature-root vs. bridge/report-root) ──

  Scenario: a feature-root argument resolves --feature beneath it instead of --root
    Given a --feature-root distinct from --root
    When verify-scenarios resolves a relative --feature path
    Then it resolves beneath --feature-root rather than --root

  Scenario: without feature-root, --feature falls back to resolving beneath root
    Given no --feature-root argument
    When verify-scenarios resolves a relative --feature path
    Then it resolves beneath --root, the same as before feature-root existed

  Scenario: the config default path, --report, and every source's reportPath stay rooted under root regardless of feature-root
    Given a --feature-root distinct from --root
    When verify-scenarios resolves --config's default path, an ad-hoc --report, or a source's reportPath
    Then each still resolves beneath --root, never --feature-root

  Scenario: an absolute --feature path is used verbatim even with a distinct feature-root
    Given a --feature-root distinct from --root and a --feature given as an absolute path
    When verify-scenarios resolves --feature
    Then the absolute path is used as-is rather than joined beneath --feature-root

  # ── Boundaries ──

  Scenario: the engine writes nothing
    Given verify-scenarios verifying a frozen feature against the configured reports
    When it emits its report
    Then it writes no file and emits only to stdout

  Scenario: the scenario set comes from gherkin-cli, not a re-implemented parser
    Given verify-scenarios deriving the scenario set from a frozen feature
    When it needs the scenarios
    Then it obtains them from gherkin-cli rather than a re-implemented Gherkin parser
