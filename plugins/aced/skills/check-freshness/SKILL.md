---
name: check-freshness
description: "Partial Skill: invoke by name only — the ACED eval-result freshness check — decides whether a recorded result still describes the configuration on disk, not user-triggered."
user-invocable: false
metadata:
  internal: true
---

# check-freshness

The **freshness check** — the deterministic engine that reads the newest eval result `run` recorded
for a target, re-hashes the paths that result recorded, and returns one of four verdicts. It is
**read-only**: it never writes, repairs, or deletes a result.

It answers the question **from the record itself**. `run` records the inputs it reports consuming and
their hashes; this re-hashes those same paths in the working tree and compares. Nothing is inferred:
no modification times, no guessed file sets, no guessed directory names.

## Invocation

```
node "<skill>/scripts/check-freshness.mts" --node <node-dir>
```

`<node-dir>` holds the node's `eval.md` (whose `subject:` names the target) and its frozen
`.feature`. Exit status is **zero only for `current`**; every other verdict, and every fail-closed
path, exits non-zero.

It also exposes the hashing routine, so `run` records entries with the same implementation that
reads them back — never a second one that merely agrees today:

```
node "<skill>/scripts/check-freshness.mts" --hash-file <path>
node "<skill>/scripts/check-freshness.mts" --hash-dir  <path>
```

## The four verdicts

| Verdict | Means |
|---|---|
| `current` | Every input the run recorded still hashes as recorded. |
| `stale` | At least one recorded **subject input** changed, is gone, or (a directory) now lists different entries — no individual score can be relied on without re-running. |
| `incomplete` | Every subject input matches, but the recorded **frozen suite** changed — the scores survive, the suite grew past them. |
| `absent` | There is nothing to compare: no results directory, no result for this target, none readable, no evaluated set, or an evaluated set that contradicts the record carrying it. |

A node with no `eval.md`, or an `eval.md` with no `subject:` key, **fails closed and emits no
verdict** — a guard that cannot decide must not manufacture one, and `absent` would read as
"checked, nothing recorded".

## Two boundaries, both deliberate

**Closed world.** It compares the inputs the result recorded and nothing else; it never re-resolves
what the subject depends on *now*. So `current` means "every input this result recorded still hashes
as recorded", never "the subject has not grown". Growth is caught at the producer — `run` records a
hash over the entry names of every directory it listed. Growth reaching the subject by a path `run`
never consumed stays invisible by construction: it was not an input, so the result stays truthful
about what it measured.

**Trust boundary.** `evaluated` is what the run **reports** consuming, not a verified trace. An
under-reporting run records a shorter set whose entries all match, and this answers `current` with
full confidence — a silent failure pointing the unsafe way (`#475`). What is checkable is
**coherence**: a set omitting the `.feature` whose scenarios the record scores, or the configuration
its own `target` names, contradicts the record it accompanies and reads `absent`. That catches only
an *inconsistent* under-reporter; a uniform one escapes.

Reading `current` as "the run's account still holds" is sound. Reading it as "the run read everything
it should have" is not, and this engine never claims the second.

## Boundaries

Scores nothing (`run`), compares no two versions (`compare`), rolls nothing up (`report`), and does
not judge whether a recorded *pass* was well-founded (a judge-protocol question, `#477`). It decides
a verdict and reports it; **what a caller does with that verdict is the caller's** — wiring `run` and
`improve` to consult it is `#476`.

Spec: `.agents/specs/aced/eval-run/check-freshness/`.
