# ADR-0013: Governance Skills (reference content as non-user-invocable skills)

## Status

Accepted

> **Update note (2026-06-28):** Core decision current. Two refs are stale: the path
> `artifacts/specs/sdd-orchestrator/` no longer exists, and `sdd:spec-governance` was renamed
> to `spec-format-governance`. Current model: `.agents/specs/sdd/design/governance-resolution.md`.

## Context

Reference/criteria content — version-pinned standards like `skill-design`, and (in the SDD plugin redesign) the universal `.feature` format bar, scenario-ordering convention, and spec principles — has historically been loaded on demand via `cyber-skills governance show <name>` (ADR-0001, ADR-0002).

Two pressures now make that mechanism the wrong home:

1. **NodeJS elimination.** The SDD plugin redesign (see `artifacts/specs/sdd-orchestrator/`) aims to run its loop without `npx cyber-skills` / `npx universal-plugin`. `governance show` is a NodeJS runtime call inside the loop.
2. **Scope.** The obvious NodeJS-free alternative — an `AGENTS.md` section — is **project-global**: it loads for *all* work in the project, including work unrelated to the plugin. A plugin exists to stay scoped; its governance should load only when that plugin's work is happening.

We need a home for reference content that is harness-native (no NodeJS), plugin-scoped (not `AGENTS.md`), and loadable by other agents (the plugin's own agents and dependent plugins' agents — e.g. ACED and Quill spec-producers loading SDD's format governance).

## Decision Drivers

- Harness-native loading; no `governance show` / NodeJS in the runtime loop.
- Plugin scope — content loads only for that plugin's work, not project-wide.
- Loadable by other agents, but **not** triggerable by the user as a workflow.
- Portable across harnesses (Claude Code, Cursor, Codex), whose frontmatter support differs.

## Considered Options

### Option 1: `governance show` CLI (status quo)

- **Pros**: version-pinned; single source; audit-enforced.
- **Cons**: NodeJS runtime call — the dependency being eliminated.

### Option 2: `AGENTS.md` section

- **Pros**: NodeJS-free; always in context.
- **Cons**: project-global — taxes every unrelated task; violates plugin scoping.

### Option 3: Governance skill (`user-invocable: false`)

A skill in the plugin holding pure reference content, not user-triggerable, loaded by other agents via the harness Skill mechanism.

- **Pros**: harness-native (no NodeJS); plugin-scoped; loadable by the plugin's own and dependent plugins' agents.
- **Cons**: the `user-invocable` frontmatter field is not yet universally adopted across harnesses.

## Decision

Reference/criteria content becomes a **governance skill**: a skill inside the owning plugin, holding only reference content, marked non-user-invocable, loaded by the plugin's agents and by dependent plugins' agents through the harness (never via `governance show`).

To mark it non-user-invocable, use **both** markers:

1. `user-invocable: false` in frontmatter — the harness field for harnesses that support it.
2. An `Internal skill:` prefix on the `description` — the portable fallback that prevents situational activation on harnesses that do not yet honor the frontmatter field.

Example: `sdd:spec-governance` carries SDD's universal `.feature` format bar and scenario-ordering convention; `aced`/`quill` spec-producers assume `sdd-plugin` exists and load it.

## Rationale

Option 3 is the only one that is simultaneously NodeJS-free, plugin-scoped, and agent-loadable. The dual marker resolves Option 3's sole con: the frontmatter field expresses intent precisely where supported, and the description prefix guarantees the no-user-trigger behavior everywhere else. This is belt-and-suspenders by necessity, not redundancy — the two markers cover disjoint harness capabilities.

This refines "governances dissolve" from the SDD redesign: **contract/interface** governances fold into agent definitions; **reference/criteria** governances become governance skills. They do not move to `AGENTS.md`, and they stop using `governance show`.

## Consequences

### Positive

- The plugin loop runs without a NodeJS `governance show` call.
- Governance content stays scoped to its plugin's work.
- Cross-plugin reuse works (dependent plugins load the owning plugin's governance skill).

### Negative

- Two markers to keep in sync on every governance skill.

### Risks

- If a harness honors neither marker, a governance skill could surface to the user. The `Internal skill:` prefix mitigates this on description-matching harnesses; fully unaware harnesses are out of scope.

## Implementation Notes

- Authoring a governance skill: `user-invocable: false` + `description: "Internal skill: …"` + body = pure reference, no workflow steps.
- A self-describing governance skill for *authoring governance skills* may be created when the first ones are built (the Curator's corpus is self-describing); until then this ADR is the source.

## Related Decisions

- [ADR-0001](0001-governance-vs-discipline-taxonomy.md) — governance vs discipline; this changes how governances load
- [ADR-0002](0002-external-governance-federation.md) — external governance federation
- [ADR-0003](0003-agent-first-authoring.md) — agent-first, self-contained bodies
- `artifacts/specs/sdd-orchestrator/spec.md` — the redesign that drove this
