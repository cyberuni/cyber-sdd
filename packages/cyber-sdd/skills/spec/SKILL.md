---
name: spec
description: Writes, reviews, splits, and previews a design spec, and derives tests from one. Spec a feature before building it, write, revise, or backfill the spec for X, split a spec, preview a whole spec or build from it to find its gaps, judge whether a spec is ready, or turn a spec into tests, even if they only say "is this spec good" or "review the spec". Not for a node of a first-generation SDD project spec under .agents/specs/ that carries a .feature suite (the sdd plugin's start-mission).
argument-hint: "[write|review|split|preview|derive tests] [capability, spec folder, or source document]"
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
| split a spec that has grown past what its readers need | [Write](#write), then [`references/split.md`](references/split.md) |
| see a whole spec at once, or build from it to find its gaps | [Preview](#preview) |
| judge a spec, or decide whether it is ready | [Review](#review) |
| derive tests from a spec | [Derive tests](#derive-tests) |
| a criterion whose verdict flipped on an unchanged state | [Write](#write): split its graph path, placement test first |

A criterion whose verdict flips on an unchanged state is not a function under its judge. In practice this is an
eval-checked criterion of a skill-instruction use case.

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
7. **Criteria.** A list of boolean statements about the outcome, one per line, each with an ID and bound to a use
   case and, where a graph exists, to an edge in it. A parent criterion that holds for every use case under it cites
   `UC*` (V5), so a child added later is covered without editing the parent. Each is self-contained: decidable from its own text, with any
   context it depends on, such as the path or the use case, written into it. The cited use case and edge are a trace,
   not part of its meaning.
8. **Open questions.** What is unresolved, marked. Empty before the spec is ready.
9. **References.** Links to rationale, sibling specs, and the home of any shared fact, and the research line: a link
   to the research artifact, or `Research: skipped, <reason>`.

**Give every item of these lists an ID** a reader can cite: `N1` for a non-goal, `K1` for a key term, `A1` for an actor and
`A1.1` for its goal, `UC1` for a use case and `UC1.1` for its extension, `R1` for a criterion, `E1` for a graph edge,
`Q1` for an open question. An ID is never reused: a removed item retires its ID.

**A bare ID is the spec's own.** When the spec links a source with its own IDs (a design record with `K1`, `R1`,
`D1`), cite the source's IDs with its name, such as `scrum-system D4`. Reuse the IDs a source took from an
earlier draft of this spec.

**An ID labels a criterion's text; the text is the criterion.** Use the ID to cite it and to name its tests. Before
the spec is first ready, revise criteria freely. After that, changing a criterion's text retires its ID, gives the
criterion a new one, and rechecks the tests derived from it. A key term counts as part of the text of every criterion
that names it, so changing a key term changes every such criterion and retires each one's ID.

**Settle one section at a time.** Grill the spec with the user, one section at a time, in the order above. Each
section is derived from the ones before it, so a wrong outcome or a missed actor carries into every criterion. For
each section:

1. Draft it. In a backfill the code supplies the draft, and it still goes through these steps: code shows what the
   capability does, not what it should do. Decided behavior the code lacks is still written as a criterion; the gap
   goes to the tracker.
2. Judge the draft against the criteria that apply to it: C1 on the outcome, C2 on the non-goals, C3 on the actors and
   use cases, C4 to C6 on the criteria, C8 on the open questions, C10 on the research line. Bracket each criterion as you write it: state its
   strictest and its most lenient reasonable reading, and check both against the use case's extensions and its graph
   paths. If they agree, the criterion is crisp. If they disagree, apply the placement test (under **Design spec
   versus functional spec**) first, and tighten the text only after that. The readings are a check made while writing, not text in the spec.
3. Show the user that section and the questions it raises, and nothing beyond it.
4. When the user agrees, commit the section, then go to the next.

A change to an earlier section reopens every section after it. With no user to ask (a headless run), draft every
section and put each question under Open questions; the spec is not ready until they are answered.

**Research before the use cases.** Once What and Actors and goals are agreed, and before Use cases and Criteria are
settled, research the idea, its feasibility, and prior art. Load `research.method` with the `reference` skill of
`cyber-agentkit` and follow it, giving it the outcome, the What, and the actors and goals as drafted; its default
delegates to `research-workbench:deep-research`. Then act on what it returns:

1. Link the artifact it produced under References. Do not copy its findings into the spec.
2. Write each feasibility limit that constrains behavior as a criterion, or as a non-goal when it rules a goal out.
   Everything else stays in the artifact.
3. When a finding changes the intent (adopt or extend an existing solution, a use case cut by a limit), reopen the
   section it changes and settle it again with the user. The change is recorded in the artifact.

A small change, such as a bug fix or a revision that leaves the What and the actors as they were, skips the research:
write `Research: skipped, <reason>` under References instead. A revision whose What or actors changed researches the
change. With no user to ask, run the research; when it cannot run, or its finding changes the intent, put the
question under Open questions.

**Split by capability, never by layer.** A child spec is a capability an actor can name (what they get), such as
`update` or `history`, so the folder names say what the system does. A split stays on one rung: a child is a design
spec for a narrower capability, never the functional spec, even when it is about specs. Never split into a library
spec, a CLI spec, and a skill spec: one capability reached through three deliveries is one spec, whose use cases list
the deliveries as entry points. A layer split writes the functional spec early and scatters one outcome across files.

**Size the spec by the tasks that read it.** When the actors and use cases are settled, list the tasks that will read
the spec: changing one behavior, deriving its tests, checking scope, a consumer checking its contract. If most of them
need less than half of it, split the capability into child specs along the line those tasks share, each with its own
outcome; the parent keeps the shared terms and links each child. Do not split by section type, such as a separate
criteria file: every task needs a slice of every section.

**Split a spec** by the steps in [`references/split.md`](references/split.md), once the use cases are settled.

Leave out implementation design, task lists, stack choices, alternatives analysis, and whether a criterion is built
yet. The gap between the criteria and the code is found by checking one against the other; the work to close it lives
in the project tracker, linked by criterion ID. Link rationale (an ADR, an issue, a research topic) and do not copy it
in.

**Design spec versus functional spec.** Each rung specifies the one beneath it: design spec, functional spec, then
code and test. Rungs are not parent and child, and not one to one: a functional spec covers a component that several
capabilities may use.

| | Design spec | Functional spec |
| --- | --- | --- |
| Named for | a capability: what an actor gets | a component or artifact of the implementation |
| Lives | in the project's spec folder, one folder per capability | next to the code it specifies |
| Use cases | what an actor gets: "merge only changes whose spec and tests agree" | how the code is used: "share state across components through context" |

One design use case may need several functional ones, and many functional ones (wiring, composition, internal
contracts) trace to no single design use case.

The design spec states outcomes: what the actor gets or can tell apart. An encoding is how an outcome is spelled or
carried: names, literal values and codes, exit numbers, output fields and formats, flag syntax, message wording, the
order of checks when every order gives the same kind of outcome. Encodings, internal contracts, module behavior, and
scenarios belong to the rungs below.

- **Hold the outcome, vary the encoding.** If the actor reaches the goal under any encoding that is stable and keeps
  distinct outcomes distinct, the encoding belongs to a lower rung. The design spec keeps the outcome and the
  property the actor needs ("distinct per cause", "stable"). A program actor reads encodings but needs no particular
  one, so it is judged the same way. Only a case whose outcome differs between two readings of a criterion is a grain
  defect in the design spec; a difference in encoding alone moves the encoding down. This is the placement test.
- **Decide in prose only what building cannot settle.** The design spec holds what must be judged: which goal and
  which outcome are wanted. What writing and running the code settles goes to the rung that runs it, where a
  deterministic test gives one verdict per state. A prose scenario an agent interprets does not.

**Notation.** The design spec names no scenario form. Use cases and criteria are the contract. A use case may carry
Gherkin or EARS for one scenario when it clarifies; the functional spec or test plan owns the form of the rest.

**Several surfaces.** When the same code is reached through several adapters (a CLI, a library, an MCP server), state
each outcome once without naming an adapter: "the reference is reported missing", not "exit 1". One criteria group,
`Adapters`, states what each adapter's actor needs of its form, such as each outcome told apart, distinct per cause,
and stable. The mapping from each outcome to an exit code, stream, return value, or thrown error belongs to a lower
rung, pinned by its tests. Group a use case's entry points by surface. Behavior that a skill's instructions add on top, such as a fallback or what to tell the user,
is its own use case. Its criteria are checked by an eval run of the skill, not by a deterministic test.

**Decision graph.** When the behavior branches, draw the decisions in `graph.md`, in the format of the decision graph
reference, and cite its edge IDs from the criteria. Omit it for a spec that states facts or a table.

## Preview

Preview renders the whole spec as one page linked by ID, then builds what it specifies from the spec alone; each
guess the build makes is a blind spot to fix or to ask. Follow
[`references/preview.md`](references/preview.md).

## Review

Load the criteria reference and judge the spec against C1 to C10 in number order. A spec is ready when none of C1 to
C10 fails, every check under [Validate](#validate) passes, and Open questions is empty.

Iterate before you present. After each judgment, fix every failing criterion in the spec yourself, then judge it again.
Repeat a few times, stopping when none fails or when a round fixes nothing new. Churn signals misplacement: a
criterion revised in two or more rounds goes through the placement test before it is revised again. Take only the fixes the spec and its
sources settle. A fix that needs a decision the user has not made (a scope call, a rule with two reasonable readings)
is not a fix: leave it, and put it under Open questions with the options and your recommendation. Keep each round a
change of the spec's text only; never move the spec's scope without asking.

Then present, in one message: what you changed across the rounds, grouped by criterion; the final pass or fail of each
criterion with the line that still fails it; and the open questions that need the user, each with a recommendation. A
reviewer asked only to judge, not to edit (a read-only review of someone else's spec), skips the iteration and reports
what is wrong and what would fix it.

## Derive tests

Follow [`references/derive-tests.md`](references/derive-tests.md).

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
- V5 Every criterion cites a use case ID that exists; `UC*` is valid only in a parent, expands to every use case of
  the parent and its children, and fails when none exists. When `graph.md` exists, every edge ID a criterion cites exists
  in it, and every outcome node in it is reached by an edge some criterion cites.
- V6 `grep -nEi '\b(TBD|TODO)\b|not (yet )?built' README.md graph.md` finds nothing.
- V7 No criterion names a source file, module, or internal function of the implementation, or pins an encoding (an
  exit number, a literal code or value, flag syntax, an output field or format, message wording) unless the actor's
  goal fails under some other stable encoding that keeps distinct outcomes distinct.
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
- V14 A standalone or parent spec presented as ready has, under References, a link to a research artifact or a line
  `Research: skipped, <reason>` with a reason (`grep -ni 'research' README.md` shows the line).

## References

- **Criteria reference** ([`references/criteria.md`](references/criteria.md)): C1 to C10 with their pass conditions and the failure modes they
  catch. Load it for Review, and for step 2 of each section in Write.
- **Split reference** ([`references/split.md`](references/split.md)): the steps that move a spec into a parent and
  child specs. Load it only when splitting.
- **Decision graph reference** ([`references/decision-graph.md`](references/decision-graph.md)): the shape of `graph.md`, its edge IDs, and the
  decision table and state list that may replace it.
- **`research.method`** (default `references/research.method.default.md`): how the research step runs and what
  artifact it leaves. Loaded by name in Write; a team swaps in its own method with the `reference` skill's Customize
  mode.
- **Rationale and sources**: the research topic
  [design-spec-criteria](https://github.com/cyberuni/cyber-sdd/tree/main/.research/design-spec-criteria), decisions
  D8 onward in its `conclusion.md`.

## Done when

Before reporting done, check each of these against the result. Report any that fails. Here `C1` to `C10` of the
criteria reference are written `spec C1` to `spec C10`.

- **C1.** Every check under Validate passes on the spec folder handed back, or the reply names each one that fails.
- **C2.** A spec presented as ready has no item under Open questions, and fails none of spec C1 to spec C10.
- **C3.** A spec presented as ready links a research artifact under References or records `Research: skipped,
  <reason>`, and a Review of a spec with neither reports it failing spec C10 and V14.
- **C4.** A read-only Review changed no file, and named each failing criterion and check by its ID with the line that
  fails it.
- **C5.** A split commit only moves lines, and no child spec folder is named for a delivery or layer.
- **C6.** After Derive tests, every criterion ID except those of a skill-instruction use case names a test or group in
  the project's own suite, and no `.feature` file was added for an agent to run.
- **C7.** A headless run put every question it could not settle under Open questions and did not present the spec as
  ready.
- **C8.** A Preview changed the spec only through Write, its view showed every actor, use case, criterion with its
  trace, and open question, and each blind spot but an encoding was fixed or put under Open questions.
