---
name: spec-gate
description: "Internal skill: the SDD spec gate (Draft → Approved) — the verdict on a CR's spec + suite diff, freezing each touched .feature on approve. Run by the conductor (start-mission) inside the mission loop; not triggered by users directly."
user-invocable: false
---

# spec-gate

Run the SDD **spec gate**: the verdict on a CR's spec + suite **diff** before it becomes the
contract. This is an **internal step the conductor runs inside the mission loop** (loaded by
`start-mission` at the end of explore), **not** a user-invocable skill. It **spawns a distinct
cold spec-judge**, derives the **leash**, takes the verdict (the in-session conductor holds the user
channel, so it is the positional ratifier), and on approval **freezes** each touched `.feature` file
and records a durable per-CR `gate` line. The impl gate (Approved → Implemented) is **not** here — it
is the mission's. This skill never collapses producing and judging into one voice.

Load `sdd:lifecycle-governance` (status enum, transitions, the freeze state-transition),
`sdd:ownership-governance` (who may write `status` / `approval`),
`sdd:gate-validation-governance` (legal-state tuples, per-node spec-type checks, derived sync —
no stored flag, `approval` attribution). The `produced-by` and sharded-ledger shapes the gate checks are in
`sdd:combat-log-governance`; the freeze model in `sdd:lifecycle-governance`; the
self-clear-vs-escalate bar and the four-C floor are the conductor's autonomy bar (`start-mission`).

## 1. Structural checks (deterministic, run first)

Run before any verdict work; structural validity **fails closed**, availability only **flags**:

```bash
node "<skill>/scripts/check-spec-state.mts" [--root <specs-dir>]
```

Exit `0` = legal; exit `1` prints each violation as `✗ <slug>: <reason>` — fix before continuing.
It checks the root lifecycle tuple **and** the per-node `spec-type` reconcile: a `reference` node
carrying a `.feature` or missing its `## Subject`, and a `behavioral` node missing `## Use Cases`,
**fail closed**; a descriptive node (no marker) raises no violation. If `node` is unavailable,
perform the same checks by reading each README's frontmatter yourself.

The sibling `scripts/check-suite.mts` is the **`.feature`-form** authority — Gherkin validity,
boolean-`Then` form (hedge-word + leaked-rubric detection), and scenario ordering/sectioning. When
the CR touches any `.feature`, run it here **fail-closed, before spawning the cold judge**, scoped to
the CR's touched files:

```bash
node "<skill>/scripts/check-suite.mts" --files <the CR's touched .feature files>
```

Exit `0` = form clean; exit `1` prints each `✗ <file>: <reason>` — **advance nothing and do not
spawn the judge; report the violations for the producer to fix.** Scoping to `--files` keeps the gate
on the CR's delta; the tree-wide `--root` sweep stays the `verify:specs-new` CI backstop. The cold
spec-judge grades form qualitatively; this engine catches it mechanically, so the judge only ever
sees a well-formed suite.

The same `check-spec-state.mts` also carries **referenced-artifact-exists** — a backtick-wrapped
path any touched **prose `.md` under the spec tree** names (not just `spec.md`/`README.md` — a
`design/*.md` or nested node doc too; a relative `./`/`../` reference or a repo-root-relative one
under `.agents/`, `plugins/`, `packages/`, `apps/`, `docs/`, `.claude/`) must resolve to a real
file or dir; a template placeholder (`<project>`) or glob (`*.plan.md`) is exempt. **Diff-scoped +
surface-for-judgment, not fail-closed:** the check gates only paths the CR **introduces** against
the file's committed baseline (`--base <baseref>`, absent ⇒ every ref counts as introduced) — a
pre-existing reference a touched file already carried is never gated. An unresolved *introduced*
ref is printed as a `⚠` finding for the cold judge to weigh, but never blocks the gate on its own;
the judge still runs. Referenced ≠ must-exist. Never the `--root` sweep, since the existing
corpus's accumulated prose legitimately names example/convention paths a blind tree-wide scan
cannot distinguish from a real broken reference. Pass every touched `.md` path (the engine filters
internally to prose `.md` files that lie under the spec tree — `.agents/spec/`, `.agents/specs/`,
or a nested `<project-path>/.agents/spec/` — so a touched `.md` outside the spec tree is never
swept):

```bash
node "<skill>/scripts/check-spec-state.mts" --files <the CR's touched .md files> [--base <baseref>]
```

Exit `0` prints each `⚠ <file>: introduces unresolved reference ...` finding (if any) plus the
summary line — **surface the findings for the judge's read, never a hard block by themselves.**
An unreadable touched file still **fails closed** (`✗ <file>: cannot read file`, exit `1`) — that
is a real error, not a can-exist judgment call.

Also carried in the same `--files` pass: the **use-case-coverage** pre-filter. For each touched
file whose `## Use Cases` section is written as a **table** with a `Scenario` column, every row's
backtick-wrapped `Scenario:` title (or shared `@tag`) must resolve to a real `Scenario:` in the
sibling `.feature` (same directory). Unresolved → **fail closed**, judge not spawned. Non-mandating:
no `## Use Cases` section, or a table with no `Scenario` column, or prose/EARS use cases, raise no
violation and stay the spec-judge's coverage backstop. Exit `1` prints each `✗ <file>: Use Cases
table names scenario ... that does not resolve in the sibling .feature`.

**Provenance structural checks** (`sdd:combat-log-governance`). Read the touched files'
`produced-by` frontmatter and the root's `ledger/` shards (globbed; a legacy `ledger.jsonl` still counts):

- **Malformed `produced-by` entry** — a value that is not a well-formed plugin-qualified name
  (`<plugin>:<agent>`) → **flag and fail closed**.
- **Uninstalled-but-valid recorded producer** — an entry whose plugin is not installed is valid
  history → **flag only** (annotate `[unavailable]`), do not block.
- **No resolvable producer** — a required production role that resolves to neither a plugin agent
  nor an SDD default → **fail closed**.

The gate stays verdict-only — it writes **no** setup frontmatter to resolve any of these.

## 2. Identify the CR's diff footprint

The gate decides a **CR**, not a single folder: resolve the set of files this CR **touched**
(the spec READMEs + `.feature` files in its delta). The digest and freeze both operate over this
footprint, never the whole tree and never one fleet-era folder.

## 3. Judge and derive the leash

Resolve the **spec-judge** for each `artifact-types` (a plugin judge or the SDD default
`sdd-spec-judge`) and **spawn it cold** over the touched node(s) — pass it `spec.md` + the
`.feature` only (the solution stays out of its view). It grades against the spec-gate lens set
**{oracle, builder, architect}**. Then take the judge's **contract-sync verdict** (derived at this
gate, never stored) and **derive the leash** (the conductor's autonomy bar,
baked into `start-mission`) in-session. Collect the judge's `STATUS`,
`ALIGNED`, failing scenarios, remaining `<!-- open: -->` markers, `OBSERVATIONS`, and the gate
report. The judge is a **distinct cold actor** and never edits the artifact it grades.

**Never advance** — by self-assertion or human verdict — with judge failures, any remaining open
markers, or a misaligned suite. They fail the confidence dimension, so they forbid self-assertion
too; report the blockers for the user to fix (surface `OBSERVATIONS`; on accept they become a new
node, never a marker grown into this spec).

## 4. Take the verdict — self-assert within leash, else the human

- **In leash** (every dimension reads safe): the conductor **self-asserts** — writes
  `approval.spec: { verdict: approve, by: agent, why }`. The diff lands
  **provisionally** into the asynchronous review queue. Still emit the digest + gate report,
  flagged **"agent-asserted — ratify or kick back."**
- **Gated** (the leash stops, or the hard floor fires): present the **digest** above the gate
  report so the human sees what they are deciding, then take the human verdict
  (`approve` / `change` / `reject`).

**Hard-floor escalations at this gate** (the conductor's autonomy bar): **Clearance** — a
narrowing (weakening or deleting an e2e scenario), escalated unless the CR pre-authorized it; and
**Compatibility** — the change's semver class exceeds the authorized change-class ceiling.
**Conflict resolution** cases (a contradiction inside the suite) are surfaced here but formally
fire at the impl gate; **Consent** never fires at authoring. Everything additive / internal / minor
self-clears.

## 5. Apply the verb + freeze

| Verb | Action |
|---|---|
| **approve** | land the diff; **freeze** each touched `.feature` (set its own `@frozen` tag); append a per-CR `gate` line to the mission's **own shard** in the root `ledger/` directory (`verdict: approve`, `frozen[]`, keyed by `cr`, no `ts`); write `status: approved` |
| **change** | revise the diff; **nothing freezes**; stays `draft` |
| **reject** | scope-kill — drop the delta; nothing freezes |

**Freeze is per `.feature` file.** Each touched file hard-freezes via its `@frozen` tag; untouched
files keep their state. An **additive** scenario folds into a frozen file without unfreezing it
(self-clears) — the `addOnly` result of the mechanical diff above (`gherkin-cli diff`) confirms a
change is purely additive with no judge round; a **narrowing/rewriting** edit (a `modified`/`removed`
scenario) unfreezes its file and fires **Clearance** once the narrowing is confirmed semantically. `spec.md`
/ the node READMEs are **kept aligned, never frozen** — editable, but may not contradict a frozen
scenario (enforced by the alignment check and the judge, not a flat freeze). Vocabulary is
**freeze/unfreeze**; "lock" is the concurrency layer.

**Attribution.** A **human verdict** writes `approval.spec: { verdict: approve, by: <name> }` (no
`why`) — only the in-session position may write this. A **self-assertion** already wrote
`by: agent, why`; this skill only writes the matching `status`. **Ratifying** a queued
self-assertion rewrites `by: agent` → `by: <name>` and drops it from the queue. Re-run the state
check after any write to confirm the tuple is legal.

## The gate digest (folded in-session)

Assemble the **digest** inline (no spawned skill) — a read-only, decision-free summary so a
ratifier sees *what* they are approving. It covers **only the CR's touched files**, aggregated;
a touched area with **no** `.feature` reports **zero scenarios, not an error**. It **writes
nothing, advances no status, renders no verdict**. Fixed sections:

| Section | Source |
|---|---|
| **CR** | the `cr` id + its what/why |
| **What** | the `## What` line of each touched capability's README |
| **Status** | the spec's `status` |
| **Scenarios** | the **added / modified / removed** `Scenario:` names across the touched `.feature` files, from a **mechanical diff** against the committed baseline — `npx gherkin-cli@0.0.1 diff --base <baseref> <file> --format json` (its `addOnly` confirms a purely additive change; a `modified`/`removed` scenario is flagged for **semantic** narrowing review — narrowing-vs-widening within a modified scenario stays a judgment). A **brand-new** suite with no committed baseline is listed with `npx gherkin-cli@0.0.1 parse <file>` (compact names / tags / counts) rather than re-tokenizing the raw file by hand |
| **Key decisions** | the `### ` headings under `## Design decisions` in the touched prose |
| **Open items** | every `<!-- open: ... -->` marker in the touched files |

## Report

- PASS / FAIL per lens, relayed from the judge
- `ALIGNED: true | false`; if false, which artifacts are out of sync
- Open markers / failing scenarios still blocking, if any
- The leash derivation and the effective leash for this gate
- On success: the new `status`, the approver (`agent` = provisional, in the review queue; `<name>` =
  ratified), and which `.feature` files were frozen

Do not fix issues automatically — report them for the user to address or confirm intent.
