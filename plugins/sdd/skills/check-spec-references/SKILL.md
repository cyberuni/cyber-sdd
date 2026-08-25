---
name: check-spec-references
description: "Partial Skill: invoke by name only — project-spec/check-spec-references' engine that resolves every relative reference in one project spec's markdown and fails on the ones pointing at nothing — run from the per-project CI entrypoint, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Check Spec References

The concrete engine for the **spec-reference resolution check**. It walks every `.md` under one
project spec, extracts each **explicitly-relative** reference, resolves it **against the file's own
directory**, and fails on every one that resolves to nothing. Read-only, deterministic, and — unlike
its `check-spec-structure` sibling — single-severity: a reference that does not resolve is always a
defect, so there is one mode, not a report mode and a gate mode. It carries a self-contained `.mts`
script (the repo's node-≥23.6 / no-deps convention).

It closes a failure **review cannot catch**: a consistent off-by-one reads as entirely plausible —
right filename, right-looking depth, wrong level — so re-reading a reference by eye is not a check
on it. The `project-spec/check-spec-references` node of the SDD project spec (repo-only) carries the
full design rationale, the actors, and the control-flow graph the scenarios derive from.

## What counts as a reference

Two forms, and only when the path is **explicitly relative** (`./` or `../`):

| Form | Where |
|---|---|
| a markdown link target — plain, angle-bracket-wrapped, titled, or a `[label]: path` definition | outside any code span |
| an inline-code span **whose whole content is the path** — a path followed by further text is prose | anywhere but a fenced block |

**Everything else is prose, not a reference** — which is what makes a repo-root-relative reference
(`.research/<topic>/`) pass by construction rather than by exception. Never extracted: a bare path,
a URL, an absolute path, a `~/`-relative path, and anything inside a **fenced code block** (tracked
by the character and run length that opened it, so a fence-shaped line of the other delimiter inside
a block neither ends it nor inverts the parity for everything after).

Code spans are read the way CommonMark delimits them — a run of N backticks opens, the next run of
exactly N closes, a run that never closes is literal text the scan resumes after (a stray backtick
never swallows what comes after it), and a span may **wrap across a line break** — the line ending
folds to a space, so a long path in wrapped prose is still one span, reported against the line it
opens on. A span is bounded by its **block** — it reaches no further than the next blank line,
heading, list item, blockquote, thematic break, or fence — which is what keeps one unclosed backtick
from pairing into the next block and swallowing the references there. One rule settles the exhibit case with no exception: a span written around another
span has content that still carries backticks, so it is not a path (this is how a spec shows the
reference form it specifies without firing on itself), while a span written around a bare path has
that path as its content and **is** a reference however many backticks opened it. A markdown link
inside a code span is text on display, not a link.

## Resolution

Against the directory of the file that **carries** the reference — never the spec root, never the
repo root. A trailing `#fragment` is stripped first. A reference resolves when the result exists as
a **file or a directory**; a trailing slash is immaterial.

Each finding names **both** the reference as written and the path it resolved to — the second is the
half a reader cannot supply by eye.

## The escape hatch

A line carrying `<!-- spec-ref-ignore -->` has **none of its references** extracted. It takes an
optional reason (`<!-- spec-ref-ignore: quoting the bridge file's own content -->`) and the
convention is to write one. Its scope is exactly the line it appears on; it is matched as a
**complete comment** (a marker whose name merely starts with this one's does not suppress) and read
from **outside the code spans**, so a line that merely quotes the marker keeps its references.

> Use it for a path that is **correct but not resolvable from here** — prose quoting a symlink
> target, or a bridge file's own content. A genuinely broken reference is fixed, never marked.

## Run the check

```bash
node "<skill>/scripts/check-spec-references.mts" --spec-dir <specDir>
```

- Exits **zero** on a spec whose every reference resolves, printing a definitive clean line.
- Exits **non-zero** on any unresolved reference, printing **every** one as
  `file:line: <ref> -> <resolved>` plus a count — every finding, never the first, because a single
  off-by-one lands as a whole family and one-at-a-time would take as many runs to clear as there are
  levels wrong.
- Findings are ordered by file, then line, then reference, so two runs over an unchanged tree are
  byte-identical. Paths render relative to the cwd.
- A missing `--spec-dir` is refused rather than defaulted.
- Run from `check-project-specs`' engine set, with cwd = the repo root.

When `node` is absent, an agent performs the same derivation by hand: list the `.md` files under the
spec dir, pull each `./`/`../` markdown link target and inline-code path (skipping fenced blocks,
displayed spans, and marked lines), resolve each against its own file's directory, and check the
path exists.

## Boundaries

Read-only — it writes nothing and fixes no reference (an author edits, or a formation pass does at
corpus scale). It never judges whether a reference is the *right* artifact to cite, only that the
cited path exists; it never follows a reference's content, never checks link text, and never reaches
outside the spec dir it is given.
