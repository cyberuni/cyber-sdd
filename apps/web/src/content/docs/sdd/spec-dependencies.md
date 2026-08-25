---
title: Spec Dependencies
description: How specs and skills reference each other across a monorepo — which dependency kinds may cycle, and why you depend on intent, not slugs.
---

Specs reference each other. A routing skill names what it fires *away from*; a chaining skill names what it invokes. In a monorepo those references cross **project** boundaries — one project's spec naming another's skill — and each project has its own lifecycle and its own right to be renamed.

Traditional programming forbids circular dependencies. The instinct is to port that ban to specs and skills. But "dependency" is not one relationship here, and porting the rule wholesale would forbid references that are not merely harmless but *correct* — a boundary is inherently two-sided.

## Dependency is not one thing

We forbid cycles in code for three concrete reasons: non-termination, un-orderable construction, and loss of independent reasoning. Not every cycle triggers them — mutual recursion is legal. So the real rule was never "no cycles"; it was *terminate, be orderable, stay independently comprehensible*.

A reference between two units is one of four kinds, each with its own cycle-tolerance:

| Kind | "A depends on B" means | Cycle allowed? |
|------|------------------------|----------------|
| **Comprehension** | A's spec can't be understood without reading B's | No — must be acyclic |
| **Production order** | B must be produced before A | No — a DAG |
| **Invocation** | A calls or chains B at runtime | Yes, with a termination guard |
| **Boundary / routing** | A defines itself as *not* B | Yes — natural, often required |

The last row is the key one: two skills that share a boundary should reference each other on purpose. That mutual reference makes the routing symmetric and complete; forbidding it makes the boundary worse.

## Depend on intent, not slugs

Each spec must be independently comprehensible, depending on another unit's **intent or interface** — never its internals or its exact slug. Reference "the ACED registry write," not `aced/init-aced`. This is dependency inversion (SOLID's *D*) applied to specs: depend on the stable capability, not the concrete implementation.

That single discipline pays off three ways. It makes comprehension cycles impossible to write. It removes most rename drift, because a renamed slug no longer appears in your spec. And it reduces **leakage into the implementation** — the worst failure mode, where a slug copied from a spec into a `SKILL.md` breaks silently at runtime when the referenced unit is renamed.

Name an exact slug only where it is **load-bearing** — the one place a skill actually invokes another. There the coupling is real; keep it to a single authoritative mention.

## Renaming a referenced unit

Because a name token in a frozen `.feature` is not part of the behavioral contract, updating a *renamed* external identity is a pure identity substitution with zero behavioral delta. It is freeze-preserving **reconciliation** — the formation loop sweeps it without reopening the spec, the same way an added scenario or a pure move preserves the freeze. The guard: this holds only when the boundary and behavior are unchanged. If the referenced capability's *meaning* moved rather than just its name, that is a real change and the spec reopens.

## The composition-root exception

Project-global agent configuration — `AGENTS.md` and its kin — is exempt from the intent-not-slug rule. It is global to the project: the router loaded for every interaction, neither independently comprehensible nor independently versioned. That makes it the **composition root** of the agent-config graph — the one place, as in dependency injection, where concrete cross-references are legitimate. Tooling checks that a composition root's references *resolve*, but does not treat them as coupling to avoid.

## Guarding drift

Cross-project references are kept honest by one shared **cross-reference resolver**: it asserts that every slug and capability named across specs, suites, and implementations resolves to a live unit. It runs in CI so drift is a red build, not a silent runtime break, and it enumerates what a rename must reconcile. The same engine is consumed by the SDD formation loop and by ACED's spec and impl judges, which layer their own agent-config-quality judgment on top.

## Related decisions

- [ADR-0021: Dependency kinds across specs and skills](/concepts/adrs/) — the four dependency kinds, intent-not-slug, reference-rename reconciliation, and the composition-root exception.
