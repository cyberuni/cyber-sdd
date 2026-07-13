---
name: solution-producer-governance
description: "Partial Skill: invoke by name only — the SDD default solution-producer procedure. Loaded in-session by the conductor when it runs the solution-producer role inline, not user-triggered."
user-invocable: false
---

# Solution-Producer Governance — the default solution-recording procedure

The procedure the **conductor** follows when it runs the **solution-producer** role from the SDD default — no plugin covers the domain and no model-tuned producer agent is named for the slot, so the conductor **loads this governance and authors inline** in its own warm context (recorded `produced-by.solution-producer: sdd:automaton`). This is the relocation of the former `plan-producer` role's *functional-spec* half: the solution is the chosen approach + rejected alternatives, now recorded **per unit** as `<unit>.solution.md` rather than as a `plan.md`. The task DAG that `plan-producer` also wrote is **not** this role's output — it is the conductor's transient execution `.plan.md` `todos`.

The solution is the unit's **third facet** (spec = *what*, suite = *proof*, solution = *why this shape*). It is **optional** and **ungated**: it gets no judge of its own, stays out of the spec-judge's view, and is never frozen. The implementation's frozen-scenario result validates it transitively.

Load alongside this governance: the resolved **architect** actor bar (structural fit — no duplication or conflict with existing code/conventions) to self-align before writing, and `sdd:ownership-governance` for the write-ownership matrix — the solution-producer must **not** modify `spec.md`, the `.feature`, or any control frontmatter; a behavior gap discovered while recording the solution is a `CONTENT_GAP` / `OBSERVATIONS`, never an in-place edit.

## Inputs (folded in by the conductor)

```
DOMAIN, DOMAIN_PATH, SPEC_PATH, FEATURE_PATH, SOLUTION_PATH
MODE: explore | implement
EXISTING_SOLUTION: <the current <unit>.solution.md, on a revise — or null>
```

## Procedure

1. **Decide whether a solution is warranted at all.** Read `spec.md` and the `.feature`. Write a solution **only** when the unit has a **real design fork** — a non-obvious approach chosen over plausible alternatives that a later reader could not reconstruct from the spec alone. If the unit's shape follows directly from its spec, **write no file** and return `STATUS: complete` with `SOLUTION_WRITTEN: none`. A solution that would only paraphrase the spec's *what* or the suite's *proof* is noise — do not write it.

2. **Record the solution at the design boundary, not per scenario.** Write `<SOLUTION_PATH>` (`<unit>.solution.md`, beside the unit's `README.md` + `.feature`) capturing: the **chosen approach**, the **rejected alternatives with why each lost**, and the trade-offs that decided it. Map to the **decision**, not one entry per scenario — the suite already covers scenarios. Apply the **architect** bar (does this shape fit existing code/conventions without duplication or conflict?).

3. **Never restate the contract.** Do not paraphrase `spec.md` or the `.feature`. The solution adds *why this shape*; it carries no *what* the spec already states and no *proof* the suite already encodes.

4. **On a revise, tighten in place.** When `EXISTING_SOLUTION` is non-null, sharpen the existing record rather than rewriting from scratch; if the design fork it documented no longer exists, remove the file (the optional facet returns to absent).

5. **Never modify `spec.md` or the `.feature`** — four-eyes (the producer does not set its own bar). The solution is co-delivered with the other producers' artifacts, not in a separate gated phase.

## Output (the conductor collects)

```
STATUS:          complete | needs-input | blocked
SOLUTION_WRITTEN: written | tightened | removed | none
NOTES:           <the fork recorded, or why none was warranted>
QUESTIONS:       [ batched, when needs-input ]
CONTENT_GAPS:    [ { artifact, location, gap } ]
OBSERVATIONS:    [ { owner: architect | strategist, note, evidence } ]
```
