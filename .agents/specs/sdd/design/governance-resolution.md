---
concept: [governance, resolution]
---

# Governance resolution

How an actor/discipline **governance** is defined, matched, composed, and loaded for a production-chain role.
Companion to `actors-governance.md` (what governances are), `specialists-and-squads.md` (the squad and the per-role loadout), and `artifact-type.md` (the squad key and how a file resolves to one).
Rule side only; the mechanical part is a deterministic **matcher** (below) — it names candidates; the **agent** composes.

## Two tiers

A role's governances split by whether they vary with the artifact-type:

- **Fixed-universal** — invariant per role on every invocation: `ownership`, `lifecycle`, `spec-format` (`spec-format-governance`), `suite-format`, `gate-validation`, `combat-log`.
  Ship with sdd; apply to every spec regardless of artifact-type (`actors-governance.md`). They are **declared in the role/agent definition** and **not** produced by the matcher — only the resolved-actor tier is matched.
  **Loaded lazily, not eagerly.** Their *names* are known up front from the role/agent definition (a compact operating digest), but a full governance **body** is read **only at the decision or gate that invokes it** — `gate-validation` + `lifecycle` at a gate, `suite-format` only while authoring a `.feature`, `spec-format` only while writing `spec.md`, `combat-log` only when writing the log. A one-line change that touches no gate and authors no suite never pays to read all six bodies; the per-mission token floor is the digest, not the corpus of governance prose.
- **Resolved-actor** — the actor bars `oracle` / `builder` / `architect`, matched per `(artifact-type, gate)`.
  The variable tier, matched dynamically per the file's artifact-type — the **only** thing the matcher resolves.

## Two faces, one merged bar

Each actor bar has a **forward** face (a producer self-aligns to it) and a **backward** face (a judge grades against it), but the two are **one merged skill per `(actor, gate)`** (Model B; `common-governances/common-governances.solution.md`): the producer agent and the judge agent load the **same** bar — for objective criteria the faces mirror, so one source serves both. `producer ≠ judge` is preserved at the **agent** level. A subjective slice that a producer must not self-grade is split out as a **judge-only `@rubric`** bar.
Strategist has no per-spec governance (it runs via the doctrine loop).

## Match key

Every governance carries frontmatter:

```yaml
metadata:
  artifact-type: <type>        # the squad key; omit for the typeless default
  actor: oracle | builder | architect
  gate: spec | impl            # which gate's bar (oracle has spec only)
  compose: union | replace     # default: union
```

Resolution matches on `(artifact-type, actor, gate)`.
**Names need not be unique** — matching is by `metadata`, never by filename or skill name.

## Sources, by addressability

The deciding factor is **can SDD address the file?**

| Source | Addressable? | Delivery | Loaded by |
|---|---|---|---|
| **project / user** | yes — `<project>/.agents/governances/` | a plain `.md` **or** a SKILL.md, authored in place, **no build** | the conductor **reads the file directly** |
| **specialist plugin** | no — version-routed, internal path | `user-invocable:false` **skill** in the plugin's `skills/`; `init` records `<plugin>:<name>` per `(artifact-type,actor,gate)` in `.agents/universal-plugin.json` | the conductor asks the **harness** to load `<plugin>:<name>` (harness version-routes) |
| **sdd default** | via the sdd plugin | the sdd plugin's own governances (skills, `sdd:<name>`) | as a plugin source; lowest precedence |

`${CLAUDE_PLUGIN_ROOT}` is harness-internal — SDD never paths into the plugin cache.
The **registry** is the resolution handle for every plugin source; the **harness** is the version-aware loader.

## Scope vocabulary

Two scopes, in SDD's own terms — **not** "workspace" or "repo-root" (both collide with VS Code / npm / git):

- **user** — `~/.agents/`.
- **project** — `<project>/.agents/`; a project is one durable spec (`project-unit.md`).

**Projects nest** — a monorepo is a project whose folders hold projects; the shared layer is the **outer project** (`project-root`), never a third named tier ("repo-root" dissolves).
The matcher reads the **caller-passed project anchors** (the file's own `project`, plus `project-root` in a monorepo) — it does **not** discover them: the conductor knows the project from `discover-specs`' `project-path` or context and hands the anchors in. (A `user` tier — `~/.agents/` — is **deferred**; see ADR-0018.)

## Precedence & composition — the agent's job, not the matcher's

The matcher returns each bar's candidates **bucketed by tier**; it does **not** order or compose. The **agent** loads each candidate and composes:

- **Precedence (most-specific wins):** `sdd-default < plugin < project-root < project`.
- **Default `union`:** every applicable governance is in force; non-conflicting criteria accumulate; **on a conflict, the higher-precedence (more-specific) candidate wins**.
- **Opt-in `replace`:** a governance whose own frontmatter carries `compose: replace` (read by the agent when it loads the file) **fully supersedes** the lower-precedence candidates for its bar.
- Conflict handling is **never** positional "last wins"; it is the explicit precedence above, applied by the agent — there is no separate composition rule to load.

## The deterministic matcher

The mechanical part — match `metadata` against the caller-passed anchors + the matched plugin squad + the sdd default, and **name** the per-role candidates **bucketed by tier** (`project` / `project-root` / `plugin` / `sdd`) — is the deterministic `.mts` script in the `resolve-governances` skill (node-≥23.6, no deps, agent fallback when node is absent). It carries **no `compose`** and applies **no precedence** — only the variable resolved-actor bars + each role's agent.
The agent never hand-enumerates: it runs the matcher, then **loads** each candidate (direct-read for project files, harness-load for `<plugin>:<name>` / `sdd:<name>` skills) and **composes by the precedence above**, reading each governance's own `compose` at load time.
