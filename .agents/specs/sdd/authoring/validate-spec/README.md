---
spec-type: behavioral
---

# validate-spec — the spec gate

The **spec gate**: the verdict on the spec + suite **diff** before it becomes the contract. It
runs the distinct judge actor, derives the **leash** (the verdict assessment in
`../../design/autonomy-rubric.md`), takes the verdict, and on approval **freezes** each touched
`.feature` file. The gate behavior lives here; the judge stays a separate actor whose verdict
the gate consumes — the gate never collapses producing and judging into one voice.

## Use Cases

**Subject** — the spec gate over one CR's spec + suite diff.
**Non-goals** — it does not author or tighten the diff (that is `../spec-producer/`); it judges,
it does not produce.

| Trigger | Inputs | Outcome |
|---|---|---|
| **render the verdict** — a spec + suite diff reaches the gate | the diff, the spec-judge result, the leash assessment | in-leash → self-assert into the async review queue; leash-stop or hard floor → digest shown first, human verdict taken; judge failure / open marker / misaligned suite → advance nothing, report the blocker |
| **apply the verb + freeze** — a verdict is recorded | the verdict (approve / change / reject) + the touched `.feature` files | **approve** → land + freeze each touched file (per-file `@frozen`) + record the per-CR `gate` ledger line; **change** → nothing freezes; **reject** → drop the delta; additive folds into a frozen file (self-clears); narrowing unfreezes its file + fires **Clearance**; `spec.md` kept in sync, never frozen |
| **emit the digest** — a ratifier needs to see what they are approving | the CR's touched files | a read-only fixed-section summary of the touched files — writes nothing, renders no verdict |
| **run structural provenance / alignment / spec-type checks** — before any verdict | the touched files' `produced-by` entries + role resolution (`../../design/provenance-model.md`) + each node's `spec-type` classification (`../../design/spec-structure.md`) | malformed `produced-by` / off-enum `correction` / unresolvable required role → **fail closed**; a `reference` node carrying a `.feature`, a `reference` node missing `## Subject`, or a `behavioral` node missing `## Use Cases` → **fail closed** (a `descriptive` node raises none); uninstalled-but-valid recorded producer → **flag** only |

Every scenario in [`validate-spec.feature`](./validate-spec.feature) maps to one of these four
use cases. Gate *rules* live in `../../design/` — legal-state transitions and the freeze model
in `lifecycle-model.md`, the self-clear-vs-escalate bar and the four-C hard floor in
`autonomy-rubric.md`, the provenance shape in `provenance-model.md`. This unit is the *behavior*
that enacts them — reference the rules, do not restate them.

## The verdict and the leash

The gate decides on the spec + suite **diff** the grilling produced, runs the distinct judge
actor, derives the leash, and takes the verdict accordingly:

- **In leash** (every dimension reads safe): self-assert — the diff lands **provisionally** into
  the asynchronous review queue. Still emit the spec digest plus gate report, flagged
  *"agent-asserted — ratify or kick back."*
- **Gated** (the leash stops, or the hard floor fires): present the digest above the gate report
  so the human sees what they are deciding, then take the human verdict.

**Hard floor escalations** (`../../design/autonomy-rubric.md`), the four-C floor. At **this**
spec gate the mandatory stops are **Clearance** — a **narrowing** (weakening or deleting an e2e
scenario), escalated unless the CR pre-authorized it — and **Compatibility** — the change's
**semver class** (patch / minor / major) exceeds the authorized change-class ceiling,
pre-authorizable via the CR / run-mode. Grilling here also surfaces **Conflict resolution**
cases — a logical contradiction inside the suite (Scenario A says yes, Scenario B says no), which
the human disambiguates — and is where they are **reduced**, though that floor formally fires at
the impl gate. **Consent**, the forge-only floor, never fires at authoring. Everything additive /
internal / minor self-clears.

**Never advance** — by self-assertion or human verdict — with judge failures, any remaining open
markers, or a misaligned suite. Those fail the confidence dimension, so they forbid
self-assertion too; report the blockers for the user to fix.

## The three verbs and freeze

The three gate verbs at the spec gate (it judges the *contract*, so each verb edits the
contract): **approve** → land the diff and freeze each touched `.feature` file (set its
`@frozen` tag); **change** → revise the diff, nothing freezes yet; **reject** → scope-kill, drop
the delta.

**Freeze on approval is per file.** Each touched `.feature` is **hard-frozen** via its own
`@frozen` tag — no scenario edits to a frozen file without a ratified re-open; untouched files
keep their state. An *additive* scenario folds into a frozen file without unfreezing it
(self-clears); a *narrowing/rewriting* edit unfreezes its file and fires **Clearance**.
`spec.md` is **kept in sync, never frozen** — editable, but it may not contradict a frozen
scenario; that invariant is enforced by the coverage judge, not by a flat freeze
of the prose. Vocabulary is **freeze/unfreeze**; "lock" is reserved for the concurrency layer.
Freeze rules: `../../design/lifecycle-model.md`.

## The gate digest

The **digest** is the read-only, decision-free summary the gate emits so a ratifier sees *what*
they are approving without opening every artifact. Re-homed from the old standalone
`spec-digest` skill, it changes on two axes for the project-spec model:

- **Unit = the CR's delta footprint, not one spec folder.** A project spec is one multi-folder
  tree and the gate decides a **CR**, so the digest summarizes the **files this CR touched**,
  aggregated — never a single fleet-era folder, and never the whole tree (the root `spec.md`
  capability map is the whole-project index).
- **Folded in-session, not a spawned skill.** The conductor assembles the digest inline while
  running the gate station; it is no longer a separately-dispatched utility (the gateway never
  calls it, and a read-only summary needs no isolated actor). What survives is the
  **fixed-section contract**, so the gate report reads the same across domains.

Fixed sections, aggregated across the touched files:

| Section | Source |
|---|---|
| **CR** | the `cr` id + its what/why (from the source — `../../intake/README.md`) |
| **What** | the `## What` line of each touched capability's `spec.md` |
| **Status** | the spec's `status` |
| **Scenarios** | added / modified / **narrowed** `Scenario:` names across the touched `.feature` files; a narrowing is flagged (it fires **Clearance**) |
| **Key decisions** | the `### ` headings under `## Design decisions` in the touched prose |
| **Open items** | every `<!-- open: ... -->` marker in the touched files |

A touched area with no `.feature` is reported as **zero scenarios, not an error**. The digest
**writes nothing, advances no status, renders no verdict** — gate legality, the risk verdict,
and the `frozen[]` set are the gate station's and the rubric's outputs, presented *alongside* the
digest, never produced by it.

## Provenance and alignment

Before any verdict the gate applies the structural provenance checks
(`../../design/provenance-model.md`): a malformed `produced-by` entry and an off-enum
`correction` cause **fail closed**; an uninstalled-but-valid recorded producer only **flags**. A
required role with no resolvable producer also fails closed. The gate stays verdict-only — it
writes no setup frontmatter to resolve any of these.
