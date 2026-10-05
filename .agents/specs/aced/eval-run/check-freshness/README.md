---
spec-type: behavioral
concept: [eval-run]
---

# check-freshness — is this recorded eval result still current?

Read the newest eval result recorded for a target, compare the file hashes that result recorded
against the files in the working tree now, and return one of four verdicts — **current**, **stale**,
**incomplete**, or **absent**. `stale` and `incomplete` name the recorded inputs that no longer
match; `absent` has nothing to compare and names why instead.

## What

`run` writes an eval result to `.agents/aced/results/<target>/<timestamp>.json`. Anyone who later
reads that result — a person, or `run` and `improve` deciding whether to cite it instead of scoring
again — needs to know whether it still describes the configuration on disk. Without an answer they
guess, and a guess that says "still good" turns a passing result into a false claim about code that
has since changed.

This node answers the question **from the record itself**. `run` records the files it reports reading, and their
content hashes (`eval-run/run/`); this check re-hashes those same paths in the working tree and
compares. Nothing is inferred: no modification times, no guessed file sets, no guessed directory
names.

The **measured** layer records the same kind of account. The bench engine (`eval-run/bench/engine/`)
writes one **measured record** per arm to `.agents/aced/results/bench/<suite>/`, carrying an
`evaluated` set in the same entry shape: the suite's `tasks.json`, every file under its `checks/`, and
a `file` arm's source file. A measured record names no `target`, so it is found by the **suite** and
**arm** it records instead (UC3), and compared the same way.

**Key terms**

| Term | Meaning |
|---|---|
| **evaluated set** | The list `run` recorded of every input it **reports** consuming to judge the target, each entry a repository path plus a SHA-256 hash. A **file** entry hashes the content read; a **directory** entry hashes the names the listing returned, which is what makes a file *added* to that directory detectable. |
| **recorded provenance** | The evaluated set carried by one result record — **the run's own account** of what it consumed, not a verified trace (see the trust boundary below). A result written before this contract carries none. |
| **the frozen suite** | The node's `<node>.feature` — one member of the evaluated set, handled apart from the rest because a change to it means something different. |
| **measured record** | A run record the bench engine writes for one arm of one suite: `layer: measured`, a `suite`, an `arm` label, a `createdAt` timestamp, and an evaluated set. It names no `target` and no frozen `.feature`. |
| **subject inputs** | Every member of the evaluated set that is not the frozen suite: the target configuration, the files it loads, any directory `run` recorded listing to find them, and the target's `eval.md`. |

**The four verdicts**

| Verdict | Means | Because |
|---|---|---|
| **current** | Every input the run recorded still hashes to what was recorded. | The run's own account of what it read still holds. **Not** a claim that the tree is unchanged (growth the run never consumed is invisible — the closed world below), nor that the run read everything it should have (the trust boundary below). |
| **stale** | At least one recorded **subject input** differs from the tree, is gone, or (for a directory) now lists different entries. | At least one input the scores rest on has moved, and this check cannot tell which scores depended on it — so no individual score can be relied on without re-running. Unlike `incomplete`, there is no fact left that survives the change. |
| **incomplete** | Every subject input matches, but the recorded **frozen suite** differs from the tree's. | Every input the scores rest on is unmoved, so the existing scores survive; the suite grew or changed past them, so the result no longer covers the whole suite. Merging this into `stale` would throw away that surviving fact. |
| **absent** | There is no recorded provenance this check can compare against. | No results directory, no result recorded for this target, no readable result, the newest result carries no evaluated set, or the evaluated set it carries **contradicts the record it accompanies** (see the trust boundary below). |

**The closed world — stated, because a guard's blind spot must never be implicit**

This check compares **the inputs the result recorded**, and nothing else. It never
re-resolves what the subject depends on *now*. That is deliberate: inferring a prose configuration's
dependent file set is a guess, and resting a freshness answer on that guess is what got the first
attempt at this capability rejected. So `current` means **every input this result recorded
still hashes as recorded** — it is never a claim that the subject has not grown.

That reading leaves one gap: a file **added** after the run, which no recorded entry would notice.
The gap is closed **at the producer, not here** — `run` records a hash over the entries of every
directory it listed, so a file added to a directory the subject loads from changes a recorded entry
and reads as `stale` (`eval-run/run/`). Growth reaching the subject through a path `run` never
consumed stays invisible by construction, and correctly so: it was not an input, so the result stays
truthful about what it measured. The suite pins **both halves** — the addition that must be caught,
and the growth that must not be guessed at.

**The trust boundary — `evaluated` is an account, not a trace**

The other half of the same boundary. `run` is prose an agent executes, not a script, so the evaluated
set is **what the run reports it consumed**. Nothing observes the agent's actual reads. An
**over**-report is catchable — a recorded file the subject does not load is visible in the record
against a known fixture. An **under**-report is not: a run that skimmed, or never opened a reference
file it should have loaded, records a *shorter* set whose every entry then matches perfectly, and
this check answers `current` with full confidence. That failure is silent and it points the **unsafe**
way.

What is checkable without a trace is **coherence** — a **conditional** relation, never a proof. *If*
the record's `scenarios` and `target` are truthful, *then* a set omitting the frozen `.feature` those
scenario names came from, or omitting the configuration that `target` field names, is **incomplete**:
scores cannot come from a `.feature` never read, and a configuration cannot be judged unopened. The
record establishes nothing on its own — an agent that fabricates scores writes a self-consistent
record and passes. So such a set is **self-contradictory relative to its own claims** — and reads
`absent`, not `current`. That oracle is independent of the **evaluated set** — it does not take the
recorded input list on trust — but it is **not** independent of the record: `scenarios` and `target`
are written by the same agent and are self-reported exactly as `evaluated` is. So it catches only an
**inconsistent** under-reporter. An agent that under-reports **uniformly** — skims the suite and then
records scores only for the scenarios it read — contradicts nothing, and escapes. So does a quietly
skipped reference file. Both read `current`, and no verdict here can find either. What is closed is
the class that is checkable; the classes left open are the ones that matter most. Reading `current` as "the run's account still holds" is sound; reading it
as "the run read everything it should have" is not, and this node never claims the second.

**Non-goals** — scoring anything (`run`); comparing two versions (`compare`); the project-wide
roll-up (`report`); deciding **what a caller does** with a verdict — no node consumes this verdict
yet, and wiring the callers is a separate change against each of those nodes; judging whether a
recorded *pass* was well-founded (a judge-protocol
question, out of scope here); **re-resolving the subject's current dependent set** (the closed world
above); **verifying that the run actually read what it recorded** (the trust boundary above — that
needs harness-level tool-call telemetry, which no ACED node has); writing, repairing, or deleting any
result.

## Use Cases

This engine is **not an ACED subject** — it decides by comparing recorded hashes against files on
disk, so its output is deterministic and directly assertable by `node:test` rather than LLM-graded.
It therefore carries **no `**Fit:**` line** and ACED's graded lenses do not apply to it, following
the `sdd-roles/extract-situation/` precedent. Its suite is boolean throughout and binds to the
engine's own tests.

**Subject** — given one spec node directory (its `eval.md` and its frozen `.feature`), report whether
the inputs the newest result for that node's target recorded still hash as recorded in the working
tree.

### Actors and their goals

Enumerated actor-first; entry points are mapped afterward, so a goal with no way in stays visible.

| Actor | Goal | Reaches it through |
|---|---|---|
| A person reviewing a recorded eval result | decide whether the pass they are reading still describes the configuration on disk, and if not, see which inputs moved | UC1 |
| A gating automation — a CI job or a scheduled run citing a recorded result | stop the moment a cited result stops holding, without parsing a report | UC2 |
| A person or automation citing a measured result for one arm of a bench suite | know whether the stored measurements still describe the suite's current tasks, checks, and the arm's source | UC3 |
| `run` and `improve` (sibling capabilities) | skip re-scoring when the recorded result still holds | **nothing — the caller side is unbuilt** (below) |
| *Affected without invoking:* whoever is handed a report, a diagnosis, or a PR comment that cites a recorded result | not be shown a passing result that stopped being true | reached only through the actors above |

**The unserved goal, recorded rather than hidden.** `improve` already carries this goal in prose —
*"ensure a recent result exists — run `run` first if the latest `results/` file is stale or missing"* —
with no definition of `stale` to consult, and `run` has the same goal when it considers citing a
recorded result instead of scoring again. Neither has a way in. The missing way in belongs to **those
two nodes**, not to this one: each needs scenarios whose `Given` *names* a verdict, in the shape UC2's
`only a current verdict exits zero` already uses. That wiring is **cut from this change** and carried
as a follow-up, so until it lands `check-freshness` is specified, tested, and consulted by nobody — a
recorded gap, not an oversight.

There are **two** entry points. `check-freshness --node <node-dir>` reads a result `run` recorded; UC1
and UC2 are two goals reaching it, distinguished by which half of its outcome the actor consumes.
`check-freshness --suite <suite> --arm <label>` reads a measured record; UC3 reaches it, and its exit
status follows UC2's rule.

### UC1 — read the verdict on a recorded result

- **Actor** — a person reviewing an eval result before acting on it.
- **Goal** — know whether the result still describes the configuration on disk, and which inputs moved
  if it does not.
- **Entry point** — **trigger:** `check-freshness --node <node-dir>`. **Inputs:** that directory's
  `eval.md` and frozen `.feature`, the recorded results under `.agents/aced/results/`, and the working
  tree. **Outcome:** one of `current` / `stale` / `incomplete` / `absent`, naming each recorded input
  that no longer matches. Nothing is written.
- **Extensions** — every path from the trigger that does not reach a verdict naming the tree's state:

  | Cause | Outcome |
  |---|---|
  | the node directory holds no `eval.md` | no verdict; the missing file is named; fail closed |
  | the `eval.md` omits the `subject:` key | no verdict; the missing key is named; fail closed |
  | no results directory exists anywhere | `absent` — nothing was ever recorded |
  | results exist, but none records this target | `absent` |
  | every result recorded for this target is unparseable | `absent`, each unreadable file named |
  | the newest result is unparseable but an older readable one exists | the unreadable file is named and skipped; the verdict comes from the newest **readable** result |
  | the selected result predates the provenance contract and carries no evaluated set | `absent` — there is nothing to compare |
  | the selected result's evaluated set contradicts its own `scenarios` and `target` fields | `absent` — the provenance is incoherent, so it is not compared (the trust boundary above) |
  | a recorded subject input changed, is gone, or (a directory) now lists different entries | `stale`, naming each |
  | every subject input matches but the frozen suite changed | `incomplete`, naming the suite |

  Two things that look like extensions are **not** — both reach a verdict, and both are limitations of
  what a verdict means rather than divergences from it: growth reaching the subject by a path the run
  never consumed reads `current` by construction (the closed world above), and a run that
  under-reported what it read also reads `current` (the trust boundary above).

### UC2 — gate on freshness without reading the report

- **Actor** — a gating automation: a CI job or a scheduled run that cites a recorded result.
- **Goal** — fail as soon as a cited result stops holding, consuming a status rather than prose.
- **Entry point** — **trigger:** the same invocation. **Inputs:** the same. **Outcome:** exit zero for
  `current` and non-zero for every other verdict.
- **Extensions** —

  | Cause | Outcome |
  |---|---|
  | the check fails closed (no `eval.md`, no `subject:` key) | also non-zero, so the gate stops rather than passing on an undecidable node |
  | the verdict is `absent` | non-zero — a node with no comparable record does not pass a gate on the strength of having no record |

  The exit status alone therefore never distinguishes *not current* from *could not decide*; the
  report names which, and UC1 is the path for an actor that needs to know.

### UC3 — read the verdict on a measured record

- **Actor** — a person or automation about to cite a stored measurement for one arm of a bench suite.
- **Goal** — know whether the measurements still describe the suite's current `tasks.json`, its
  `checks/`, and a `file` arm's source, and which of those moved if they do not.
- **Entry point** — **trigger:** `check-freshness --suite <suite> --arm <label>`. **Inputs:** the
  measured records under `.agents/aced/results/bench/<suite>/` and the working tree. **Outcome:** one
  of `current` / `stale` / `absent`, naming each recorded input that no longer matches; exit zero only
  for `current`. Nothing is written.
- **Selection** — a record belongs to the suite and arm its own `suite` and `arm` fields name, never
  to the ones its file name suggests, and the newest is the one whose recorded `createdAt` is greatest.
  A file that is not a measured record (a compare record beside them, say) is not a candidate.
- **No `incomplete`** — every recorded input of a measured record moves what was measured: a changed
  `tasks.json` changes the prompts, a changed check changes what `pass` means, and a changed source
  changes the arm. No measurement survives any of them, so any moved input reads `stale`. The
  `incomplete` verdict needs a frozen suite whose change leaves the scores standing, and a measured
  record has none.
- **Coherence** — the bench engine always records the suite's `tasks.json`, and records a `file` arm's
  source whenever that arm reads it from a path. A record whose evaluated set omits either contradicts
  itself and reads `absent`, not `current` — the same conditional oracle as UC1's.
- **Extensions** —

  | Cause | Outcome |
  |---|---|
  | `--suite` given without `--arm` | no verdict; the missing option is named; fail closed |
  | the suite has no measured-results directory | `absent` — nothing was measured for this suite |
  | records exist for the suite, but none for this arm | `absent` |
  | the newest file for the arm is unparseable but an older readable record exists | the unreadable file is named and skipped; the verdict comes from the newest **readable** record |
  | the selected record carries no evaluated set | `absent` — there is nothing to compare |
  | the selected record's evaluated set omits the suite's `tasks.json` or the `file` arm's source path | `absent` — the provenance is incoherent |
  | a recorded input changed or is gone | `stale`, naming each |

  The trust boundary is narrower here than for `run`: the bench engine is a script, so its evaluated
  set is computed rather than reported by an agent. The closed world is the same — a file the suite
  never recorded is not compared. A `git` or `package` arm records no source entry, because its subject
  is pinned by a commit or a version that cannot move.

### Surface trace

The surface is two invocations. `--node <node-dir>` is needed by UC1 and UC2. `--suite <suite>` and
`--arm <label>` are needed together by UC3, and one without the other fails closed. Nothing else is
exposed: the verdict and the list of non-matching inputs go to standard output, and the exit status is
the only other channel — each traced to UC1/UC3 and UC2/UC3 respectively.

## Control Flow

Two entry points, one pass each. Every path ends in a verdict or in a fail-closed exit; nothing is
written. The first graph is the `--node` path (UC1, UC2).

```mermaid
flowchart TD
  A[check-freshness --node dir] --> B{eval.md present?}
  B -- no --> X1[report the missing eval.md, no verdict, exit non-zero]
  B -- yes --> C{eval.md names a subject?}
  C -- no --> X2[report the missing subject key, no verdict, exit non-zero]
  C -- yes --> D{results directory present?}
  D -- no --> ABS1[verdict absent - nothing recorded anywhere]
  D -- yes --> E[scan every result file; match on the target each result records]
  E --> F{any readable result for this target?}
  F -- none recorded --> ABS2[verdict absent - no result records this target]
  F -- all unreadable --> ABS3[verdict absent - every recorded result is unreadable]
  F -- some readable --> G[select the greatest recorded timestamp; name each skipped unreadable file]
  G --> H{does it carry an evaluated set?}
  H -- no --> ABS4[verdict absent - no recorded provenance]
  H -- yes --> H2{taking the record's own scenarios and target as given, does the evaluated set cover the inputs they imply were read?}
  H2 -- no --> ABS5[verdict absent - the provenance contradicts the record it accompanies]
  H2 -- yes --> I[split the evaluated set into the frozen suite and the subject inputs]
  I --> J{every subject input still hashes as recorded?}
  J -- no --> STALE[verdict stale, naming each input that changed, is missing, or now lists different entries]
  J -- yes --> K{the frozen suite still hashes as recorded?}
  K -- no --> INC[verdict incomplete, naming the suite file]
  K -- yes --> CUR[verdict current]
  ABS1 --> R[report the verdict; exit zero only for current]
  ABS2 --> R
  ABS3 --> R
  ABS4 --> R
  ABS5 --> R
  STALE --> R
  INC --> R
  CUR --> R
```

The second graph is the `--suite --arm` path (UC3). Its edges are prefixed `M` so a scenario-map row
names one graph unambiguously.

```mermaid
flowchart TD
  MA[check-freshness --suite s --arm label] --> MB{both options given?}
  MB -- no --> MX[report the missing option, no verdict, exit non-zero]
  MB -- yes --> MC{results/bench/s directory present?}
  MC -- no --> MABS1[verdict absent - nothing measured for this suite]
  MC -- yes --> MD[scan every record file; keep measured records whose recorded suite and arm match]
  MD --> ME{any readable record for this arm?}
  ME -- none --> MABS2[verdict absent - no measured record for this arm]
  ME -- some --> MF[select the greatest recorded createdAt; name each skipped unreadable file]
  MF --> MG{does it carry an evaluated set?}
  MG -- no --> MABS3[verdict absent - no recorded provenance]
  MG -- yes --> MH{does the evaluated set cover tasks.json and a file arm's source path?}
  MH -- no --> MABS4[verdict absent - the provenance contradicts the record it accompanies]
  MH -- yes --> MI{every recorded input still hashes as recorded?}
  MI -- no --> MSTALE[verdict stale, naming each input that changed or is missing]
  MI -- yes --> MCUR[verdict current]
  MX --> MR[exit zero only for current]
  MABS1 --> MR
  MABS2 --> MR
  MABS3 --> MR
  MABS4 --> MR
  MSTALE --> MR
  MCUR --> MR
```

## Scenario map

Every scenario binds 1:1 to a CFG edge, grouped by use case. Scenarios derive from the CFG alone;
the extension lists above are the instrument that made the graph complete, never a source a row is
drawn from — so the counts do not correspond.

### UC1 — read the verdict on a recorded result

Rows follow the CFG top to bottom: resolve the target, select the recorded result, decide the verdict.

| Edge | Path (Given) | Scenario |
|---|---|---|
| `C` → yes | an eval.md naming a subject | `a node whose eval.md names a subject resolves that target` |
| `B` → no | a node directory holding no eval.md | `a node with no eval.md fails closed` |
| `C` → no | an eval.md whose frontmatter omits the subject key | `an eval.md with no subject key fails closed` |
| `D` → no | a repository with no results directory | `a repository with no results directory reports absent` |
| `F` → none recorded | a results directory holding results for other targets only | `a target with no recorded result reports absent` |
| `E` match on recorded target | a result for this target filed under a directory named after something else | `the result is matched by the target it records, not by the directory it sits in` |
| `G` greatest recorded timestamp | two results whose filename order disagrees with their recorded timestamps | `the newest result is the one whose recorded timestamp is greatest` |
| `G` skip unreadable | two results for the target, the newer one not parseable as JSON | `an unreadable result file is skipped and named` |
| `F` → all unreadable | a target whose only results are unparseable | `a target whose every recorded result is unreadable reports absent` |
| `H` → no | a result written before the evaluated set existed | `a result carrying no evaluated set reports absent` |
| `H2` → no, suite missing | a result scoring named scenarios whose evaluated set omits the frozen `.feature` | `a result whose evaluated set omits the suite it scored reports absent` |
| `H2` → no, configuration missing | a result whose evaluated set omits the configuration its own target field names | `a result whose evaluated set omits the configuration it names reports absent` |
| `K` → yes | every recorded file hashes as recorded | `a result whose recorded files all match the working tree is current` |
| `J` → no, content changed | a recorded subject file edited since the run | `a recorded subject file whose content changed makes the result stale` |
| `J` → no, file gone | a recorded subject file deleted since the run | `a recorded file that is no longer in the tree makes the result stale` |
| `K` → no | subject files unchanged, the frozen suite edited | `a changed suite with an unchanged subject is incomplete, not stale` |
| `J` → no, both changed | a subject file and the frozen suite both edited | `a subject change alongside a suite change is reported stale` |
| `J` → yes, mtime only | a recorded file re-timestamped with its bytes unchanged | `a file touched without a content change stays current` |
| `J` → no, a recorded directory grew | a file added to a directory the evaluated set records | `a file added to a recorded directory makes the result stale` |
| `K` → yes, growth outside the recorded inputs | a file added to a sibling assets directory the configuration does not load from | `growth the result never consumed is not reported` |
| `R` read-only | any invocation | `it writes nothing` |

### UC2 — gate on freshness without reading the report

| Edge | Path (Given) | Scenario |
|---|---|---|
| `R` exit code | any of the four verdicts | `only a current verdict exits zero` |

### UC3 — read the verdict on a measured record

Rows follow the second CFG top to bottom: resolve the invocation, select the record, decide the verdict.

| Edge | Path (Given) | Scenario |
|---|---|---|
| `MB` → no | a suite option with no arm option | `a measured check given a suite and no arm fails closed` |
| `MC` → no | a suite with no measured-results directory | `a suite with no measured results reports absent` |
| `ME` → none | measured records for the suite, each for another arm | `a suite with no measured record for the arm reports absent` |
| `MD` match on recorded suite and arm | a record whose file name names a different arm than its own arm field | `a measured record is matched by the arm it records, not by its file name` |
| `MF` greatest recorded createdAt | two records whose filename order disagrees with their recorded createdAt | `the newest measured record is the one whose recorded createdAt is greatest` |
| `MF` skip unreadable | two records for the arm, the newer one not parseable as JSON | `an unreadable measured record is skipped and named` |
| `MG` → no | a record carrying no evaluated set | `a measured record carrying no evaluated set reports absent` |
| `MH` → no, tasks missing | a record whose evaluated set omits the suite's tasks.json | `a measured record whose evaluated set omits the suite's tasks reports absent` |
| `MH` → no, source missing | a file arm read from a path whose evaluated set omits that path | `a measured record whose evaluated set omits the file arm's source reports absent` |
| `MI` → yes | every recorded input hashes as recorded | `a measured record whose recorded files all match the working tree is current` |
| `MI` → no, tasks changed | the suite's tasks.json edited since the record | `a changed task set makes the measured record stale` |
| `MI` → no, check gone | a recorded check file deleted since the record | `a check removed since the measurement makes the measured record stale` |
| `MI` → no, source changed | the file arm's source edited since the record | `a changed file-arm source makes the measured record stale` |
| `MR` exit code | a current, a stale, and an absent measured check | `only a current measured verdict exits zero` |
| `MR` read-only | any measured invocation | `a measured check writes nothing` |

## References

- `eval-run/bench/engine/` — the producer of measured records and their evaluated set. It hashes the
  raw bytes of each file with SHA-256, the same rule as a **file** entry here; it records no
  **directory** entries, so a check file added to `checks/` after the run changes no recorded entry.
  That is the closed world again — the added check was not part of what was measured.

- `eval-run/run/` — the producer of the `evaluated` set this node reads. Without that contract every
  answer here would be a guess, which is what the rejected first attempt at this capability was.
  **`run` owns the hashing rule; this node re-applies the identical one.** The Key terms table above
  restates it for a reader, but the restatement is not a second definition — a comparison between two
  differing hash schemes is meaningless, and the divergence would surface as a permanent `stale`
  rather than as an error. The implementation must share one hashing routine with `run`, not two that
  currently agree.
