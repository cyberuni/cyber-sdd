# Design spec: contents and review criteria

## Last updated

October 2026 (reviewed by the owner; decisions D8 to D19 added)

## Question

What should a design spec contain, and what high-level criteria judge whether it is good? The spec fixes WHAT a
feature must do (intent plus criteria on the outcome, checkable without reading the implementation). Output feeds a
small agent skill "how to write and review a spec". Not adopting a whole spec-driven process.

## Verdict

Sources agree on a small core: a spec states the problem and who has it, bounds scope with explicit non-goals,
states behavior as individually checkable statements about the outcome, covers the non-happy paths, and marks what is
unresolved. They differ on whether rationale and alternatives live inside the doc (RFC, PEP, Google) or elsewhere
(ADR, cyber-truss). For this repo, keep the spec outcome-only and link rationale out. Nine criteria below, each a
pass/fail test. Origin tags: [CT] cyber-truss, [SDD] SDD plugin bars, [EXT] external practice (evidence IDs in
evidence.md).

## Owner decisions (2026-10-18)

These settle the open choices below and override the recommendations where they differ.

- D8 Rationale and alternatives live outside the spec, linked. Reason: the spec is loaded on every task, so each
  line costs tokens every time; rationale is read only when someone questions a criterion.
- D9 The design spec is as specific as it can be about the public surface (names, flags, exit codes, codes). It does
  not hold internals. A fact belongs in the design spec when a consumer is judged against it; the rest belongs in the
  functional spec, the spec co-located with the implementation.
- D10 The spec is standing (spec-anchored): it is compared against on every change, not discarded after the build.
- D11 The design spec stays notation-free. Use cases and a criteria list are the contract. Gherkin or EARS may
  describe a scenario inside a use case, and the functional spec or test plan owns the scenario form. Tests are built
  from the criteria list as native, deterministic tests. An agent does not "run" a feature file. SDD's literal use of
  Gherkin as the test made each run cost tokens.
- D12 The decision graph (cyber-truss name; SDD's control flow graph is the same shape) lives in its own file, so the
  main spec stays small. It serves C6 to C8: every leaf has an outcome and a criterion, an undecided question is a
  marked node, and a forbidden combination is a guard. A decision table or a state list may replace the graph where
  the behavior is a combination of conditions or a set of states.
- D13 The What opens with the problem (who has it, what goes wrong without the capability), then the intent. A
  definition goes in Key terms. Reason: a reader opens the What to learn why the capability exists. In the reference
  spec the problem sat in the last sentence of the first paragraph, and its strongest reason (a plugin ships a
  document a repository overrides without forking it) at the end of the second.
- D14 A spec is sized by the tasks that read it, and split by capability when most tasks need less than half of it.
  C9 carries this as a cost. Reason: an agent loads a spec whole. The reference spec (330 lines, about 5.5k tokens,
  plus a 1.2k graph) was read for these tasks:

  | Task | Needs | Loaded |
  | --- | --- | --- |
  | Change one behavior (fix `create`) | head, UC5, R24 to R32, Q5 | all, the slice spread over three places |
  | Derive tests for one area | that, plus its graph edges | all, the graph mixing every area |
  | Check scope | outcome, What, non-goals | the short head, if the reader stops |
  | A consumer checks the JSON contract | UC8, R38, R39 | all |
  | Implement issue #110 | UC1, UC7, UC9, R2 to R8, main graph | all |
  | Review the spec | all, one section at a time | all |

  Only the review needs the whole file. Splitting by section type (a separate criteria file) does not help, since
  each task needs a slice of every section. Splitting by capability does, and it coincides with C1: that spec's What
  listed four activities around one decision ("lets people see, find, write and remove, and check").
- D15 The spec is settled one section at a time with the user, in section order, each section committed when agreed.
  A backfill is settled the same way. Reason: each section is derived from the one before, so an error in the outcome
  or the actors reaches every criterion, and a review of the finished spec finds it after the later sections are
  built on it. Code-derived text records what the code does, not what it should do: the reference backfill left eight
  questions (Q1 to Q8) the code could not answer. With no user, every section is drafted and each question goes to
  Open questions.
- D16 Every list item in a spec carries an ID, and a removed item retires its ID. Reason: grilling and review
  cite items one at a time ("drop N4", "revise A1.2"); without an ID each reference quotes the text, and a reworded
  item can no longer be found by the quote.
- D17 Outcomes are stated once, adapter-neutral, and one `Adapters` criteria group maps them to each adapter; skill
  instructions get their own use cases. Reason: a CLI, a library, and an MCP server are adapters of one code path, so
  stating an outcome per adapter puts one fact in three homes (C7). The reference spec cited a CLI exit code and a
  low-level function as if they were separate behaviors. A skill's instructions add behavior no adapter has and no
  deterministic test reaches.
- D18 A spec states what must be true, not whether it is built yet. The gap between the criteria and the code is
  derived by checking one against the other; the work to close it lives in the project tracker, linked by criterion
  ID. Reason: a "(not built)" mark is a second home for the gap, beside the tracker, and goes stale on each release
  unless the spec is edited again. After a redesign most criteria carry it, so it stops saying anything.
- D19 A spec splits by the procedure in the skill: the parent keeps what every task shares, each child owns its use
  cases and their criteria, IDs stay shared and unchanged, and the move is a commit of its own. Reason: the split
  applies the capability-first rule (D14) to the spec itself, the same line the code's folders follow. Stable IDs keep
  every issue, commit message, and cross-reference valid; a move-only commit lets a reviewer confirm nothing changed.
  Splitting before the sections are agreed would make each revision of a shared term edit several files: the
  reference spec's stack redesign reopened every section after Key terms. The reference spec split into resolve, write,
  interfaces, and skill, cutting the largest task's read from the whole spec to about 60%.

## Reference material

### 1. Recommended minimal section list

| # | Section | One-line purpose |
|---|---|---|
| 1 | Title + one-line outcome | Names the single outcome; the reviewer's first "and" test. |
| 2 | What (problem, who has it, intent) | Why this exists and for whom; the intent half of the spec. Legible to a non-engineer. |
| 3 | Non-goals | Plausible goals deliberately excluded, so scope cannot creep silently. |
| 4 | Key terms | Define each term a criterion leans on once; the cheapest defence against ambiguity. |
| 5 | Actors and goals | Every actor, including affected non-actors, with the result each wants (not the call they make). |
| 6 | Use cases with extensions | Per actor goal: trigger, inputs, success outcome, and every path that does not reach it (or `extensions: none, why`). |
| 7 | Criteria | Boolean, outcome-level statements, each bound to a use case (EARS or Given/When/Then form). |
| 8 | Open questions | Unresolved points, marked, never silently guessed. Empty before the spec is "ready". |
| 9 | References | Links to rationale (ADR/issue/research), sibling specs, and the single home of any shared fact. |

Add only when the behavior branches: a decision graph (Control Flow) from which criteria are derived. Omit when the
spec describes facts or a table (CT: no graph for non-behavioral sets). Do not add: implementation design, task
lists, tech stack, alternatives analysis (link out). Sections 5-7 are the load-bearing ones; 1-4 are short.

### 2. Proposed criteria (pass/fail)

Group A. Intent and scope (is this worth specifying, and is the boundary clear?)

| ID | Criterion | Reviewer's test | Origin |
|---|---|---|---|
| C1 | One intent | Can you name the outcome in one sentence without "and"? If not, it is two specs. | [SDD] oracle; [EXT] Shape Up (one problem), PEP/RFC motivation |
| C2 | Bounded scope | Does it list at least the non-goals a reader would otherwise assume, each a plausible goal explicitly excluded (not "must not crash")? | [SDD] oracle; [EXT] Google design doc, Shape Up no-gos |
| C3 | Paid for by a use case | Does every criterion and every exposed surface element trace to a use case with a named actor and a goal that is a result, not a restated mechanism? An orphan element is cut or justified. | [CT]/[SDD] oracle; [EXT] spec-kit "every feature traces to a user story", 29148 "necessary" |

Group B. Criteria quality (can each statement be judged?)

| ID | Criterion | Reviewer's test | Origin |
|---|---|---|---|
| C4 | Outcome-level (blackbox) | Could someone with no access to the code decide pass/fail from outputs alone? Does any criterion name a module, library, or internal step? Would renaming an internal break it? | [CT] criteria over outcome; [EXT] Gherkin declarative, spec-kit WHAT not HOW, Diataxis reference, DbC |
| C5 | Checkable and unambiguous | Is each criterion a boolean with one reading, one behavior (singular), and no unmeasured words ("fast", "appropriate", "sometimes")? Can you write the failing case? | [SDD] builder; [EXT] 29148/830 verifiable-unambiguous-singular, EARS |
| C6 | Complete over divergence | For each use case, is every path that does not reach the goal (error, absent input, refusal, partial result, contended state) stated as a criterion, or declared `none, why`? Is a deliberately unstated rule recorded as such? | [CT] extensions, implicit criteria; [SDD] builder/architect; [EXT] EARS unwanted behavior, DbC precondition violation, 29148 complete |

Group C. The spec as a set (does it hold together?)

| ID | Criterion | Reviewer's test | Origin |
|---|---|---|---|
| C7 | Consistent, one home | Does any criterion contradict another, a sibling spec, or a convention? Is any fact (rule, term, contract) stated in two places rather than once and referenced? Resemblance without a shared change reason is not duplication. | [SDD] architect; [CT] one home per fact; [EXT] 29148 set-consistent, AIP-8 no duplicate/contradiction |
| C8 | Nothing hidden | Is every unresolved question listed under Open questions, with no `TBD`, no guessed default, and nothing deferred that the spec's own criteria need? | [EXT] spec-kit NEEDS CLARIFICATION, RFC/PEP open issues; [SDD] oracle "no premature commitment" is the inverse (defer what need not be decided) |
| C9 | Proportionate | Is size matched to risk (a bug-fix spec is a few criteria, not a document), and does it state only what the reader could not get from the code, the repo conventions, or a linked home? | [EXT] Fowler on Kiro verbosity, Google mini design doc, AGENTS.md study, Shape Up appetite; not in CT/SDD |

Checking order for a reviewer: C1, C2 (cheap, kill early), C3, then C4-C6 per criterion, then C7-C9. C3 and C6 are
the two that catch what is missing; the rest catch what is wrong or surplus.

### 3. Failure modes

| ID | Failure | Caught by | Source |
|---|---|---|---|
| F1 | Spec is the interface restated as requirements (derived from entry points, so it cannot show a missing use case) | C3 | [SDD] spec-format |
| F2 | Goal restates the function name ("calls resume()") | C3 | [SDD] |
| F3 | Implementation leaks in (stack, APIs, class names, UI clicks); spec breaks when code is refactored | C4 | spec-kit, Gherkin, [CT] |
| F4 | Vague adjectives and compound statements; two readings; two behaviors in one line | C5 | 29148, EARS |
| F5 | Happy path only; errors and absent inputs invented by the implementer | C6 | EARS unwanted behavior, [SDD] |
| F6 | Scenarios derived from the prose list, so the suite can never reveal a hole | C6 | [SDD] builder |
| F7 | Same rule in two places; they drift | C7 | [SDD], AIP-8 |
| F8 | Plausible guesses filled in silently (agent assumes email/password login) | C8 | spec-kit; CMU underspecification study |
| F9 | Verbosity: 4 stories / 16 criteria for a small bug fix; review burden exceeds reading the code | C9 | Fowler |
| F10 | Spec goes stale or is revised from the code it constrains, so it stops constraining | out of scope for one-time review; see Thin | Fowler spec-first drift; [CT] |
| F11 | Design doc that is only an implementation plan with no trade-off | do not write the spec | Google |
| F12 | Everything in the spec is "tested", including invariants that always hold | C3 (not a decision) | [SDD] oracle strict |

### 4. Specific to specs consumed by AI agents

- Ambiguity is resolved by guessing, and guesses are fragile. Evidence: LLMs guess unspecified requirements correctly
  about 41% of the time by default; underspecified prompts regress about twice as often across model changes
  (E-AI-1, abstract-level). Agents also fail to notice they are underspecified; letting them ask lifted results up to
  74% (E-AI-2). So: C5 and C8 matter more for agents; add "agent must ask or stop on an open question".
- More is not better. Adding requirements does not reliably improve outcomes (E-AI-1). Context files gave no gain and
  raised inference cost over 20% in one study; agents follow instructions, so surplus instruction is real work (E-AI-3,
  abstract-level, a different artifact type than a spec). So C9 is a cost criterion, not style.
- Agents may skip written instructions even in a spec; a spec needs a check that does not rely on the agent
  honoring it (E-AI-4). This is why testability (C5) outranks prose quality.
- A spec read by an agent is consulted, not read through (Diataxis reference); put criteria in a stable, scannable
  shape (one statement per line, ids), and keep rationale in links so it is loaded only on demand.
- Separation of intent from criteria: an agent cannot indict a wrong criterion without the intent ([CT]).

### 5. Disagreements between sources

- D1 Rationale and alternatives inside the doc or outside. RFC, PEP, and Google put rationale and alternatives in the
  design doc ("one of the most important sections"); MADR/ADR records them as a separate decision; cyber-truss and the
  SDD spec hold criteria only. Recommendation: outside, linked (one home), because rationale decays on a different
  clock from criteria. Cost: reviewers lose the trade-off in one view.
- D2 Is a spec a requirements doc? Google says its design doc is "not a requirements doc"; Fowler equates spec with PRD;
  cyber-truss says a spec is intent plus criteria and is per-edge (a PRD is the spec of the product and the
  implementation of intent). Here "spec" means the cyber-truss pair.
- D3 Where does HOW stop? spec-kit and Gherkin say never HOW; Tessl-style specs include an API section and
  Kiro has design.md alongside; Fowler found the boundary unclear. Public surface (names, signatures, exit codes) is
  outcome when consumers depend on it; internals are not. The dependencies example lists CLI flags and exit codes as
  outcome. Rule of thumb: if a consumer is judged against it, it is criterion.
- D4 Implicit criteria. 29148/830 push "complete"; cyber-truss says some criteria are never stated by decision. Resolve
  by requiring that the decision be recorded (C6), not that everything be written.
- D5 Notation. Kiro uses EARS; OpenSpec uses SHALL plus WHEN/THEN scenarios; SDD uses Gherkin from a control-flow
  graph; none is shown better in the sources. Choose one per repo.
- D6 Heavy up-front vs iterative. Shape Up and Fowler favor small, shaped, time-boxed specs; spec-kit workflows
  are heavy. C9 sides with small.
- D7 Standing spec lifetime. Spec-first (scaffolding discarded), spec-anchored, spec-as-source (Fowler); cyber-truss
  assumes a standing spec compared against on each change. The skill should state which it assumes (anchored).

### 6. Example: how the finished node spec maps

packages/cyber-agentkit/.agents/spec/dependencies/README.md has: What + Non-goals + Key terms; Use Cases with an actors
table and per-UC entry points, inputs, outcome, extensions; Control Flow; Scenario map; References. Extension lists
are long (UC1 has about 11), showing C6 in practice and C9 pressure. It adds a decision graph and scenario map
beyond the minimal list because the capability branches. It states exit codes and stable error codes as outcome (D3).

## Confidence

Medium for the criteria set (convergent across about ten independent sources; cyber-truss/SDD and external practice
agree on C1-C7). Medium-low for the AI-specific claims (E-AI-*: abstracts and search summaries only, not full papers).
Low for the exact wording of IEEE 830 and 29148 (secondary sources only).

## Strongest supporting evidence

- Independent convergence on non-goals (Google, Shape Up, SDD) and on testable statements (spec-kit, Gherkin, EARS,
  29148, SDD builder): E-GOO-1, E-SU-2, E-SK-2, E-EARS-1, E-29-1.
- Convergence of SDD "extensions" with EARS "unwanted behaviour" and 29148 "complete": E-SDD-3, E-EARS-1.

## Strongest weakening evidence

- Fowler: heavy spec processes added review burden and agents still skipped instructions (E-FOW-1). A good spec is
  necessary, not sufficient.
- AGENTS.md study: extra instruction cost more and did not help (E-AI-3). Argues for a short spec, but concerns
  context files, not specs.
- Nothing found measuring whether any specific criterion list improves outcomes (see Thin).

## What is not supported

- That any of these nine criteria has been validated empirically as a predictor of spec quality. They are a synthesis.
- That EARS or Gherkin outperforms free prose for agents.
- Exact clause text of 29148 and 830 (not fetched).

## Where evidence is thin

- T1 No controlled study of spec quality criteria for agent consumption; only prompt-underspecification papers.
- T2 No evidence on token cost of specs specifically; only AGENTS.md context files.
- T3 Amazon PR/FAQ and Shape Up are product-pitch artifacts; mapping to a library-feature spec is by analogy.
- T4 API design review (AIP) read only via search snippets; criteria beyond consistency/no-duplication not extracted.
- T5 Spec staleness and drift (F10) is a real failure mode but a review of one doc cannot detect it; a staleness
  check needs a separate mechanism ([CT] canonical execution, not covered here).
- T6 OpenSpec rules not documented on the page fetched; its MODIFIED/REMOVED deltas unverified.
- T7 Kiro docs fetched do not use the word "acceptance criteria"; the Fowler article says GIVEN/WHEN/THEN. Minor
  conflict, unresolved.

## What should be checked again later

- Read full text of Fowler's article and of arXiv 2602.11988 and 2505.13360; verify numbers.
- Obtain 29148 clause 5.2 text; verify the "nine individual, five set" characteristics.
- Cucumber's official Gherkin reference (one behavior per scenario) was not fetched.
- Re-run once the cyber-truss model leaves "Thesis" status for use cases and implicit criteria.
