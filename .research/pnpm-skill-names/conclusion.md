# Does a name-resolution hint make an agent find a pnpm-linked skill from `/<pkg>:<skill>`?

Gates the Phase 0 decision "references to plugin-qualified skill names under pnpm naming". pnpm links each skill as `pnpm-<package>-<skill>` (scoped `@acme/kit` becomes `pnpm-@acme+kit-<skill>`) and offers no setting to change it, so a reference to `/<pkg>:<skill>` points at nothing.

**Verdict: yes.** Without a hint the agent fails to resolve an unscoped name (0–1 of 10 runs from a task prompt; 2/10 haiku and 8/10 sonnet from a referring skill). With any of the four hints, 40 of 40 runs per cell-group succeed. Writing both names in the reference (variant `d`) is cheapest in turns and has no wrong calls.

## Method

- Fixture, built fresh per run by `run.py`: the target skill exists only as `.claude/skills/pnpm-demo-pkg-target/` or `.claude/skills/pnpm-@acme+kit-target/`, with description `"By name only"`. Its body says to write a code word to `result.txt`.
- Entry modes: `driver` (a `driver` skill says to invoke `/<pkg>:target`) and `prompt` (the task prompt says it).
- Variants: `a` no hint; `b` instruction inside the referring skill (driver only); `c` the same instruction in project `CLAUDE.md`; `d` both names written in the reference, ``/demo-pkg:target` (installed via pnpm as `pnpm-demo-pkg-target`)``; `e` a one-line naming-convention note in `CLAUDE.md`.
- Harness: real `claude -p` (Claude Code 2.1.296), models haiku-5-5 and sonnet-5-5, project settings only, tools Skill/Read/Write/Glob. Success = `result.txt` holds the code word; the trace comes from stream-json.
- Runs: **10 per cell, 360 total.** Reproduce with `python3 -I run.py haiku 10 driver,prompt a,b,c,d,e` (same for `sonnet`); it appends to `results-<model>.jsonl`.

## Results (successes of 10; mean turns; wrong Skill calls over 10 runs)

| mode / variant | haiku plain | haiku scoped | sonnet plain | sonnet scoped |
|---|---|---|---|---|
| driver a | 2 (9.3, 5) | 10 (6.4, 2) | 8 (6.5, 10) | 10 (4.6, 0) |
| driver b | 10 (7.7, 1) | 10 (6.0, 0) | 10 (5.0, 2) | 10 (4.0, 0) |
| driver c | 10 (7.5, 0) | 10 (6.8, 0) | 10 (5.0, 1) | 10 (5.0, 0) |
| driver d | 10 (7.2, 0) | 10 (6.5, 0) | 10 (4.0, 0) | 10 (4.0, 0) |
| driver e | 10 (6.2, 0) | 10 (6.5, 0) | 10 (4.6, 0) | 10 (4.8, 0) |
| prompt a | 1 (5.1, 10) | 10 (6.5, 9) | 0 (3.4, 10) | 10 (4.0, 0) |
| prompt c | 10 (5.4, 0) | 10 (5.1, 0) | 10 (3.8, 1) | 10 (4.2, 0) |
| prompt d | 10 (4.5, 0) | 10 (4.2, 0) | 10 (3.0, 0) | 10 (3.1, 0) |
| prompt e | 10 (4.4, 0) | 10 (4.0, 0) | 10 (3.0, 0) | 10 (3.2, 0) |

The unscoped baseline breaks because the agent calls `demo-pkg:target`, gets not-found, and stops. The scoped baseline passes, probably by fuzzy match against the skill listing; do not read that as scoped names being safe.

## Limits

One skill in the listing is the easy case; a crowded listing (the real plugins ship 40+ skills) is untested. Turn means are small-sample.

## Recommendation

- Have `plugin build` emit both names at each cross-skill reference: ``/<pkg>:<skill>` (pnpm install: `pnpm-<pkg>-<skill>`; scoped `@scope/name` becomes `pnpm-@scope+name-<skill>`)``. It travels inside the skill files pnpm links, so it needs no consumer config and no per-skill repetition.
- A shared reference helps only if a skill loads it. An AGENTS.md line depends on consumers adding it; keep it as a fallback: when `/<pkg>:<skill>` is not found, use `pnpm-<pkg>-<skill>`.
- Script output that prints `/<plugin>:<skill>` needs the same pair printed; build injection cannot reach it.
