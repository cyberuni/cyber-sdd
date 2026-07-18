---
spec-type: behavioral
concept: setup
---

# gateway/init/ — the SDD onboarding front door (the `init` skill)

A third user-facing skill beside the gateway and `manage`: `init` is the **onboarding** front door for
an SDD project — the place a repo opts into SDD's optional, repo-scoped conveniences. Unlike the
gateway and `manage` (thin classifiers that write no repo files), `init` is a **setup skill**: it
writes operational config (never spec/contract state). It opens no CR and invokes no gate.

Its v1 capability is the **mission statusline**: an opt-in that surfaces the current mission phase/task
in the Claude Code status line while a mission runs, and shows nothing at rest. `manage` references
`init` under its Setup & discovery group so a bare "set up the statusline" reaches it.

> **This is a single behavioral unit, not an overview** — `init` is one skill. This spec owns the
> **behavior + suite** ([`init.feature`](./init.feature)); the impl is the `init` skill in
> `plugins/sdd/skills/init/`.

## Use Cases

**Subject** — the `init` onboarding skill: offer SDD's opt-in conveniences and, on consent, wire them
into the repo's operational config. v1 offers exactly one — the **mission statusline** — asking the
user whether to enable it and, if so, whether it renders on its **own line** or the **same line** as
any existing status line, then wiring the reader into project `.claude/settings.json`, ignoring the
status file when the repo is a git repo, and composing with any status line already configured —
including one detected (read-only) in the **global** settings that the project wiring would shadow.

**Non-goals** — it writes **no** `status` / `approval` / spec content (only operational config); it
opens **no CR** and invokes **no gate**; it never wires the **global** settings (SDD is repo-scoped —
a user's global status line is theirs; detection reads that file, never writes it); it does **not**
move the existing Setup & discovery engines
(`backfill-project-spec` / `manage-spec-anchors` / `manage-ignore`) into itself; and it neither writes
nor clears the status **value** at runtime (that is the conductor's — `../../mission/conductor/`).

Every scenario in [`init.feature`](./init.feature) maps to one of these behaviors:

| Behavior | What it covers |
|---|---|
| **user-invocable front door** | `init` is a user-invocable onboarding skill, not a thin classifier |
| **offer + consent** | it asks whether to enable the statusline; a decline writes nothing |
| **display-mode choice** | on enable it asks own-line vs same-line and wires the chosen render |
| **wire the reader** | it writes a `statusLine` command into **project** `.claude/settings.json` that reads the status file |
| **compose, not stomp** | an existing `statusLine` is composed with (existing output kept, SDD line added), never replaced |
| **global detection** | before wiring it reads the global settings — read-only, never written — for a `statusLine` the project wiring would shadow; a malformed global file counts as none |
| **global base compose** | a fresh wire with no project `statusLine` surfaces the shadow, asks, and by default wraps the global command as the base (the piped status input flows through to it); declining wires with no base; a project `statusLine` always wins; a re-run recovers the wired base and never re-consults global |
| **project scope** | it wires project settings, never the global settings |
| **gitignore when a repo** | it adds the status file to `.gitignore` when the folder is a git repo; skips when not |
| **fall-through when absent** | the wired command shows nothing (or the composed base) when the status file is absent |
| **idempotent** | re-running does not duplicate the `statusLine` wiring or the gitignore entry |

## The mission statusline

The feature is a reader/writer split across two units:

- **`init` (this unit) wires the reader.** On consent it writes a `statusLine` command into project
  `.claude/settings.json`. The command reads the single-line status file `.agents/sdd/statusline` and
  renders it — on its own row (**own-line** mode) or appended to the base output (**same-line** mode).
  When the file is absent the command emits nothing (or exactly the composed base), so the status line
  falls through to whatever the user already had.
- **The conductor writes the value** (`../../mission/conductor/`) — during the mission loop only,
  overwriting `.agents/sdd/statusline` on each phase transition and clearing it on every exit path. `init`
  never writes or clears the runtime value.

**Compose, never stomp.** If project `.claude/settings.json` already defines a `statusLine`, `init`
composes: it preserves the existing command's output and adds the SDD line (a new row for own-line, an
appended segment for same-line). It never overwrites a user's status line. Re-running `init` is
idempotent — it neither stacks a second SDD segment nor duplicates the gitignore entry.

**Detect the global shadow.** Claude Code's project `statusLine` **replaces** the global one (no
merge), so a project wiring with an empty base would blank a status line that lives in the global
settings. Before wiring, `init` reads the global settings — **read-only, never written** — for a
`statusLine.command` the project wiring would shadow. When the project defines no `statusLine` and
the global does, it surfaces the shadow and asks; by default it wraps the global command as the
composed base — the piped status input flows through to it — so the global line keeps rendering.
Declining wires with no base (a deliberate shadow). A project `statusLine` always wins as the base;
a re-run recovers the base from the wired command and never re-consults the global settings; a
malformed global settings file is treated as no global statusLine.

**Repo-scoped.** `init` wires **project** settings (`.claude/settings.json`), never the global
`~/.claude/settings.json` — the status file path is repo-relative and a user's global status line is
their own; the global file is read only to detect a statusLine to compose against, never written.
When the folder is a git repo it adds `.agents/sdd/statusline` to `.gitignore` (idempotent);
when it is not a repo it skips the ignore.

**Static staleness.** The status shows whatever the conductor last wrote. There is no heartbeat —
the SDD loop is turn-based, so a slow-but-alive phase must not be dimmed as dead; a hard crash that
bypasses the conductor's clear leaves a stale value until the next mission overwrites it.

## Scenarios (colocated)

The behavior suite is [`init.feature`](./init.feature) — the offer/consent, the display-mode choice,
wiring the project reader, composing with an existing status line, global-statusline detection and
the composed global base, project scope, the git-repo gitignore, fall-through when absent, and
idempotency. The runtime write/clear of the status **value**
is the conductor's suite (`../../mission/conductor/`); cross-capability workflow scenarios live in
`../../workflows/`.
