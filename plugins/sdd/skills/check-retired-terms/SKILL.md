---
name: check-retired-terms
description: "Partial Skill: invoke by name only — retired-terms' guard engine against survivors of a retired path, directory, or naming convention across the whole tracked corpus — the CI guard, not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Check Retired Terms

The concrete engine for the **retired-terms registry plus corpus-wide sweep**. A design decision
retires a path, directory, or naming convention, and records it once in
`.agents/sdd/retired-terms.toml`. This engine guards that the retirement holds: it scans every
git-tracked file in the repo — not only the node someone happened to touch — for a literal,
case-sensitive occurrence of a registered term, and reports every survivor as `file:line:term` with
the replacement to use. It carries a self-contained `.mts` script (the repo's node-≥23.6 / no-deps
convention), parsing the registry with the same minimal hand-rolled TOML subset `discover-specs`
already uses for `spec-anchors.toml`.

It is the corpus-wide, declared-data sibling of `check:metaphor-free`
(`packages/cyberlegion/src/metaphor-free.ts`): same banned-term / allow-list / exclusion / scope
shape, but the banned list here is registry data any CR can append to, not a hardcoded package
charter — see [`../../.agents/specs/sdd/corpus/retired-terms/README.md`](../../../../.agents/specs/sdd/corpus/retired-terms/README.md)
for the full design rationale.

## Registry format

```toml
[[retired]]
term = "old/retired/path/"                      # the literal text that is retired
since = "the-cr-that-retired-it"                # provenance
replacement = "what to write instead"
scope = ["plugins/", "docs/"]                   # optional: only scan under these prefixes
allow = [                                       # optional: sanctioned occurrences
  "docs/HISTORY.md",                            # whole file: superseded, kept for history
  "docs/glossary.md :: the still-live sibling", # one line: a usage that stays correct
]
```

> The example above uses placeholder values on purpose. This file is **not** on the guard's
> self-exclusion list — only the registry, the engine, its test, and the spec node's own
> `README.md` / `.feature` are — so writing a real registered term here would make the guard
> report its own documentation. See the live registry at `.agents/sdd/retired-terms.toml` for
> the real entries.

- **`term` is matched as literal text, case-sensitive** — no globs, no regular expressions.
- **`scope`** lists repo-relative include prefixes. No `scope` scans the whole tracked tree.
- **`allow`** has two forms: a bare path sanctions every occurrence in that file; a
  `path :: substring` entry sanctions only the lines carrying that substring. An `allow` entry is
  for an occurrence that is still correct, never one that is merely inconvenient — a genuine
  survivor is fixed, not allow-listed.
- **Built-in exclusions**, always applied, never configurable: the registry file itself, this
  engine's own source and test, this node's own `README.md` and `retired-terms.feature`, every
  `ledger/` directory, and everything under `.agents/plans/`.

## Run the scan

```bash
node "<skill>/scripts/check-retired-terms.mts" [--root .]         # the verify-time sweep
node "<skill>/scripts/check-retired-terms.mts" [--root .] --list  # what is registered
```

- Default `--root` is the current directory.
- The **sweep** (default, no verb) exits **0** on a clean corpus (or an absent registry) and
  **non-zero** on any survivor, printing each as `file:line:term — replace with: <replacement>`,
  then a count. A **malformed registry never reports clean** — it names the parse error and exits
  non-zero, because the registry *is* the check.
- **`--list`** prints each registered term with its `since` and `replacement`, and exits 0. With no
  registry, it states plainly that nothing is registered — a definitive empty state, not silence.
- Wired into `check:specs` (`node …/check-retired-terms.mts --root .`), so it runs on every
  `pnpm verify` and in CI.

When `node` is absent, an agent performs the same derivation by hand: read
`.agents/sdd/retired-terms.toml`, then grep every registered `term` across `git ls-files`, applying
the same exclusion / scope / allow rules by hand.

## Boundaries

Read-only — it writes nothing and fixes no survivor (a person or a follow-up CR edits). It does not
decide that something is retired (a CR does, then registers it), does not curate the registry (the
file is hand-edited), and reads no spec frontmatter.
