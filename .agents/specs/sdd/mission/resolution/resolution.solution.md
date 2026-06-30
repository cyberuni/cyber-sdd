# resolution — solution

> The durable decision record (the unit's "third facet") for **how governance resolution splits
> between a deterministic matcher and the composing agent**. Not frozen, not gated. Companion to
> ADR-0018 (the repo-level decision); this is the unit's design facet.

## Chosen — a dumb matcher names candidates; the agent composes

The `resolve-governances` engine **matches and names** the resolved-actor bar candidates for a file's
artifact-type, returned **bucketed by tier** (`project` / `project-root` / `plugin` / `sdd`). It does
**not** order by precedence, apply `compose`, or carry a `compose` field. The **agent** loads each
candidate, reads each governance's own `compose`, and composes by precedence
`sdd-default < plugin < project-root < project` (union; conflict → most-specific; `replace`
supersedes).

The split is forced by **what each side can know**:

- A **plugin / sdd** governance is a **harness-loaded skill** whose real `compose` lives in its own
  frontmatter, which the matcher never reads (`${CLAUDE_PLUGIN_ROOT}` is harness-internal). Only
  **project** governances — addressable files the matcher frontmatter-scans — carry a `compose` the
  matcher could see. So a matcher that "composed" would be acting on a fiction (the prior code
  hard-coded `compose: 'union'` on plugin/sdd and collapsed on it).
- The **harness** cannot compose for us either: it does not merge/order/de-dupe loaded skills (its
  only precedence is same-name collision, ordered `personal(user) > project` — *inverted* from ours),
  exposes no runtime provenance to attribute a loaded skill to a tier, and keeps plugin skill files
  opaque. Composition is unavoidably the agent's.

The matcher therefore emits **only** what it can honestly know — `ref`, tier, and `kind` — and the
agent owns the judgment. This also keeps **project governances as addressable files** under
`.agents/governances/` (a plain `.md` or a `SKILL.md`); they are not relocated into the harness skills
folder, because only addressable files can be metadata-matched and tier-attributed.

## Considered — the `user` location tier (deferred, out of scope now)

A **`user` tier** — personal governance bars under `~/.agents/governances/`, carried across all of a
user's projects — was considered as a precedence tier between `plugin` and `project-root`
(`sdd-default < plugin < user < project-root < project`). It is **deferred**: an unlikely use case
that would widen the matcher's input surface (a `user` anchor) and the precedence chain for little
near-term value. The current chain omits it; it can slot in later **without reopening this boundary**
(the matcher already buckets by tier; `user` would be one more bucket the agent orders). Recorded so
the omission is a decision, not an oversight.

## Considered — the resolver as its own skill (chosen)

The matcher first lived inside `validate-spec/scripts/`. Because it is consumed by the **conductor**
(start-mission) **and** both cold judges — not just the spec gate — it was **extracted** into its own
`resolve-governances` engine-skill, parallel to `discover-specs` / `discover-plans` /
`plan-retirement`. The alternative (leaving it under `validate-spec`) mis-stated ownership and buried
a shared engine under one consumer.

## Why this is reversible

The matcher is a git-tracked `.mts` with a `node:test` oracle; the matcher/composer boundary is a
data-shape choice (buckets vs a collapsed list), not a behavioral contract the gates depend on — the
same bars are in force either way, the only question is **who** orders them. Re-folding composition
into the script, or adding the `user` tier, is a localized change to the engine + this unit's suite.
