# Skill Design

Rules for authoring SKILL.md files that agents load on demand. Apply when creating, generalizing, or auditing a skill — before adding scripts or CLI instructions.

## Structure

SKILL.md must be agent-first: dense normative rules the agent executes without opening linked files first.

- Do not include `## Why`, `## Rationale`, `## Background`, or `## Context` sections.
- Do not include causal explanation ("because…") or rationale prose in the body.
- One-line scope ("Apply when…") is allowed at the top.
- Put optional depth in `## References` at the end — `governance show` commands, external HTTPS URLs, sibling files in the same skill folder only.

**SKILL.md structure:**

```markdown
# Skill Title
## When to use / Prerequisites   # short scope
## Workflow                      # numbered steps, decision logic
## Anti-patterns                 # optional
## References                    # on-demand standards, external URLs, reference.md — no repo file paths
```

Do not embed References content or links to sibling files mid-workflow.

## Core principles

### Decisions over documentation

Encode what to decide and how. Do not repeat generic best practices, API docs, or facts the model can derive without the skill.

### Narrow and composable

One workflow per skill. A skill is selected one of three ways — matched against a situation, named by a caller, or fired by an event. Declare that choice in the `description`; never infer it from a visibility flag.

- **Name-only skills** (loaded by name from another skill, never matched to a user situation) set the `description` to exactly `"By name only"` — nothing else. The minimal description is the mechanism, not a label for it: the `description` is the only surface the model matches against, so every word added to it is another handle for a spurious match. Identity — what the skill is, who calls it, what it returns — belongs in the body and README, which the caller reads after loading it by name.
- **`user-invocable` is a visibility flag only.** It controls whether a skill appears in the user's command list. It never determines how a skill is selected, and must not be read as one: a skill may legitimately be `user-invocable: false` and still situationally triggered.
- Whether a skill can run standalone is documentation for its README, not a declared kind. A self-contained engine and a fragment of a larger capability are selected the same way and carry the same minimal description.
- Neither type should be loaded as ambient context.

### No baked-in opinions

Detect the user's setup (package manager, monorepo shape, editor, OS paths) at runtime rather than assuming a specific stack. If the skill only applies to one stack, say so explicitly in the description.

## Placement and scope

Where a skill file lives depends on who consumes it. Whole-repo layout (manifests, CI, archetypes) is covered in **skill-repo-structure** — load from References when scaffolding a library repo.

### Skill placement

Use **placement** for where a skill lives; do not call this axis "type".

| Placement | Location | Use case |
| --- | --- | --- |
| **User** | `~/.agents/skills/<name>/` | Personal skills across all projects |
| **Project private** | `.agents/skills/<name>/` | Contributor tooling scoped to one repo |
| **Project public** | `skills/<name>/` | Shipped with a package or installed via `npx skills add` |

### Skill patterns

Use **pattern** for the workflow shape; do not overload "kind" or "type" here.

| Pattern | Use case |
| --- | --- |
| **Process** | Multi-step workflows where sequence and decision logic matter |
| **Tool-based** | Workflows centered on consistent use of tools, systems, or connectors |
| **Standard** | Workflows that enforce tone, structure, formatting, or quality bars |
| **Persona** | Loads an expert stance, decision style, and working behavior into the session |

Repo-internal skills must include `metadata: internal: true` in frontmatter.
Persona skills must include `metadata.persona: "true"`.

### Patch and local rules

- Upstream contributions from a local install map to `skills/<name>/…` in the source repo — never `.agents/skills/` upstream.
- **`SKILL.local.md`** extends a skill locally; never commit or push it upstream.
- Include every changed file under the skill folder when patching (not only `SKILL.md`).

## Progressive disclosure

Keep SKILL.md concise — essential workflow and decision logic only.

- Put detailed reference material in sibling files (`reference.md`, `examples.md`) in the same skill folder.
- Link sibling files **only from References**; agent reads them when stuck, not by default.
- Link references **one level deep** from SKILL.md; avoid chains of nested files.
- Aim to keep SKILL.md under ~500 lines; split when a skill grows beyond that.

## Extract deterministic logic

When a step produces the same output given the same input and needs no judgment, move it out of prose:

- Prefer an **existing project CLI** or a small **script** in the skill's `scripts/` directory.
- The skill retains **when** to invoke the tool; the tool retains **how**.
- Candidates: text manipulation, file I/O, structured data transforms, validation with fixed rules.

Do not re-derive deterministic steps in natural language each run.

### Keep scripts inside the skill folder

The skill folder is the unit an installer copies (`skills add --skill <name>` takes that folder and nothing else).

- Put every script the skill runs in its own `scripts/`, and invoke it as `node <skill-dir>/scripts/<file>`.
- Never reference a path outside the skill folder: a sibling skill, a plugin's `bin/`, or the package root. Standalone copies and symlinked installs break such paths without an error.
- Use Node built-ins only, or bundle dependencies into the script. The script itself never depends on `npx`, `tsx`, or a global install; the pinned `npx` fallback below is the skill's, not the script's. For a released CLI the skill depends on but does not ship, follow **cli-resolution**.

### Share logic by bundling it into each skill

When several skills, or a skill and a package CLI, need the same logic:

- Author it once in the package source, typed and tested there.
- Have the build emit a self-contained bundle into the `scripts/` of each skill that uses it. Start the bundle with a header naming its source file and saying it is generated, then the usage comment an agent reads when stuck. Minify the rest.
- Do not commit the bundles. Gitignore them, build them in `prepack`, and ship them through the npm package's `files`.
- Add a CI check that packs the package, unpacks it with no `node_modules`, and runs each bundle from the unpacked skill folder.
- If the build is cached (for example by Turborepo), list each bundle as a build output by exact path. A glob such as `skills/**` restores cached copies over hand-written scripts.
- Keep the tests with the source, outside the skill folder, so installs do not copy them.
- Expose the same commands in the package CLI, and give each such skill a pinned fallback: when `scripts/<file>` is missing or cannot run, call `npx -y <package>@^<version> <command>` with the same arguments. A skill installed from git has no built `scripts/`, and this is how it still works.
- Distribute the plugin from npm where the harness supports an npm plugin source. Git-sourced installs, including organization-distributed marketplaces that exclude npm sources, use the fallback.

When a skill includes `scripts/` or documents CLI commands agents run, load **agent-tool-output** from References for stdout, JSON, non-interactive, and stderr rules.

## Description and structure

### Frontmatter

- `name` must match the parent directory name exactly.
- `description` must contain `"Use this skill when"` or `"When to use"` trigger language — **unless the skill is name-only**, whose `description` is exactly `"By name only"` and carries no trigger language at all.
- Keep `description` ≤120 characters — long descriptions are truncated in the agent context window.
- `compatibility` — optional; declare environment constraints (required tools, network access, OS, runtime version). Include only when the skill has requirements the agent cannot assume.

#### Runtime fields

Support varies by platform; the notes below are Claude Code's documented behavior. Set none of these unless the skill needs them — each one is a deviation the reader must account for.

| Field | Effect |
| --- | --- |
| `allowed-tools` | **Pre-approves** the listed tools for the invoking turn. It does not restrict the tool pool — every other tool stays callable. The grant clears on the user's next message. |
| `disallowed-tools` | Removes tools from the pool while the skill is active. This is the field that restricts. Also clears on the next message. |
| `model` | Model to use while the skill is active. Applies for the rest of the current turn only; the session model resumes on the next prompt. |
| `effort` | Effort level while the skill is active: `low`, `medium`, `high`, `xhigh`, `max`. Same turn-scoped lifetime as `model`. |
| `context: fork` | Runs the skill in a subagent, with the skill body as the task prompt. Pair with `agent:` to choose the subagent type. Only meaningful for a skill that states a task — a reference or stance skill forked this way receives no actionable prompt and returns nothing useful. |
| `paths` | Glob patterns limiting automatic activation to matching files. |

A skill cannot express a tool **allowlist** — `allowed-tools` grants and `disallowed-tools` denies, but neither says "only these". A hard allowlist, `permissionMode`, `maxTurns`, persistent `memory`, `mcpServers`, and worktree `isolation` remain agent-definition fields. Reach for an agent definition when one of those is the actual requirement, not for `model` or `effort` alone.

### skill.json — install-time metadata

`skill.json` is an optional sidecar file in the same directory as `SKILL.md`. It holds install-time metadata that the `skills add` / `skills update` installer reads. It is **not** loaded into agent context, so it costs zero tokens at runtime.

Do not put install-time metadata in SKILL.md frontmatter — agents load it unnecessarily.

**Supported fields:**

```json
{
  "distribution": {
    "install_via": "package_manager",
    "package": {
      "name": "cyber-asana",
      "bin": "cyber-asana"
    }
  }
}
```

**`distribution`** — declare the required install channel.

| Field | Required | Description |
| --- | --- | --- |
| `install_via` | yes | `"package_manager"` — must be installed via npm, not source control |
| `package.name` | when `install_via: package_manager` | npm package that ships the skill binary |
| `package.bin` | no | binary name; defaults to `package.name` |

Use `install_via: package_manager` when the skill depends on a released binary from the same repo. Source-based `skills add org/repo` will skip such skills and print an `npm install` hint.

### Activation

The `activation` field belongs in **SKILL.md frontmatter** as a **top-level field** (not nested under `metadata:`). Agents need this information to know whether a hook is involved; not all agents support hooks, so it must travel with the skill file.

```yaml
---
name: my-skill
activation: per-situation
description: "Use this skill when..."
---
```

| `activation` | Claude Code | Cursor | Codex |
| --- | --- | --- | --- |
| `per-situation` | — | — | — |
| `session-start` | `SessionStart` | `sessionStart` | `SessionStart` |
| `session-end` | `SessionEnd` | `sessionEnd` | — |
| `pre-tool-use` | `PreToolUse` | `preToolUse` | — |
| `post-tool-use` | `PostToolUse` | `postToolUse` | `PostToolUse` |
| `post-tool-use-failure` | — | `postToolUseFailure` | — |
| `before-submit-prompt` | `UserPromptSubmit` | `beforeSubmitPrompt` | — |
| `before-shell-execution` | — | `beforeShellExecution` | — |
| `after-shell-execution` | — | `afterShellExecution` | — |
| `before-mcp-execution` | — | `beforeMCPExecution` | — |
| `after-mcp-execution` | — | `afterMCPExecution` | — |
| `before-read-file` | — | `beforeReadFile` | — |
| `after-file-edit` | — | `afterFileEdit` | — |
| `subagent-start` | — | `subagentStart` | — |
| `subagent-stop` | — | `subagentStop` | `SubagentStop` |
| `pre-compact` | `PreCompact` | `preCompact` | — |
| `stop` | `Stop` | `stop` | `Stop` |
| `after-agent-response` | — | `afterAgentResponse` | — |
| `after-agent-thought` | — | `afterAgentThought` | — |
| `before-tab-file-read` | — | `beforeTabFileRead` | — |
| `after-tab-file-edit` | — | `afterTabFileEdit` | — |

— = no documented equivalent on that host.

**Default:** omit or set `per-situation` — no hook; load via `description` or explicit invoke.

**Hook-backed skills:** set `activation` to the normalized event, then register with `hook register --event …` (cyberplace CLI maps `session-start` → `SessionStart` / `sessionStart`, `post-tool-use` → `PostToolUse` / `postToolUse`). CLI today supports `SessionStart` and `PostToolUse` only; other values are portable declarations until hosts implement them.

**Defaults by pattern:** persona → `per-situation` (opt-in via `description`); discipline / always-on injection → `session-start`; process / tool-based / standard → `per-situation` or omit.

Deprecated: `metadata.activation` in SKILL.md frontmatter. Use top-level `activation:` instead.

### Body

- Include actionable steps, numbered instructions, or decision logic — not just a restatement of the description.
- Do not instruct generic behavior the model already follows ("write clean code", "be helpful").

## Anti-patterns

- Rationale or "because…" prose in the body
- `## Why`, `## Rationale`, `## Background`, or `## Context` sections
- Links to other repository files mid-workflow
- Mid-body links to sibling skill files (use References at end)

## Governance lookup order

A skill that reads a governance at run time stops at the first hit:

1. `.agents/governances/<name>.md` — project override.
2. Only when an installed copy exists: `upx --local-only buddy-agent-harness@^<major> governance show <name> --overrides-only` when `upx` is on PATH; else `buddy-agent-harness governance show <name> --overrides-only` when `command -v buddy-agent-harness` finds it. Exit 127 from `upx`, or any non-zero exit, means no override. Never through `npx`.
3. `references/governances/<name>.md` inside the skill — the default copy, committed to git.

Copies live at `<skill>/references/governances/<name>.md`, and the files in that folder declare which governances the skill uses. A skill copies every governance a copied governance references, and lists every copy in its SKILL.md References, so each stays one level deep. A pointer inside a copy (`governance show <other>`) is read as "load `references/governances/<other>.md`".

`buddy-agent-harness governance` and the copy step in `universal-plugin plugin build` are planned (tracked in https://github.com/repobuddy/buddy-agent-harness/issues/122). Until they ship, a skill uses step 3 only.

## References

Related governances (load on demand; read stdout as authoritative):

```bash
npx cyberplace@<version> governance show skill-repo-structure
npx cyberplace@<version> governance show agent-tool-output
npx cyberplace@<version> governance show universal-plugin
```

Runtime field reference (re-verify before relying on a version-gated field):

- <https://code.claude.com/docs/en/skills> — skill frontmatter, invocation control, `context: fork`
- <https://code.claude.com/docs/en/sub-agents> — agent-definition frontmatter, `skills:` preloading
