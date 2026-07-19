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
| **run structural provenance / alignment / spec-type / suite-form / referenced-artifact checks** — before any verdict, before the judge is spawned | the touched files' `produced-by` entries + role resolution (`../../design/provenance-model.md`) + each node's `spec-type` classification (`../../design/spec-structure.md`) + the touched `.feature` files' form (`../suite-format/README.md`) + every backtick-wrapped artifact path the touched `spec.md`/`README.md` names | malformed `produced-by` / off-enum `correction` / unresolvable required role → **fail closed**; a `reference` node carrying a `.feature`, a `reference` node missing `## Subject`, or a `behavioral` node missing `## Use Cases` → **fail closed** (a `descriptive` node raises none); uninstalled-but-valid recorded producer → **flag** only; a touched `.feature` whose form is invalid (a non-boolean step, a missing `Feature`/`Then`) → **fail closed** before the cold judge runs, the form check **scoped to the touched files**; a touched `.feature` the **pinned Gherkin parser cannot parse** → **fail closed** before the cold judge runs, reporting the parse failure and its line *in place of* that file's form findings (a partial read is not evidence) — and this one fails the tree-wide `--root` sweep closed too; a touched **frozen** `.feature` whose **edit class cannot be classified** (the differ reports a parse error, returns no result for the file, or produces no readable result) → **`unclassifiable`** → **escalate to Clearance**, never `no-content-change` and never `additive`; a **CR-introduced** backtick artifact path that resolves to nothing → **surfaced as a judgment finding**, not a hard fail-closed (a pre-existing ref unchanged by the CR is never gated; adjudication follows the floor — obvious stale → served fix, plausibly-intended-optional → accept/escalate), scoped to the touched files (the sweep covering every touched prose `.md` under the spec tree, not just `spec.md`/`README.md`), a template placeholder or glob exempt; a touched behavioral `spec.md` whose `## Use Cases` table row names a scenario that does not resolve in the sibling `.feature` → **fail closed** (a reference/descriptive spec.md or a prose/EARS use case with no row raises none); a `@trigger` `Scenario Outline` whose `Examples` table carries neither a `query` nor a `should_trigger` column → **surfaced as a judgment finding** (advisory), not a fail-closed — the tag claims the trigger-run policy but the rows cannot drive it, and the repair (re-tag vs. adopt the contract vs. retire) is a judgment the table cannot settle; an **untagged** outline is never held to it, and a blocking form violation beside an advisory finding still fails closed |

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

### The advisory tier within the form check

Most form findings are **blocking** — a missing `Then`, a hedge adverb, a leaked rubric, a parse
failure. They stay exactly as above: a partition into tiers must never weaken them, so a blocking
violation still fails the gate closed even when an advisory finding sits beside it in the same file.

A form finding is **advisory** only when the check can prove the defect but **cannot pick the
repair** — the same test the referenced-artifact check already passes below. Such a finding is
**surfaced for judgment** (`⚠`, exit unaffected, the cold judge still spawns) rather than advancing
nothing. This is the shape `check-spec-state` already runs; the suite-form check adopts it rather
than inventing a second one.

### The `@trigger` activation contract

A layer tag is not a label — it is the **evaluation layer a resolved judge routes the scenario
through** (`../suite-format/README.md`). `@trigger` routes a scenario into the **trigger-run
policy**, and that policy reads a query and an expected activation verdict. So a `@trigger`
`Scenario Outline` must carry the activation contract its tag promises: an `Examples` table with a
**`query` column and a `should_trigger` column**, the corpus shape the suite-form bar already names.

An outline tagged `@trigger` whose table carries neither column routes the judge into a policy it
**cannot execute** — the tag claims a contract the rows do not supply. That is the defect the check
names, and it is a mechanical consequence, not a style preference.

The finding is **advisory** because the repair is genuinely a judgment call the table cannot settle:
a mis-tagged outline may want its tag corrected to `@behavior` (content-preserving, when the outline
is a sound intra-node decision table), or may want the contract adopted, or may want the outline
retired. Only the first is free; the others narrow a frozen scenario and fire Clearance.

The rule keys on the **tag**, not the outline: an **untagged** `Scenario Outline` carries no
activation claim and is never held to this contract — enumerated decision tables remain fully
sanctioned. Both directions are frozen, so the check cannot be satisfied by a constant.

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
