# ADR-0018: The governance resolver is a dumb matcher; the agent composes

## Status

Accepted

## Context

SDD's governance resolution decides, for a touched file's **artifact-type**, which
**resolved-actor bars** each production-chain role loads (oracle/builder/architect × gate),
across three sources: the project's own `.agents/governances/`, a matched specialist plugin, and
the sdd defaults. The mechanism is a deterministic `.mts` script the conductor and the cold judges
run so they never hand-enumerate.

[ADR-0014](0014-sdd-governance-split.md) and the original `design/governance-resolution.md` framed
that script as doing the *whole* job: discover candidates by walking the filesystem, **order them
by precedence**, **collapse on `compose`** (a `replace` candidate truncating everything below it),
and emit a finished "load/compose plan" the agent merely executes. Three problems surfaced:

- **The script faked data it cannot know.** It hard-coded `compose: 'union'` on plugin and
  sdd-default candidates — but those are **harness-loaded skills** whose real `compose` lives in
  their own frontmatter, which the script never reads (`${CLAUDE_PLUGIN_ROOT}` is harness-internal).
  Only project files, which it frontmatter-scans, carried a real `compose`. The collapse therefore
  ran on a fiction.
- **A dangling composition reference.** The doc and the consuming agents said the conductor
  "composes per `governance-composition`" — but no such runtime rule exists; the only
  `governance-composition` artifact is an unrelated build-time-embedding spec (ADR-0013).
- **The harness cannot help.** Research (Claude Code docs, this session) confirmed the harness
  does **not** merge/order/de-dupe loaded skills (its only precedence is same-name collision,
  ordered `personal(user) > project` — *inverted* from ours), exposes **no** runtime provenance to
  attribute a loaded skill to a tier, and keeps plugin skill files **opaque** (so they can't be
  frontmatter-matched by our `(artifact-type, actor, gate)` keys). Composition is unavoidably the
  agent's job; only addressable project files can be matched and tier-attributed at all — which is
  why project governances stay direct-read files, not harness skills.

## Decision

Split the responsibility cleanly. The script (now the `resolve-governances` skill) is a **dumb
matcher**; the **agent** composes.

- **Matcher (deterministic).** Over the **caller-passed** project anchors (`--project`, optional
  `--project-root` — never discovered), it matches by `(artifact-type, actor, gate)` and **names**,
  per role, the agent that runs it plus the resolved-actor bar candidates **bucketed by tier**
  (`project` / `project-root` / `plugin` / `sdd`). It does **not** order by precedence, apply
  `compose`, or even carry a `compose` field. It emits **only** the resolved-actor bars — the
  fixed-universal governances are invariant per role and stay declared in the role/agent definition.
- **Agent (judgment).** It loads each named candidate (direct-read for project files, harness-load
  for `<plugin>:<bar>` / `sdd:<name>` skills), **reads each governance's own `compose`** at load
  time, and composes by precedence **`sdd-default < plugin < project-root < project`** —
  union the non-conflicting criteria, **on conflict the more-specific candidate wins**, and a
  `compose: replace` fully supersedes lower-precedence candidates for its bar. There is **no**
  separate composition rule to load; the dangling `governance-composition` reference is removed.

A **`user` tier** (`~/.agents/governances/`) is **deferred** — an unlikely use case. The precedence
chain omits it for now; it can later slot in between `plugin` and `project-root` without reopening
this boundary.

This supersedes the "the helper applies precedence / emits a load-compose plan" language in
[ADR-0014](0014-sdd-governance-split.md) and the prior `design/governance-resolution.md`.

## Consequences

- The matcher's output is honest: refs + tier, nothing it cannot know. Composition lives in one
  place — the agent — guided by the precedence stated canonically in `design/governance-resolution.md`
  and inline in each consuming agent (so a cold judge has it without the design doc).
- Project governances **remain addressable files** under `.agents/governances/` (a plain `.md` or a
  `SKILL.md`, author's choice); they are **not** relocated into the harness skills folder, because
  only addressable files can be metadata-matched and tier-attributed.
- The engine moved out of `validate-spec/scripts/` into its own `resolve-governances` skill, since
  the conductor and both cold judges consume it — not just the spec gate.
