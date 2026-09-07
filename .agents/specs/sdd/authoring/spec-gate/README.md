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
| **render the verdict** — a spec + suite diff reaches the gate | the diff, the spec-judge result, the leash assessment | in-leash → self-assert into the async review queue; leash-stop or hard floor → digest shown first, human verdict taken; judge failure / open marker / misaligned suite / a `governance-preflight-missing` **or** `governance-preflight-uncorroborated` finding (`## The governance pre-flight check`) → advance nothing, report the blocker; a **spec-format conformance warning** (`## The spec-format conformance warning`) → **surfaced in the report, never a block on its own** |
| **apply the verb + freeze** — a verdict is recorded | the verdict (approve / change / reject) + the touched `.feature` files | **approve** → land + freeze each touched file (per-file `@frozen`) + record the per-CR `gate` ledger line; **change** → nothing freezes; **reject** → drop the delta; additive folds into a frozen file (self-clears); a pure move/rename preserves the freeze (not gate-able); narrowing unfreezes its file + fires **Clearance**; `spec.md` kept in sync, never frozen |
| **emit the digest** — a ratifier needs to see what they are approving | the CR's touched files | a read-only fixed-section summary of the touched files — writes nothing, renders no verdict |
| **run structural provenance / alignment / spec-type / suite-form / referenced-artifact checks** — before any verdict, before the judge is spawned | the touched files' `produced-by` entries + role resolution (`../../design/provenance-model.md`) + each node's `spec-type` classification (`../../design/spec-structure.md`) + the touched `.feature` files' form (`../suite-format/README.md`) + every backtick-wrapped artifact path the touched `spec.md`/`README.md` names | malformed `produced-by` / **unflagged** off-enum `correction` (a `cause-candidate: true`-flagged one is legal) / unresolvable required role → **fail closed**; a `reference` node carrying a `.feature`, a `reference` node missing `## Subject`, or a `behavioral` node missing `## Use Cases` → **fail closed** (a `descriptive` node raises none); uninstalled-but-valid recorded producer → **flag** only; a touched `.feature` whose form is invalid (a non-boolean step, a missing `Feature`/`Then`) → **fail closed** before the cold judge runs, the form check **scoped to the touched files**; a touched `.feature` the **pinned Gherkin parser cannot parse** → **fail closed** before the cold judge runs, reporting the parse failure and its line *in place of* that file's form findings (a partial read is not evidence) — and this one fails the tree-wide `--root` sweep closed too; a touched **frozen** `.feature` whose **edit class cannot be classified** (the differ reports a parse error, returns no result for the file, or produces no readable result) → **`unclassifiable`** → **escalate to Clearance**, never `no-content-change` and never `additive`; a **CR-introduced** backtick artifact path that resolves to nothing → **surfaced as a judgment finding**, not a hard fail-closed (a pre-existing ref unchanged by the CR is never gated; adjudication follows the floor — obvious stale → served fix, plausibly-intended-optional → accept/escalate), scoped to the touched files (the sweep covering every touched prose `.md` under the spec tree, not just `spec.md`/`README.md`), a template placeholder or glob exempt; a touched behavioral `spec.md` whose `## Use Cases` table row names a scenario that does not resolve in the sibling `.feature` → **fail closed** (a reference/descriptive spec.md or a prose/EARS use case with no row raises none); a `## Use Cases` data row whose `Scenario` cell is non-empty but carries no backtick reference → **fail closed**, the unparseable row reported never skipped; a touched `.feature`'s sibling `## Scenario map` binding checked — every scenario one map row, every row a real scenario, each `(edge, path class)` pair unique — with a data row whose `Scenario` cell is not backtick-wrapped **reported as an unparseable row, never skipped** (a spec carrying no `## Scenario map` section raises none) |

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

**A `change` verdict's findings are evidence, not a work order.** Remediating them one cited line at
a time fixes instances and leaves the defect — and can introduce new defects the next round then
reports. The producer therefore: **substantiates** each finding before acting (an unsubstantiated one
is contested with evidence, not edited away); states the **rule** each finding instantiates and
**sweeps** for its other instances, reporting the ruled-out candidates as well as the hits;
**re-derives** each correction against the rule *governing the artifact*, since a correction that
clears the finding while contradicting that rule is worse than the defect it replaced; and accounts
for findings by **provenance** each round. All findings pre-existing ⇒ the loop is **converging**.
Any finding introduced by the previous round's remediation ⇒ the loop is **diverging**, which halts
iteration for a re-plan rather than another remediation round. Frozen in
[`../../workflows/gate-verdicts.feature`](../../workflows/gate-verdicts.feature) (theme E).

**A Clearance-gated repair of an already-frozen scenario carries a stricter re-approval bar.** When a
narrowing/rewrite re-opens a frozen scenario under a ratified Clearance re-open and the producer
repairs it, the repair is re-approved only if it **fails against the pre-repair artifact** — not
merely that it passes the post-repair one. A repair that **already passes** the pre-repair draft is a
suspected **back-fit** (reverse-engineered to fit what exists rather than a genuine contract
correction) and is rejected; the pre-repair failure is the evidence that the contract's substance
changed. Frozen in `../../workflows/gate-verdicts.feature` (theme E, the Clearance-repair scenarios).

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
(`../../design/provenance-model.md`): a malformed `produced-by` entry and an **unflagged** off-enum
`correction` cause **fail closed** (a `cause-candidate: true`-flagged off-enum cause is legal); an uninstalled-but-valid recorded producer only **flags**. A
required role with no resolvable producer also fails closed. The gate stays verdict-only — it
writes no setup frontmatter to resolve any of these.

## The governance pre-flight check

The spec-judge cannot see whether the spec-producer ran its pre-flight (loaded its required
governances before writing) — a producer that skipped pre-flight and one that ran it correctly both
show up, absent this check, as an indistinguishable output gap. So the check runs as the spec-judge's
**own first act**, before the three lenses do any content judgment:

- The judge **derives its own expected governance set** from what it itself loaded to judge this
  diff — never from the producer's declaration, which is untrusted input, not the standard.
- It reads **`producer_governances_declared`** from the dispatch channel (the conductor's relay of
  the producer's `governances_loaded`, `../../mission/conductor/README.md`) and checks
  `expected ⊆ declared`.
- **On a miss**, it emits a **`change`** verdict carrying **finding-kind `governance-preflight-missing`**,
  listing each expected governance absent from the declared set, and renders **no content-analysis
  findings** — the check halts before the oracle/builder/architect lenses run, so a preflight gap is
  never conflated with a content defect. The gate never advances on this verdict, same as any other
  judge failure.
- A declared set that is a **superset** of the expected set (extra governances beyond what the judge
  itself needed) raises no finding — declaring more than required is not a violation.

This surfaced from a multi-round backfill where round 1 was entirely structural because the producer
started writing without loading `sdd:spec-format-governance` and `sdd:suite-format-governance` first
— a preflight check would have caught **that honest omission** before the judge ever reasoned about
content.

**What it catches, and what it does not — the declaration is self-reported, not attested.**
`producer_governances_declared` is a value the producer *asserts*; nothing here observes the actual
load. So the check is a **forcing-function against honest omission** (the motivating case — a producer
that loaded a subset and truthfully declares it), **not** an attestation. It does **not** catch a
producer that skips the load and declares the full set anyway — and because the expected set is
**derivable from the artifact-type**, that full set is guessable, so the check has little adversarial
strength. It also does **not** catch a producer that loaded every governance and *applied* one badly;
that is a content defect the three lenses still own. Mechanical *verification* of the declaration is
not portable — no agent harness exposes a stable, cross-harness "governance X was loaded" signal (skill
loading is silent context injection on most, and the one harness that models it as an observable tool
call does not observe a **spawned** producer's calls). A portable attested version would capture the
load at a **repo-owned loader seam** rather than from harness telemetry — tracked as a follow-up, not
built here.

**The corroboration stage answers the adversarial half.** Everything above reads a **claim**, so every
check of that shape is defeated by the same move: declare the derivable set, skip the load. The second
stage below therefore reads the **artifact** instead — properties a producer that never opened a bar
does not produce. It is still not an attestation and does not pretend to be one; what it changes is
that the cheapest route to a clean pre-flight stops being "guess the list".

### Stage 1 — the declaration check

The `expected ⊆ declared` subset check stated above. It runs first and short-circuits: a missing
declaration is reported as `governance-preflight-missing` and stage 2 does not run, so one gap is
never reported under two finding-kinds.

### Stage 2 — corroboration: check the artifact, not the claim

When `expected ⊆ declared` passes, the judge runs a second stage over the **tells**, checking each
against what this CR produced.

Three of the four tells belong to a **governance bar**; the fourth belongs to the **backfill
workflow node**, which is not a bar and needs no registry entry — it fires on the relayed mode, so
nothing has to resolve it. That asymmetry is deliberate and is the point of the next paragraph.

**A tell is never gated on the producer's own declaration.** Gating stage 2 on "each *declared* bar
that carries a tell" would make the check opt-in by the party it polices: a producer that skipped a
bar omits it from the declaration and is never corroborated for it — cheaper than either reading or
faking. So each tell states its own trigger, and every trigger is a fact the judge or the conductor
holds rather than one the producer asserts.

A **tell** is a property of the produced artifact that is (a) checkable from the artifact alone,
(b) required by exactly one bar, and (c) **silently wrong by default** — a producer that never opened
the bar emits something that *reads as complete*. Property (c) is what makes a tell correlate with
behavior rather than with care: a tell whose miss is an obvious blank is already caught by every
reader, and buys nothing here.

| Bar | Tell | The wrong-by-default shape it catches |
|---|---|---|
| `sdd:spec-format-governance` | every use case states its **extensions** — rows, or the explicit `extensions: none — <why>` claim | the field is simply absent, and nothing else looks for it |
| `sdd:spec-format-governance` | a **surface trace** table names, per element, the elements it **may not be combined with** | a two-column `Element / Needed by` trace, which reads complete |
| `sdd:suite-format-governance` | every **guard / negative** edge on the scenario map carries a **positive companion** on the same path class | a lone negative, which reads as coverage and lints clean |
| [`../backfill/README.md`](../backfill/README.md), fired by `producer_mode: backfill` | each step record entry **corresponds to the artifact it claims to have produced** — step 2's actors to `## Use Cases`, step 4's decisions to the drawn `## Control Flow`, step 5's rows to the `## Scenario map` | a record with the right number of entries whose content matches nothing, which reads as a completed procedure |

**The unit of applicability is what the CR *added*.** A tell is evaluated against the elements this
producer **authored** — a use case it added, a table it added, map rows it added — never against an
element that already existed in a file it happened to touch.

Two weaker units were tried and both fail, so the reasoning is recorded rather than the conclusion
alone. **Per file** is the obvious one and it inverts the stage: the corpus carries **37 of 42
behavioral nodes whose use cases state no extensions field**, so a file-granular tell hard-blocks the
first CR to touch any of them, for debt that CR did not create. **Per touched element** — "added or
changed" — looks like the fix and is not, because *changed* has no definition for a table row: a
one-clause edit to a single cell, or a pure reflow, pulls in that row's whole obligation. It moves
the same failure from file scope to row scope instead of removing it. **Added** is the unit that
holds, because it is the unit the producer is genuinely accountable for: authoring a new use case
without stating its extensions is exactly what a producer who never opened the bar does, while
editing a cell in an old one reveals nothing about whether the bar was read.

Per tell, the applicable unit is:

- the **extensions** tell — each use case the CR **added** to a **behavioral** `spec.md`; an
  existing use case is not evaluated even when the CR edits it, and a `reference` or `descriptive`
  node is not evaluated at all;
- the **surface-trace** tell — a surface-trace **table** the CR added; a single-entry-point capability
  recording its trace in a line (which `../spec-format/README.md` allows) is not evaluated;
- the **guard-companion** tell — the `## Scenario map` rows the CR **added**, paired against the whole
  map (a companion the CR did not touch still counts as the pairing); a node with no map has no edges
  to pair;
- the **step-record** tell — the relayed record, applicable whenever the conductor relays
  `producer_mode: backfill` (below).

An inapplicable tell is **never evaluated and never reported**.

Reporting an inapplicable tell is the failure mode this stage must avoid. A corroboration stage that
fires on nodes it does not govern teaches its readers to route around it, which is the same defeat as
not having the stage at all.

**Scope, ordering, and the verdict.**

- **This CR's production only** — the hunk rule above, restated as scope: a pre-existing node that
  predates a tell raises nothing, and neither does an untouched use case inside a file the CR edited.
  The subject is always the producer of *this* diff.
- **Where the step record comes from, and what fires its tell.** The record is not a repo artifact —
  it is provenance about how a node was derived, deliberately never written into `spec.md` or the
  `.feature`. It reaches the judge as **`producer_backfill_steps`**, relayed through the dispatch
  channel. What *fires* the tell is the sibling **`producer_mode`** the conductor relays on the same
  channel (`../../mission/conductor/README.md`). The mode is the **conductor's** knowledge — it is the
  conductor that invokes the producer in `create`, `revise`, or `backfill` mode — so the producer
  cannot exempt itself by staying quiet. On `producer_mode: backfill` the tell fires, and a **missing
  or empty** `producer_backfill_steps` is then the miss, not an excuse. On `create` or `revise` the
  tell is inapplicable.
- **The tell is artifact-checked, which is what keeps it off the list-shaped pile.** It does not count
  entries; it checks each against the drawn graph, the map, and the use cases the same CR produced. A
  record with five well-formed entries whose content corresponds to nothing **fails**.
- **After the declaration check, and only when it passed.** A missing declaration short-circuits, so
  one gap is never reported under two finding-kinds.
- **On a miss**, the judge returns `PREFLIGHT: { result: fail, finding-kind:
  governance-preflight-uncorroborated, uncorroborated: [ { bar, tell, artifact } ] }` and halts before
  the three lenses, exactly as a missing declaration does. The gate advances nothing.

**A tell is a sample, not an attestation, and the sample is sparse.** It does not prove a bar was
read. Where a tell *is* applicable it makes not reading cost about what reading costs, and a producer
that learns the tell and satisfies it without reading has done the specific work the tell names — a
strictly narrower cheat than the one this stage closes.

But **a large and ordinary class of CRs has no applicable tell at all**, and the stage says so rather
than claiming otherwise. A CR that edits only prose, a graph, or a `.feature` adds no use case and no
table. The guard-companion tell reaches only nodes carrying a `## Scenario map`, and **35 of 42**
behavioral nodes in this corpus carry none. For such a CR stage 2 is a **no-op**, and stage 1's
declaration check is all that runs. That is a real limit on the mechanism, not a gap in its
description: the tell set is expected to grow, and the honest reading today is that corroboration
raises the floor where it applies and is silent everywhere else.

Further escapes are known and named rather than papered over:

- **A wholesale rewrite of an existing use case escapes the extensions tell**, because a rewrite is an
  edit and the unit is what was *added*. The justification for the `added` unit — that editing a cell
  in an old use case reveals nothing about whether the bar was read — holds for a cell and does not
  hold for a rewrite. The unit is kept anyway, because "rewrite" is exactly the undefined predicate
  that made "changed" unusable; a narrower unit that admits rewrites would reintroduce it.
- **A producer that writes no surface trace at all is exempt from the surface-trace tell**, because
  the tell's unit is a table the CR *added*. It therefore catches only a producer that knew to write
  a trace and got its columns wrong — one that opened the bar partway — and not one that never opened
  it. That inverts property (c) for this one tell, and it is asymmetric with the extensions tell,
  which fires precisely on absence. The asymmetry is deliberate: a use case is a required anchor the
  bar makes mandatory, while a surface trace has no anchor that makes its absence detectable without
  judging whether the capability exposes anything. Named so the asymmetry is a known cost rather than
  an assumed symmetry.
- **Tell coverage is two bars, not the whole expected set.** The tells reach
  `sdd:spec-format-governance` and `sdd:suite-format-governance`. A producer that reads those two and
  skips `lifecycle`, `ownership`, `gate-validation`, `combat-log`, `remediation`, `spec-structure`
  and the three actor bars passes stage 2 on **every** CR — not only on the no-applicable-tell class
  above. Stage 1 still requires it to *declare* them; nothing corroborates that declaration. This is
  the largest limit on the stage and the clearest direction for growing the tell set.
- **Nothing yet owns how the conductor decides `producer_mode`.** The step-record tell can no longer
  be escaped by the *producer*, which was the point, but a conductor that labels a shipped-behavior CR
  `revise` never fires it. The escape now requires a different party than the one being policed, which
  is a real improvement and not a closure. The mode-selection determinant wants a home
  (`../../mission/conductor/README.md` states the relay, not the decision).

**The duty is mirrored.** The **producer** runs the same tells as a self-check before returning
(`../spec-producer/README.md`), and the **judge** corroborates them here. The corpus record shows the
declaration check catching skipped bars at round 1 repeatedly, each costing a full cold judge round; a
producer-side self-check spends none.

## The spec-format conformance warning

The spec-judge already loads `sdd:spec-format-governance` — the bar for how a **behavioral**
`spec.md` is structured (`../spec-format/README.md`): the required sections `## What`, `## Use
Cases`, `## Control Flow` (the control-flow graph, **CFG**), and `## Scenario map`. Reading it
backward, the judge also **reports when those sections are missing** — a **conformance warning**,
distinct from the three lenses and from the deterministic structural checks:

- **What it checks.** For each touched **behavioral** `spec.md`, whether the required spec-format
  sections are present — **especially the three the corpus most often skips on a backfill: `## Use
  Cases`, `## Control Flow` (CFG), and `## Scenario map`**. A missing section is named in the
  warning; all present is a clean `pass`.
- **Behavioral only.** A `reference` node carries `## Subject` (not the four sections) and a
  `descriptive` index carries none, so **neither raises a conformance warning** — the check keys off
  the node's `spec-type`, never a blind scan for the headings.
- **A warning, never a block on its own.** It is **surfaced in the gate report** and does **not**
  fail the gate, set `ALIGNED: false`, or halt the advance by itself — matching how the gate treats
  every other judge-emitted structural finding (`CONTENT_GAPS`, an introduced-reference finding).
  The judge's conformance read covers **all four** behavioral sections uniformly; in the normal gate
  flow a missing `## Use Cases` is already caught by the **deterministic** `## Use Cases` fail-closed
  above (`check-spec-state`), which runs **first** and gates that case before the judge is ever
  spawned — so the warning's **load-bearing** contribution is the two sections that deterministic
  check does **not** enforce, the **CFG and the scenario map**, with `## Use Cases` named too when
  the judge does read a spec.md that lacks it.

The judge carries the result on a `CONFORMANCE: { result: pass | warn, missing: [ … ] }` field,
parallel to `PREFLIGHT` but **non-blocking**: a `warn` never short-circuits the lenses and never
forbids the advance the way a failed preflight does.

## The suite-form pre-filter

Alongside the structural checks, and **before the cold judge is spawned**, the gate runs the
deterministic `.feature`-form check over the CR's **touched** `.feature` files — the executable
form of `../suite-format/README.md` (Gherkin validity, every `Then` a boolean assertion, no hedge
adverbs or leaked rubric lingo, scenario sectioning). It **fails closed**: an invalid form advances
no status and the judge is not spawned, so a well-formed suite is the only thing the qualitative
judge ever sees, and a mechanical bar never rides on the judge catching a hedge word. The check is
**scoped to the touched files**, not the whole tree (the tree-wide sweep stays a CI backstop). The
gate stays verdict-only — it fixes nothing, it reports the form violation for the producer to fix.

**Gherkin validity is the pinned parser's verdict, not a lenient read.** A `.feature` the pinned
Gherkin parser (`../../design/gherkin-cli-dependency.md`) **rejects** is a **fail closed** — the check
reports the parse failure and the line it occurred on, and the judge is not spawned. The parse
failure **replaces** the form findings rather than joining them: every other form check reads the
file through a permissive scan, so on an unparseable file those findings are read from a partial
view and are not evidence. Reporting "no violations" from a file the parser could not read is the
**fail-open** this guard exists to close — a permissive scan cannot see a `Scenario:` the parser
rejects, so it reports the reassuring answer instead of the true one.

A parse failure is a **form violation like any other** — it needs no special surface and gets none.
It fails the gate's touched-scope check closed and the CI backstop's tree-wide sweep closed by the
same path every other form violation already takes. What makes it worth naming is only **where the
verdict comes from**: the pinned parser, never the permissive scan the other form checks read
through.

The guard is specified to **discriminate, not merely to refuse**: a `.feature` that parses raises no
parse violation, and a corpus that parses wholly raises none either. A check that always fails
closed would be as useless as one that always passes — it would just fail in the safe direction, and
"safe" is not the same as "measuring". Both directions are frozen so neither can be satisfied by a
constant.

## The referenced-artifact-exists pre-filter

Alongside the suite-form check, and also **before the cold judge is spawned**, the gate runs a
deterministic scan for **broken artifact references** in the CR's **touched** prose `.md` files:
every backtick-wrapped path shaped like a relative (`./`, `../`) or repo-root-relative (`.agents/`,
`plugins/`, `packages/`, `apps/`, `docs/`, `.claude/`) reference; a template placeholder
(`<project>`) or glob (`*.plan.md`) is exempt.

**Diff-scoped — only the refs the CR introduces.** The scan gates only the backtick paths a CR
**adds** against the committed baseline, never the pre-existing refs a file already carried and the
CR left untouched. Prose legitimately names **can-exist** paths — an opt-in config (`.agents/sdd/*`
runtime-settings home, created only on opt-in), an example, a not-yet-built artifact — and touching
a file for an unrelated reason must not pull its standing refs into scope. Non-existence there is
correct, not a broken reference: **referenced ≠ must-exist**.

**Surfaced for judgment, not failed closed.** An unresolved **introduced** ref cannot be classified
from the path alone (a typo vs an intended-optional path), so it is **surfaced as a judgment
finding** the gate reports — not a deterministic hard block, and the cold judge still runs.
Adjudication follows the four-C floor: an obvious stale mistake → a conductor-served minor fix; a
plausibly-intended-optional path → accept or escalate to the human. (The **use-case-coverage** check
below stays fail-closed — a Use Cases row naming a missing scenario is not a can-exist case.)

**Deliberately scoped to `--files`, never the tree-wide `--root` sweep** — the check only ever
inspects a CR's own touched prose. The sweep covers **every touched prose `.md` under the spec
tree** — not only `spec.md`/`README.md` but `design/*.md` and any nested node doc the CR touched —
so a stale reference a CR **introduces** into a sibling design doc is surfaced the same way. The
`--files` touched-scope plus the introduced-only diff is what keeps this safe; the file's name never
gated it. Contradiction detection (a sibling doc *asserting* behavior a CR changed) stays a semantic
judge concern, never this deterministic check.

## The use-case-coverage pre-filter

Also **before the cold judge is spawned**, the gate verifies each touched **behavioral** `spec.md`'s
`## Use Cases` **table** rows: every row names its covering scenario in a `Scenario` cell (a
backtick-wrapped `Scenario:` title or a shared `@tag`), and each named scenario must resolve to a real
`Scenario:` in the sibling `.feature`. An unresolved link **fails closed** — no status advance, no
judge spawn. This mechanizes the recurring coverage gap (`../spec-format/README.md`). It is
**non-mandating**: a reference/descriptive spec.md carries no Use Cases section and a prose/EARS use
case carries no row to link, so both stay silent and the spec-judge remains the coverage backstop for
the un-tabled forms.

**A present-but-unparseable row is a violation, not a silent skip.** Once a `## Use Cases` table
carries a `Scenario` column, every data row under it (after the header and its dashed separator) is a
link that must resolve. A data row whose `Scenario` cell is **non-empty but carries no backtick-wrapped
reference** — a title written without backticks, a stray note — is **reported and fails closed**, never
dropped. Skipping it would be the same fail-open the coverage check exists to close: a row that reads
as covered to a human but binds nothing to the checker. The non-mandating cases above are recognized *structurally*
(no table, or a table with no `Scenario` column), never by a row quietly failing to parse.

## The scenario-map binding check

For every touched `.feature` that parses cleanly and has a sibling `README.md`/`spec.md`, the gate
binds the suite to that spec's `## Scenario map` — the maintained table pairing each control-flow
edge with the one scenario covering it (`sdd:spec-format-governance`). The binding is **form only**: it
checks that the map is **complete and non-duplicated**, not that the edges cover the drawn CFG (that
needs the graph's semantics and stays a judge concern). Three violations:

- **every scenario is on the map** — a `Scenario:` in the `.feature` that no map row names is reported;
- **every row names a real scenario** — a map row whose `Scenario` cell names no sibling `Scenario:` is
  reported;
- **each `(edge, path class)` pair is unique** — two rows sharing the same edge and path cover
  different scenarios by the same key, so a repeated pair is reported.

A spec that carries **no `## Scenario map` section** is **skipped, not failed** — the map is the
rebuilt-node format, and a node still on the older shape is not in violation of a section it does not
claim. The section is recognized only by a **real `## Scenario map` heading line** — a spec that
mentions the heading inside prose or a backtick span (a doc *about* the map, like this one) is not
misread as having one — and it **ends at the next `## ` heading**, so a following section's table
(e.g. `## References`) is never read as map rows.

**A present-but-unparseable data row is a violation, not a silent skip.** The map is a markdown
table: its **first row is the column header** (`| Edge | Path (Given) | Scenario |`) and its **second
is the dashed separator**; every row after those is a **data row**, and each data row must name its
scenario in a **backtick-wrapped `Scenario` cell**. A data row whose `Scenario` cell is **not**
backtick-wrapped is **reported as an unparseable row** — never dropped. This is the fail-open this
check exists to close: the backtick match must **discriminate a data row from the header/separator**,
not double as the *only* signal that a row exists at all. Conflating the two means a fully-authored
map — every scenario present, titles verbatim, one row each — whose cells were written without
backticks **binds nothing while reading as complete to a human**: the exact "skip rather than fail"
shape the scenario map itself exists to prevent. The header and separator rows, recognized
**positionally**, raise no unparseable-row violation.

## Structural edit-class classification (freeze integrity)

The gate routes a touched `.feature`'s change by its **edit class** — an *additive* scenario
**self-clears** (folds into the frozen file, stays `@frozen`); a *narrowing/rewrite* of an existing
scenario **unfreezes the file and fires Clearance** (`../../design/autonomy-rubric.md` — a hard floor,
**pre-authorizable** in the CR, else escalated); a *pure `git mv` rename* (zero content delta) is not a
gate-able edit. That routing is only as trustworthy as the **classification** feeding it, and the
classification must be **structural — a per-named-`Scenario` diff of the file against its committed
baseline (the pinned `gherkin-cli diff` the freeze model and digest already consume,
`../../design/gherkin-cli-dependency.md` — its `addOnly` / per-scenario `change`), never a raw git
line-diff.**

A **raw line-diff misclassifies a narrowing as additive**: a trailing step orphaned off a frozen
scenario onto a newly added adjacent scenario shows **no `-` line** and reads as purely additive, so the
narrowing **self-clears silently and Clearance never fires** — the suite quietly guarantees less. The
structural diff is not fooled: it reports the losing scenario as `modified` (`addOnly: false`), so the
change is correctly classified as a **narrowing** and takes the **existing** unfreeze-and-fire-Clearance
path (self-clearing only when the CR pre-authorized Clearance). This closes the recurring
freeze-integrity gap; it **adds no new verdict** — it makes the edit-class signal that the freeze model
(`../../design/lifecycle-model.md`) and the Clearance floor already consume **reliable**, so a
context-line reassignment can no longer route a narrowing down the additive path.

The classification is scoped to the CR's **touched** `.feature` files. A whole-scenario addition stays
additive and self-clears; only a baseline scenario that is genuinely `modified`/`removed` is a narrowing,
and its outcome is Clearance (per the floor), not a bare block.

### A scenario's structural identity includes its steps' arguments

A step's **DocString** and **DataTable** are part of that step, not decoration around it — so they are
part of the scenario's structural identity. A signature over **step text alone** reads a rewritten
argument as **no change at all**, and that hole is not evenly distributed: a `@rubric` lives **wholly**
inside a DocString, so it is exactly the **graded** scenarios that lose their freeze. A frozen rubric
could be renamed and its `threshold: 3` moved to `threshold: 0` — every subject then passing — while
the diff reported `unchanged` / `addOnly: true` and the gate printed `NO-CONTENT-CHANGE`: a self-clear
route, Clearance never firing, the discrimination bar satisfied at freeze time guaranteeing nothing
thereafter. The identity therefore covers each step's **argument content**, and a rewritten argument is
a `modified` scenario taking the same narrowing → Clearance path as a rewritten step.

Only what an argument **says** counts, never how it is written — and that holds for **each** argument
kind on **both** faces, not for the DocString the defect was reported against:

| | a change to what it says → `modified` | a change to how it is written → `unchanged` |
| --- | --- | --- |
| **DocString** | its content, or its **media type** (which selects how the content is read, so it is identity, not decoration) | re-indenting it; swapping its delimiter between `"""` and back-ticks |
| **DataTable** | its cell values | realigning its column padding |
| **either** | — | its source location: a scenario pushed down the file by an insertion above it stays `unchanged`, and the edit stays purely additive |

Three of those exclusions — the delimiter, the padding, and the source location — are **independent
implementation choices** rather than consequences of "only content counts": dropping a DataTable's
padding means reducing its rows to cell *values*, which a naive hash of the raw rows would not do. So
each is **frozen by its own scenario** rather than inferred, because an identity that hashed a
delimiter, a cell's padding, or a line number would satisfy every *other* scenario here while
re-classifying ordinary formatting and ordinary additive edits as narrowings. A DocString's
indentation is the exception that proves the rule: the parser strips it before the identity is
computed, so there is no field to exclude — its scenario guards a **dependency's** property rather than
a choice of ours, and it is frozen so that a parser swap cannot quietly take it away.

Keeping the identity off form is what stops it over-firing — and a floor that fires on a re-indent is a
floor that gets ignored.

### An input the classifier cannot classify

The structural differ reports a per-file **parse error** when either side of the comparison fails to
parse, and it reports that error **alongside a fully reassuring result**: `addOnly: true`, zero
changed scenarios. That pairing is not a measurement — a file that yields **no scenarios** gives the
differ nothing to compare, so "nothing changed" is **structurally guaranteed rather than observed**.
A classifier that reads `addOnly` and ignores the error field therefore returns `no-content-change`
for a diff that rewrote the whole suite, and the edit **self-clears with Clearance never firing**.

So the classifier **never derives a class from `addOnly`** — it reads the error field first, and any
input it cannot classify becomes **`unclassifiable`**, which **escalates to Clearance** and advances
no status. Three distinct inputs collapse to it: a **parse error** on either side, a differ that
returns **no per-file result** for a touched file, and a differ that **produces no readable result at
all**. Each is a case where the classifier has no evidence — and the absence of evidence is never
read as evidence of no change. A check that cannot classify its input **escalates; it never exempts**.

Two boundaries keep the escalation honest rather than merely loud:

- **A pure rename still classifies as `no-content-change`**, even when the file does not parse. That
  verdict comes from **git's** rename detection (a 100% similarity score across the tree), which
  **measures** a zero-content delta without ever parsing the file. The classifier has evidence here,
  so it needs no escalation — the rename check runs before the differ for exactly this reason.
- **An unparseable file with no `@frozen` tag stays `unfrozen-skip`.** Edit-class routing exists to
  protect a freeze, and there is no freeze to protect. This is not an exemption: the file is still
  touched, so the **form check above fails the gate closed on it** regardless. The two checks are
  independent, and the gate needs only one of them to hold.
