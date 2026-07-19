---
spec-type: behavioral
concept: [contribution]
---

# contribute-skill — contribute a locally-improved installed skill back to its source repo

Take a skill you installed from another repo and improved locally, and open a pull request that lands
your improvement in that skill's **source** repository — resolve the source from the lockfiles, map
your local files onto the source's canonical `skills/<name>/` tree, diff against upstream, and (only
when there is a real change and you have confirmed the diffs) fork-if-needed, commit every changed
file in one commit, and open the PR.

## Use Cases

**Fit:** strong — contribute-skill makes a genuine activation decision inside a confusable family
(contribute-upstream vs. `define-skill` scaffolding, `skillify` session-extraction, `improve` /
`improve-skill` eval-diagnosis) and carries a hard **repo-native carve-out** (if this repo IS the
skill's source, it must not fire), and its invoked behavior is non-deterministic judgment
(path-mapping across layouts, file inclusion/exclusion, diff-and-confirm, the no-op stop, fork
fallback), so all four eval layers carry signal.

**Subject** — contributing an already-authored, locally-improved installed skill back upstream:
identify the source `owner/repo` from the repo-local and global lockfiles, map every local file
(under `.agents/skills/<name>/` or global `~/.agents/skills/<name>/`) onto the source's canonical
`skills/<name>/…` tree, exclude machine-local augmentations, diff each mapped file against upstream,
stop when nothing differs, show the diffs and get confirmation before pushing, fork when there is no
push access, land all changed files in a single commit, open the PR, and report its URL.

**Non-goals** — scaffolding a **new** skill from scratch is `define-skill`; generalizing the
**current session** into a skill is `skillify`; diagnosing why a skill's evals fail or improving its
quality is `improve` / `improve-skill`; editing a **repo-native** skill whose source IS this repo, or
a local skill with no intent to send it upstream, is ordinary editing — none of these are contribute-skill.
The Git Data API blob→tree→commit→ref plumbing is deterministic mechanics, not a graded behavior.

Every scenario in [`contribute-skill.feature`](./contribute-skill.feature) maps to one of these behaviors:

| Behavior | What it covers |
|---|---|
| **trigger on a contribution request** | contribute-skill fires on "PR this improved skill back upstream" and defers the repo-native carve-out, a from-scratch scaffold, a session generalization, an eval diagnosis, and a no-upstream local edit |
| **map consumer paths to the source skills tree** | a local file under `.agents/skills/<name>/` (or a global install) maps to `skills/<name>/…` in the source repo even when the consumer `skillPath` points at another layout |
| **include every changed file** | every changed file under the skill folder is contributed, not only `SKILL.md` |
| **exclude machine-local files** | `SKILL.local.md` is never included in the contribution |
| **diff and confirm before pushing** | it shows the unified diffs and gets user confirmation before any push |
| **no changes means no PR** | when every mapped file is identical to upstream it contributes nothing and stops |
| **fork when there is no push access** | with `push:false` it forks the source and branches on the fork |
| **single commit for the contribution** | all changed files land in one commit, not one commit per file |
| **report the PR and the next step** | it outputs the PR URL and advises `npx skills update` in the consumer after merge |
| **never write outside the source skills tree** | it never writes `.agents/skills/`, a duplicate tree, or any path outside `skills/<name>/` in the source (guard) |
| **do not push without confirmation** | it does not push until the diffs are shown and confirmed (guard) |
| **quality of the contribution PR** | the PR is scoped — its summary describes only `skills/<name>/` changes, on the correct base branch (graded) |

## Scenarios (colocated)

The behavior suite is [`contribute-skill.feature`](./contribute-skill.feature) — the activation decision and its
sibling deferrals (including the repo-native carve-out), mapping consumer paths onto the source skills
tree, including changed files while excluding machine-local ones, the diff-and-confirm gate, the
no-change stop, the fork fallback, the single-commit contribution, the report, the write-scope guards,
and the graded quality of the produced PR. Cross-capability e2e scenarios live in `../../workflows/`.
