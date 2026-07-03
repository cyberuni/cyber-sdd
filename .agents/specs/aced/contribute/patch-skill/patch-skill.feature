@frozen
Feature: patch-skill — contribute a locally-improved installed skill back to its source repo
  Unit suite for the patch-skill skill: route a "PR this improved skill back upstream" request, resolve
  the source repo from the lockfiles, map local files onto the source's canonical skills/<name>/ tree,
  include every changed file while excluding machine-local ones, diff against upstream, stop when nothing
  differs, show the diffs and get confirmation before pushing, fork when there is no push access, land all
  changed files in a single commit, open the PR, and report its URL. A repo-native skill whose source IS
  this repo does not fire; scaffolding a new skill from scratch is define-skill; generalizing the current
  session is skillify; diagnosing failing evals is improve. Cross-capability e2e scenarios live in
  ../../acceptance/.

  # ── Triggering ──

  @trigger
  Scenario Outline: patch-skill activates on a contribution request and defers its siblings
    Given a user query "<query>"
    When ACED routes the request
    Then invocation is "<should_trigger>"

    Examples:
      | query                                                                             | should_trigger |
      | contribute my local changes to the fix-security-pr skill back to its source repo  | yes            |
      | open a PR upstream for the skill I improved after installing it                    | yes            |
      | send my improvements to the installed commit-work skill back to the source         | yes            |
      | patch the source repo of this installed skill with my local edits                 | yes            |
      | I improved a repo-native skill in this repo, PR it — this repo is its source        | no             |
      | scaffold a brand-new skill from scratch for deploying previews                     | no             |
      | turn what we just did in this session into a reusable skill                        | no             |
      | why is my installed skill's golden-set eval failing and how do I fix it            | no             |
      | just edit my local copy of this skill, I'm not sending it anywhere                 | no             |

  Scenario: a request to PR an improved skill in this repo's own tree does not fire (repo-native carve-out)
    Given the user improved a skill under this repo's own skills/<name>/ tree and asks to PR it, and this repo is the skill's source
    When ACED routes the request
    Then patch-skill does not handle it because contributing to a skill's own source repo is ordinary in-repo work

  Scenario: a request to scaffold a new skill from scratch defers to define-skill
    Given the user asks to build a brand-new skill for a topic they have not performed
    When ACED routes the request
    Then patch-skill does not handle it and define-skill does

  Scenario: a request to generalize the current session into a skill defers to skillify
    Given the user asks to turn what they just did this session into a reusable skill
    When ACED routes the request
    Then patch-skill does not handle it and skillify does

  Scenario: a request to diagnose an installed skill's failing evals defers to improve
    Given the user asks why their installed skill's golden-set cases fail and how to fix them
    When ACED routes the request
    Then patch-skill does not handle it and improve does

  Scenario: a request to edit a local skill with no intent to send it upstream does not fire
    Given the user asks only to edit their local copy of an installed skill and states they will not contribute it
    When ACED routes the request
    Then patch-skill does not handle it because there is no upstream contribution intent

  # ── Mapping local files onto the source skills tree ──

  @behavior
  Scenario: a consumer .agents/skills path maps to the source skills/<name>/ tree
    Given the source lock entry has skillPath ".agents/skills/skillify/SKILL.md" and the improved file lives at the consumer's .agents/skills/skillify/SKILL.md
    When patch-skill maps the file to its upstream path
    Then the mapped upstream path is "skills/skillify/SKILL.md" and not any ".agents/skills/" path

  @behavior
  Scenario: every changed file under the skill folder is contributed, not only SKILL.md
    Given the local skill folder changed both SKILL.md and scripts/run.mjs relative to upstream
    When patch-skill collects the files to contribute
    Then both skills/<name>/SKILL.md and skills/<name>/scripts/run.mjs are included in the contribution

  @behavior
  Scenario: a machine-local SKILL.local.md is excluded from the contribution
    Given the local skill folder contains SKILL.md, scripts/run.mjs, and a machine-local SKILL.local.md
    When patch-skill collects the files to contribute
    Then SKILL.local.md is not part of the contribution and no skills/<name>/SKILL.local.md path is written

  # ── Diff and confirm ──

  @behavior
  Scenario: the diffs are shown and confirmed before any push
    Given at least one mapped file differs from upstream on the default branch
    When patch-skill prepares to contribute
    Then it shows the unified diffs to the user and obtains confirmation before it pushes anything

  @behavior
  Scenario: an unchanged skill contributes nothing and stops
    Given every mapped file is byte-identical to upstream on the default branch
    When patch-skill compares the local skill to the source
    Then it contributes nothing and opens no pull request

  # ── Access and commit ──

  @behavior
  Scenario: no push access forks the source and branches on the fork
    Given the source repo reports push access false for the current user
    When patch-skill prepares the branch to push
    Then it forks the source repo and creates the branch on the fork rather than on the source

  @behavior
  Scenario: all changed files land in a single commit
    Given three changed files mapped under skills/<name>/ are ready to contribute
    When patch-skill pushes the contribution
    Then the branch gains exactly one new commit containing all three files and not one commit per file

  # ── Reporting ──

  @behavior
  Scenario: the PR URL and the consumer refresh step are reported
    Given patch-skill has opened the pull request
    When it reports the result
    Then it outputs the pull request URL and advises running "npx skills update" in the consumer repo after merge

  # ── Guards ──

  @behavior
  Scenario: no path outside skills/<name>/ is written in the source
    Given a consumer whose skill is installed under .agents/skills/<name>/
    When patch-skill builds the contribution tree for the source repo
    Then every written path is under skills/<name>/ and it writes no .agents/skills/ path and no duplicate tree outside skills/<name>/

  @behavior
  Scenario: nothing is pushed before the diffs are confirmed
    Given mapped files that differ from upstream and a user who has not yet confirmed the diffs
    When patch-skill reaches the push step
    Then it does not push and does not open a pull request until the diffs are confirmed

  # ── Quality of the contribution PR ──

  @quality @rubric
  Scenario: the produced PR is scoped to the source skills tree on the correct base branch
    Given a confirmed set of changed files under skills/<name>/ ready to contribute
    When patch-skill opens the pull request
    Then the judge evaluates the produced PR against the rubric
      """
      dimensions:
        - name: scoped_to_skills_tree
          max: 3
        - name: summary_describes_only_skill_changes
          max: 2
        - name: correct_base_branch
          max: 2
      threshold: 5
      """
    And the rubric score is at least the threshold
