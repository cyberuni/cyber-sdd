@frozen
Feature: check-field-mandates — a definition's declared fields and its prose agree
  Unit suite for the block-and-prose check. Whether every field a shipped skill or agent
  definition declares in a structured block is explained, and every field its prose mandates is
  declared in one of its blocks. Never whether the field is consumed downstream, and never the
  meaning of a prose sentence that names no field.

  # ── UC1 — check every shipped definition in the tree ──

  Scenario: a declared field nothing explains is reported unexplained
    Given an agent definition whose structured block holds only the line "TARGET_PATH, WORK_MODE"
    And its prose names "WORK_MODE" as a whole word
    And nothing in the file names "TARGET_PATH" outside that declaration
    When the check runs over the tree
    Then it names the definition, the declaration's line, and "TARGET_PATH" as unexplained
    And it reports nothing against "WORK_MODE"
    And the run exits non-zero

  Scenario: a field glossed on its own declaration is explained
    Given an agent definition whose structured block declares "RETRY_COUNT: how many attempts ran"
    And nothing in the file names "RETRY_COUNT" outside that declaration
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a gloss on the line after a declaration explains it
    Given an agent definition whose structured block has the line "SUBJECT:" with nothing after the colon
    And the next line of that block reads "<the full text under evaluation>"
    And nothing in the file names "SUBJECT" outside that block
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: the next declaration ends a gloss
    Given an agent definition whose structured block has the line "SUBJECT:" with nothing after the colon
    And the next line of that block reads "WORK_MODE: the run mode"
    And nothing in the file names "SUBJECT" or "WORK_MODE" outside that block
    When the check runs over the tree
    Then it names the definition, the "SUBJECT:" line, and "SUBJECT" as unexplained
    And it reports nothing against "WORK_MODE"
    And the run exits non-zero

  Scenario: a gloss after a comma list explains every field in it
    Given an agent definition whose structured block declares "STATUS: done or failed"
    And that block also declares "TARGET_PATH, WORK_MODE, RUN_ID: the target, the run mode and the run"
    And its prose names "WORK_MODE" in a code span
    And a second definition whose structured block declares "WORK_MODE: a mode"
    And nothing in the first definition names "TARGET_PATH" or "RUN_ID" outside that declaration
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a lone token on a block line glosses the declaration before it
    Given an agent definition whose structured block holds the line "SUBJECT:" and then the line "RUN_ID"
    And nothing in the file names "SUBJECT" or "RUN_ID" outside that block
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a lone token opening a block declares nothing
    Given an agent definition whose structured block holds the line "RUN_ID" and then the line "STATUS: done or failed"
    And nothing in the file names "RUN_ID" outside that block
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a gloss stops at the end of its block
    Given an agent definition whose structured block ends with the line "SUBJECT:"
    And a prose paragraph follows the closing fence without naming "SUBJECT"
    When the check runs over the tree
    Then it names the definition, the "SUBJECT:" line, and "SUBJECT" as unexplained
    And the run exits non-zero

  Scenario: a field is named in the prose only as a whole word
    Given an agent definition whose structured block holds only the line "MODE, RUN_ID"
    And its prose names "WORK_MODE" and "RUN_ID" as whole words
    And nothing in the file names "MODE" as a whole word outside that declaration
    When the check runs over the tree
    Then it names the definition, the declaration's line, and "MODE" as unexplained
    And it reports nothing against "RUN_ID"
    And the run exits non-zero

  Scenario: a field named only in the frontmatter is unexplained
    Given an agent definition whose YAML frontmatter description names "RUN_ID"
    And whose structured block holds only the line "RUN_ID, WORK_MODE"
    And whose prose names "WORK_MODE" as a whole word
    When the check runs over the tree
    Then it names the definition, the declaration's line, and "RUN_ID" as unexplained
    And the run exits non-zero

  Scenario: a comment after a declaration's colon explains it
    Given an agent definition whose structured block holds only the line "RUN_ID:   # the run being judged"
    And nothing in the file names "RUN_ID" outside that declaration
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a bare field the prose names is explained
    Given an agent definition whose structured block declares the comma list "TARGET_PATH, WORK_MODE"
    And its prose names both "TARGET_PATH" and "WORK_MODE" as whole words
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a list-item declaration declares every bold field it opens with
    Given an agent definition whose structured block declares "STATUS: done or failed"
    And a list item reading "- **FEATURE_PATH** + **SCENARIO** — the suite and one scenario in it"
    And its prose names "FEATURE_PATH" and "SCENARIO" each in a code span
    And a second definition whose structured block declares "FEATURE_PATH: a path" and "SCENARIO: a name"
    When the check runs over the tree
    Then it reports no finding against the first definition
    And the run exits zero

  Scenario: a list-item declaration with nothing after its bold lead is unexplained
    Given an agent definition whose structured block declares "STATUS: done or failed"
    And a list item reading "- **RUN_ID**"
    And nothing else in the file names "RUN_ID"
    When the check runs over the tree
    Then it names the definition, the list item's line, and "RUN_ID" as unexplained
    And the run exits non-zero

  Scenario: a code span in a list item's gloss is a mandate like any other
    Given an agent definition whose structured block declares "STATUS: done or failed"
    And a list item reading "- **RUN_ID** — the run, or a `BLOCKER` when none started"
    And a second definition whose structured block declares "BLOCKER: why it stopped"
    When the check runs over the tree
    Then it names the agent definition, the list item's line, and "BLOCKER" as undeclared
    And the run exits non-zero

  Scenario: a fenced block tagged text is a structured block
    Given an agent definition whose only fenced block is tagged "text" and holds only the line "TARGET_PATH, WORK_MODE"
    And nothing in the file names "TARGET_PATH" or "WORK_MODE" outside that declaration
    When the check runs over the tree
    Then it names "TARGET_PATH" and "WORK_MODE" as unexplained in that definition
    And the run exits non-zero

  Scenario: a declared token's plural suffix declares the bare token
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And that block also declares "NODE_PATH(s): the node folders"
    And its prose names "NODE_PATH" in a code span
    And a second definition whose structured block declares "NODE_PATH: a node folder"
    When the check runs over the tree
    Then it reports no finding against the skill definition
    And the run exits zero

  Scenario: a line in a fenced block tagged with a language declares nothing
    Given an agent definition whose only fenced block is tagged "yaml" and holds the line "ORPHAN_KEY: 1"
    And that definition's structured block declares "STATUS: done or failed"
    And a second definition whose prose names "ORPHAN_KEY" in a code span
    And that second definition's structured block declares "STATUS: done or failed"
    When the check runs over the tree
    Then it reports no finding against either definition
    And the run exits zero

  Scenario: a field the prose mandates and no block declares is reported undeclared
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And its prose names "BLOCKER" in a code span
    And a second definition whose structured block declares "BLOCKER: why it stopped"
    When the check runs over the tree
    Then it names the skill definition, the prose line, and "BLOCKER" as undeclared
    And the run exits non-zero

  Scenario: a field the prose mandates and a block declares passes
    Given a skill definition whose structured block declares "STATUS: done or failed" and "BLOCKER: why it stopped"
    And its prose names "BLOCKER" in a code span
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a field named in the singular resolves to its plural declaration
    Given a skill definition whose structured block declares "CONTENT_GAPS: the gaps found"
    And its prose names "CONTENT_GAP" in a code span
    And a second definition whose structured block declares "CONTENT_GAP: one gap"
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a field named in the plural resolves to its singular declaration
    Given a skill definition whose structured block declares "CONTENT_GAP: one gap"
    And its prose names "CONTENT_GAPS" in a code span
    And a second definition whose structured block declares "CONTENT_GAPS: the gaps found"
    When the check runs over the tree
    Then it reports no finding against the skill definition
    And the run exits zero

  Scenario: a snake_case declaration declares a field
    Given an agent definition whose structured block holds only the line "batch_size, retry_limit"
    And its prose names "retry_limit" as a whole word
    And nothing in the file names "batch_size" outside that declaration
    When the check runs over the tree
    Then it names the definition, the declaration's line, and "batch_size" as unexplained
    And it reports nothing against "retry_limit"
    And the run exits non-zero

  Scenario: a lowercase mandate of a field this file declares in upper case is reported miscased
    Given a skill definition whose structured block declares "BATCH_SIZE: rows per write"
    And its prose names "batch_size" in a code span
    When the check runs over the tree
    Then it names the skill definition, the prose line, and "batch_size" as miscased
    And it reports nothing against "batch_size" as undeclared
    And the run exits non-zero

  Scenario: an uppercase mandate of a field this file declares in lower case is reported miscased
    Given a skill definition whose structured block declares "batch_size: rows per write"
    And its prose names "BATCH_SIZE" in a code span
    When the check runs over the tree
    Then it names the skill definition, the prose line, and "BATCH_SIZE" as miscased
    And the run exits non-zero

  Scenario: a mandate spelled as its declaration passes in either case
    Given a skill definition whose structured block declares "batch_size: rows per write" and "STATUS: done or failed"
    And its prose names "batch_size" and "STATUS" each in a code span
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a lowercase mandate of a field declared only elsewhere is reported undeclared
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And its prose names "batch_size" in a code span
    And a second definition whose structured block declares "BATCH_SIZE: rows per write"
    When the check runs over the tree
    Then it names the skill definition, the prose line, and "batch_size" as undeclared
    And the run exits non-zero

  Scenario: a lowercase word with no underscore is not a field
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And its prose names "status" in a code span
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a bare field the prose names in the other case is explained
    Given an agent definition whose structured block holds only the line "BATCH_SIZE, RETRY_LIMIT"
    And its prose names "batch_size" and "RETRY_LIMIT" as whole words, in no code span
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a lowercase word with no underscore explains no field
    Given an agent definition whose structured block holds only the line "STATUS, RETRY_LIMIT"
    And its prose names "status" and "RETRY_LIMIT" as whole words, in no code span
    And nothing else in the file names "STATUS"
    When the check runs over the tree
    Then it names the definition, the declaration's line, and "STATUS" as unexplained
    And it reports nothing against "RETRY_LIMIT"
    And the run exits non-zero

  Scenario: a mixed-case word mandates no field
    Given a skill definition whose structured block declares "BATCH_SIZE: rows per write"
    And its prose names "Batch_Size" in a code span
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a mixed-case key declares nothing
    Given an agent definition whose structured block holds the line "Batch_Size:" and then the line "STATUS: done or failed"
    And nothing in the file names "Batch_Size" outside that block
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a mixed-case word explains no field
    Given an agent definition whose structured block holds only the line "BATCH_SIZE, RETRY_LIMIT"
    And its prose names "Batch_Size" and "RETRY_LIMIT" as whole words, in no code span
    And nothing else in the file names "BATCH_SIZE" in any case
    When the check runs over the tree
    Then it names the definition, the declaration's line, and "BATCH_SIZE" as unexplained
    And the run exits non-zero

  Scenario: a field declared in both cases accepts a mandate in either
    Given a skill definition whose structured block declares "BATCH_SIZE: rows per write" and "batch_size: rows per write"
    And its prose names "BATCH_SIZE" in a code span on one line and "batch_size" in a code span on another
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a lowercase key with no underscore declares nothing
    Given an agent definition whose structured block holds the line "notes:" and then the line "STATUS: done or failed"
    And nothing in the file names "notes" outside that block
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a code span that does not open with a field is not a mandate
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And its prose names "see BLOCKER" in a code span
    And a second definition whose structured block declares "BLOCKER: why it stopped"
    When the check runs over the tree
    Then it reports no finding against the skill definition
    And the run exits zero

  Scenario: a single capital letter is not a field
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And its prose names "A" in a code span
    And a second definition whose structured block declares "STATUS: done or failed" and "A: the first option"
    When the check runs over the tree
    Then it reports no finding against either definition
    And the run exits zero

  Scenario: an uppercase code span that is no field is not a mandate
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And its prose names "TODO" in a code span
    And that definition is the tree's only definition
    When the check runs over the tree
    Then it reports no finding against that definition
    And the run exits zero

  Scenario: a field named outside a code span is not a mandate
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And its prose names "BLOCKER" as a bare word, in no code span
    And a second definition whose structured block declares "BLOCKER: why it stopped"
    When the check runs over the tree
    Then it reports no finding against the skill definition
    And the run exits zero

  Scenario: a definition that declares no field is not held to one
    Given a skill definition whose body is prose paragraphs only
    And its prose names "BLOCKER" in a code span
    And a second definition whose structured block declares "BLOCKER: why it stopped"
    When the check runs over the tree
    Then it reports no finding against the skill definition
    And the run exits zero

  Scenario: an ignore marker with a reason excuses its line
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And a prose line naming "BLOCKER" in a code span
    And that line carries "<!-- field-mandate-ignore: the judge's field, not ours -->"
    And a second definition whose structured block declares "BLOCKER: why it stopped"
    When the check runs over the tree
    Then it reports no finding against the skill definition
    And the run exits zero

  Scenario: an ignore marker excuses only its own line
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And a prose line naming "BLOCKER" in a code span, with no marker
    And a different prose line carrying "<!-- field-mandate-ignore: an unrelated note -->"
    And a second definition whose structured block declares "BLOCKER: why it stopped"
    When the check runs over the tree
    Then it names the skill definition, the unmarked line, and "BLOCKER" as undeclared
    And the run exits non-zero

  Scenario: an ignore marker without a reason excuses nothing
    Given a skill definition whose structured block declares "STATUS: done or failed"
    And a prose line naming "BLOCKER" in a code span
    And that line carries "<!-- field-mandate-ignore -->"
    And a second definition whose structured block declares "BLOCKER: why it stopped"
    When the check runs over the tree
    Then it names the skill definition, that line, and "BLOCKER" as undeclared
    And the run exits non-zero

  Scenario: every mismatch in every definition is reported in one run
    Given an agent definition whose structured block declares the bare comma list "TARGET_PATH, WORK_MODE" that nothing explains
    And a skill definition, nested two directories under its plugin's skills directory, whose structured block declares "STATUS: done or failed"
    And that skill definition's prose names "BLOCKER" in a code span
    And a third definition whose structured block declares "BLOCKER: why it stopped"
    When the check runs over the tree
    Then it names "TARGET_PATH" and "WORK_MODE" as unexplained in the agent definition
    And it names "BLOCKER" as undeclared in the skill definition
    And the run exits non-zero

  Scenario: a markdown file that is not a definition is not read
    Given a markdown file named "README.md" beside a skill's "SKILL.md"
    And a markdown file nested one directory below a plugin's "agents" directory
    And a file named "SKILL.md" under a directory that is not a plugin's "skills" directory
    And each of those three files has a structured block holding only the line "TARGET_PATH, WORK_MODE"
    And the skill's "SKILL.md" carries no mismatch
    When the check runs over the tree
    Then it reports no finding
    And the run exits zero

  Scenario: a tree with no definition passes
    Given a tree whose only file is a plugin's package manifest
    When the check runs over the tree
    Then it reports that it found no definition
    And the run exits zero

  Scenario: with no root flag the check reads the working directory
    Given a working directory holding an agent definition with an unexplained field
    When the check runs with no root flag
    Then it names that definition and the unexplained field
    And the run exits non-zero

  Scenario: the check reads the tree it is pointed at, not the working directory
    Given a tree holding an agent definition with an unexplained field
    And a working directory outside that tree
    When the check runs with the root flag naming that tree
    Then it names that definition and the unexplained field
    And the run exits non-zero

  Scenario: a root that is not a directory fails instead of passing clean
    Given the root flag names a path that is a regular file
    When the check runs
    Then it names the unusable root
    And the run exits non-zero

  Scenario: an unrecognized flag fails loudly instead of being ignored
    Given a tree holding an agent definition with an unexplained field
    And an invocation carrying a flag the check does not define and the root flag naming that tree
    When the check runs
    Then it names the unrecognized flag
    And it reports no finding against that definition
    And the run exits non-zero

  # ── The repo's own chain ──

  Scenario: the root check chain runs the field-mandate check
    Given the repository's root package manifest
    When its verify chain is read
    Then the chain invokes the field-mandate check
