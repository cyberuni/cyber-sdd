# corpus/ — spec-corpus tooling

## Owns

The **tooling** that operates over the spec corpus: discovery, digest,
dedupe, split, and **align**. Most are deterministic and read-only; **`align-specs`** is
the exception — **user-invocable** (and CI-usable) and able to **reconcile**, not just
report. This folder is the *machinery*; the
[`../formation/`](../formation/) outer loop is the **process** that wields it (dedupe
overlap, split monoliths, reconcile contradictions). The tools
compute and propose; formation — run by the Warden — decides and acts on the proposals,
making its own self-clear-vs-escalate verdict per act.

## What "the corpus" is now

Under the one-project-spec model a single project is **one spec, one behavior suite, one
gate/freeze baseline**, organized into files and folders (folders are *views*, never
lifecycle units). So the corpus the tooling ranges over is two-tiered:

- the **cross-project set** — the sibling project specs in a repo (`sdd`, `aces`,
  `universal-plugin`, …), each a root `spec.md` plus its tree; and
- the **internal structure** of one project spec — its capability folders, its `design/`
  rules, its `acceptance/` e2e suite, and its colocated unit suites.

Discovery derives these tiers from frontmatter; digest, dedupe, and split
read individual specs and **propose** a structural change for formation to ratify. None of
the tooling reads runtime behavior or owns a lifecycle state.

**The two tiers gate differently (ruling E).** Structural acts at the **cross-project** tier
— splitting one project spec out of another, deduping sibling project specs, deprecating a
spec — are real **gated** lifecycle acts, which is why
dedupe/split only *propose* and require approval. Reorganizing the **internal structure** of
*one* project spec (moving a capability folder, regrouping files — folders are views) is
**plain editing**: no new gate, no formation ratification, since no scenario's truth changes
and folders carry no lifecycle state. The dedupe/split tools target the cross-project tier;
intra-project reorg needs no corpus tool at all. (`deprecate`/retire is a lifecycle act owned
by `../design/lifecycle-model.md`, not a corpus tool — see "authoring and retirement stay
elsewhere" below.)

## The tools

### Discovery — find specs by shape, not location

A spec is defined by its **shape, not its location**: any git-tracked `spec.md` whose
frontmatter `status` is in the lifecycle enum. Consumers glob `**/spec.md`, filter to those
carrying a lifecycle `status`, and match a requested name to a spec's **folder slug** (its
root-relative path). No specs root is hardcoded; no `specs/<domain>/` convention is assumed;
no registry, array, or index of paths is ever consulted — discovery is a pure derivation, so
no second place can drift. An ambiguous name match is disambiguated with the user, never
guessed. The convention is owned by the lifecycle rule in [`../design/`](../design/);
discovery's consumers defer to it rather than restate it.

### Digest — read-only summary of one spec

Given a spec folder, reads `spec.md` and its sibling `.feature` and returns a fixed-section
summary — **What**, **Status**, **Scenarios** (count + names), **Key decisions** (the `###`
headings under Design decisions), and **Open items** (every `<!-- open: ... -->` marker).
Read-only and decision-free: it writes nothing, advances no status, renders no verdict. A
missing `.feature` is reported as zero scenarios, not an error. The digest is structural and
domain-agnostic — derived mechanically from artifacts every spec shares — so the summary
format stays consistent and a small/fast routing model never has to read and summarize the
artifacts itself.

### Dedupe — collapse overlapping scope

Reads a candidate set, finds where their What, design decisions, and `.feature` scenarios
**substantially** overlap (not incidental shared vocabulary), and proposes a **dedupe plan**:
which spec survives and which fold into it. Survivor
selection (most complete coverage, most advanced status) is *proposed with reasons*, never
assumed — peers are sent to the user. It owns the overlap analysis only: it never scaffolds
or rewrites artifacts, never writes `status`/`approval`, and requires **explicit approval**
before any structural change. A frozen survivor (`approved`/`implemented`) routes through the
draft re-open path before any scenario moves, per the freeze rule.

### Split — decompose an oversized spec

Reads one target, groups its design decisions and `.feature` scenarios into cohesive
independent concerns, and proposes a **split plan** with scope. A
scenario or decision belongs to exactly one child; shared vocabulary becomes a governance,
not duplicated scope. Like dedupe, it owns the analysis only — authoring
and retirement stay elsewhere — and requires explicit approval; a frozen target routes through
the draft re-open path first. "Just delete the parts about X" is out of scope: that is a
revise/deprecate, not a split.

### Align — detect & reconcile prose↔suite drift (`align-specs`, user-invocable, CI)

The one **user-invocable** tool here, and the only one that **reconciles**. It runs the same
alignment check the spec gate runs (`../authoring/`), but on demand over **one, more, or all**
specs — for audits, post-large-change verification, and CI gating. Drift is normally caught
**inline** at every CR's spec gate (so no outer loop hunts for it); `align-specs` is the
on-demand / full-corpus complement — latent drift, batch audit, CI — never a substitute for
the gate.

- **Detect** (default; `--check` for CI): per spec, the resolved spec-judge applying the
  **Builder (coverage) lens** reads `spec.md` (prose + diagrams) against its `.feature` for
  coverage — unstated behaviors, prose/scenario contradiction. A mechanical pass also runs
  `.feature` validity + a **scenario-diff** against the frozen suite (a narrowing → a
  **Clearance** flag). There are **no scenario IDs in the prose** — prose↔suite alignment is
  judge-only; only the `.feature` carries scenario identity. `--check` reports and exits
  non-zero on any drift, writing nothing.
- **Reconcile** (interactive): for each gap a **Director-lens (scope)** call sets the
  direction (in-scope → add a scenario; out → trim the prose; contradiction → align the
  loser) and the **Builder (coverage) lens** fixes coverage. A gap that would **narrow an
  already-frozen scenario** escalates as a **Clearance** CR rather than being silently
  rewritten.

## Boundaries

- **Tooling, not process.** These tools compute and propose. The act — applying a dedupe,
  performing a split, reconciling a contradiction — belongs to
  [`../formation/`](../formation/), which runs corpus-wide and continuously and owns the
  ratification verdict. The per-spec structural verdict at a gate is a separate thing.
- **No lifecycle ownership.** Nothing here writes `status`, `approval`, or a freeze. Digest,
  dedupe, and split are read-only and emit proposals.
  **`align-specs`** may write **prose / scenarios** in reconcile mode, but still never
  `status`/`approval`/freeze — a fix that would narrow a frozen scenario escalates as a
  Clearance CR instead.

## Scenarios

Unit scenarios for each tool colocate in this folder. Cross-capability outcome (e2e)
scenarios live in [`../acceptance/`](../acceptance/).
