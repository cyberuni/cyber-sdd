---
name: init
description: Use this skill to onboard SDD's opt-in repo-scoped conveniences — currently the mission statusline, which surfaces the current mission phase in the Claude Code status line while a mission runs. Trigger on "set up the statusline", "configure the SDD status line", "onboard SDD conveniences", or "init sdd".
---

# init

The **onboarding front door** for an SDD project — the place a repo opts into SDD's optional, repo-scoped conveniences. Unlike `sdd:sdd` (the gateway) and `sdd:manage` (thin classifiers that write no repo files), `init` is a **setup skill**: it writes operational config, never spec/contract state. It **opens no CR** and **invokes no gate**.

`sdd:manage`'s Setup & discovery group loads this skill for a bare "set up / configure the statusline" request.

## v1 capability — the mission statusline

While a mission runs, the conductor (`start-mission`) overwrites `.agents/sdd/statusline` with the current phase on each transition and clears it on every exit. This skill wires the **reader**: a Claude Code `statusLine` command in **project** `.claude/settings.json` that renders that file. It never writes or clears the runtime value itself — only the conductor does.

### 1. Offer, and ask consent

Ask the user whether to enable the mission statusline. **On decline, write nothing** — no settings change, no `.gitignore` entry — and stop.

### 2. Ask the display mode

On enable, ask whether the mission status should render:

- **own-line** — its own row, beneath any existing status line output
- **same-line** — appended to the end of the existing status line output

### 3. Detect a global statusline

Before wiring, run the read-only detection — Claude Code's project `statusLine` **replaces** the global one (no merge), so a fresh project wiring would silently shadow a status line living in `~/.claude/settings.json`:

```bash
node "<skill>/scripts/wire-statusline.mts" --root . --detect
```

It reports the project statusLine (absent | wired | foreign), the global statusLine (present | absent), and the shadow risk. On a shadow risk (project absent, global present), tell the user wiring will shadow their global status line and ask:

- **compose it** (default) — the global command is wrapped as the base, the piped status input flows through to it, and the global line keeps rendering. Warn when project `.claude/settings.json` is committed: composing copies the global command text into it, which may be machine-specific.
- **shadow it** — wire with no base (pass `--no-global-base` below).

No shadow risk → proceed straight to wiring.

### 4. Wire the reader

Run the engine to compose the reader into project settings and (in a git repo) gitignore the status file:

```bash
node "<skill>/scripts/wire-statusline.mts" --root . --wire --mode own-line
node "<skill>/scripts/wire-statusline.mts" --root . --wire --mode same-line   # add --no-global-base to shadow deliberately
```

The engine:

- writes **only** `.claude/settings.json` and, only in a git repo, `.gitignore` — the global `~/.claude/settings.json` is read for detection only, **never written**
- **composes, never stomps**: an existing project `statusLine` command's output is preserved as the wrapped base; the SDD segment is added around it (a new row for own-line, an appended segment for same-line). No project command → a fresh wire wraps the detected **global** command as the base by default (`--no-global-base` opts out); no command anywhere → it creates one.
- a project `statusLine` always wins as the base; re-running recovers the base from the wired command and never re-consults the global settings; a malformed global settings file counts as no global statusLine
- the wired command reads `.agents/sdd/statusline` and falls through to nothing beyond the composed base when the file is absent — no heartbeat, no polling, just a read
- adds `.agents/sdd/statusline` to `.gitignore` idempotently when the folder is a git repo; skips when it is not
- is **idempotent**: re-running (same or a different mode) rewrites the one managed block, never stacking a second SDD segment or duplicating the gitignore line

When `node` is absent, an agent performs the same edit by hand: read `.claude/settings.json`, wrap any existing project `statusLine.command` as a POSIX `sh` subshell base — when the project defines none, read `~/.claude/settings.json` (read-only) and, with the user's consent from step 3, wrap its `statusLine.command` as the base instead — append the mode-specific read-and-render logic for `.agents/sdd/statusline`, and add the gitignore line when the folder is a git repo — never touch the global settings file.

### Report

State whether the statusline was enabled or declined, the chosen mode (if enabled), whether a global statusline was detected and composed as the base (or deliberately shadowed), and whether the gitignore entry was added, already present, or skipped (not a git repo).

## Boundaries

Writes **only** operational config (`.claude/settings.json`, `.gitignore`) — never a `spec.md`, `status`, `approval`, or freeze. Opens no CR, invokes no gate. Never wires the **global** settings file — SDD is repo-scoped, a user's global status line is theirs; the global file is read only to detect a statusLine to compose against, never written. Does not move `scaffold-project-spec` / `manage-spec-anchors` / `manage-ignore` into itself. Never writes or clears the statusline **value** — that is the conductor's during the mission loop.
