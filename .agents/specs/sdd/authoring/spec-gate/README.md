---
spec-type: behavioral
concept: [lifecycle, spec-authoring]
---

# spec-gate — the spec gate

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
| **apply the verb + freeze** — a verdict is recorded | the verdict (approve / change / reject) + the touched `.feature` files | **approve** → land + freeze each touched file (per-file `@frozen`) + record the per-CR `gate` ledger line; **change** → nothing freezes; **reject** → drop the delta; additive folds into a frozen file (self-clears); a pure move/rename preserves the freeze (not gate-able); narrowing unfreezes its file + fires **Clearance**; `spec.md` kept in sync, never frozen |
| **emit the digest** — a ratifier needs to see what they are approving | the CR's touched files | a read-only fixed-section summary of the touched files — writes nothing, renders no verdict |
| **run structural provenance / alignment / spec-type / feature-form / referenced-artifact checks** — before any verdict, before the judge is spawned | the touched files' `produced-by` entries + role resolution (`../../design/provenance-model.md`) + each node's `spec-type` classification (`../../design/spec-structure.md`) + the touched `.feature` files' form (`../suite-format/README.md`) + every backtick-wrapped artifact path the touched `spec.md`/`README.md` names | malformed `produced-by` / off-enum `correction` / unresolvable required role → **fail closed**; a `reference` node carrying a `.feature`, a `reference` node missing `## Subject`, or a `behavioral` node missing `## Use Cases` → **fail closed** (a `descriptive` node raises none); uninstalled-but-valid recorded producer → **flag** only; a touched `.feature` whose form is invalid (a non-boolean step, a missing `Feature`/`Then`) → **fail closed** before the cold judge runs, the form check **scoped to the touched files**; a referenced skill/engine/artifact path that resolves to nothing → **fail closed**, scoped to the touched files, a template placeholder or glob exempt |

Every scenario in [`spec-gate.feature`](./spec-gate.feature) maps to one of these four
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
`@frozen` tag; untouched files keep their state. What may be done to a frozen file depends on the
**edit class**, not on the freeze itself (`../../design/lifecycle-model.md` — the unfreeze trigger is
risk, not phase): an *additive* scenario folds in without unfreezing (**self-clears**, stays
`@frozen`, no re-open); a *pure move/rename* (`git mv`, zero content delta) likewise **preserves the
freeze and is not a gate-able edit**; only a *narrowing/rewriting* edit unfreezes its file, fires
**Clearance**, and needs a ratified re-open.
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

## The feature-form pre-filter

Alongside the structural checks, and **before the cold judge is spawned**, the gate runs the
deterministic `.feature`-form check over the CR's **touched** `.feature` files — the executable
form of `../suite-format/README.md` (Gherkin validity, every `Then` a boolean assertion, no hedge
adverbs or leaked rubric lingo, scenario sectioning). It **fails closed**: an invalid form advances
no status and the judge is not spawned, so a well-formed suite is the only thing the qualitative
judge ever sees, and a mechanical bar never rides on the judge catching a hedge word. The check is
**scoped to the touched files**, not the whole tree (the tree-wide sweep stays a CI backstop). The
gate stays verdict-only — it fixes nothing, it reports the form violation for the producer to fix.

## The referenced-artifact-exists pre-filter

Alongside the feature-form check, and also **before the cold judge is spawned**, the gate runs a
deterministic scan for **broken artifact references** in the CR's **touched** `spec.md`/`README.md`
files: every backtick-wrapped path shaped like a relative (`./`, `../`) or repo-root-relative
(`.agents/`, `plugins/`, `packages/`, `apps/`, `docs/`, `.claude/`) reference must resolve to a real
file or directory; a template placeholder (`<project>`) or glob (`*.plan.md`) is exempt. It **fails
closed**: a broken reference advances no status and the judge is not spawned. **Deliberately scoped
to `--files`, never the tree-wide `--root` sweep** — the accumulated corpus legitimately names
example/convention paths (an opt-in config not yet created, a hypothetical nested project) a blind
tree-wide scan cannot distinguish from a real broken reference, so this check only ever gates a
CR's own new/touched prose.
