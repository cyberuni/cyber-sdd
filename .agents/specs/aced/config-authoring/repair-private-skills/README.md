---
spec-type: behavioral
concept: [config-authoring]
---

# repair-private-skills — validate and repair repo-private skill hygiene

Check and fix the hygiene of **repo-private skills under `.agents/skills`** — a stray symlink left
pointing into the public `skills` tree, and a `SKILL.md` missing the `metadata.internal: true` flag
that marks it as contributor-only. Two operations on the same checks: a read-only **validate** that
reports issues, and a **repair** that writes fixes to disk. An **internal, non-invokable** engine
reached only through the ACED `manage` gateway (`../../manage/`); it inspects and fixes skill config
artifacts, so it lives beside `list-skills` and `manage-model-runners` in `config-authoring/`.

> **This is a single behavioral unit, not an overview** — one engine skill. This spec owns the
> behavior + suite ([`repair-private-skills.feature`](./repair-private-skills.feature)); the impl is
> the non-invokable `repair-private-skills` skill in `plugins/aced/skills/repair-private-skills/`.

## Use Cases

**Fit:** partial — the operations are mechanical (scan `.agents/skills`, classify each entry,
optionally write a fix), reached via the `manage` gateway rather than by an activation decision, so
trigger near-miss balance is N/A; the behavior layer still carries signal (the issue taxonomy, the
read-only/write split, and which issues repair can and cannot fix).

**Subject** — an internal engine, loaded by the `manage` gateway, with two operations over the same
per-entry checks under `.agents/skills`:

- **validate-private** (read-only) — reports every issue found: a symlink resolving into the public
  `skills` tree, a missing `SKILL.md` (unless the directory is local/project augmentation-only), a
  `SKILL.md` missing YAML frontmatter, or a `SKILL.md` missing `metadata.internal: true`; exits
  non-zero on any issue.
- **repair-private** (writes) — fixes what it can: deletes a symlink resolving into the public
  `skills` tree, and inserts `metadata.internal: true` into a `SKILL.md`'s frontmatter when absent;
  leaves already-correct entries untouched and skips entries it cannot safely fix (missing
  frontmatter, augmentation-only directories).

**Write boundary** — `repair-private` is the only operation of the two that mutates the filesystem,
and only under `.agents/skills`: it deletes a stray symlink there and rewrites a `SKILL.md` file
there. It never writes into the public `skills` tree itself.

**Non-goals** — discovering or summarizing skills across all sources (`list-skills` — this engine
only ever looks at `.agents/skills`); maintaining the per-model runner agent-def family
(`manage-model-runners`); any hygiene check other than the public-symlink and
`metadata.internal` checks (e.g. content quality — that is `audit-skill`/`improve-skill`). It is
**not user-invocable** — it is reached via `manage`.

Every scenario in [`repair-private-skills.feature`](./repair-private-skills.feature) maps to one of
these behaviors:

| Behavior | What it covers |
|---|---|
| **reached via the gateway** | the engine is loaded by the `manage` gateway, not triggered directly by a bare user invocation |
| **flags a public-tree symlink** | validate reports a repo-private entry that is a symlink resolving into the public `skills` tree |
| **flags a missing SKILL.md** | validate reports a repo-private entry with no `SKILL.md` and no local/project augmentation file |
| **allows augmentation-only directories** | validate does not flag a directory that has only a `SKILL.local.md` or `SKILL.project.md` and no `SKILL.md` |
| **flags missing frontmatter** | validate reports a `SKILL.md` whose first line is not a YAML frontmatter delimiter |
| **flags missing internal metadata** | validate reports a `SKILL.md` that lacks `metadata.internal: true` |
| **reports ok when clean** | validate reports no issues and an ok result when every entry passes all checks |
| **validate never writes** | validate makes no filesystem changes regardless of issues found |
| **repair deletes the stray symlink** | repair deletes a repo-private symlink that resolves into the public `skills` tree |
| **repair inserts internal metadata** | repair inserts `metadata.internal: true` into a `SKILL.md`'s frontmatter when it is missing |
| **repair is idempotent on clean entries** | repair leaves a `SKILL.md` that already declares `metadata.internal: true` unchanged, with no rewrite |
| **repair skips what it cannot fix** | repair leaves augmentation-only directories and frontmatter-less `SKILL.md` files untouched, recording a skip |
| **repair's write boundary** | repair's only filesystem writes are a delete under `.agents/skills` (the symlink) and a rewrite under `.agents/skills` (the `SKILL.md`) — never a write into the public `skills` tree |

## Scenarios (colocated)

The behavior suite is [`repair-private-skills.feature`](./repair-private-skills.feature) — gateway
reach, the four validate checks (public symlink, missing SKILL.md, missing frontmatter, missing
internal metadata) plus the augmentation-only exemption and the clean/ok case, and the repair writes
(symlink delete, metadata insert, idempotence on clean entries, skip-what-it-cannot-fix, and the
`.agents/skills`-only write boundary). Cross-capability e2e scenarios live in `../../workflows/`.
