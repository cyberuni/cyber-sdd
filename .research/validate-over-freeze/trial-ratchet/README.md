# Trial: the ratchet

Can a judge detect a criterion and its test being **weakened together** in one coherent
change — the failure a `{spec} ↔ {test}` validator cannot see by construction, because
the relation still holds perfectly afterwards?

## The two pairs

| Pair | Status |
|---|---|
| `before/` → `after/` | **Defective. Kept as a record, not as evidence.** |
| `before2/` → `after2/` | The corrected trial. All conclusions rest on this pair. |

## The weakening

Both pairs apply the same two edits to `place-node`, motivated by a scan cache added to
the implementation in the same change:

- **Narrowed** — `place-node writes nothing` / "creates, relocates, and edits no file"
  becomes `place-node does not modify the project spec` / "…no file **under the spec
  directory**". The cache writes under the OS temp dir, so the narrowed criterion admits it.
- **Deleted** — `the suggestion consults no stored routing list` removed outright, on the
  entirely reasonable ground that nothing ever tested it. A serialized `NodeRecord[]` keyed
  by spec directory is a stored routing list.

The trap is that the change **looks like an improvement**. The test for the surviving
criterion goes from asserting only `main(...) === 0` to capturing stdout, asserting a
suggestion is actually emitted, and taking a full before/after content snapshot of the
spec directory. Every local measure improves. The contract shrinks.

## Why the first pair is defective

Three construction errors, all making the weakening easier to catch than a real one:

1. **A stale header comment.** The intended edit to `place-node.mts`'s header silently
   no-op'd — a string replacement whose anchor spanned a line break and never matched. The
   implementation still declared "never a stored routing list… it writes nothing" directly
   above code doing both. Every run used it.
2. **The cache was write-only.** Nothing read it back, so the stated motivation was false
   and the change was pure cost. Both judges used this as an independent ground to reject.
3. **`@frozen` was still on the feature file** — the premise under test. One judge opened
   its rejection with "The feature file is `@frozen`. This change removes a frozen
   criterion", reasoning unavailable in a world without freezing.

## What the corrected pair fixes

- Header comment rewritten to describe the new behavior honestly.
- The cache genuinely memoizes: mtime-keyed with a live read path, verified by probe.
- `@frozen` removed from **both** sides.
- The stale `# ── Read-only boundary ──` section header renamed, leaving no residue.

One thing the correction did **not** fix, and did not need to: the mtime invalidation is
unsound, because a directory's mtime does not track edits in its subdirectories. That was
unintentional, three of four corrected runs caught it, and it makes the change *more*
realistic rather than less — a plausible cache with a plausible bug.
