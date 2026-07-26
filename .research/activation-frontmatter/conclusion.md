# Activation frontmatter proposal (May 2026)

Draft for upstream discussion with [Agent Skills](https://agentskills.io). **Upstream comment:** [agentskills#57 — merged `activation.lifecycle` proposal](https://github.com/agentskills/agentskills/issues/57#issuecomment-4540026815). **Normative rules in this repo:** `governance show skill-design` (Activation section). **Related ADR:** [ADR-0005: Skill Taxonomy](../../artifacts/adr/0005-skill-taxonomy.md).

---

## Problem

Agent hosts expose **hook lifecycle events** with different config key names:

- Claude Code: `SessionStart`, `PostToolUse`, `PreToolUse`, …
- Cursor: `sessionStart`, `postToolUse`, `afterFileEdit`, …
- Codex: overlaps with Claude for some events

Skill authors need a **portable declaration** of which lifecycle event should run a skill (via hook registration or host interpretation). The Agent Skills spec defines `metadata` for extensions but does not standardize hook event names.

Related mechanisms answer different questions:

| Question | Examples |
| --- | --- |
| Which hook event runs the skill | **Gap — this proposal** |
| Who may load without a hook | `description`, Claude `disable-model-invocation`, `"Internal skill:"` |
| Matchers / tool filters on hooks | Hook config `matcher` at registration time |

---

## Proposal

Document a recommended **`metadata` key** with normalized kebab-case hook event values:

```yaml
metadata:
  activation: session-start   # or per-situation, post-tool-use, …
```

### Allowed values

| `metadata.activation` | Claude Code | Cursor | Codex | Role |
| --- | --- | --- | --- | --- |
| `per-situation` | — | — | — | **Default.** No hook; load via `description` / invoke |
| `session-start` | `SessionStart` | `sessionStart` | `SessionStart` | Chat/session opens or resumes |
| `session-end` | `SessionEnd` | `sessionEnd` | — | Session ends |
| `pre-tool-use` | `PreToolUse` | `preToolUse` | — | Before any tool call |
| `post-tool-use` | `PostToolUse` | `postToolUse` | `PostToolUse` | After tool succeeds |
| `post-tool-use-failure` | — | `postToolUseFailure` | — | After tool fails |
| `before-submit-prompt` | `UserPromptSubmit` | `beforeSubmitPrompt` | — | Before prompt sent |
| `before-shell-execution` | — | `beforeShellExecution` | — | Before shell command |
| `after-shell-execution` | — | `afterShellExecution` | — | After shell command |
| `before-mcp-execution` | — | `beforeMCPExecution` | — | Before MCP call |
| `after-mcp-execution` | — | `afterMCPExecution` | — | After MCP call |
| `before-read-file` | — | `beforeReadFile` | — | Before file read |
| `after-file-edit` | — | `afterFileEdit` | — | After file edit |
| `subagent-start` | — | `subagentStart` | — | Subagent starts |
| `subagent-stop` | — | `subagentStop` | `SubagentStop` | Subagent stops |
| `pre-compact` | `PreCompact` | `preCompact` | — | Before context compaction |
| `stop` | `Stop` | `stop` | `Stop` | Agent turn completes |
| `after-agent-response` | — | `afterAgentResponse` | — | After agent response |
| `after-agent-thought` | — | `afterAgentThought` | — | After agent thought |
| `before-tab-file-read` | — | `beforeTabFileRead` | — | Tab completion read |
| `after-tab-file-edit` | — | `afterTabFileEdit` | — | Tab completion edit |

— = no documented equivalent on that host.

String values under `metadata` match the Agent Skills spec's key-value map.

### Authoring rules

- **Default:** omit or `per-situation` — no hook; load via `description`.
- **Hook-backed skills:** set `metadata.activation` to the normalized event; register hooks using host-specific keys from the mapping table.
- Matchers (e.g. `Write|Edit` for `post-tool-use`) remain a **hook registration** concern — optional future `metadata.activation-matcher`.
- Pair with `metadata.persona: "true"` when the skill pattern is persona (cyberplace convention).

### Examples

Opt-in persona (default):

```yaml
---
name: security-auditor
description: Use this skill when the user asks for a security audit or reviewer stance.
metadata:
  persona: "true"
  activation: per-situation
---
```

Discipline injected at chat open:

```yaml
---
name: commit-discipline
description: Internal skill for commit discipline hook injection.
metadata:
  activation: session-start
---
```

---

## Non-goals

- Defining hook payload formats or stdout contracts (see host docs and **agent-tool-output** governance)
- Replacing Claude `disable-model-invocation` or Cursor `alwaysApply`
- Requiring all hosts to implement every mapped event in phase 1

---

## Compatibility

- Omitted key → treat as `per-situation`
- Unknown `metadata` keys are already ignored by spec-compliant clients
- No breaking change to required frontmatter (`name`, `description`)

---

## Alternatives considered

| Alternative | Why not (phase 1) |
| --- | --- |
| Top-level `activation` field | Implies core spec contract before hosts converge; defer promotion to phase 2 |
| Persistence-only semantics (`session-start` = "stay loaded") | Collides with hook event naming; use hook vocabulary instead |
| Prose-only in skill body | Not machine-readable |
| Overload `description` | Mixes load trigger with hook lifecycle |

---

## Suggested upstream path

**Posted:** [agentskills#57 comment — merged activation block (`activation.lifecycle`)](https://github.com/agentskills/agentskills/issues/57#issuecomment-4540026815) (canonical upstream thread; supersedes [discussion #408](https://github.com/agentskills/agentskills/discussions/408)).

**Phase 1:** Document `activation` as a recommended metadata key with the mapping table above (metadata conventions appendix or companion doc). Align with [agentskills#271](https://github.com/agentskills/agentskills/issues/271) extended frontmatter discussions.

**Phase 2:** Hosts and tooling (e.g. cyberplace `hook register`) read `metadata.activation` from skill frontmatter and map to native hook config.

### Suggested spec text (metadata conventions)

> **`activation`** (optional, string): Normalized hook lifecycle event for this skill. Values are lowercase kebab-case names from the hook event registry (see mapping table). Default: `per-situation` when omitted — load via `description` without a hook. Does not replace hook matchers or invoker-control fields.

---

## Reference implementation

- [governances/skill-design.md](../../governances/skill-design.md) — Activation section
- [skills/create-skill/SKILL.md](../../skills/create-skill/SKILL.md)
- [skills/create-persona-skill/SKILL.md](../../skills/create-persona-skill/SKILL.md)
- [src/hook/build-definition.ts](../../src/hook/build-definition.ts) — partial CLI mapping today

---

## Sources

- [agentskills#57 — activation mechanisms RFC (merged proposal comment)](https://github.com/agentskills/agentskills/issues/57#issuecomment-4540026815)
- [Agent Skills specification](https://agentskills.io/specification)
- [Cursor third-party hooks mapping](https://cursor.com/docs/reference/third-party-hooks)
- [Claude Code skills docs](https://code.claude.com/docs/en/skills)
- [ADR-0005: Skill Taxonomy](../../artifacts/adr/0005-skill-taxonomy.md)
- [Skill ecosystem landscape](../skill-ecosystem-landscape/conclusion.md)
