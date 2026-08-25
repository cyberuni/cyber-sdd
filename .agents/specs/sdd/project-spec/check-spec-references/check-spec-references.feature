@frozen
Feature: The check-spec-references procedure — every relative reference in a spec node resolves
  Unit suite for the check-spec-references tool. Deterministic, read-only, single-severity: it
  resolves the explicitly-relative references a project spec's .md files carry and reports the
  ones that resolve to nothing. Cross-capability e2e scenarios live in ../../workflows/.

  # ── The two reference forms ──

  Scenario: a markdown link to a path that does not exist is reported
    Given a node whose README links a relative path with no file or directory at it
    When check-spec-references audits the project-spec
    Then it reports that reference

  Scenario: a link target is extracted whichever inline form carries it
    Given links to the same missing path written plain, with a title, in angle brackets, and as a reference definition
    When check-spec-references audits the project-spec
    Then each is extracted as the same reference

  Scenario: a markdown link to a path that exists is not reported
    Given a node whose README links a relative path that exists
    When check-spec-references audits the project-spec
    Then it reports no finding for that reference

  Scenario: an inline-code path that does not exist is reported
    Given a node whose README carries a relative path in an inline-code span with nothing at it
    When check-spec-references audits the project-spec
    Then it reports that reference

  Scenario: an inline-code path that exists is not reported
    Given a node whose README carries a relative path in an inline-code span that exists
    When check-spec-references audits the project-spec
    Then it reports no finding for that reference

  # ── Resolution is against the file's own directory ──

  Scenario: a reference resolves against the directory of the file that carries it
    Given two files at different depths carrying the same relative reference text
    When check-spec-references audits the project-spec
    Then each is resolved from its own directory rather than from a shared root

  Scenario: a reference one directory level short of its target is reported
    Given a reference whose target exists one level further up than the reference reaches
    When check-spec-references audits the project-spec
    Then it reports that reference

  Scenario: the finding names the path the reference resolved to
    Given a reference that resolves to nothing
    When check-spec-references audits the project-spec
    Then the finding carries both the reference as written and the path it resolved to

  # ── What is not a reference ──

  Scenario: a repo-root-relative path is not extracted
    Given a node carrying a path in inline code that starts with neither a dot-slash nor a dot-dot-slash
    When check-spec-references audits the project-spec
    Then it extracts no reference from it and reports nothing

  Scenario: a URL is not extracted
    Given a node whose README links an absolute URL
    When check-spec-references audits the project-spec
    Then it extracts no reference from it

  Scenario: an absolute or home-relative path is not extracted
    Given a node carrying an absolute path and a home-relative path in inline code
    When check-spec-references audits the project-spec
    Then it extracts no reference from either

  Scenario: a relative path inside a fenced code block is not extracted
    Given a node whose fenced code block contains a relative path that does not exist
    When check-spec-references audits the project-spec
    Then it extracts no reference from inside the fence

  Scenario: a fence closes only on its own delimiter character, at its own length or longer
    Given a fenced block whose interior carries a line shaped like a fence of the other delimiter character
    When check-spec-references audits the project-spec
    Then the block stays fenced and every reference after it is still extracted

  Scenario: a code span carrying a path plus other text is prose
    Given a code span whose content is a relative path followed by further text
    When check-spec-references audits the project-spec
    Then it extracts no reference from that span

  Scenario: a code span that wraps across a line break is still one span
    Given a code span whose relative path lands across a line break, the path resolving to nothing
    When check-spec-references audits the project-spec
    Then it reports that reference against the line the span opens on

  Scenario: a code span does not reach past a block boundary
    Given an unclosed backtick run, then a line starting a new block, then a code span holding a relative path that does not exist
    When check-spec-references audits the project-spec
    Then it reports the later reference

  Scenario: a finding after a fenced block reports its own line number
    Given a fenced block followed by a code span holding a relative path that does not exist
    When check-spec-references audits the project-spec
    Then the finding names the line the reference sits on

  Scenario: a code span does not cross a blank line
    Given an unclosed backtick run, a blank line, and then a code span holding a relative path that does not exist
    When check-spec-references audits the project-spec
    Then it reports the later reference

  Scenario: a code span holding another code span is not a path
    Given a code span whose content is itself an inline-code span around a relative path
    When check-spec-references audits the project-spec
    Then it extracts no reference from that span

  Scenario: a code span in doubled backticks whose content is a bare path is a reference
    Given a code span opened with doubled backticks whose whole content is a relative path that does not exist
    When check-spec-references audits the project-spec
    Then it reports that reference

  Scenario: a code span closes on a backtick run of its own length
    Given a doubled-backtick span whose content carries a nested span followed by a relative path
    When check-spec-references audits the project-spec
    Then it reads one span whose content is not a path and reports nothing

  Scenario: an unmatched backtick run does not suppress a later reference on the same line
    Given a line carrying a backtick run that never closes, followed by a code span holding a relative path that does not exist
    When check-spec-references audits the project-spec
    Then it reports that reference

  Scenario: a markdown link written inside a code span is not a link
    Given a code span whose content exhibits a markdown link to a path that does not exist
    When check-spec-references audits the project-spec
    Then it extracts no reference from that span

  # ── Directories and fragments ──

  Scenario: a reference resolving to a directory resolves
    Given a reference whose target is a directory
    When check-spec-references audits the project-spec
    Then it reports no finding for that reference

  Scenario: a trailing slash on a directory reference is immaterial
    Given two references to the same existing directory, one with a trailing slash and one without
    When check-spec-references audits the project-spec
    Then neither is reported

  Scenario: a heading fragment is stripped before the path is resolved
    Given a reference to an existing file followed by a heading fragment
    When check-spec-references audits the project-spec
    Then it reports no finding for that reference

  # ── The suppression marker ──

  Scenario: a line carrying the ignore marker has none of its references extracted
    Given a line carrying an unresolvable reference and the spec-ref-ignore marker
    When check-spec-references audits the project-spec
    Then it reports nothing for that line

  Scenario: a marker quoted inside a code span does not suppress the line
    Given a line whose code span exhibits the marker, carrying a link to a path that does not exist
    When check-spec-references audits the project-spec
    Then it reports that reference

  Scenario: the marker is matched as a complete comment, not as a prefix
    Given a line carrying an unresolvable reference and a comment whose name merely starts with the marker's
    When check-spec-references audits the project-spec
    Then it reports that reference

  Scenario: the marker suppresses only the line it appears on
    Given one line carrying the marker and a following line carrying an unresolvable reference
    When check-spec-references audits the project-spec
    Then the following line's reference is still reported

  # ── The verdict ──

  Scenario: an unresolved reference exits non-zero
    Given a project-spec carrying at least one unresolved reference
    When check-spec-references audits the project-spec
    Then it exits non-zero

  Scenario: a spec whose every reference resolves exits zero
    Given a project-spec whose every relative reference resolves
    When check-spec-references audits the project-spec
    Then it exits zero

  Scenario: a missing spec dir is refused rather than defaulted
    Given no project-spec directory is named
    When check-spec-references is run
    Then it refuses and exits non-zero

  Scenario: a spec dir that does not exist is refused by name
    Given a named project-spec directory that is not there
    When check-spec-references is run
    Then it names the directory and exits non-zero rather than failing unhandled

  # ── Determinism and boundaries ──

  Scenario: every unresolved reference is reported, not only the first
    Given a project-spec carrying several unresolved references across several files
    When check-spec-references audits the project-spec
    Then every one of them appears in the report

  Scenario: findings are ordered deterministically
    Given a project-spec carrying unresolved references in more than one file
    When check-spec-references audits the project-spec twice
    Then the two reports are identical

  Scenario: the walk covers markdown at any depth and reads nothing else
    Given a project-spec with markdown nested several folders deep beside non-markdown files
    When check-spec-references audits the project-spec
    Then the nested markdown is walked and the non-markdown files are not read

  Scenario: the audit writes nothing
    Given a project-spec carrying unresolved references
    When check-spec-references audits the project-spec
    Then no file under the project-spec is modified
