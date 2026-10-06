@frozen
Feature: check-freshness — is this recorded eval result still current?
  Unit suite for the deterministic engine that compares the file hashes a result recorded against the
  files in the working tree, and returns current / stale / incomplete / absent. Every Given below names
  apparatus that DISCRIMINATES: a result filed under a directory that does not match its target, two
  results whose filename order contradicts their recorded timestamps, and a file re-timestamped without
  a content change each leave a guessing implementation unable to pass. Recording the evaluated set is
  run's contract; scoring is run's; what a caller does with a verdict is that caller's. Cross-capability
  e2e scenarios live in ../../workflows/, not here.

  # ---- Resolve the target ----

  Scenario: a node whose eval.md names a subject resolves that target
    Given a node directory whose eval.md frontmatter sets subject to a configuration path
    When the check runs against that node directory
    Then it reports that configuration path as the target it looked results up for

  Scenario: a node with no eval.md fails closed
    Given a node directory holding a frozen .feature and no eval.md
    When the check runs against that node directory
    Then it reports the missing eval.md, emits no verdict, and exits non-zero

  Scenario: an eval.md with no subject key fails closed
    Given a node directory whose eval.md frontmatter carries only the eval layers and judge keys
    When the check runs against that node directory
    Then it reports the missing subject key, emits no verdict, and exits non-zero

  # ---- Select the recorded result ----

  Scenario: a repository with no results directory reports absent
    Given a repository holding no .agents/aced/results directory
    When the check decides the verdict
    Then it reports absent and states that no result is recorded anywhere

  Scenario: a target with no recorded result reports absent
    Given a results directory holding results whose recorded target is a different configuration
    When the check decides the verdict
    Then it reports absent and states that no result is recorded for this target

  Scenario: the result is matched by the target it records, not by the directory it sits in
    Given a result whose recorded target is this configuration
    And that result sits in a results subdirectory named after a different string than this configuration path
    When the check selects the recorded result
    Then it selects that result

  Scenario: the newest result is the one whose recorded timestamp is greatest
    Given two results for the target whose alphabetical filename order is the reverse of their recorded timestamps
    When the check selects the recorded result
    Then it selects the one carrying the greatest recorded timestamp

  Scenario: an unreadable result file is skipped and named
    Given two results for the target, the one with the greatest recorded timestamp holding text that is not parseable JSON
    When the check selects the recorded result
    Then it selects the other result and names the unreadable file as skipped

  Scenario: a target whose every recorded result is unreadable reports absent
    Given every result recorded for the target holds text that is not parseable JSON
    When the check decides the verdict
    Then it reports absent and names each unreadable file

  Scenario: a result carrying no evaluated set reports absent
    Given the newest result for the target carries a timestamp, a target, a pass rate, and scenarios, and no evaluated set
    When the check decides the verdict
    Then it reports absent and states that the result carries no recorded provenance

  Scenario: a result whose evaluated set omits the suite it scored reports absent
    Given the newest result for the target reports a score for each of several named scenarios
    And its evaluated set carries no entry for the frozen .feature those scenario names come from
    When the check decides the verdict
    Then it reports absent and states that the recorded provenance contradicts the result it accompanies

  Scenario: a result whose evaluated set omits the configuration it names reports absent
    Given the newest result for the target names that configuration in its target field
    And its evaluated set carries no entry for that configuration
    When the check decides the verdict
    Then it reports absent and states that the recorded provenance omits the configuration the result names

  # ---- Decide the verdict ----

  Scenario: a result whose recorded files all match the working tree is current
    Given a result whose every evaluated entry hashes to the same content in the working tree
    When the check decides the verdict
    Then it reports current

  Scenario: a recorded subject file whose content changed makes the result stale
    Given a result whose evaluated set includes the target configuration
    And that configuration has been edited since the result was written
    When the check decides the verdict
    Then it reports stale and names that configuration as no longer matching

  Scenario: a recorded file that is no longer in the tree makes the result stale
    Given a result whose evaluated set includes a reference file the configuration used to load
    And that reference file has been deleted from the working tree
    When the check decides the verdict
    Then it reports stale and names that reference file as missing from the tree

  Scenario: a changed suite with an unchanged subject is incomplete, not stale
    Given a result whose every evaluated subject file hashes to the same content in the working tree
    And the frozen .feature recorded in that same evaluated set has been edited since the result was written
    When the check decides the verdict
    Then it reports incomplete, names the frozen .feature as no longer matching, and does not report stale

  Scenario: a subject change alongside a suite change is reported stale
    Given a result whose evaluated set includes both the target configuration and the frozen .feature
    And both of those files have been edited since the result was written
    When the check decides the verdict
    Then it reports stale rather than incomplete

  Scenario: a file touched without a content change stays current
    Given a result whose every evaluated entry hashes to the same content in the working tree
    And one of those files carries a modification time later than the result's recorded timestamp
    When the check decides the verdict
    Then it reports current

  Scenario: a file added to a recorded directory makes the result stale
    Given a result whose evaluated set records a references directory and the files that listing returned
    And a new file has been added to that directory since the result was written
    When the check decides the verdict
    Then it reports stale and names that directory as no longer matching

  Scenario: growth the result never consumed is not reported
    Given a result whose every evaluated entry hashes to the same content in the working tree
    And an assets directory sitting beside the target configuration that the configuration does not load from
    And a new file added to that assets directory since the result was written
    When the check decides the verdict
    Then it reports current and names no file as no longer matching

  # ---- Report the verdict ----

  Scenario: only a current verdict exits zero
    Given four runs of the check producing current, stale, incomplete, and absent in turn
    When the check reports each verdict
    Then the current run exits zero and the stale, incomplete, and absent runs each exit non-zero

  Scenario: it writes nothing
    Given any node directory and results directory
    When the check runs against them
    Then no file under the repository is created, modified, or deleted

  # ---- Measured records ----

  Scenario: a measured check given a suite and no arm fails closed
    Given an invocation naming a bench suite and no arm
    When the check runs
    Then it reports the missing arm option, emits no verdict, and exits non-zero

  Scenario: a suite with no measured results reports absent
    Given a repository holding no measured-results directory for the named suite
    When the check decides the verdict for that suite and an arm
    Then it reports absent and states that nothing is measured for this suite

  Scenario: a suite with no measured record for the arm reports absent
    Given a measured-results directory for the suite holding only records whose recorded arm is a different label
    When the check decides the verdict for that suite and arm
    Then it reports absent and states that no measured record is recorded for this arm

  Scenario: a measured record is matched by the arm it records, not by its file name
    Given a record whose recorded arm is this arm and whose every evaluated entry matches the working tree, filed under a name ending in a different arm label
    And a record whose recorded arm is that different label and whose evaluated entry no longer matches, filed under a name ending in this arm label
    When the check decides the verdict for this arm
    Then it reports current

  Scenario: the newest measured record is the one whose recorded createdAt is greatest
    Given two records for the arm whose alphabetical filename order is the reverse of their recorded createdAt
    And only the one carrying the greatest recorded createdAt carries an evaluated set
    When the check decides the verdict for that arm
    Then it reports current and does not state that the record carries no recorded provenance

  Scenario: an unreadable measured record is skipped and named
    Given two record files for the arm, the one sorting last by name holding text that is not parseable JSON
    When the check decides the verdict for that arm
    Then it names the unreadable file as skipped and reports the verdict of the readable record

  Scenario: a measured record carrying no evaluated set reports absent
    Given the newest record for the arm carries a suite, an arm, a createdAt, and runs, and no evaluated set
    When the check decides the verdict for that arm
    Then it reports absent and states that the record carries no recorded provenance

  Scenario: a measured record whose evaluated set omits the suite's tasks reports absent
    Given the newest record for the arm carries an evaluated set with no entry for the suite's tasks.json
    When the check decides the verdict for that arm
    Then it reports absent and states that the recorded provenance contradicts the record it accompanies

  Scenario: a measured record whose evaluated set omits the file arm's source reports absent
    Given the newest record for the arm records a file arm read from a source path
    And its evaluated set carries no entry for that source path
    When the check decides the verdict for that arm
    Then it reports absent and states that the recorded provenance omits the file arm's source

  Scenario: a measured record whose recorded files all match the working tree is current
    Given the newest record for the arm, whose every evaluated entry hashes to the same content in the working tree
    When the check decides the verdict for that arm
    Then it reports current

  Scenario: a changed task set makes the measured record stale
    Given the newest record for the arm, whose evaluated set includes the suite's tasks.json
    And that tasks.json has been edited since the record was written
    When the check decides the verdict for that arm
    Then it reports stale and names that tasks.json as no longer matching

  Scenario: a check removed since the measurement makes the measured record stale
    Given the newest record for the arm, whose evaluated set includes a file under the suite's checks directory
    And that check file has been deleted from the working tree
    When the check decides the verdict for that arm
    Then it reports stale and names that check file as missing from the tree

  Scenario: a changed file-arm source makes the measured record stale
    Given the newest record for a file arm read from a source path, whose evaluated set includes that source
    And that source file has been edited since the record was written
    When the check decides the verdict for that arm
    Then it reports stale and names that source file as no longer matching

  Scenario: only a current measured verdict exits zero
    Given three measured checks producing current, stale, and absent in turn
    When the check reports each verdict
    Then the current check exits zero and the stale and absent checks each exit non-zero

  Scenario: a measured check writes nothing
    Given any bench suite, arm, and measured-results directory
    When the check runs against them
    Then no file under the repository is created, modified, or deleted
