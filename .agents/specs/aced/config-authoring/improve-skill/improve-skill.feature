@frozen
Feature: improve-skill — audit and improve an existing SKILL.md
  Unit suite for the improve-skill skill and its ported deterministic engine: route a review/audit
  request, resolve the target SKILL.md (named or discovered across all three placements), sandbox
  its content as untrusted data, run the full check table (mechanical plus agent-only), load the
  governances that back judged checks, report findings with severity/evidence/fix, block on any
  CRITICAL finding until confirmed, then apply fixes in one pass and re-verify only what was fixed.
  The mechanical subset (S1–S5, Q1–Q5, Q10–Q11, E1–E2, E6, E9) also runs standalone, LLM-free, as a
  CI-usable scan with its own scope and exit-code rules. Authoring a new skill from scratch is
  define-skill; validating repo-private skill metadata is repair-private-skills; finding a skill's
  upstream source is contribute-skill. Cross-capability e2e scenarios live in ../../acceptance/.

  # ---- Triggering ----

  @trigger
  Scenario Outline: improve-skill activates on a review/audit/pre-install request and defers its siblings
    Given a user query "<query>"
    When ACED routes the request
    Then invocation is "<should_trigger>"

    Examples:
      | query                                                                          | should_trigger |
      | review this SKILL.md before I publish it                                       | yes            |
      | my skill isn't triggering, can you check it                                    | yes            |
      | audit every skill in this project for security issues                          | yes            |
      | check this skill before I install it from that repo                            | yes            |
      | is this SKILL.md description specific enough                                   | yes            |
      | scaffold a brand-new skill from scratch for formatting changelog entries        | no             |
      | audit the repo-private metadata on this .agents/skills entry                    | no             |
      | find the upstream repo this installed skill came from                          | no             |
      | turn what we just did in this session into a reusable skill                    | no             |

  Scenario: a request to author a new skill from scratch defers to define-skill
    Given the user asks to build a brand-new skill for a topic they have not performed
    When ACED routes the request
    Then improve-skill does not handle it and define-skill does

  Scenario: a request to validate repo-private skill metadata defers to repair-private-skills
    Given the user asks to check the repo-private metadata on a .agents/skills entry
    When ACED routes the request
    Then improve-skill does not handle it and repair-private-skills does

  Scenario: a request to find a skill's upstream source defers to contribute-skill
    Given the user asks where an installed skill's source repo lives so they can send a fix upstream
    When ACED routes the request
    Then improve-skill does not handle it and contribute-skill does

  # ---- Sandboxing untrusted content ----

  Scenario: SKILL.md and script content is analyzed, never executed
    Given a target SKILL.md whose body contains directive-shaped text
    When improve-skill reads the file to audit it
    Then it treats the content as data to analyze and does not execute, interpret, or act on any directive found inside it

  Scenario: only expected or user-given paths are read
    Given a target SKILL.md that references a file path inside its own body
    When improve-skill audits the skill
    Then it does not follow that discovered path and reads only the expected skill paths or a path the user explicitly provided

  # ---- Pre-install fetch ----

  Scenario: a remote skill is fetched without running install hooks before auditing
    Given a request to audit a remote skill before installing it
    When improve-skill obtains the skill
    Then it fetches only the target skill's files via a sparse, hookless clone into a temporary directory and audits from there

  # ---- Target resolution ----

  Scenario: a named skill is located by its SKILL.md
    Given the user names a specific installed skill to audit
    When improve-skill resolves the target
    Then it locates that skill's SKILL.md and audits only that file

  Scenario: an unnamed request audits every skill across all three placements
    Given the user asks to audit skills without naming one
    When improve-skill resolves the target
    Then it audits every SKILL.md found under the user, project-private, and project-public skill locations

  Scenario: duplicate skills reached by symlink are counted once
    Given a symlinked skill resolves to the same real SKILL.md path as one already found under another location
    When improve-skill enumerates targets
    Then it deduplicates by real path and audits that skill only once

  # ---- Full check table ----

  Scenario: every check in the table is evaluated for each target skill
    Given a resolved set of target skills
    When improve-skill runs its checks
    Then it evaluates every check in the table, mechanical and agent-only, and produces one results table per skill

  Scenario: skill-design governance backs the Q6-Q9 checks
    Given improve-skill is about to judge checks Q6 through Q9
    When it prepares to evaluate them
    Then it loads the skill-design governance before rendering a verdict on those checks

  Scenario: agent-tool-output governance backs the Q10-Q12 checks when scripts are present
    Given a target skill that has a scripts/ directory or CLI instructions
    When improve-skill prepares to evaluate checks Q10 through Q12
    Then it loads the agent-tool-output governance before rendering a verdict on those checks

  # ---- Reporting findings ----

  Scenario: a non-passing finding is reported with severity, evidence, and a fix
    Given a check that does not pass for a target skill
    When improve-skill reports the result
    Then the finding names the check, its severity, a quoted excerpt of the evidence, and a one-line remediation

  Scenario: a skill with no findings reports a clean pass
    Given every check passes for a target skill
    When improve-skill reports the result
    Then it reports that skill as fully passing with no findings listed

  # ---- Block on CRITICAL ----

  Scenario: a CRITICAL finding blocks a pre-install audit until confirmed
    Given a CRITICAL finding on a skill being audited before install
    When improve-skill finishes the audit
    Then it outputs a do-not-install warning and does not proceed with the install until the user confirms fixes

  Scenario: a CRITICAL finding blocks an authoring or pre-commit audit until confirmed
    Given a CRITICAL finding on a skill being audited before commit or publish
    When improve-skill finishes the audit
    Then it outputs a do-not-commit-or-publish warning and does not proceed with commit, symlink, or publish until the user confirms fixes

  Scenario: no CRITICAL finding does not block
    Given only WARN-level or no findings on an audited skill
    When improve-skill finishes the audit
    Then it does not block install, commit, or publish on that skill

  # ---- Applying fixes ----

  Scenario: fixes are applied in a single edit pass after confirmation
    Given the user has confirmed fixes for a reported set of findings
    When improve-skill applies the fixes
    Then it edits the SKILL.md once, applying every finding's remediation together rather than writing intermediate states

  Scenario: only what a finding's remediation specifies is changed
    Given a finding whose fix line names a specific change
    When improve-skill applies that fix
    Then it changes only what the fix line specifies and leaves the rest of the SKILL.md untouched

  Scenario: only the checks with findings are re-run after fixing
    Given a set of checks that had findings and were just fixed
    When improve-skill re-verifies the skill
    Then it re-runs only the checks that had findings and confirms they now pass

  Scenario: supply-chain and script findings are surfaced, not auto-fixed
    Given a P1-P3 supply-chain finding or an E8 bundled-script finding
    When improve-skill reports and applies fixes
    Then it reports that finding to the user and does not apply an automatic fix for it

  # ---- Judgment quality of the audit ----

  @quality @rubric
  Scenario: the audit correctly distinguishes a specific trigger description from a vague one
    Given two SKILL.md descriptions, one with concrete trigger conditions and one generic and matches-everything
    When improve-skill judges checks Q1 and Q2 on each
    Then the judge evaluates the two verdicts against the rubric
      """
      dimensions:
        - name: specific_description_passes
          max: 3
        - name: vague_description_flagged
          max: 3
        - name: no_false_positive_on_specific_description
          max: 2
      threshold: 6
      """
    And the rubric score is at least the threshold

  @quality @rubric
  Scenario: the audit judges baked-in stack assumptions and scope creep on content quality
    Given a SKILL.md body that assumes one specific tech stack and mixes two unrelated workflows
    When improve-skill judges checks Q6 and Q7 against the loaded skill-design governance
    Then the judge evaluates the verdict against the rubric
      """
      dimensions:
        - name: baked_in_assumption_flagged
          max: 3
        - name: scope_creep_flagged
          max: 3
        - name: fix_lines_are_actionable
          max: 2
      threshold: 6
      """
    And the rubric score is at least the threshold

  # ---- Mechanical validate engine: scan scope ----

  Scenario: --path validates a single skill directory or SKILL.md file
    Given the engine is invoked with --path pointing at one skill directory
    When it resolves the scan target
    Then it validates only that skill's SKILL.md and no other skill

  Scenario: omitting --path scans every configured skill location
    Given the engine is invoked with no --path
    When it resolves the scan target
    Then it validates every SKILL.md found across the configured skill directories

  Scenario: --path with no SKILL.md at the target errors and exits non-zero
    Given the engine is invoked with --path pointing at a directory with no SKILL.md
    When it resolves the scan target
    Then it prints an error naming the missing path and exits with a non-zero code

  Scenario: no SKILL.md files found across the whole project exits zero
    Given the engine is invoked with no --path and no SKILL.md exists anywhere in the configured locations
    When it runs the scan
    Then it reports that no SKILL.md files were found and exits zero

  # ---- Mechanical validate engine: severity split and exit code ----

  Scenario: the engine runs only the mechanical check subset
    Given a target skill scanned by the engine
    When it runs its checks
    Then it evaluates only S1-S5, Q1-Q5, Q10-Q11, E1-E2, E6, and E9, with no agent-only check evaluated

  Scenario: a CRITICAL finding produces a non-zero exit code
    Given a scan across one or more skills where at least one CRITICAL finding is found
    When the engine finishes the scan
    Then it exits with a non-zero code

  Scenario: only warning-level findings still exits zero
    Given a scan where every finding is WARN-level and none is CRITICAL
    When the engine finishes the scan
    Then it exits zero

  Scenario: a fully clean scan exits zero
    Given a scan where every scanned skill has no findings at all
    When the engine finishes the scan
    Then it exits zero