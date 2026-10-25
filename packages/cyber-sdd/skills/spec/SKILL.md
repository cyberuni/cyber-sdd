---
name: spec
description: Writes, revises, reviews, and splits a design spec, the document that states what a capability must do (intent, use cases, and checkable criteria on the outcome) before or alongside its code, and derives tests from one. Use when asked to spec a feature, write, revise, or backfill the spec for X, split a spec, judge whether a spec is ready, or turn a spec into tests, even if they only say "is this spec good" or "review the spec". Not for a node of a first-generation SDD project spec under .agents/specs/ that carries a .feature suite (the sdd plugin's start-mission).
---

# Design spec

A **design spec** fixes what a capability must do, in terms an outsider can check without reading the code. It is a
pair: **intent** (what the capability is for, argued with) and **criteria** (what must be true of the outcome,
evaluated). Intent without criteria cannot be checked. Criteria without intent cannot be questioned when they turn
out to encode the wrong goal.

This skill is spec-anchored: the spec stays and is compared against on every change. It is not scaffolding discarded
after the build.

## Route

| The request | Mode |
| --- | --- |
| write a spec for a capability, or backfill one for existing code | [Write](#write) |
| change what an existing spec says | [Write](#write), then [Review](#review) the changed parts |
| split a spec that has grown past what its readers need | [Write](#write), the steps under **Split a spec** |
| judge a spec, or decide whether it is ready | [Review](#review) |
| derive tests from a spec | [Derive tests](#derive-tests) |

Not for a node of a first-generation SDD project spec (under `.agents/specs/`, with a `.feature` suite): that is
the `sdd` plugin's `start-mission`. This skill covers the design spec only, not the functional spec beneath it.

## Write

Put one capability in one folder: `README.md` holds the spec, `graph.md` holds the decision graph when the
behavior branches. Write these sections of `README.md`, in order. Keep each as short as it can be.

1. **Title and outcome.** One sentence naming the single outcome.
2. **What.** Open with the problem: who has it, and what goes wrong without this capability. Then the intent: what the
   capability does about it. Legible to a non-engineer. A definition belongs in Key terms, not here.
3. **Non-goals.** Plausible goals this capability excludes. "Must not crash" is not a non-goal.
4. **Key terms.** Each term a criterion leans on, defined once.
5. **Actors and goals.** A table of ID, actor, and goal (`A1.1`, `A1.2`, ...), one row per goal. Include people affected
   by the outcome who never invoke it; a missed use case usually hides there. Derive use cases from actors, never by
   walking the interface.
6. **Use cases.** One per actor goal, each its own heading `### UCn — <title> (<actor IDs>)` with these labelled
   bullets, in this order: **Trigger**, **Entry node** (only when `graph.md` exists: the graph node the trigger enters
   at), **Entry points** (grouped by surface, the primary delivery first and named as such), **Inputs**, **Success**, and **Extensions**, every path from the trigger that does not reach the goal, as
   `UCn.m` sub-bullets. A use case with no extensions says `extensions: none, <why>`. The use case states the goal and
   result and is delivery agnostic; the delivery (a skill, a command, a library call) appears only under Entry points,
   and in the criteria group for that adapter.
7. **Criteria.** A list of boolean statements about the outcome, one per line, each with a stable ID and bound to a
   use case and, where a graph exists, to an edge in it.
8. **Open questions.** What is unresolved, marked. Empty before the spec is ready.
9. **References.** Links to rationale, sibling specs, and the home of any shared fact.

**Give every item of these lists an ID** a reader can cite: `N1` for a non-goal, `K1` for a key term, `A1` for an actor and
`A1.1` for its goal, `UC1` for a use case and `UC1.1` for its extension, `R1` for a criterion, `E1` for a graph edge,
`Q1` for an open question. An ID is never reused: a removed item retires its ID.

**Settle one section at a time.** Grill the spec with the user, one section at a time, in the order above. Each
section is derived from the ones before it, so a wrong outcome or a missed actor carries into every criterion. For
each section:

1. Draft it. In a backfill the code supplies the draft, and it still goes through these steps: code shows what the
   capability does, not what it should do. Decided behavior the code lacks is still written as a criterion; the gap
   goes to the tracker.
2. Judge the draft against the criteria that apply to it: C1 on the outcome, C2 on the non-goals, C3 on the actors and
   use cases, C4 to C6 on the criteria, C8 on the open questions.
3. Show the user that section and the questions it raises, and nothing beyond it.
4. When the user agrees, commit the section, then go to the next.

A change to an earlier section reopens every section after it. With no user to ask (a headless run), draft every
section and put each question under Open questions; the spec is not ready until they are answered.

**Split by capability, never by layer.** A child spec is a capability an actor can name (what they get), such as
`update` or `history`, so the folder names say what the system does. Never split into a library spec, a CLI spec, and a
skill spec: one capability reached through three deliveries is one spec, whose use cases list the deliveries as entry
points. A layer split writes the functional spec early and scatters one outcome across files.

**Size the spec by the tasks that read it.** When the actors and use cases are settled, list the tasks that will read
the spec: changing one behavior, deriving its tests, checking scope, a consumer checking its contract. If most of them
need less than half of it, split the capability into child specs along the line those tasks share, each with its own
outcome; the parent keeps the shared terms and links each child. Do not split by section type, such as a separate
criteria file: every task needs a slice of every section.

**Split a spec.** Decide the line once the use cases are settled, and move the text once every section is agreed, so
a revision never straddles files.

1. Table the tasks, the sections each needs, and its share of the spec. Split only when most shares are under half.
2. Put in the parent what every task needs: the What, Non-goals, Key terms, Actors, the criteria groups that span
   children (such as `Adapters`, names, the output contract), the open questions they share, References, and a table
   linking each child with its use cases.
3. Give each child its use cases, the criteria groups bound to them, its open questions, a title naming its own
   outcome, and a line linking the parent's terms. A child is never read without its parent.
4. Keep every ID: IDs are shared across the parent and its children, and a retired one stays retired. Move each graph
   edge with the criteria that cite it; edges several children cite stay in the parent's `graph.md`.
5. Make the split a commit of its own that moves text without rewording it, and check that no line was lost.

Leave out implementation design, task lists, stack choices, alternatives analysis, and whether a criterion is built
yet. The gap between the criteria and the code is found by checking one against the other; the work to close it lives
in the project tracker, linked by criterion ID. Link rationale (an ADR, an issue, a research topic) and do not copy it
in.

**Design spec versus functional spec.** The design spec states what a consumer of the capability is judged against:
names, flags, exit codes, error codes, stated outcomes. Be specific there. Internal contracts, module behavior, and
scenarios belong in the functional spec co-located with the implementation. Test: if a consumer would notice the
change, it is a criterion here. Otherwise it is not.

**Notation.** The design spec names no scenario form. Use cases and criteria are the contract. A use case may carry
Gherkin or EARS for one scenario when it clarifies; the functional spec or test plan owns the form of the rest.

**Several surfaces.** When the same code is reached through several adapters (a CLI, a library, an MCP server), state
each outcome once without naming an adapter: "the status is `missing`", not "exit 1". Map each outcome to each
adapter's form (exit code, stream, return value, thrown error) in one criteria group, `Adapters`. Group a use case's
entry points by surface. Behavior that a skill's instructions add on top, such as a fallback or what to tell the user,
is its own use case. Its criteria are checked by an eval run of the skill, not by a deterministic test.

**Decision graph.** When the behavior branches, draw the decisions in `graph.md`, in the format of the decision graph
reference, and cite its edge IDs from the criteria. Omit it for a spec that states facts or a table.

## Review

Load the criteria reference and judge the spec against C1 to C9 in number order. A spec is ready when none of C1 to
C9 fails, every check under [Validate](#validate) passes, and Open questions is empty.

Iterate before you present. After each judgment, fix every failing criterion in the spec yourself, then judge it again.
Repeat a few times, stopping when none fails or when a round fixes nothing new. Take only the fixes the spec and its
sources settle. A fix that needs a decision the user has not made (a scope call, a rule with two reasonable readings)
is not a fix: leave it, and put it under Open questions with the options and your recommendation. Keep each round a
change of the spec's text only; never move the spec's scope without asking.

Then present, in one message: what you changed across the rounds, grouped by criterion; the final pass or fail of each
criterion with the line that still fails it; and the open questions that need the user, each with a recommendation. A
reviewer asked only to judge, not to edit (a read-only review of someone else's spec), skips the iteration and reports
what is wrong and what would fix it.

## Derive tests

Build tests from the criteria list, one test or group per criterion ID, as native, deterministic tests of the
project's own test stack. Put the criterion ID in the name of its test or group. Do not write a feature file for an
agent to run: an agent running prose scenarios spends tokens on every run and cannot be relied on to follow them. A
criterion of a skill-instruction use case is the exception: an eval run of the skill checks it. Any other criterion
that cannot become such a test fails C5; send it back to Write instead of guessing.

## Validate

Check the spec folder before you hand it back. A cold reader runs the same checks later against the folder and its
git history, not against your report. Each line is pass or fail; `README.md` and `graph.md` are the spec folder's.

- V1 A standalone or parent `README.md` has an H1 title followed by a one-sentence outcome, then these `##` sections
  in this order: What, Non-goals, Key terms, Actors and goals, Use cases, Criteria, Open questions, References. A
  child's `README.md` has an H1 title with its own outcome, a link to the parent's terms, then Use cases, Criteria,
  and Open questions (`grep -n '^##\? ' README.md`).
- V2 Every item under Non-goals, Key terms, Actors and goals, Use cases, Criteria, and Open questions, and every edge
  in `graph.md`, starts with its ID (`N`, `K`, `A`, `UC`, `R`, `Q`, `E`), and no ID labels two items across the parent
  and its children.
- V3 No ID that `git log -p` shows removed from the spec labels a different item now.
- V4 Each use case is a `### UCn — <title> (<actor IDs>)` heading with Trigger, Entry points, Inputs, Success, and
  Extensions in that order, and its Extensions are `UCn.m` items or read `extensions: none, <why>`. When `graph.md`
  exists, an Entry node bullet sits between Trigger and Entry points and names a node that exists in `graph.md`.
- V5 Every criterion cites a use case ID that exists. When `graph.md` exists, every edge ID a criterion cites exists
  in it, and every outcome node in it is reached by an edge some criterion cites.
- V6 `grep -nEi '\b(TBD|TODO)\b|not (yet )?built' README.md graph.md` finds nothing.
- V7 No criterion names a source file, module, or internal function of the implementation; public names a consumer
  depends on (flags, exit codes, error codes) are allowed.
- V8 The spec holds no implementation design, task list, stack choice, or alternatives analysis; rationale appears
  only as links.
- V9 A spec presented as ready has no item under Open questions and no node in `graph.md` marked `open`.
- V10 A Review run without the user (headless, or read-only) added or removed no non-goal, actor, or use case: the
  diff of the spec over the review adds or removes no line that starts with an `N`, `A`, or `UC` ID.
- V11 A split commit only moves lines. `git show -U0 --format= <commit> | grep -E '^[-+][^-+]' | cut -c2- | sort |
  uniq -u` lists only the lines a split adds: each child's title and its link to the parent's terms, and the parent's
  table of children.
- V12 After Derive tests, every criterion ID, except those of a skill-instruction use case, names at least one test or
  group in the project's own suite, and no `.feature` file was added for an agent to run.
- V13 No child spec folder is named for a delivery or layer (such as `cli`, `lib`, `library`, `skill`, `mcp`).

## References

- **Criteria reference** (`references/criteria.md`): C1 to C9 with their pass conditions and the failure modes they
  catch. Load it for Review, and for step 2 of each section in Write.
- **Decision graph reference** (`references/decision-graph.md`): the shape of `graph.md`, its edge IDs, and the
  decision table and state list that may replace it.
- **Rationale and sources**: the research topic
  [design-spec-criteria](https://github.com/cyberuni/cyber-sdd/tree/main/.research/design-spec-criteria), decisions
  D8 to D19 in its `conclusion.md`.
