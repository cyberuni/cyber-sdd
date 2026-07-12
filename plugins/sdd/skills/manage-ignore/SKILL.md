---
name: manage-ignore
description: "Internal skill: by name only — intake/manage-ignore's curation engine for the SDD ignore rules — loaded by the manage gateway (Housekeeping), not triggered by users directly."
user-invocable: false
metadata:
  internal: true
---

# Manage Ignore

The concrete engine for `.agents/sdd/.sddignore` — the optional gitignore-syntax file
`resolve-tracking` consults to decide whether an artifact is **tracked** or **ignored**. It is the
**write** side of the ignore file (`resolve-tracking` is the read side). It exists so a user curates
the ignore rules through a clean interface instead of hand-editing the file. Loaded **in-session** by
the `manage` gateway (Housekeeping group); it carries a self-contained `.mts` script (the repo's
node-≥23.6 / no-deps convention).

## The file it curates

`.agents/sdd/.sddignore` is plain **gitignore syntax**: a bare pattern **ignores**, a leading `!`
**re-includes** (re-tracks), `#` comments and blank lines are allowed. Order is **meaningful** —
`.sddignore` is **last-match-wins**, so a later `!rule` re-tracks a path an earlier rule ignored. The
engine therefore **never re-sorts**: `--add` appends, `--remove` preserves the order of the survivors.

## Run an operation

```bash
node "<skill>/scripts/manage-ignore.mts" [--root .] <operation>
```

| Operation | Effect |
|---|---|
| `--list` | print every rule in file order (comments/blanks omitted); a missing file prints nothing, no error |
| `--add <pattern>` | validate + append a well-formed rule (creates the file if absent); a malformed pattern is refused (file unchanged, nonzero exit) |
| `--remove <pattern>` | drop the matching rule, keeping the order of the rest; removing an absent rule is a no-op (file byte-for-byte unchanged) |
| `--induce <path>` | from a sample repo-relative path, offer a literal-path candidate and a `**/<basename>` generalization; persists nothing; refuses a path not under the repo |
| `--preview <pattern>` | list the working-tree paths the candidate would **ignore** (or, for a `!pattern`, the paths it would **re-track**), without persisting it; a malformed pattern is refused |

**Curate with preview.** The intended flow: take the user's sample path → `--induce` it → `--preview`
each candidate to show the affected paths → confirm with the user → `--add` the chosen rule. Never
write a rule the user has not seen the effect of.

## Boundaries

Writes **only** `.agents/sdd/.sddignore` — never a `spec.md`, `status`, `approval`, or a freeze; it is
operational config, not spec content (so `manage`'s write-ownership guard holds). It does **not**
resolve an artifact's tracking signal — that is `resolve-tracking`, which *reads* this file. The
**read-side** fail-safe (an already-corrupted file never breaks intake) is `resolve-tracking`'s
guarantee; this engine validates on the **write** side so a malformed pattern is never persisted.

When `node` is absent, an agent performs the same edits by hand: read the file, apply the CRUD,
validate a line is a well-formed gitignore pattern, and preserve rule order (never re-sort).
