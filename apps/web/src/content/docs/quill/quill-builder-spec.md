---
title: Quill Builder Bar — Spec Gate
description: What a documentation spec must contain to clear Quill's spec gate, and what it must never freeze — each requirement with the condition that decides it.
---

This page is the public surface of Quill's **spec-gate Builder bar**. Look up one requirement, apply it, and leave; nothing here has to be read in order.

## What this bar is

Four things settle whether a requirement below applies to you at all: which actor and gate the bar belongs to, what else binds alongside it, which direction you are reading it in, and whether your subject is a documentation subject in the first place.

### Which actor, and which gate

This is the **Builder** actor's bar, and it applies at the **spec gate** — the gate that grades a documentation node's `spec.md` and its `.feature` before the document itself exists. It is **not** the impl gate's bar. Quill ships two Builder bars, and the one that grades the finished document — the document-scoped enumeration rule and the judged defect catalog — is [the impl-gate Builder bar](/quill/quill-builder-impl/).

### It unions onto the generic SDD builder-spec bar

This bar **unions onto** SDD's generic `builder-spec` bar rather than replacing it. The generic testability and coverage requirements still apply to a documentation spec in full; what follows adds the requirements that make a *documentation* spec a complete contract.

A spec that satisfies every requirement on this page and none of the generic ones does not clear the gate. The generic half is named — not re-derived — under [What the other half of the union still requires](#what-the-other-half-of-the-union-still-requires), which links the governance that owns it.

### One bar, read in two directions

The **spec-producer** role reads this bar **forward** while authoring a spec: each requirement is something to satisfy. The **spec gate** reads the same bar **backward** while grading that spec: each requirement is something an element either met or missed.

That is why every requirement below is given with **the condition that decides it**, never as the element's name alone. A requirement stated as a name serves neither direction — the author cannot tell when they are done, and the reviewer cannot cite what was missed.

### Fit — whether this bar applies at all

A subject with an **inspectable document surface** — a declared path and required sections — is graded under this bar. A subject with **no** inspectable document surface is outside Quill's lens and **recuses** to the SDD-default chain rather than being graded here.

Carrying prose does not by itself make an artifact a documentation subject. A spec whose artifact is code, configuration, or an agent definition recuses however much prose that artifact contains.

## The seven required elements of `## What`

A documentation spec's `## What` section carries seven required elements:

1. an **audience table**
2. a **declared doc type**
3. a **north star**
4. a statement of **why the document exists**
5. a **required-coverage list** of key points
6. **non-goals**
7. **prerequisites**

Each is required, and each has a pass condition below.

### 1. Audience — a table whose rows name a role and a goal

The audience is given as a **table**, never as a phrase. Each row names a **role together with what that role is trying to accomplish**.

`the reader` fails as an audience. So do `users` and `developers`. The reason is the same in each case: the phrase names no goal, so nothing about the document follows from it — not what to cover, not what to leave out, not what order to route.

Write the audience list **first**. The required-coverage list and the reader entry points in `## Use Cases` are derived from it, so an audience list settled after them ratifies whatever the draft already served.

### An audience with no reader entry point is not an audience

A **reader entry point** is one row of `## Use Cases`: one way a reader arrives at the document. An audience row that **no** reader entry point serves fails as an audience — it is listed and never served. An audience row carrying **at least one** reader entry point stands.

There are two remedies, and either settles it:

- **add a reader entry point** for that audience, or
- **cut the row**.

### Two audiences needing opposite things from one fact

Where two audience rows need **opposite things from the same fact**, that is a signal to decide between **one document and two**.

The decision must be **recorded** whichever way it goes — one document serving both audiences, or two documents. Leaving the case undecided is what fails; neither answer does.

### 2. Doc type — one of four, declared, chosen by what the reader is doing

The doc type is declared in the spec, and it is chosen by **what the reader is doing while they read** — not by the subject matter.

| The reader is | Type | Success is |
|---|---|---|
| doing something for the first time, learning by doing | **tutorial** | it worked, and they now trust they can do it |
| accomplishing a goal they already understand | **how-to** | they got unblocked |
| looking one thing up | **reference** | they found it, and it was accurate |
| building understanding rather than doing a task | **explanation** | they can make a decision they could not make before |

The type sets what "good" means for the document, and **mixing types in one document is a common structural defect** — the most common one at this element.

### 3. North star — one sentence, carrying a failure mode

The north star names **what the reader leaves with**.

It must also carry a **concrete reader state that would mean the document missed** — a state a reader could actually be in after reading, which the document was written to prevent. A north star with no such state is unfalsifiable: it grades nothing, because no revision can fail it.

> *A reader finishes able to X.* **A revision that leaves a reader able to Y but not X has missed.**

### 4. Why the document exists

The spec states the **problem the document resolves, in the domain's own terms**.

Where that problem **can** be stated without restating the document's title, state it in the domain's own terms. Where it **cannot** — where the only available statement of the purpose is a paraphrase of the title — say so outright rather than papering over it. What that surfaces is a real consequence: the document may not need to exist separately from its parent.

### 5. Required coverage — key points, and the drop test

The required-coverage list is a numbered table. Each row is a **claim the document must land**, never a section name. *"Separating targets lets contradictory values coexist"* is a claim; *"the separation section"* is a heading.

The test for a row is the **drop test**: *if this row were dropped and the document left unchanged, would a reader be worse off?* A row that fails that test — a reader no worse off — is **cut**.

Each row must also be **checkable by static inspection**. What those checks verify is owned by [the doc-eval model](/quill/doc-eval-model/); a row no such check can settle is not yet a key point.

### When the coverage list is complete

The coverage list is complete when **a document meeting every row cannot still trip the north star's failure mode**.

If such a document could still trip it — if you can imagine a document satisfying every row and still leaving the reader in the state the north star names as a miss — then **a key point is missing**, and the list is not yet complete.

### 6. Non-goals — each with a forwarding address

Each non-goal names what the document deliberately does not cover **and where that material lives instead**.

An exclusion with **no forwarding address** reads as an omission rather than a decision: a reader cannot tell whether the material was ruled out or simply forgotten, and neither can the gate.

### 7. Prerequisites — each naming the document that supplies it

Prerequisites name **what a reader must already know** before the document is usable, and each one names **which document supplies it**.

A document that claims to be **self-contained** declares that explicitly. Silence is not a declaration — an unstated prerequisite is indistinguishable from a missing one.

## `## Use Cases` — reader entry points, grouped by audience

Each row of `## Use Cases` is **one way a reader arrives** at the document.

A row gives three things: the **trigger** that brought the reader, **what the reader brings** with them, and **what they leave with**.

The rows are **grouped under their audience**. Every audience carries **at least one** entry point, and every entry point **traces to a coverage row** that serves it — an arrival the coverage list does not serve is an arrival the document will not satisfy.

## `## Control Flow` — the reader's decision path

The control-flow graph draws **the questions the document must answer to route a reader**.

**A list of the document's sections is not a control-flow graph.** The difference is what each records: a section list records **what was written**, while the graph records **what a reader needs, and in what order they need it**. A graph that can be read off the table of contents has recorded the draft rather than the reader.

Where the document serves several audiences, the default first branch is **which audience the reader is** — that is the branch that selects which part of the document they need.

### A disjunction is read by the node it sits in

A node offering the reader two options is routed by the **kind of node** it sits in.

- In a **decision** node, **keep it**. A decision node is a question, and a question with two answers is exactly what it should be.
- In an **outcome** node, **promote it to a decision node** and put the criterion on the edges.

An outcome node reading `[do A, or do B]` is a decision the author deferred onto the reader. The consequence is concrete: the reader is left exactly where they arrived — needing to choose, with no criterion to choose on.

Before — one outcome, two options, no criterion:

```
K -- yes --> K1[split into units, or scope by prose]
```

After — the criterion is the node, and each option is its own outcome:

```
K -- yes --> K1{would splitting copy more than it separates?}
K1 -- no --> K2[split into single-target units]
K1 -- yes --> K3[keep one file, branch by prose]
```

### A route must reach every option the spec enumerates

Where a coverage row names a **set** — three mechanisms, four arrangements — and a node routes a case across that set, an option **absent from the routing** is a **gap, not a simplification**.

Two remedies, and either settles it:

- **route to the option**, or
- **state why the option is excluded**.

**This is checked against the spec, never against the document.** At the spec gate the document may not exist yet, so the spec's own coverage table is the inventory the route must spend. Grading the route against a draft costs something specific: the draft's omissions become the contract, and the gate then certifies exactly the gaps it exists to catch.

## `## Scenario map` — one-to-one with the suite

The scenario map is **one-to-one with the suite**: every scenario in the `.feature` appears in the map, and every map row names a scenario that exists.

Every **coverage row** must be reachable from **at least one scenario**. A coverage row no scenario checks is **unenforced** — it is a claim the spec makes and the gate cannot grade.

### What the other half of the union still requires

This bar unions onto SDD's generic `builder-spec` bar, and that half binds a documentation suite too. An author who has satisfied every requirement on this page has not finished the suite until it also holds:

- **every edge of the spec's control flow carries a scenario**;
- **every guard or negative edge is paired with a positive companion**;
- **every scenario asserts an observable boolean outcome**.

Those three are named here so a reader knows what binds them; their derivation is not repeated here, because it has one owner. That owner is SDD's **`builder-spec` governance**, listed among SDD's loadable contracts under [the SDD workflow overview's governance table](/sdd/overview/#the-governances). The governance is a contract the SDD plugin loads by name, not a page on this site — the overview is where it is located and what it owns is recorded, and the governance text itself is where the derivation is read.

### A load-bearing claim is asserted against the reader's paths

Where a coverage row's claim is load-bearing in **several passages** of the document, an assertion of the form `Then it states X` is under-specified: **it is satisfied wherever X lands**, including a document that lands the claim only where one of the readers who need it will pass.

Require the claim **on each path the control flow routes a reader to it** — the control flow being the spec's own `## Control Flow` graph, which draws the questions the document must answer to route a reader:

```gherkin
Then it presents two values that cannot both be one house style
And it states that contrast on each path the control flow routes to it
```

The control flow is already in the spec and the passages are already in the document, so this is a comparison the reader-path check settles. It **freezes no wording, no section order, and no count** — only that a reader who needs the claim reaches it.

### The place-count rule is retracted

An earlier revision of this bar required a load-bearing claim to appear **in exactly one place**, with later passages referring back to it. **That rule is retracted.** It is recorded here as retracted rather than current so that a reader who learned it can stop applying it.

Two grounds:

- **Recurrence has no empirical warrant as a defect.** The measured comprehension cost attaches to a passage whose given information has no retrievable antecedent — not to a claim appearing twice.
- **The count gets its driving case backwards.** The case it was written for is a reader arriving at a later section from the sidebar or from search, who **has not read the lead**. For that reader the "redundant" restatement was the only statement of the claim they ever saw, and the rule's prescribed fix — replacing it with a pointer — made the document worse for exactly them.

### A routing scenario asserts what decides

Where a scenario covers a case the document **routes across a set of options**, the assertion names **what decides which option a case takes**.

An assertion naming only **where the case lands** passes whether or not that destination is the right one. The consequence is that the suite **ratifies the route the draft took instead of testing it** — the one thing a suite is there to prevent.

```gherkin
Then it directs a target whose rules can stand as their own unit to description matching
And it reserves prose matching for variants that splitting would duplicate
```

A destination-only assertion is worth writing **only where the set has one member**. Wherever the reader is choosing, the criterion is the behavior and the destination follows from it.

## What a documentation spec never freezes

Four things a documentation spec never freezes:

- **the order of the document's sections**;
- **wording, phrasing, and headings** verbatim;
- **which specific examples are used**;
- **length, tone, and voice**.

An edit touching only these cannot break a frozen documentation spec.

### What the spec does freeze

Two things are frozen:

- **the claims the document must land**, and
- **the paths a reader takes to reach those claims**.

An **example** is asserted by **the kind of example required**, never by which example is used — so swapping one example of the required kind for another is inside the contract.

The rule in one line: **freeze the claims and the reader's path, and leave the prose to the author.**

### Why the prohibition exists

A spec that freezes order, wording, examples, or tone **breaks on every honest revision while catching no real defect**. Every rewording trips it; no actual defect is found by it.

That outcome is the failure mode that **makes teams abandon documentation specs** — not because the specs were too strict about the wrong things in principle, but because the gate became noise and the cheapest response was to stop running it.

The concrete consequence to preserve: **a reordering that serves readers better must not fail the gate.**

## When a required element is missing

A missing **audience table**, **doc type**, **north star**, or **coverage table** is returned as a **content gap** for the user to settle. It is not filled in on the user's behalf.

The audience in particular is **not inferred from the document's existing prose**. Inferring it **launders whatever audience the draft happens to serve into the contract** — which is precisely the defect the audience element exists to catch, now blessed by the gate that was supposed to catch it.

This is the rule for an element that is **absent**. An element that is present but not passing is graded against its own requirement above.

## What this page does not own

Three lookups belong to other pages and are reached by link rather than answered here:

- **the impl-gate Builder bar**, its document-scoped enumeration rule, and the judged defect catalog — [the impl-gate Builder bar](/quill/quill-builder-impl/);
- **what the static checks verify**, and how the judged instrument works — [the doc-eval model](/quill/doc-eval-model/);
- **which agent fills the spec-producer role**, which one runs the gate, and the write-versus-run independence anchor — [the production chain](/quill/production-chain/).

For what Quill is and how to register it in a project, see [the Quill overview](/quill/overview/) and [`init-quill`](/quill/init-quill/).
