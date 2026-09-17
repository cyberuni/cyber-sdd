# Skill Repo Structure

Rules for organizing a **repository that ships one or more Agent Skills** — directories, manifests, contributor internals, and CI. Apply when creating a skill library, running `init-skill-repo`, or auditing whether a repo is a well-formed skill collection.

This governance covers **repo layout**. Per-skill authoring rules live in **skill-design**; per-skill format baseline is the agentskills.io specification (see References).

## Repo archetypes

Pick the **primary** archetype. Hybrid repos are fine if each layer is intentional.

### Collection

Skills only — publish via `npx skills add owner/repo`.

**Typical layout:**

```text
LICENSE
README.md
skills/
  <skill-name>/
    SKILL.md
    README.md          # human-facing usage + install (skills.sh listing hygiene)
```

**Optional:** `skills.sh.json`, `.claude-plugin/marketplace.json`, `template/`, `spec/` (pointer to agentskills.io).

### Maintained library

Collection plus validation and install hygiene.

**Add:**

- `AGENTS.md` (and `CLAUDE.md` → symlink when using Claude Code)
- CI that runs skill validation on PRs touching `skills/`
- Documented install commands in README
- Optional committed `skills-lock.json` when the repo dogfoods `npx skills add`

**Validate with:** your skill-validation tool (e.g. the aced `improve-skill` skill's `validate.mts` engine).

### Tooling library

Maintained library plus npm CLI, governances, or hooks shipped from the same repo.

**Add (as needed):**

```text
governances/           # version-pinned standards (cyberplace pattern)
src/                   # CLI source
package.json           # publishable bin
.changeset/            # if npm releases use Changesets
```

**Require:** a single documented verify command in AGENTS.md (typecheck + lint + test + audit, or equivalent for the stack).

### Plugin bundle

Skills grouped under named bundles for Claude/plugin marketplaces.

**Layout:**

```text
plugins/
  <bundle-name>/
    skills/
      <skill-name>/
        SKILL.md
    .claude-plugin/
```

Do not treat plugin-bundle layout as the default — most repos use flat `skills/<name>/`.

## Required for any public skill repo

1. **`LICENSE`** at repo root.
2. **Public skills under `skills/<name>/SKILL.md`** (or documented bundle path for plugin archetype).
3. **Each skill complies** with agentskills.io: `name` matches directory; valid frontmatter; optional folders only as `scripts/`, `references/`, `assets/` unless documented otherwise.
4. **Each public skill includes `README.md`** alongside `SKILL.md` — when to use, what it does, and `npx skills add owner/repo --skill <name>`. Agent instructions stay in `SKILL.md`; README is for humans and skills.sh discovery.
5. **No loose `SKILL.md`** at repo root or outside a named skill directory.
6. **Root README** with install instructions (`npx skills add …`) for consumer-facing repos.

## Recommended for maintained and tooling libraries

| Artifact | Purpose |
| --- | --- |
| `AGENTS.md` | Agent-facing commands, architecture, pointers to governances |
| `.agents/skills/` | Repo-internal contributor skills (`metadata: internal: true`) |
| `skills.sh.json` | skills.sh groupings and install scopes |
| `.claude-plugin/marketplace.json` | Claude plugin marketplace groupings |
| CI on `skills/` | Block merges that fail skill validation |
| `awesome-skills.json` | Curated discovery (cyberplace-specific; optional elsewhere) |

## Contributor and patch conventions

These extend **skill-design** placement rules for library repos:

| Placement | Location | Notes |
| --- | --- | --- |
| **User** | `~/.agents/skills/<name>/` | User machine; not in the skill repo |
| **Project private** | `.agents/skills/<name>/` | `metadata: internal: true`; not shipped in `npx skills add` public tree |
| **Project public** | `skills/<name>/` | Installed by consumers |

**Upstream patches** from a local install always map to `skills/<name>/…` in the source repo — never `.agents/skills/` in upstream.

## Discipline sections

AGENTS.md **Discipline** sections (for example `## Commit Discipline` injected by SessionStart hooks) are **agent-first**:

- **Dense normative rules** in the section body — unit-of-work definition, staging rules, habits.
- **Self-contained** — no links to other repository files; agent follows discipline without loading governances first.
- **`### References` at section bottom** — commit-helper skill name, `governance show` one-liners only.
- **Do not** paste full governance bodies or ecosystem surveys into AGENTS.md.

Use **`init-commit-discipline`** to inject commit discipline for this profile.

## Optional manifests (do not require all)

| File | When |
| --- | --- |
| `skills-lock.json` | Repo records installed skills for reproducibility |
| `skills.sh.json` | Listing on skills.sh with groupings/scopes |
| `.claude-plugin/marketplace.json` | Claude plugin UX |
| `governances/` | Repo ships version-pinned standards loadable via `governance show` |

Prefer **digest + lockfile** over ad hoc path scraping for reproducible installs.

## Anti-patterns

- Duplicating the same skill in `skills/` and `.agents/skills/` without a documented reason
- Bloating AGENTS.md with full governance bodies — use `governance show` pointers in References instead
- Embedding reference-repo catalogs or surveys in governances — keep those outside agent-loaded standards
- Rationale or "because…" prose in governances, discipline sections, or public skills
- `## Why`, `## Rationale`, `## Background`, or `## Context` sections in agent-loaded artifacts
- Linking to repository files (ADRs, research, other governances as paths) from governances, discipline sections, or public skills
- Assuming `node_modules` or install paths for loading governances from other repos
- Running no CI on skill-only repos that accept external PRs
- Committing `SKILL.local.md` or secrets into public skill trees

## Detecting a skill repo

Treat a repository as a **skill repo** when any of:

- `skills/**/SKILL.md` exists (or `plugins/**/skills/**/SKILL.md` for bundle archetype)
- README or package scripts document a skill-validation command
- Primary purpose is distributing Agent Skills (not an application that happens to have one skill)

Use **`init-skill-repo`** (when shipped) to scaffold and wire disciplines for this profile.

## Verification

| Archetype | Minimum check |
| --- | --- |
| Collection | Manual or `skills-ref validate` per skill |
| Maintained / tooling | your skill-validation tool (e.g. the aced `improve-skill` `validate.mts` engine) in CI |
| Tooling library | Full repo verify command documented in AGENTS.md |

Full quality review (Q6–Q13, E3–E8): run the **improve-skill** agent skill after mechanical validation passes.

## References

**Related governances** (load on demand):

```bash
npx cyberplace@<version> governance show skill-design
```

| Layer | Source |
| --- | --- |
| Single skill format | [agentskills.io specification](https://agentskills.io/specification) |
| Skill content quality | `governance show skill-design` |
| Skill security | `governance show skill-security` (when shipped) |
| Org operational governance | [OWASP AST09](https://owasp.org/www-project-agentic-skills-top-10/) — out of scope for repo layout |
| Distribution RFCs | [agentskills distribution RFCs](https://github.com/agentskills/agentskills/issues/255) — future `.well-known` manifests |
