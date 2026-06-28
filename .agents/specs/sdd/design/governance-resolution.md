# Governance resolution

How an actor/discipline **governance** is defined, discovered, composed, and loaded for a production-chain role.
Companion to `actors-and-governance.md` (what governances are) and `specialists-and-squads.md` (the squad and the per-role loadout).
Rule side only; the mechanical resolution is a deterministic helper (below).

## Two tiers

A role's governances split by whether they vary with the artifact-type:

- **Fixed-universal** — invariant per role on every invocation: `ownership`, `lifecycle`, `spec-format` (`spec-format-governance`), `suite-format`, `gate-validation`.
  Ship with sdd; eligible for build-time embedding (`actors-and-governance.md`).
- **Resolved-actor** — the actor bars `director` / `builder` / `architect`, resolved per `(artifact-type, face)`.
  The variable tier; **never build-embedded** — resolution is dynamic per the file's artifact-type.

## Two faces

Each actor bar has a **forward** face (a producer self-aligns to it) and a **backward** face (a judge grades against it), authored and loaded **separately** so a role loads only its face — a producer never loads the judge checklist, a judge never loads the producer how-to.
Strategist has no per-spec governance (it runs via the doctrine loop).

## Match key

Every governance carries frontmatter:

```yaml
metadata:
  artifact-type: <type>        # the squad key; omit for the typeless default
  actor: director | builder | architect
  face: forward | backward
  compose: union | replace     # default: union
```

Resolution matches on `(artifact-type, actor, face)`.
**Names need not be unique** — matching is by `metadata`, never by filename or skill name.

## Sources, by addressability

The deciding factor is **can SDD address the file?**

| Source | Addressable? | Delivery | Loaded by |
|---|---|---|---|
| **project / user** | yes — `<project>/.agents/governances/` | a plain `.md` **or** a SKILL.md, authored in place, **no build** | the conductor **reads the file directly** |
| **specialist plugin** | no — version-routed, internal path | `user-invocable:false` **skill** in the plugin's `skills/`; `init` records `<plugin>:<name>` per `(artifact-type,actor,face)` in `.agents/universal-plugin.json` | the conductor asks the **harness** to load `<plugin>:<name>` (harness version-routes) |
| **sdd default** | via the sdd plugin | the sdd plugin's own governances (skills, `sdd:<name>`) | as a plugin source; lowest precedence |

`${CLAUDE_PLUGIN_ROOT}` is harness-internal — SDD never paths into the plugin cache.
The **registry** is the resolution handle for every plugin source; the **harness** is the version-aware loader.

## Scope vocabulary

Two scopes, in SDD's own terms — **not** "workspace" or "repo-root" (both collide with VS Code / npm / git):

- **user** — `~/.agents/`.
- **project** — `<project>/.agents/`; a project is one durable spec (`project-unit.md`).

**Projects nest** — a monorepo is a project whose folders hold projects; the shared layer is the **outer project**, never a third named tier ("repo-root" dissolves).
Resolution **unions** across the nested project anchors plus user.
It does **not** blind-walk every directory: it jumps to the known **project anchors** (a project announces itself via its spec) plus user — union is anchor-based, not depth-based.

## Precedence & composition

- **Precedence (most-specific wins):** project > specialist-plugin > sdd-default; among nested projects, inner > outer.
- **Default `union`:** every applicable governance is in force; non-conflicting criteria accumulate; **most-specific wins on conflict**.
- **Opt-in `replace`:** a governance with `compose: replace` fully supersedes the lower-precedence bar for its key.
- Conflict handling is **never** positional "last wins"; it is the explicit precedence above, enforced by the `governance-composition` rule the conductor loads.

## The deterministic helper

The mechanical part — discover candidates across sources, match `metadata`, apply precedence, emit the per-role **load/compose plan** — is a deterministic `.mts` helper (sibling to `check-spec-state.mts`; node-≥23.6, no deps, agent fallback when node is absent).
The agent never hand-enumerates: it runs the helper, then **executes the plan** (direct-read for project files, harness-load for `<plugin>:<name>` skills) and composes per `governance-composition`.
