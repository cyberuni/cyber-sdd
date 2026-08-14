# check-freshness

Internal, non-invokable ACED engine. It decides whether a recorded eval result still describes the
configuration on disk, and returns `current`, `stale`, `incomplete`, or `absent`.

## What it does

`run` writes an eval result to `.agents/aced/results/<target>/<timestamp>.json` carrying an
`evaluated` set — every input the run reports consuming, each as a repository path plus a SHA-256
hash. This engine resolves a node's target from its `eval.md`, selects the newest **readable** result
whose own `target` field is that subject, re-hashes each recorded path, and compares.

Two rules do the work:

- A **file** entry hashes the bytes read, so a content change is detectable and a timestamp never
  stands in for one.
- A **directory** entry hashes the **names** the listing returned, so a file *added* to a directory
  the subject loads from is detectable without re-resolving what the subject depends on now.

A directory the run expanded carries both its own entry and a `file` entry per file the listing
yielded — the directory hash covers names only, so without the per-file entries an edit inside that
directory would read `current` forever.

## Why the record and not the tree

The first attempt at this capability inferred the subject's dependencies from outside: it guessed
the file set from a slug, treated modification time as a content change, and read a judge's prose
with a regex. All three guesses trace to one missing upstream contract — the producer recorded
nothing about what it evaluated. Fixing the producer turns freshness into a comparison instead of
four stacked heuristics, which is why every decision here reads only what the record names.

## Selection is by what the result records

The newest result is the one whose **recorded timestamp** is greatest, not the one whose filename
sorts last, and a result belongs to the target its own `target` field names, not the directory it
happens to sit in. An unparseable result is skipped and named rather than thrown on, so one corrupt
record cannot blind the check to the readable ones beside it.

## Limits it states rather than hides

`current` means the run's account still holds — not that the run read everything it should have. An
under-reporting run records a shorter set whose entries all match, and no verdict here can find it,
because the only witness to what was read is the same self-report under test. See the trust boundary
in `SKILL.md`.

Nothing consults this engine yet: wiring `run` and `improve` to it is `#476`. Until that lands it is
specified, tested, and reachable only by a human running it directly — a recorded gap, not an
oversight.

## Tests

`scripts/check-freshness.test.mts` — one test per frozen scenario, with fixtures chosen so a
guessing implementation cannot pass: the result is filed under a deliberately wrong directory name,
alphabetical filename order is the reverse of recorded timestamp order, and one fixture rewrites a
file's modification time while leaving its bytes identical.

Spec: `.agents/specs/aced/eval-run/check-freshness/`.
