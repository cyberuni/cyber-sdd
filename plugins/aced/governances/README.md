# Governances

The agent-configuration authoring standards ACED owns. Each is a version-pinned Markdown rule set
a skill loads on demand.

These artifacts are **governance** — auditable standards frozen to the version that ships them.
Session **discipline** (for example commit habits injected by hooks) is a separate layer.

## Consumption

Do not link to these files from a `SKILL.md`, and do not call a CLI to read them at run time.
A skill carries its own committed copy:

1. `universal-plugin plugin build` copies each governance a skill declares to
   `<skill>/references/governances/<name>.md`, resolving the name against the plugin being built
   and then the packages its `package.json` declares. A governance resolves from its owner at
   `governances/<name>.md` — this directory.
2. The skill reads `.agents/governances/<name>.md` (a project override) first, then an installed
   `buddy-agent-harness governance show <name> --overrides-only`, then its own copy.

The lookup order is stated once, in `skill-design`.

## Authoring

Governances load into agent context on demand. Write them **agent-first**:

- **Dense and concise** — imperative must / should / do not rules; no tutorials or surveys in the body
- **Self-contained** — no links to other repository files; the agent completes the workflow from the
  document alone
- **References at end** — cross-governance `governance show <name>` pointers and external HTTPS URLs
  only in `## References`. The copy step rewrites each pointer to the sibling copy, so a pointer must
  name a governance, never a file path
- **No rationale sections** — no `## Why`, `## Rationale`, `## Background`, or `## Context`, and no
  causal "because…" prose. ADRs record **why**; a governance records **what**

Do not embed reference-repo catalogs, issue surveys, or illustrative examples. Surveys and decision
rationale belong in ADRs and research dossiers.

## Owned by ACED

| Name | Purpose |
| ---- | ------- |
| `skill-design` | SKILL.md authoring — agent-first structure, placement, patterns, progressive disclosure, deterministic extraction, script placement and bundling, governance lookup order |
| `skill-repo-structure` | Skill library repo layout — archetypes, manifests, CI, discipline sections, contributor conventions |
| `agent-tool-output` | Output rules for scripts, hooks, and CLIs that agents invoke |
| `cli-resolution` | How a skill runs its own scripts and resolves a released CLI it does not ship |

Owned elsewhere and referenced from these documents: `plugin-design`, `slash-invocation`, and
`universal-plugin` ship from the `universal-plugin` package.

See [ADR-0035](../../../docs/adr/0035-authored-governances-ship-as-package-files.md) for why these
ship as package files rather than as governance skills.
