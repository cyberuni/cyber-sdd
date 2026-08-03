---
title: Production Chain
description: Which actor holds each of Quill's SDD production-chain slots — phase by phase, role by role, bar by bar — and what that actor is allowed to do.
---

Quill ships three agents. [SDD](/sdd/overview/)'s production chain has five delegate roles and five gate bars. The two sets do not line up on their own: an agent name going past in a transcript does not say which role SDD asked for, and a slot Quill leaves empty does not say what acts there instead. This page is where you look that up.

Every binding on this page is decided by one file — the project's plugin registry, `.agents/universal-plugin.json`. **This page reports the bindings; the registry decides them.** [Checking the table against the registry](#checking-the-table-against-the-registry) gives the entry to read them off.

## Where each Quill agent acts in the mission loop

Three points of the loop dispatch a Quill agent. Two do not, and they are listed here rather than left out, because "no Quill agent appeared" is the lookup a reader arrives holding just as often as "which agent is this?".

| Point in the mission loop | Who acts | Role slot |
|---|---|---|
| **explore** — before the spec gate | `quill-spec-writer` | `spec-producer` |
| **the design fork** — where a solution design is drafted | no Quill agent: the **SDD conductor** acts, running SDD's own default procedure for the slot | `solution-producer` — empty |
| **the spec gate** | no Quill agent: **SDD's spec gate** acts, on SDD's own default for the slot | `spec-judge` — empty |
| **deliver** | `quill-doc-writer` | `impl-producer` |
| **the impl gate** | `quill-judge` | `impl-judge` |

A role Quill leaves empty falls back to the **SDD default** for that slot. It is not a point where nothing runs — the mission still passes through the design fork and still passes through the spec gate, with the actor named in the table above doing the work Quill declined to bind an agent for.

## The three agents are dispatched, not invoked

`quill-spec-writer`, `quill-doc-writer`, and `quill-judge` are dispatched by the **SDD conductor** as it moves the mission through the loop. A reader does not invoke them directly: they take their inputs from the conductor, not from a person, and they do not appear as anything you can call by hand. If you are looking for a Quill entry point you can run yourself, the one that exists is [`init-quill`](/quill/init-quill/), and it registers the plugin rather than running any of these three.

## The five production-chain roles

The production chain is a **closed set of five delegate roles** that SDD resolves for each artifact-type. The set belongs to SDD, not to Quill; a plugin fills a subset of it and leaves the rest to SDD. Quill fills three of the five.

| Role | Quill's binding | Who acts |
|---|---|---|
| `spec-producer` | `quill-spec-writer` | Quill's agent, in explore |
| `solution-producer` | `null` | the SDD default: the **SDD conductor**, running SDD's own solution-producer procedure |
| `spec-judge` | `null` | the SDD default: **SDD's spec gate** |
| `impl-producer` | `quill-doc-writer` | Quill's agent, in deliver |
| `impl-judge` | `quill-judge` | Quill's agent, at the impl gate |

Both of the rows reading `null` name the actor that fills the slot in Quill's absence, and no row in the table is left without either a Quill agent or a named filler. A `null` is a delegation, not a gap.

## The five bar governances

A **bar** is the standard a gate grades against. SDD supplies a default bar at every slot; a plugin overrides the ones where its domain needs a different standard. Quill overrides two and leaves three alone.

| Bar slot | Quill's binding | Where it acts |
|---|---|---|
| `oracle-spec` | `null` — left to the SDD default | the spec gate |
| `builder-spec` | [`quill-builder-spec`](/quill/quill-builder-spec/) | the spec gate |
| `builder-impl` | [`quill-builder-impl`](/quill/quill-builder-impl/) | the impl gate |
| `architect-spec` | `null` — left to the SDD default | the spec gate |
| `architect-impl` | `null` — left to the SDD default | the impl gate |

If you are deciding whether to write a documentation-specific bar for a gate, this table is the answer: the Builder bar exists at both gates already, and the Oracle and Architect bars are SDD's.

## Checking the table against the registry

Both tables above are derived from the project's plugin registry at `.agents/universal-plugin.json`, and that file is the **authority** for every binding this page reports. The page can go stale under it; the registry cannot go stale under the page.

To read a binding at the source, open the registry and find the entry in the `sdd-plugins` array whose name is `quill`. Its squad carries two objects, and they are the two tables above:

- **`roles`** — one key per production-chain role, each holding a bound agent name or `null`. This is where the role table comes from.
- **`governances`** — one key per bar slot, each holding a bound bar name or `null`. This is where the bar table comes from.

If what you read there disagrees with what you read here, the registry wins and this page is the thing that needs fixing.

## Who writes, and who runs

At the impl gate, two Quill agents are involved and they are not doing the same job:

- **`quill-doc-writer` authors** both the documents **and** their per-scenario acceptance checks — the checks that decide whether each document satisfies its frozen scenarios.
- **`quill-judge` runs** those checks. It authors no criteria of its own.

Read quickly, that looks like a producer grading itself, which is why the rest of this section exists.

### Three anchors, and no fourth

Everything `quill-judge` is entitled to report as a finding comes from three anchors:

1. **The frozen `.feature`** — the scenario suite ratified at the spec gate.
2. **The frozen document-scoped rule** — the one criterion that reads a document whole rather than passage by passage. Its content is on [Builder bar — impl gate](/quill/quill-builder-impl/).
3. **The frozen defect catalog** — the named prose defects the judged pass reads for. Its entries are also on [Builder bar — impl gate](/quill/quill-builder-impl/).

Each of the three is an artifact the judge **did not write**: the suite was authored upstream and ratified at the spec gate, and both frozen bars ship with the plugin.

There is **no fourth anchor**. An impression the judge forms that matches none of the three is not a finding, and is not reportable — however reasonable it sounds.

### What the independence rests on

The verdict is independent for two reasons, and neither of them is "the judge wrote its own checks" — it did not, and that is the fact that prompts the question:

- **The anchors are artifacts the judge did not write.** A judge that cannot invent a criterion cannot invent a reason to fail you, and cannot quietly drop one to pass you either.
- **The judge is a separate runner from the author.** `quill-judge` runs in its own context, not the one that wrote the document, so it does not inherit the author's assumptions about what the document already says.

Those two together are what make the verdict worth something. Producer-authored checks do not undermine that, because the checks are anchored to a suite frozen before either agent ran.

## Questions this page hands off

This page resolves bindings. Each of the following is named here and developed elsewhere — follow the link rather than reading a second-hand account:

| Question | Where it is answered |
|---|---|
| What the per-scenario checks actually verify, and how the judged pass runs | [The doc eval model](/quill/doc-eval-model/) |
| What the `builder-spec` bar contains — what a documentation spec must hold and must never freeze | [Builder bar — spec gate](/quill/quill-builder-spec/) |
| What the `builder-impl` bar contains — the document-scoped rule and the defect catalog entries | [Builder bar — impl gate](/quill/quill-builder-impl/) |
| How a registry entry is written, and what its shape is | [init-quill](/quill/init-quill/) |
| Installing Quill, and which artifact-types it claims | [Quill overview](/quill/overview/) |

**Creating an entry versus reading one.** If your project has no `quill` entry in its registry yet, the question of how one gets there belongs to [init-quill](/quill/init-quill/), which writes it. What an entry that already exists currently binds stays here — that is the table you just read.
