# Archive stale branches

A maintainer can archive every branch untouched for 90 days in one step.

## What

Maintainers of busy repositories collect branches nobody works on, and the branch list stops showing what is in
flight. This capability finds the branches untouched for 90 days and archives them, so the list shows live work only.

## Non-goals

- N1 Deleting a branch's commits. An archived branch can be restored.
- N2 Archiving branches with an open pull request.

## Key terms

- K1 **Stale branch**: a branch whose latest commit is more than 90 days old and that has no open pull request.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | Maintainer | The branch list shows only branches with recent work. |
| A2.1 | Contributor | A branch they still need can be restored after it was archived. |

## Use cases

### UC1 — Archive stale branches (A1.1)

- **Trigger**: the maintainer asks to archive stale branches.
- **Entry points**: command line (primary).
- **Inputs**: the repository.
- **Success**: every stale branch is archived, and every other branch is left as it was.
- **Extensions**:
  - UC1.1 No branch is stale: nothing is archived, and the maintainer is told so.

### UC2 — Restore an archived branch (A2.1)

- **Trigger**: the contributor asks to restore an archived branch by name.
- **Entry points**: command line (primary).
- **Inputs**: the branch name.
- **Success**: the branch is back in the branch list with its commits.
- **Extensions**:
  - UC2.1 No archived branch has that name: nothing changes, and the contributor is told it was not found.

## Criteria

- R1 (UC1) After archiving, no stale branch is in the branch list, and every branch that was not stale still is.
- R2 (UC1.1) When no branch is stale, archiving changes no branch and reports that none was stale.
- R3 (UC2) After restoring an archived branch, it is in the branch list with the same latest commit it had.
- R4 (UC2.1) Restoring a name no archived branch has changes no branch and reports the name not found.

## Open questions

## References

- Sibling spec: none.
