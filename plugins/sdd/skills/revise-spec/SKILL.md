---
name: revise-spec
description: Use this skill when revising an existing SDD spec — grill and tighten spec.md, then bring the .feature back into line. The Revise spec and draft re-open path; smaller than create-spec (no scaffolding).
metadata:
  internal: true
---

# revise-spec

Revise an **existing** `specs/<domain>/spec.md` and its `.feature`. This is the **Revise spec** / draft re-open path — distinct from `create-spec`, which scaffolds a spec from scratch. There is nothing to scaffold here: the spec exists. The work is to **grill** it — pressure-test what is already written, find what is weak, missing, or stale, and tighten it — then bring the `.feature` back into line. Leaves the spec at `status: draft`, ready for the spec gate (`validate-spec`).

Load `sdd:lifecycle-governance` for the status enum and the freeze re-open transition, `sdd:ownership-governance` for the write-ownership matrix, and `sdd:spec-governance` for the `.feature` bar, the `## Use Cases` rule, and the **spec-granularity heuristic**.

## Precondition — the spec must be writable

- If `status` is `draft`, proceed.
- If `status` is `approved` or `implemented`, the `.feature` is **frozen**. Re-opening is a freeze transition and a `status` write you do not own — confirm the re-open was ratified by the Council (carried by the relay), then proceed under the re-open. Never edit a frozen `.feature` without the ratified re-open.

## Two phases, in order — grill the spec, then the features

Revise **`spec.md` first, to settle the contract's intent; only then** revise the `.feature`. Editing scenarios before the spec is settled wastes work — the scenarios chase a moving target.

### Phase 1 — grill the spec (`spec.md`)

Interrogate what is already there. Do not rewrite from scratch; pressure-test and tighten:

- **Scope** — is the spec still about *one* behavior? If grilling reveals it bundles several (per the `spec-governance` granularity heuristic — >~15–20 scenarios, or use cases spanning more than one behavior), **recommend a split** instead of growing it further. A revision is the moment to catch a monolith.
- **Use cases** — is each entry-point's trigger, inputs, and outcome still accurate? Did the change add, remove, or alter an entry-point?
- **Design decisions** — does any decision now contradict the change, a sibling spec, or a governance? Reconcile stale terms and claims.
- **Open items** — resolve every `<!-- open: -->` marker the revision touches; leave none dangling.

Carry the user's intent into the grilling (the relay collected it). Where the right answer is a judgment call, surface it as a batched question, not a guess.

### Phase 2 — grill the features (`.feature`)

Once `spec.md` is settled, bring the boolean layer into line:

- Every use case still maps to one-or-more scenarios; add scenarios for any new entry-point, retire scenarios for any removed one.
- Each scenario is still a pure boolean `Given`/`When`/`Then`; tighten any that drifted.
- Step-down ordering and `# ── stage ──` grouping still hold after the edits.

## Drive the operator (the user loop)

Set an **iteration cap** (default **3**; override if the user named one). Then loop:

1. Invoke `sdd-operator` with the resolved domain, `DOMAIN_PATH`, the user's revision intent, and any `USER_ANSWERS` from the previous wave; signal that this is a **revision** (grill, not scaffold).
2. On `STATUS: complete` → exit.
3. On `STATUS: needs-input` → ask the **batched** `QUESTIONS`, re-invoke with the answers, count the iteration.
4. On `STATUS: blocked` or cap hit without converging → **do not auto-accept**. Present the failing scenarios / open items and ask the user to **accept as-is**, **keep grilling** (reset the count), or **change direction**.

## Route observations

The operator bubbles typed `OBSERVATIONS` (`architect` | `strategist`) but never acts on them. Surface them. A granularity/split observation becomes a **new spec** (or a `split-spec` operation) — never a marker in this spec. Decline = drop it.

## Report

- Spec revised; what changed in `spec.md` and the `.feature`
- `ALIGNED: true | false` (contract layer); if false, list what is out of sync
- Open markers remaining (should be zero)
- Whether a split was recommended, and its disposition
- Next step: run `validate-spec` to take Draft → Approved

## Commit

Only commit when `ALIGNED` is `true` and no markers remain. Stage the spec's own artifacts:

```
refactor(specs): revise <domain> spec
```
