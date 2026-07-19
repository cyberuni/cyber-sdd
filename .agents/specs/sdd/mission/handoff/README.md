---
spec-type: behavioral
concept: delivery
---

# mission/handoff/ — the handoff phase (step 4)

The **handoff phase** of the Mission Loop — step 4. Take step-3's verified result (from
`../delivery.md`) and land it in the **project-declared delivery shape**. `handoff` is a verb,
like the other mission phases; the **outcome** is the noun this action produces (a set of
commits, a PR, a published chapter). The orchestrator that sequences this phase is
`../README.md` (the [`conductor`](../conductor/README.md) unit).

> **This is a single behavioral unit, not an overview** — handoff has no sub-skills; the behavior
> is enacted by the conductor (the [`conductor`](../conductor/README.md) realization, built in
> `core-agents`). This spec owns the **behavior + suite** ([`handoff.feature`](./handoff.feature)).

## Use Cases

**Subject** — the handoff phase: landing a verified result in the project's declared delivery
shape, decomposed by unit of work, writing the CR's public conclusion back to its source, and
carrying the mission's identified **follow-ups** through record → classify → propose → drain.

**Non-goals** — it does **not** re-verify (it consumes the verified result), does **not** touch the
contract **content** or write spec/suite frontmatter (it may **relocate** a node — a pure rename that
preserves freeze — but never edits a scenario or a frontmatter field), introduces **no** new hard
floor, does **not** retire the mission plan (the doctrine loop deletes it later), does **not**
**admit** a follow-up to the mission graph (it proposes; the graph's single writer admits — see
`../../mission-graph/`), and does **not** dispatch the follow-up work it proposes. The impl-gate
verdict that produced the verified result is the [`conductor`](../conductor/README.md) unit's, not
this phase's.

Every scenario in [`handoff.feature`](./handoff.feature) maps to one of these behaviors:

| Behavior | What it covers |
|---|---|
| **finalize placement** | relocate this mission's provisionally-placed nodes to their blessed home via a pure rename (freeze survives), scoped to the touched nodes, logged — in the same change |
| **land in the declared shape** | detect the project's single declared shape and land accordingly (commit-to-main / branch+PR / deploy / chapter) |
| **decompose by unit of work** | a multi-unit cycle lands as multiple commits / a unit-split PR, never one blob, never two unrelated concerns together |
| **conditional status write-back** | when the source closes by reference, handoff writes the auto-close reference (`Closes #N`) into the PR body so the source closes on merge; a non-close-capable source gets none; direct-to-`main` work transitions the source to `done` on push |
| **distilled public summary** | append an outward-facing conclusion + follow-ups (which re-enter as new CRs **through a later mission**, never opened by handoff) to the source — not the combat log |
| **record every follow-up** | each identified follow-up is appended as a durable `followup` line to the CR's own ledger shard — unconditional: no permission, no forge, no human |
| **classify a follow-up** | `blocking` (it contradicts a completion claim the mission already made) or `backlog` (genuinely new territory); a finding that the mission's own frozen contract was wrong is an Oracle-lens revert, not a follow-up at all |
| **propose, never admit** | handoff emits the classified proposal + its evidence and writes no node or edge itself; admission is the graph's single writer's act |
| **drain to the forge** | file one issue per outstanding follow-up, deduped against existing issues (**open or closed**), forge-conditional — a drain on the durable record, refusable, retryable, and loud when refused |
| **the outward-publish floor** | a filed issue body is self-contained and carries no production-internal artifact reference — a **stricter** bar than the committed-record floor |
| **the agent-filed marker** | a filed follow-up carries a marker identifying it as agent-filed and names the mission it was discovered from, so intake can tell agent- from human-filed and the branching factor is measurable |
| **no new floor** | handoff raises no new mandatory escalation; earlier hard floors already fired |
| **the plan is kept, not landed, not retired** | the `.plan.md` stays in the PR as scratch, is not landed as a delivery artifact, and is not retired early |
| **nudge the formation loop** | surface a reminder after landing that a corpus-wide formation pass is due (via `sdd:manage`) — spawn nothing, gate nothing |

## Inputs

The verified result of the deliver phase: the implementation passed the impl gate, impl-sync holds
(the frozen suite runs green), and the colocated unit suites plus `../../workflows/` are green.
Handoff **consumes** this; it does not re-verify and it does not touch the contract.

## Placement finalization — the scoped Warden pass

Before landing, handoff finalizes **where** the mission's nodes live. Explore placed each new node in
a *provisional* home (`../../design/spec-layout.md`); now that the work is built and verified — the
moment of best information — handoff runs a Warden placement pass **scoped to the mission's touched
nodes**, applies the placement-map routing table (`../../design/spec-layout.md`), and **relocates** any
misplaced node to its blessed home via `git mv`, in the **same change** so the delivery shows every
node already in the right place — no follow-up formation CR.

- **A relocation is a pure rename, never a content edit.** A frozen `.feature` stays frozen across the
  move (`../../design/lifecycle-model.md`, freeze-protects-content-not-path); the move touches the
  spec/suite node only — never the impl — so the impl-gate verdict is path-independent, and squad
  resolution (by `artifact-types`, not folder) is unchanged.
- **Scoped, not corpus-wide.** This finalizes only *this mission's* placement; cross-mission structural
  drift (node-shape audit + align across missions) is the **separate** corpus-wide formation loop
  (`../../formation/`), not this pass.
- **Logged, keyed by name.** Each relocation is recorded as a detail-adjustment in the combat log
  (`../../design/provenance-model.md`), referencing the node by its **stable name**, so the move never
  dangles a reference.
- **Usually a no-op.** With the routing table + `place-node` (`../../project-spec/`), explore's provisional
  pick is usually already the blessed home, so most missions relocate nothing.

**Nudging the corpus-wide pass.** After landing (below), handoff **does not spawn** the Warden. It
**surfaces a one-line reminder** that a corpus-wide formation pass is due, pointing to `sdd:manage`
("audit the corpus structure" → `formation-loop`). The pass is **on-demand**, run deliberately when
someone chooses — a full corpus scan on every mission landing is costly and noisy, and `sdd:manage`
already owns the on-demand trigger. Handoff gates nothing on it and reads back nothing; the loop's
own behavior (what the pass does once running) is owned entirely by `../../formation/`. The
formation loop's documented "post-mission" cadence is unchanged — only its trigger moves from an
auto-spawn to this nudge.

## The delivery-shape contract

The **delivery shape** is a property the **project declares once** — it is part of the
project's harness, not a per-CR choice. The shape names how a verified result becomes a
durable outcome for *this kind of project*. SDD does not assume one shape; it detects the
project's declared shape and lands the result accordingly.

| Project kind | Declared delivery shape | Outcome (the noun) |
|---|---|---|
| repo / package (commit-to-main) | commits broken down by unit of work, committed to `main` | a sequence of commits on `main` |
| repo / package (PR flow) | a branch pushed, opened as a pull request | a branch + PR |
| website / app | a deploy of the verified build | a released site/app version |
| article / book | a written chapter or section landed in the manuscript | a published chapter |

The set is **open** — a project can declare another shape — but a project has exactly one
declared shape, so handoff is deterministic at run time.

## The unit of delivery

Delivery is decomposed by **unit of work** — one coherent, independently revertable change —
the same granularity the repo's commit discipline already enforces. A multi-unit cycle lands
as multiple commits (or a PR whose commits are split by unit), never as one undifferentiated
blob and never two unrelated concerns together. This keeps the outcome auditable and
revertable at the same grain the work was reasoned about.

## No handoff-layer hard floor

Handoff introduces **no new mandatory human escalation**. The only hard-floor escalations are
the ones raised earlier in the loop (see `../../design/autonomy-rubric.md`): **Clearance** (a
**narrowing** — weakening or deleting an e2e scenario), **Compatibility** (the change's **semver
class** over the authorized ceiling), and **Conflict resolution** (a logical contradiction inside
the suite). A separate handoff-layer floor for irreversible execution acts (force-push, data loss,
history rewrite) was **considered and rejected** — those are not a gate: SDD work is git-reversible,
and genuinely irreversible acts are out of scope (externally guarded) or pre-authorized
(`../../design/autonomy-rubric.md`). If a narrowing or a breaking change-class is in scope it was
already cleared in step 2/3 before any code was written, so handoff never has to halt mid-flight.

## Provenance

What was delivered, in what shape, broken into which units, lands in the durable **public
trail** — the CR-source conclusion, the changesets, and git history (see
`../../design/provenance-model.md`) — never the combat log (committed but transient, deleted
from the tree at retro). Handoff does not write spec/suite frontmatter; the contract is
already firmed.

### Conclusion write-back to the source

Handoff is where the CR's **public conclusion** is written back to its source (the mechanics
live in `../../intake/README.md`):

- **Status.** Conditional, never bookkeeping: when the source **supports closing by reference**
  (a same-forge issue — GitHub, GitLab), handoff **writes the auto-close reference** (`Closes #N`,
  naming the source) **into the PR body**, so the source auto-closes on merge — SDD adds no
  separate close. A CR with **no close-by-reference source** (a bare prompt, or a cross-system
  source such as Asana/Jira) gets **no closing reference**; work landed **directly on `main`**
  transitions the source to `done` on push, and a cross-system source is moved natively (`../intake/README.md`).
- **Distilled summary.** A short, **public-worthy** conclusion — what shipped, in what shape,
  and any **follow-up tasks** (which re-enter SDD as new CRs only when a **later mission** is started
  from them — filing is not opening a CR, and handoff opens none) — is appended to the source. This
  is deliberately the *outward* distillate, not the internal combat log: it is part of the
  **public trail** the campaign / formation outer loops read forward via their cursor, so they
  resume from conclusions instead of cold-scanning the product.

### Follow-ups — record, classify, propose, drain

A **follow-up** is work the mission identified but held out of scope. Handoff carries it through four
stages, and **only the first always works** — the split is the point.

| Stage | Act | Can it be denied? |
|---|---|---|
| **1. Record** | append a `followup` line to the CR's own **ledger shard** (`../../common-governances/combat-log/`) | **no** — no permission, no forge, no human, no channel |
| **2. Classify** | mark it `blocking` or `backlog` | no |
| **3. Propose** | emit the classified proposal + evidence to the graph's single writer | no |
| **4. Drain** | file it to the forge | **yes** — permission-gated and forge-conditional |

**Record is load-bearing, and it is first.** The record is written **before any filing is attempted**,
so a refused drain cannot lose the thread. It goes to the **ledger**, not the combat log: the combat
log is deleted from the tree at retro (`../../design/provenance-model.md`), and a follow-up must
outlive its mission. The shard is per-CR-per-writer (ADR-0020), so two pods identifying the same
follow-up are reconciled by **reading**, not by racing the forge.

**Classification is a proposal, not a verdict** — and it is a **privilege boundary**, not a taxonomy:
`blocking` is the class that may enter the graph, become `ready`, and get dispatched. A mission that
classified generously would be spawning its own work — grading its own homework on *"should more work
be spawned for me?"*. So handoff **proposes and never admits**: it appends no node and no edge, and
dispatches nothing.

| Finding | Class | Where the **work** goes |
|---|---|---|
| the **contract** was wrong — the mission is not done | *not a follow-up* | an **Oracle-lens revert** inside this mission (`../../design/lifecycle-model.md`) |
| the **graph** was wrong — the mission is done per its contract, but the operation has a gap | **`blocking`** | proposed as a mission node — "needed next to complete the operation" |
| neither — genuinely new territory | **`backlog`** | the backlog |

**The class decides graph admission, not filing.** The column above names where the *work* is
destined, not the only artifact created. **The drain is class-agnostic**: every outstanding follow-up
is filed, `blocking` and `backlog` alike — a `blocking` follow-up is *additionally* proposed for
admission. The two are orthogonal, and reading the table as an either/or is the trap: a `blocking`
follow-up whose proposal has nowhere to land yet would otherwise be silently dropped from the forge,
which is the thread-loss this whole design exists to prevent.

**The containment bar:** `blocking` means **the follow-up contradicts a completion claim already
made**. That class is finite and shrinking — there are only so many completion claims, and each
either holds or does not. The unbounded class (ideas begetting ideas) is `backlog`, where it costs
nothing to hold.

**Draining is a drain on the record, not the primary act.** It dedupes against the forge's existing
issues and files **one issue per outstanding follow-up** — the **mixed** set files the unmatched and
skips the matched, never all-or-nothing. It is **forge-conditional** (a source with no issue forge
files none; the records still stand). The `followup` line carries **no filed-state** — the ledger is
append-only, so what is outstanding is **re-derived** at each drain by that same dedupe, which is what
makes a retry both correct and idempotent.

**Dedupe matches any existing issue, open or closed** — not open alone. Because the record is
append-only and never marked filed, matching only *open* issues would re-file a duplicate for every
follow-up whose issue was already filed and resolved: the retry path is exactly where that lands, and
re-filing settled work is the runaway the containment bar exists to prevent. A **closed** match is
skipped, and nothing is lost by skipping it — the `followup` record still stands in the ledger, so a
follow-up wrongly closed is recoverable from the durable record rather than by re-filing.

**A refused drain is a defined path, not an undefined one.** Filing is permission-gated and can be
refused (an unattended mission has no channel to grant it). When it is: the **records stand**, handoff
**reports the refusal**, and it **never reports the follow-ups as filed** — a fallback indistinguishable
from success is the failure being avoided. The drain retries later from the durable record.

### The outward-publish floor — stricter than the committed record

A filed issue body is a **new outward channel**, and outward channels carry a floor. The
committed-record floor (`../../common-governances/combat-log/`) governs artifacts **tracked in the
repo**; a **public tracker** needs a stricter one, because that floor bans absolute paths, `$HOME`,
usernames, and machine-local locations — and a **ledger shard filename is repo-relative and passes it
cleanly**. The issue body floor adds:

- **Self-contained** — the finding is stated so a reader who cannot see the mission's internal
  artifacts can still act on it. No "see the ledger line", no gate/judge/leash prose.
- **No production-internal artifact reference** — no ledger shard filename (it carries the writer's
  random per-session hash — a session id), no combat-log reference, no plan-brief path.
- **Everything the committed-record floor already bans**, unchanged.

The distilled public summary above is a sibling outward channel; this bar is scoped to the **issue
body** it was written for.

**The agent-filed marker.** A filed follow-up carries a marker identifying it as **agent-filed** and
**names the mission it was discovered from**. Without it, intake cannot tell agent-filed from
human-filed and the loop's branching factor cannot be measured at all — a fact that is cheap to record
now and impossible to reconstruct later.

### The plan is a portable handoff artifact

The mission **plan** (`.agents/plans/<cr-ref>.plan.md`) is itself a self-contained, portable
brief (`../../design/provenance-model.md`): a different agent or model can pick up an
in-flight mission from it. It is **tracked worktree-local scratch** — committed with the work
and kept in the PR (the decision + failure trail reviewers want), but handoff does **not**
treat it as a delivery artifact to land in the declared shape. The doctrine loop **deletes it
from the tree later** (a tracked deletion, once distilled and the source is done) — handoff
neither retires it early nor specially preserves it.

## Scenarios (colocated)

Unit scenarios for handoff (decompose-by-unit, land in the declared shape, the PR-flow vs
commit-to-main branch, no new floor) **colocate** in this folder. Cross-capability outcomes
that run a CR end-to-end through handoff live in `../../workflows/`.

## Source

- new (from `../../DESIGN-NOTES.md`) — the project delivery-shape contract. No prior spec.
