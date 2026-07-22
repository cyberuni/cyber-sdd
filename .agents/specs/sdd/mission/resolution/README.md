---
spec-type: behavioral
concept: resolution
---

# resolution — match the governance bars for an artifact-type, bucketed by tier

The **resolution** procedure (the registry **READ**): for a touched file's **artifact-type**, name —
per production-chain role — the **agent** that runs it and the **resolved-actor bar candidates** it
loads, matching governances across the caller-passed **project anchors**, the matched **plugin**
squad, and the **sdd** defaults. It is a **matcher**, not a composer: it returns each bar's
candidates **bucketed by tier** (`project` / `project-root` / `plugin` / `sdd`) and **never** orders
by precedence or applies `compose` — the consuming agent does that. The concrete engine is the
[`resolve-governances`](../../../../plugins/sdd/skills/resolve-governances/) skill, a
self-contained `.mts` script.

## Use Cases

**Subject** — matching the resolved-actor governance bars for a file's artifact-type and naming each
role's agent, returning the bar candidates bucketed by source tier for the agent to compose.
**Non-goals** — it does **not** compose (no ordering, no union/replace — the agent does, by
precedence `sdd-default < plugin < project-root < project`); it does **not** discover anchors (they
are caller-passed); it does **not** emit the **fixed-universal** governances (invariant per role,
declared in the role/agent definition); it does **not** classify a file's **artifact-type** — that is
the conductor's step (convention-first plus the `.agents/sdd/artifact-types.toml` tiebreaker,
[`../conductor/`](../conductor/README.md)); the engine exposes a `--path` convenience but the
classification behavior is owned there. It does **not** own registry **version reconciliation /
legacy-shape migration** — the canonical `squads[]` shape is written by `../../plugin/` init-WRITE;
the engine's read-time normalization of a legacy flat entry is a defensive detail, not a resolution
behavior. It owns no lifecycle state and writes nothing. The registry **shape** is
`../../design/specialists-and-squads.md`; the registry **WRITE** is `../../plugin/`; the conductor's
**use** of resolution (spawning delegates, fail-closed on no delegate, recording the disambiguation
choice for resume) is [`../conductor/`](../conductor/README.md); the precedence rule itself is
`../../design/governance-resolution.md`.

| Trigger | Inputs | Outcome |
|---|---|---|
| **resolve a role's bars** — the conductor or a cold judge needs the bars for a touched file | the file's `artifact-type`, the project registry, the caller-passed project anchors | per role: the resolved `agent` (a named plugin delegate, the SDD default, or the `<plugin>-<role>` convention) + the resolved-actor bar candidates, each **bucketed by tier** (`project` / `project-root` / `plugin` / `sdd`) |
| **disambiguate / validate** — the matcher checks the registry is resolvable | the registry + an `artifact-type` (or none) | an artifact-type claimed by **two** plugins returns **needs-input**; with no artifact-type, the registry is validated well-formed + unambiguous |

Every scenario in [`resolution.feature`](./resolution.feature) maps to one of these two entry points.
A registry that is **present but claims none** of the artifact-type is **not** an ambiguity — it floors
every role to the SDD default and returns **no `needs-input`**, exactly as an absent registry does;
`needs-input` is reserved for the two-plugins-claim-one-type case alone.

## Matcher, not composer — the load-bearing boundary

The matcher **names** candidates; the **agent composes**. This split is forced by what each side can
know (ADR-0018):

- **The matcher** matches a project governance by its frontmatter `(artifact-type, actor, gate)` and
  emits its file path (a **direct-read** ref); it names the plugin bar from the registry and the sdd
  default by convention (both **harness-load** refs it never opens). It returns the candidates
  **bucketed by tier**, **unordered**, with **no `compose` field** — it cannot honestly know `compose`
  for a harness-loaded skill it never reads, and faking it would be a lie.
- **The agent** loads each candidate (direct-read for project files, harness-load for plugin/sdd
  skills), **reads each governance's own `compose`** at load time, and composes by precedence
  `sdd-default < plugin < project-root < project` — union the non-conflicting criteria; on conflict
  the more-specific wins; a `compose: replace` supersedes its bar's lower-precedence candidates. That
  agent behavior is asserted in the **conductor / cold-judge** suites, not here — this unit specs the
  **matcher** only.

The harness cannot help: it does not merge/order/de-dupe loaded skills, exposes no runtime provenance
to attribute a skill to a tier, and keeps plugin skill files opaque — so composition is the agent's,
and project governances stay **addressable files** under `.agents/governances/`.

## Caller-passed anchors — never discovered

The matcher reads **only** the anchors it is handed: the file's own `project` and, in a monorepo, the
outer `project-root` (the shared layer). It never walks the tree to find anchors — the conductor
knows the project from `discover-specs`' `project-path` or context and passes them in. A `user` tier
(`~/.agents/governances/`) is **out of scope** for now (`resolution.solution.md`).

## Two tiers — only the resolved-actor bars are matched

A role's governances split into **fixed-universal** (invariant per role: `ownership`, `lifecycle`,
`spec-format`, `suite-format`, `gate-validation`, `combat-log`) and **resolved-actor** (the
`oracle` / `builder` / `architect` bars per `(artifact-type, gate)`). Only the resolved-actor tier
varies and is matched here; the fixed-universal are declared in the role/agent definition and the
matcher does **not** emit them.

## Delivery

This unit is implemented by the **`resolve-governances`** skill —
`plugins/sdd/skills/resolve-governances/` — a non-user-invocable skill carrying a self-contained
`.mts` script (the repo's node-≥23.6 / no-deps convention; an agent fallback when `node` is absent).
The script realizes the matching, the tier bucketing, the registry validation, and the needs-input
disambiguation; its `node:test` is the deterministic oracle for every scenario below.

## Source

- new — no prior `plugins/sdd/` impl. The matching logic first lived inside `spec-gate/scripts/`;
  this CR extracted it into the `resolve-governances` skill (consumed by the conductor and both cold
  judges) and narrowed it from a precedence-applying composer to a tier-bucketing matcher (ADR-0018).
