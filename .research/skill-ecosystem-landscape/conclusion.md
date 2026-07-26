# Skill ecosystem landscape (May 2026)

Background research for cyberplace repo structure, external governance federation, and alignment with the Agent Skills open standard. **Normative rules live in governances and ADRs** — this document preserves evidence and links for future work.

**Related:**

- [ADR-0002: External governance federation](../../artifacts/adr/0002-external-governance-federation.md)
- Governance: `governance show skill-repo-structure` (after build)
- [ADR-0001: Governance vs discipline taxonomy](../../artifacts/adr/0001-governance-vs-discipline-taxonomy.md)
- [Activation frontmatter proposal](../activation-frontmatter/conclusion.md) — [upstream comment on agentskills#57](https://github.com/agentskills/agentskills/issues/57#issuecomment-4540026815)

---

## Question

What do existing standards and popular skill repos already say about **skill library repo layout**, **governance**, and **distribution** — and where is cyberplace filling a gap?

---

## Standards and “foundation” bodies

There is **no separate “AI Agent Skill Foundation”** shipping repo-layout guidance. Responsibility is split:

| Body | URL | Scope |
| --- | --- | --- |
| **Agent Skills open standard** | [agentskills.io](https://agentskills.io), [agentskills/agentskills](https://github.com/agentskills/agentskills) | **Single skill directory** — `SKILL.md`, optional `scripts/`, `references/`, `assets/` |
| **OWASP Agentic Skills Top 10** | [owasp.org/www-project-agentic-skills-top-10](https://owasp.org/www-project-agentic-skills-top-10/) | **Security and org ops** — inventory, approval, audit (AST09), not repo trees |
| **Vercel Skills CLI** | [vercel-labs/skills](https://github.com/vercel-labs/skills) | Install/discovery — `npx skills add`, `skills-lock.json` |
| **skills.sh** | [skills.sh](https://skills.sh) | Marketplace listing |

The agentskills spec intentionally **does not** define how to organize a multi-skill repository. [CONTRIBUTING](https://github.com/agentskills/agentskills/blob/main/CONTRIBUTING.md) states a high bar for spec additions and that they are **not** maintaining a community skill directory.

---

## What agentskills.io defines (per skill)

Minimum layout:

```text
skill-name/
  SKILL.md          # required — YAML frontmatter + markdown body
  scripts/          # optional
  references/       # optional
  assets/           # optional
```

Key constraints: `name` matches directory; progressive disclosure; validate with [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref).

Client implementation guides mention cross-client paths such as `.agents/skills/` — convention, not core spec.

The spec defines **`metadata`** for author/client extensions but does not standardize a **portable hook lifecycle vocabulary** — how skill authors declare which agent hook event should run a skill. Claude Code, Cursor, and Codex each use different hook config key names (`SessionStart` vs `sessionStart`, `PostToolUse` vs `postToolUse`, etc.). cyberplace proposes **`metadata.activation`** as normalized kebab-case hook events, with `per-situation` for description-triggered skills — see [2026-05-activation-frontmatter-proposal.md](../activation-frontmatter/conclusion.md) and `governance show skill-design`.

---

## Active agentskills discussions (distribution and repos)

| Topic | Reference | Status (May 2026) | Takeaway |
| --- | --- | --- | --- |
| Packaging / dependency managers | [agentskills#338](https://github.com/agentskills/agentskills/issues/338) | Closed | Maintainers won't dictate one PM; ecosystem must converge |
| `.well-known` discovery | [agentskills#255](https://github.com/agentskills/agentskills/issues/255), [PR #254](https://github.com/agentskills/agentskills/pull/254) | Open | Manifest + packaged artifacts + digests; lockfile pinning |
| Collection namespaces `collection/skill` | [agentskills#312](https://github.com/agentskills/agentskills/issues/312) | Discussion | May affect multi-skill directory depth later |
| Skills as packages | [#226](https://github.com/agentskills/agentskills/issues/226) | Proposals | Manifest-based dependency model |
| Shared files in multi-skill repos | [#271](https://github.com/agentskills/agentskills/issues/271) | Proposal | Possible `includes` frontmatter |
| Frontmatter signing | [#247](https://github.com/agentskills/agentskills/issues/247) | RFC | Overlaps OWASP proposed metadata |

**Implication for cyberplace:** External governance federation should align with **manifest + digest + npm-style packages**, not reading files from `node_modules` or installed skill directories.

---

## OWASP — “governance” vs repo structure

**AST09 — No Governance** covers organizational controls: skill inventory, risk tiers, approval records, invocation audit logs, revocation, agent NHI identity — not `skills/` vs `.agents/` layout.

OWASP proposes extended frontmatter (`signature`, `content_hash`, `scan_status`, `risk_tier`) as a cross-platform metadata superset. Maps to cyberplace **`skill-security`** (content) and optional **provenance** checks (P1–P3 in audit-skill), not **`skill-repo-structure`**.

---

## Popular skill repos — induced patterns

Survey of public repos (GitHub top-level layout, May 2026):

| Repo | Skill path | Notable repo artifacts |
| --- | --- | --- |
| [anthropics/skills](https://github.com/anthropics/skills) | `skills/<name>/` | `spec/`, `template/`; skills-only |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `skills/<name>/` | `skills.sh.json`, `AGENTS.md` |
| [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) | `skills/<name>/` | `.claude-plugin/marketplace.json`, `agents/`, `commands/` |
| [obra/superpowers](https://github.com/obra/superpowers) | `skills/<name>/` | Multi-agent plugin dirs, `hooks/`, `package.json` |
| [trailofbits/skills](https://github.com/trailofbits/skills) | `plugins/<bundle>/skills/<name>/` | Plugin-bundle layout |
| [microsoft/skills](https://github.com/microsoft/skills/) | `.github/plugins/.../skills/` | Language symlinks, `AGENTS.md` template |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | `skills/<name>/` | [skill-anatomy.md](https://github.com/addyosmani/agent-skills/blob/HEAD/docs/skill-anatomy.md) |
| **cyberplace** | `skills/<name>/` | npm CLI, `governances/`, `.agents/skills/`, audit CI |
| **repobuddy/agent-changesets** | `skills/<name>/` | Minimal skills-only; changeset skills |

**Archetypes:**

1. **Collection** — `skills/` + README; optional `skills.sh.json`
2. **Maintained library** — collection + CI + lock/manifest
3. **Tooling library** — maintained + npm CLI + `governances/` + verify script
4. **Plugin bundle** — `plugins/<bundle>/skills/...` (Trail of Bits pattern)

### Reference implementations by archetype

Maps each archetype in `governance show skill-repo-structure` to public repos (May 2026). Update this table when surveying the ecosystem — not the governance file.

| Archetype | Reference repos |
| --- | --- |
| **Collection** | [anthropics/skills](https://github.com/anthropics/skills), [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills), [repobuddy/agent-changesets](https://github.com/repobuddy/agent-changesets) |
| **Maintained library** | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (CI + `skills.sh.json`), [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) |
| **Tooling library** | [cyberuni/cyberplace](https://github.com/cyberuni/cyberplace), [obra/superpowers](https://github.com/obra/superpowers) |
| **Plugin bundle** | [trailofbits/skills](https://github.com/trailofbits/skills), [microsoft/skills](https://github.com/microsoft/skills/) (`.github/plugins/…`) |

---

## cyberplace decisions recorded from this research

### Governances to add or extend

| Item | Decision |
| --- | --- |
| `skill-security` | Yes — extract E1–E7 from audit-skill |
| Placement rules | Extend **`skill-design`**, not a separate governance |
| Pinned `npx cyberplace@<exact>` | **ADR/repo doc**, not shipped governance |
| `changeset-authoring` | **`repobuddy/agent-changesets`** PR; federation deferred |
| `conventional-commits` | Yes — cyberplace governance |
| `skill-supply-chain` | Low priority; means P1–P3 **skill provenance**, not npm CVE audit; separate from `agent-tool-output` |
| **`skill-repo-structure`** | Yes — library-repo layer above agentskills.io per-skill spec |

### Disciplines and workflows (not governances)

| Item | Decision |
| --- | --- |
| Verify / acceptance | **Acceptance Pipeline** workflow ([unclebob/Acceptance-Pipeline-Specification](https://github.com/unclebob/Acceptance-Pipeline-Specification)), not SessionStart discipline |
| Augmentation habit | **`skill-augmentation-discipline`**; composite hook ordering via future ADR |
| Skill-repo audit habit | Scope to skill repos; orchestrate via **`init-skill-repo`** |

### External governance federation

Options rejected for now:

- Resolve governances from `skills-lock.json` install paths
- Read from `node_modules/...`

Blocked until skill repos publish **npm packages** (or agentskills distribution RFC lands with manifest + digest). Track in ADR-0002.

---

## Follow-up work

| Action | Owner repo |
| --- | --- |
| PR: `governances/changeset-authoring.md` | `repobuddy/agent-changesets` |
| Issue: external governance federation | `cyberplace` (ADR-0002) |
| Governance: `skill-repo-structure` | `cyberplace` |
| Governance: `skill-security`, `conventional-commits` | `cyberplace` |
| Skill: `init-skill-repo` | `cyberplace` |
| Acceptance pipeline init skill | `cyberplace` (later) |

---

## Sources

- [Agent Skills specification](https://agentskills.io/specification)
- [agentskills/agentskills](https://github.com/agentskills/agentskills) issues #255, #312, #338
- [OWASP Agentic Skills Top 10](https://owasp.org/www-project-agentic-skills-top-10/)
- [Acceptance Pipeline Specification](https://github.com/unclebob/Acceptance-Pipeline-Specification)
- Repo layouts verified via GitHub API, May 2026
