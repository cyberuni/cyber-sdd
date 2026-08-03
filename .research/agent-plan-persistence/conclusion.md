# Agent plan / session-state persistence across coding harnesses

**Date:** 2026-06 · **Informs:** ADR-0015 (three-tier provenance and the plan as a handoff
artifact), SDD `design/provenance-model.md`, the SDD plan/ledger/cursor design.

How do major AI coding harnesses persist **mid-flight plan / todo / session state** — and
durable memory — to disk? Where, in what format, committed or not, and with what lifetime?
This survey grounds SDD's decision to put the ephemeral mission **plan** in the worktree as a
portable `*.plan.md` handoff artifact, keep a slim durable **ledger** sibling to the spec, and
read durable **public** signal (CR source + changesets + git) in the outer loops.

## Survey

| Harness | Mid-flight plan/todo on disk? | Where | Format | In repo / committed |
|---|---|---|---|---|
| **Cursor** | Yes — *plans* | `~/.cursor/plans/` (default); **`.cursor/plans/` on "save to workspace"** | `*.plan.md` Markdown (file paths + editable to-dos) | optional — workspace copy committable |
| **Claude Code** | Tasks (default since v2.1.142; legacy `TodoWrite` was session-only) | `~/.claude/tasks/<task-list-id>/` (id via `CLAUDE_CODE_TASK_LIST_ID`) | per-task files (JSON unconfirmed); deps via `blocks`/`blockedBy` | no — home dir |
| **Copilot CLI** | Yes — session | `~/.copilot/session-state/<id>/` | `events.jsonl` (append-only) + `plan.md` + `checkpoints/` + `workspace.yaml` | no — home dir, also account-synced |
| **Copilot coding agent** (cloud) | No (plan in cloud session; output is branch + PR) | GitHub "Agents" tab | UI session | no — only code commits land |
| **Codex CLI** | Yes — inside the rollout transcript (incl. `update_plan` events) | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` | append-only **JSONL** event stream | no — home dir; `--ephemeral` disables |
| **Gemini CLI** | Checkpoints (opt-in, off by default) | `~/.gemini/tmp/<project_hash>/checkpoints` + `~/.gemini/history/<project_hash>` (shadow git) | JSON + git objects | no — home dir |
| **Cline** | Internal task store + checkpoints (auto) + Memory Bank (prompt pattern) | VS Code globalStorage (`tasks/<id>/…json`, shadow-git checkpoints); `memory-bank/*.md` in repo | JSON (state); Markdown (memory) | state no; Memory Bank usually committed (docs silent) |
| **Roo Code** (Cline fork) | Internal task store; Boomerang passes context **in-conversation only** | globalStorage / `~/.roo` (configurable) | JSON (dual stream: api history + ui messages) | state no; Memory Bank is **community add-on only** |
| **Aider** | No structured plan (architect plan lands in chat transcript) | `.aider.chat.history.md`, `.aider.input.history`, `.aider.tags.cache.*` | Markdown / text / cache | **gitignored by default** (`.aider*`) |
| **Amp** (Sourcegraph) | No — in-thread `todo_read`/`todo_write`, server-side threads | ampcode.com (server) | server thread | no |
| **Devin** (Cognition) | No — plans server-side; durable = Knowledge Base + Playbooks | Devin cloud / app | server docs | no — workspace resets unless committed |

In-repo **durable config** (distinct from task state) is universal: `AGENTS.md`,
`.github/copilot-instructions.md`, `GEMINI.md`, Cursor `.cursor/rules/*.mdc`, Windsurf
`.windsurf/rules` (`.devin/rules`), Aider `CONVENTIONS.md`. Windsurf/Cascade **Memories** live
out-of-repo at `~/.codeium/windsurf/memories/` keyed by a workspace-path hash.

## Three lessons

1. **In-repo mid-flight state is the exception; Cursor is the outlier.** Nearly every tool
   parks runtime state in the **home dir** (`~/.codex`, `~/.gemini`, `~/.copilot`,
   `~/.claude/tasks`, Cline globalStorage) or **server-side** (Amp, Devin). In-repo files are
   durable **config**, not mid-flight scratch.
2. **A clean format dichotomy.** Machine event logs are **append-only JSONL** (Codex
   `rollout-*.jsonl`, Copilot `events.jsonl`); human/portable plans and memory are
   **Markdown** (Cursor `*.plan.md`, Cline Memory Bank, GEMINI.md). SDD adopts both — a
   `*.plan.md` brief plus a `*.log.jsonl` telemetry sibling.
3. **Everyone separates durable config from runtime state.** None keeps a durable *internal
   provenance ledger* (gate verdicts + distilled lessons); that tier is SDD-specific.

## Two field properties that are wrong for SDD

- **Home-dir / global storage forces a synthetic unique key.** Because `~/.tool/` is shared
  across every checkout, those tools must synthesize a per-project-and-per-worktree
  identifier — Gemini's `<project_hash>`, Windsurf's workspace-path hash, Claude Code's
  `CLAUDE_CODE_TASK_LIST_ID`. SDD already has a natural key (the worktree), so co-locating the
  plan **in the tree** makes its path intrinsically unique with no hashing.
- **Runtime state is private to its own runtime.** A JSONL rollout or a server thread is only
  resumable as *"continue session `<id>`"* inside the same tool. There is **no portable,
  cross-model mission artifact** in the field. SDD's `*.plan.md` — self-contained Markdown,
  co-located with the work — is exactly that artifact: hand the plan to another agent or
  model and the mission continues.

## Sources

- Cursor: [Plan Mode docs](https://cursor.com/docs/agent/plan-mode), [Plan Mode blog](https://cursor.com/blog/plan-mode), [forum: `.plan.md` in `~/.cursor/plans`](https://forum.cursor.com/t/plan-mode-creates-many-plan-md-snapshots-in-home-user-cursor-plans-for-a-single-plan-2-2-36-linux/146772)
- Claude Code: [Agent SDK — todo/task tools](https://code.claude.com/docs/en/agent-sdk/todo-tracking), [issue #6207 (persistent plan request)](https://github.com/anthropics/claude-code/issues/6207)
- Copilot: [CLI session data](https://docs.github.com/en/copilot/how-tos/copilot-cli/chronicle), [cloud agent plan/changelog](https://github.blog/changelog/2026-04-01-research-plan-and-code-with-copilot-cloud-agent/)
- Codex CLI: [features](https://developers.openai.com/codex/cli/features), [non-interactive/ephemeral](https://developers.openai.com/codex/noninteractive), [config](https://developers.openai.com/codex/config-reference)
- Gemini CLI: [checkpointing](https://geminicli.com/docs/cli/checkpointing/), [memory/GEMINI.md](https://google-gemini.github.io/gemini-cli/docs/tools/memory.html)
- Cline: [Memory Bank](https://docs.cline.bot/features/memory-bank), [task storage issue #7742](https://github.com/cline/cline/issues/7742)
- Roo Code: [Boomerang tasks](https://roocodeinc.github.io/Roo-Code/features/boomerang-tasks), [settings/storage](https://docs.roocode.com/features/settings-management)
- Aider: [config options](https://aider.chat/docs/config/options.html), [conventions](https://aider.chat/docs/usage/conventions.html)
- Windsurf: [Cascade Memories & Rules](https://docs.devin.ai/desktop/cascade/memories)
- Amp: [manual](https://ampcode.com/manual)
- Devin: [Knowledge & Playbooks](https://docs.devin.ai/product-guides/knowledge)

*Confidence flags from the survey:* Cursor's exact default path/extension is community-sourced
(forum), not official docs; Claude Code Tasks and Copilot CLI `plan.md` on-disk serialization
are inferred, not verbatim-documented; Windsurf appears to write **no** per-task plan file
(absence of evidence). None affects the lessons SDD draws.
