---
title: Quill Overview
description: Quill is SDD's documentation-domain plugin — what it treats a document as, which artifact types it covers, and which page answers the question you arrived with.
---

**Quill** is the documentation-domain plugin for [SDD](/sdd/overview/) — spec-driven development, the process that writes down what an artifact must do *before* the artifact is built, and then grades the built artifact against that written contract. Quill is the part of that process that knows what a **document** is. Its sibling [ACED](/aced/overview/) does the same job for agent configuration.

This page is the section's front door. It says what Quill decides about a document, whether Quill applies to the file you are holding, and which of the five other pages in this section answers the question you came with. Nothing here assumes you have read anything else — every term is explained or linked where it first appears.

## Documentation fails the way code fails

A document breaks in the same ways a program does.

- **Missing content** — a section the reader needs was never written, or went away with the paragraph that used to reference it.
- **Structural drift** — headings that the rest of the project assumes are there get renamed, merged, or quietly dropped.
- **Reader-path gaps** — a guide's steps no longer reach the outcome the guide promises, or a step depends on something the guide never introduced.

Those are not matters of writing taste. They are the same defects code has — a missing definition, a changed interface, an unreachable branch — landing in prose instead of in source.

The difference is what catches them. Code has a **compiler** that refuses to build and a **test runner** that goes red. Documentation has neither. Nothing fails when a heading disappears, and nothing goes red when a tutorial's third step stops working. The defect ships, and the first thing that notices is a reader.

## What Quill treats a document as

Quill is that missing runner. It treats a document as an **implementation artifact with verifiable structure** — the same kind of thing as a module, and checkable in the same way.

The move that makes this possible is contracting the document's behavior **before the document is written**. Two artifacts carry the contract:

- a **spec**, which states who the document is for, what it must land, and which questions it must answer; and
- a **`.feature`** — a plain list of scenarios, each naming something the finished document must be true of, in a form a checker can run.

The `.feature` is **frozen** once the contract is agreed: it stops changing. That is what makes it an anchor. The document is written to satisfy the frozen scenarios, and later graded against them, rather than against whatever the document happened to become.

## Quill does not run on its own

Quill is a **plugin** — a component SDD loads and calls, not a command you point at your docs. There is no `quill` binary and no `quill check` to run.

SDD carries a change through a fixed set of **delegate roles**: one writes the spec and its `.feature`, one writes the artifact itself, and others grade each of those at a **gate** — the checkpoint where work is held to a standard before it is allowed to move on. A component called the **conductor** decides which delegates fill those roles, and it decides per **artifact-type**: the declared kind of thing being changed. When the artifact under change is declared as a documentation type, the conductor resolves **Quill's** delegates for it and invokes them.

Those five roles are SDD's **production chain**, and Quill fills them for its documentation types. Which agent fills each role, and which **bar** — the standard an actor is held to at a gate — grades each gate, is the [Production chain](/quill/production-chain/) page's subject; it reads those bindings from the plugin registry rather than from another page's prose.

## Two instruments, and what neither of them asserts

A Quill verdict is reached in one of exactly two ways, and the difference is *how* the verdict is reached:

- **Inspection** compares the document against a frozen artifact and returns a **boolean** — the claim holds or it does not ([how inspection decides](/quill/doc-eval-model/)).
- **Judgment** simulates a reader going through the document and scores that reading against a frozen catalog of named prose defects, returning a **graded** finding rather than a yes or a no ([how judgment decides](/quill/doc-eval-model/)).

**Neither instrument asserts wording, style, or tone.** Quill has no opinion about your sentences, your register, or the order you arranged your sections in — the prose stays yours. That limit holds at the judged instrument exactly as it holds at the boolean one; the graded tier is not where style was quietly moved to. [Doc eval model](/quill/doc-eval-model/) is the page of record for that boundary and for what each instrument does assert.

## Does Quill apply to what you are holding?

Quill covers five documentation **artifact-types**: `documentation`, `guide`, `tutorial`, `article`, and `reference`. These are the keys SDD resolves a chain by — when a change's artifact is declared as one of the five, that declaration is what makes the conductor pick Quill's chain for the file rather than some other plugin's.

The subject also has to be **structurally checkable** for a Quill verdict to mean anything:

- a **declared path** — one stated location the document is expected to exist at;
- **required sections** — headings a scenario can name and a checker can look for;
- and, for a **guide** or a **tutorial**, a **reader flow** — an ordered path a reader follows that has to arrive at a stated outcome.

**A subject Quill's chain does not resolve for goes to the SDD default chain.** That is the destination whether the subject has no inspectable document surface at all — a config file, a schema, a script whose only prose is a docstring — or whether it is a perfectly good document of some type outside the five. Both reach the same place: the SDD default chain takes it, and grades it as a general artifact instead of a documentation one. Neither case is a rejection. The subject still has a chain; it is just not this one.

## Getting it running

Two acts, not one.

**1. Install the plugin.**

```bash
npx skills add cyberuni/cyberplace --plugin quill
```

**2. Register it.** Installing puts Quill on disk. It does not tell SDD to use it. Until Quill is registered in the project, the conductor resolves Quill for **nothing** — every documentation change goes to the default chain exactly as if the plugin were not installed at all.

Registration is a separate step with its own page: [Registering Quill](/quill/init-quill/) is where the registry entry is written, and what it must contain.

## Where to go next

Five pages, one question each.

- **[Doc eval model](/quill/doc-eval-model/)** — *how is a document actually checked?* What separates the two instruments, what each of the scenario-scoped checks verifies, why one check has to read the whole document, and what a judged finding is worth.
- **[Production chain](/quill/production-chain/)** — *who checks it?* Which agent fills each of the five delegate roles, which bar applies where, and why the one that writes a document is never the one that grades it.
- **[Registering Quill](/quill/init-quill/)** — *how do I switch it on in my project?* The registry entry, what goes wrong when it is missing or malformed, and what to do once it is in.
- **[Builder bar — spec gate](/quill/quill-builder-spec/)** — *what must my documentation spec contain?* The standard a spec and its `.feature` are held to at the **spec gate**, where the contract is frozen — including what a documentation spec must never freeze.
- **[Builder bar — impl gate](/quill/quill-builder-impl/)** — *what will my finished document be held to?* The standard applied at the **impl gate**, where the written document is graded: the document-scoped enumeration rule, the named prose defects, and when one of them can block.

## Related

- [SDD Overview](/sdd/overview/) — the spec-driven development process Quill plugs into
- [ACED Overview](/aced/overview/) — SDD's sibling plugin for the agent-configuration domain
