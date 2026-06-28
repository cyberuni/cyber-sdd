# plugin/ — SDD's plugin nature

SDD's **plugin nature**, two-faced: SDD **ships as a plugin** to a host agent runtime, and
SDD **is extended by domain plugins** that fill its production-chain roles. This folder owns
the packaging/manifest face and the plugin-contract + registry **init-WRITE** face. The
registry **shape** lives in `../design/specialists-and-squads.md`; the registry
**READ/resolution** lives in `../mission/`; only the **init-WRITE** lives here.

## SDD ships as a plugin

The SDD plugin is authored as markdown skills and agents plus TypeScript verification
scripts — not a compiled npm package — and is distributed through agent marketplaces, not
`npm publish`.

- **Public manifest.** `plugins/sdd/.plugin/plugin.json` declares `name: "sdd"`, its
  description, and the `skills: ./skills` and `agents: ./agents` pointers — the contract for
  which skills, agents, and commands the plugin exposes to a host agent runtime.
- **Marketplace listings.** Listings live in `.claude-plugin/marketplace.json` and
  `.cursor-plugin/marketplace.json`; `plugins/sdd/package.json` is `private` (no npm
  publish).

The `plugin.json` shape is the spec-level contract; the actual manifest and marketplace
files are the code-level artifacts it abstracts. The universal-plugin format itself is
external (`governance show universal-plugin`); this folder is the SDD layer on top.

### Workspace init — the plan directory + Cursor interop

SDD's own **`init`** skill (distinct from a domain plugin's `init-<plugin>`) prepares the
workspace for mission plans (`../design/provenance-model.md`):

- **Ensure the plan directory.** Create `.agents/plans/` (the tool-agnostic, **tracked** home
  for each mission's `<cr-ref>.plan.md` + `<cr-ref>.log.jsonl` combat log — committed with the
  work, not gitignored).
- **Symlink for Cursor.** Cursor only reads its own `.cursor/plans`, so init makes
  `.cursor/plans` a **symlink → `.agents/plans`** — `.agents/plans` stays the real folder, and
  Cursor's conventional path resolves to it, so a plan written by either tool is seen by both.
  **The link target is relative to `.cursor/`, so it must be `../.agents/plans`, NOT
  `.agents/plans`** — a verbatim `ln -s .agents/plans .cursor/plans` resolves to a broken
  `.cursor/.agents/plans`. Use `ln -sfn ../.agents/plans .cursor/plans` (or an absolute path);
  `-fn` replaces an existing link in place rather than nesting a new one inside it.
- **Migration, idempotent.** Re-runnable safely. If `.cursor/plans` already exists as a **real
  directory** (not the symlink), init **does not clobber** it — it moves its contents into
  `.agents/plans` (or backs it up), then replaces it with the symlink. An already-correct
  symlink is left as-is.

## SDD is extended by domain plugins

A domain plugin teaches SDD to produce and judge a new artifact-type. It implements the
**plugin contract** and registers itself into the project registry.

### The plugin contract — the five delegate roles

A plugin covers a set of artifact-types by providing agents for these role keys (source:
`plugins/sdd/skills/plugin-contract-governance/SKILL.md`; squad model:
`../design/specialists-and-squads.md`). Any role may be `null` (degenerates to the SDD
default) or omitted (falls back to the convention name `<plugin>-<role>`). A **producer**
role may also name a model-tuned agent; naming any agent means the conductor **spawns** it.

| Role key | Acts | SDD default |
|---|---|---|
| `spec-producer` | writes the `spec.md` body + the `.feature` | conductor loads `spec-producer-governance`, authors inline in-session (`sdd:sdd-operator`) |
| `solution-producer` | writes the per-unit **solution** (`<unit>.solution.md`) when a unit has durable rationale | conductor loads `solution-producer-governance`, authors inline in-session (`sdd:sdd-operator`) |
| `spec-judge` | judges the `.feature` at the spec gate | `sdd-spec-judge` — spawned cold agent |
| `impl-producer` | builds the artifact **and** its verification | conductor spawns a generic builder that loads `impl-producer-governance` (`sdd:sdd-operator`) |
| `impl-judge` | runs the verification against the frozen `.feature` | `sdd-implementer` — spawned cold agent |

**Producers run inline, judges spawn cold** ("conductor writes, cold judges grade"). The
judge stays a **distinct actor** (producer/judge separation). Which governances each role
loads is owned by `../design/specialists-and-squads.md`.

### Contract-registry init-WRITE

A domain plugin's `init-<plugin>` skill writes that plugin's `sdd-plugins[]` entry into
`.agents/universal-plugin.json` at install/upgrade/re-run time. This folder owns the
**write**; the entry **shape** (the five-role map and governance bindings) is owned by
`../design/specialists-and-squads.md`, and **resolving** an entry at runtime is owned by
`../mission/`.

The write is idempotent and self-reconciling:

1. Read `.agents/universal-plugin.json`; create it as `{}` if missing.
2. If the file exists but contains malformed JSON, **fail with an error and stop — do not
   overwrite** (a partial write could destroy other plugins' valid entries; fail loudly and
   let a human repair it).
3. Find the entry whose `name` matches this plugin; replace it if present, append it if not.
4. Reconcile a stale entry against the plugin's own version: on a `version` mismatch, update
   `version` and bring `roles`/`governances` to the current plugin shape; rewrite an
   old-shape entry to the role-map shape.
5. Write back without reordering or reformatting other entries.

Version reconciliation is the init skill's job at install/upgrade/re-run, so the runtime
resolver in `../mission/` only ever reads a current-shape entry and never compares versions.

## Plugin & governance management — planned (deferred CR)

Beyond the init-WRITE above, SDD will expose **user-facing management** of its domain plugins and
governances, reached through the `../gateway/`: the gateway **classifies and routes** the request
here, and the management **skill** performs the write — so the gateway's thin-relay non-goals (it
installs nothing, edits no files) still hold; the *handler* does the work.

- **Manage domain plugins** — install / list / remove a plugin's `sdd-plugins[]` registration.
- **Author a governance** — scaffold a `metadata:{artifact-type, actor, face}` governance
  (the `create-governance` skill).
- **Marketplace** — register a plugin to the marketplace and discover plugins by artifact-type;
  the **marketplace** is the global catalog, the **registry** the per-project resolution.

These are **net-new capabilities, deferred to follow-up CRs** — the impl is not built. This section
captures the shape so the `../gateway/` has a declared route; the spec + suite are authored when the
work lands.

## Scenarios

Unit scenarios for plugin behavior (manifest validity, idempotent init-write,
fail-closed on a corrupt registry, version reconciliation, the `.cursor/plans` symlink +
its no-clobber migration) **colocate** in this folder.
Cross-capability outcomes (a plugin registers and the conductor later resolves its delegates)
live in `../acceptance/`.

## Source

- `sdd-plugin` — packaging/distribution + the public manifest (the SDD project description
  itself moved to `../spec.md` and `../design/`)
- `sdd-contract-registry` — the init-WRITE behavior only (shape → `../design/`; read →
  `../mission/`)
- `plugin-contract-governance` — the five-role plugin contract
