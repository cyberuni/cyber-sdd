# Do rendered `next[N]{run,why}` command lines reduce wrong calls?

Gates item 4 of [clibuilder#688](https://github.com/clibuilder/clibuilder/issues/688).

**Verdict: no difference.** A hint that names the second command and its arguments cuts wrong calls and turns sharply compared with no hint. Rendering that hint as `next[N]{run,why}` command lines did no better than a plain `help` string in TOON, in either round. In this eval, keep plain `help` strings.

## Method

- Fixture: one skill, `task-lookup`, in `fixture/task-lookup/`. `SKILL.md` gives only the first call (`list --owner <name>`). The task ("who made the last comment on Ana's invoice export task, and what did they say?") needs a second call to `thread`, which `SKILL.md` never names.
- The script `tasks.template.mjs` is built once per variant by `build.mjs` (the variant is baked in, so an agent that reads the source sees only its own renderer).
- Variants: `prose` (hint as a sentence), `toon-help` (TOON plus `help[1]:` string), `toon-next` (TOON plus `next[N]{run,why}`, one filled absolute-path command per row), `toon-none` (TOON, no hint; control).
- Harness: `run.mjs` runs real `claude -p` (Claude Code 2.1.296, model `haiku`, tools Bash/Skill/Read, project settings only) in a fresh directory per run, interleaving variants. The script logs every call and its exit code.
- Prompt: `prompt.txt`. Reproduce with `node run.mjs 30 haiku 8 && node summarize.mjs`.
- Wrong call = script exit code ≠ 0. Also reported: `--help` calls, runs with more than the 2 necessary calls, turns (`num_turns`), and answer correctness.
- Runs: **30 per variant, 120 per round**, two rounds.

## Round 1: second call takes `--task <id>`

(`results-round1.jsonl`, fixture as of the first commit of this dossier; the `project` column and `--project` flag were added after.)

| variant | turns (mean ± se) | calls | wrong calls | runs with a wrong call | `--help` calls | correct |
|---|---|---|---|---|---|---|
| prose | 5.00 ± 0.00 | 2.00 | 0 | 0 | 0 | 30/30 |
| toon-help | 5.03 ± 0.03 | 2.00 | 0 | 0 | 0 | 30/30 |
| toon-next | 5.13 ± 0.06 | 2.00 | 0 | 0 | 0 | 30/30 |
| toon-none | 6.00 ± 0.00 | 3.40 | 17 | 13 | 25 | 30/30 |

Ceiling effect: any hint gets 100%.

## Round 2: second call takes `--project <p> --task <id>` (both from the list row)

(`results-round2.jsonl`; the fixture in this directory.)

| variant | turns (mean ± se) | calls | wrong calls | runs with a wrong call | `--help` calls | correct |
|---|---|---|---|---|---|---|
| prose | 5.30 ± 0.11 | 2.43 | 7 | 6 | 7 | 30/30 |
| toon-help | 5.00 ± 0.00 | 2.00 | 0 | 0 | 0 | 30/30 |
| toon-next | 5.00 ± 0.00 | 2.00 | 0 | 0 | 0 | 30/30 |
| toon-none | 6.03 ± 0.03 | 3.43 | 13 | 8 | 26 | 30/30 |

## Reading

- Any actionable hint beats none (about one turn and 1.4 calls saved per run).
- `toon-next` equals `toon-help` in round 2 and is marginally slower in round 1 (5.13 vs 5.03; a gap of about 0.1 turn).
- Prose lost to TOON in round 2, but its list line also changed shape (project inline in brackets), so treat that as weak evidence about prose itself.

## Limits

- One model (haiku), one task shape, an easy one: the help string already carries the flag names. A task where the help string cannot carry the needed argument (values that must be computed, ambiguous multiple targets) is where `next` could still win; not tested.
- `next` here lists one line per row (3 lines); a large list would cost tokens that this eval does not price.
- Round 1 and round 2 fixtures differ; only the round 2 fixture is kept. Round 1 reproduces by removing the `project` column and flag.
