# ADR-0017: Spec frontmatter is the router's upfront index — minimal `status` + `project-path`

## Status

Accepted

## Context

The SDD **gateway** routes by scanning every `.agents/specs/*/spec.md` **frontmatter only** —
upfront, without reading bodies — to surface the most important next action across all projects in a
repo. That use defines what frontmatter is *for*: a cheap, machine-readable **router index**. A field
earns its place in frontmatter only if the router needs it **without opening the body**.

The schema drifted away from that. [ADR-0012](0012-spec-frontmatter-schema.md) set
`status` / `priority` / `blocked-by`; Phase 0 then removed `priority` + `blocked-by` with the
spec-graph apparatus. Separately, the project-spec model added a `spec-layout` block
(`strategy` / `location` / `placement-map`), an `aligned` boolean, and a run-level `strategy` (leash)
block to the root frontmatter — with no consolidating decision. Reviewing each field against the
router test exposed three that fail it and one category error:

- **`aligned`** is a stored boolean that secretly caches **two different properties at two layers**:
  impl ↔ frozen-suite (deterministic — *run the suite*) and `spec.md` prose ↔ `.feature`
  (judge-only by design — there are no scenario IDs in prose). At project granularity it also
  **over-claims**: `aligned: false` says the *whole* project is unsettled when only the mission's
  touched nodes are in flux.
- **`spec-layout.location`** (`colocated | hoisted | monorepo-member`) is a *category*; the useful
  datum — *which source dir this spec governs* — was never recorded, so a router scanning
  `.agents/specs/*/` could not map `sdd` → `plugins/sdd-new`.
- **`spec-layout.placement-map`** points at an in-file anchor (`#capability-map`) — information-free
  to a frontmatter-only scan, since following it requires reading the body.
- The run-level **`strategy` (leash) block** is, per `design/autonomy-rubric.md`, **session-local and
  re-derived at each gate** — transient per-run state stored on the *durable* project spec, a
  durable-vs-transient category error.

## Decision Drivers

- **Frontmatter = the upfront router index.** Minimize it to what cross-project routing needs.
- **Derive, don't store.** A property that is mechanically derivable, or only judge-assessable, must
  not be cached as a stored boolean that can rot or over-claim.
- **Granularity honesty.** No project-level flag may claim something about parts the mission never
  touched.
- **Durable vs transient.** Per-run/session-local state belongs on the transient `.plan.md` / the
  `ledger.jsonl`, never on the durable project spec.

## Considered Options

### Option 1: Keep the fields, rename `aligned` → `synced`

- **Pros**: smallest diff; keeps a familiar working flag.
- **Cons**: a rename fixes the name, not the disease — the conflation (two layers under one boolean)
  and the project-level over-claim remain; `placement-map` and `location` still fail the router test.

### Option 2 (chosen): Minimal schema — `status` + `project-path`; derive the rest

- **Pros**: the index carries only what routing needs; the router gains source→spec mapping;
  no rotting/over-claiming flag; `implemented` legality gains real teeth (the impl gate runs the
  suite) instead of trusting a boolean.
- **Cons**: a behavioral sweep — every scenario that referenced `aligned` must be re-homed.

### Option 3: ADR only, defer the migration

- **Pros**: lowest immediate risk.
- **Cons**: leaves the schema documented one way and used another; chosen against because the
  consistency is wanted now.

## Decision

The root `spec.md` frontmatter is **minimal**:

```yaml
---
status: draft           # draft | approved | implemented | deprecated
project-path: plugins/sdd-new   # repo-relative source dir this spec governs (location is derivable)
---
```

plus the gate-written `approval` (per-gate verdict) and `produced-by` maps that appear **as gates
run** — not at draft. Everything else is removed from the durable spec frontmatter:

- **`aligned` — dropped, not renamed.** Its faces are derived or judged, never stored:
  - impl ↔ frozen suite → **run the frozen suite**; the impl gate already advances to
    `status: implemented` only when *every* impl-judge passes, so the boolean was a cache of that run.
  - `spec.md` ↔ `.feature` prose drift → **judged** at the spec gate (Builder coverage lens); a
    judge-only property must not become a stored boolean.
  - per-node settled-vs-in-flux → the **`@frozen` tag** scan over `.feature` files.
  - "what is in flux right now" → the **`.plan.md` todos** (the active mission's touched set).
- **`spec-layout.location` — dropped.** Derivable from `project-path` (hoisted iff `project-path` is
  not the spec's own dir).
- **`spec-layout.placement-map` — dropped.** An in-file anchor carries no information to a
  frontmatter-only scan.
- **organization strategy** (`capability-first | mirror-source | …`) — **moved out of frontmatter**
  to a one-line body declaration + the `design/spec-layout.md` taxonomy; read on demand by placement
  ops (`backfill-project-spec`, the formation Warden), off the router's hot path.
- **run-level `strategy` (leash) block — removed** from the durable spec; it is session-local
  (`autonomy-rubric.md`) and lives on the `ledger.jsonl` / `.plan.md`.

`project-path` **replaces** `location` with the genuinely useful datum: the source the spec governs,
so the router maps a file the user is editing → its spec.

This **supersedes ADR-0012**.

## Rationale

The router test is a single sharp criterion, and applied honestly it collapses the schema to two
fields. The decisive reframe is **derive-don't-store**: `aligned` felt necessary only because it was
doing two unrelated jobs; split them and each job already has a better home (a suite run, a `@frozen`
scan, a judge verdict, the plan todos) that cannot rot the way a hand-written boolean can. `location`
loses to `project-path` because a category is weaker than the path it categorizes, and the path is
what routing actually consumes.

## Consequences

### Positive

- The router index is minimal and honest; it can map source dir → governing spec.
- No stored flag can over-claim or drift out of sync with reality.
- `implemented` legality moves from "trust a boolean" to "the impl gate ran the frozen suite" — a
  real guarantee, where it always belonged.

### Negative

- `check-spec-state.mts`'s static `implemented` check is now only "`approval.impl` ratification is
  recorded"; the suite-pass guarantee is the impl gate's **runtime** job (acceptable — the static
  checker never ran suites).
- `aligned`'s "don't commit mid-flight" guard re-expresses as "don't commit with an unfrozen touched
  `.feature` or incomplete plan todos."

### Risks

- Behavioral ripple: conductor / impl-gate scenarios that read `aligned` must be re-homed onto
  `status` + judge passes + freeze state. A mis-migration could silently drop a guard — mitigated by
  the full sweep and `pnpm verify:specs-new`.

## Implementation Notes

Migration units (committed independently): the validator + tests (`check-spec-state.mts` — the
mechanical source of truth), the design docs (`lifecycle-model.md`, `spec-layout.md`), the governance
SKILLs (lifecycle / gate-validation / ownership), the producers (backfill / start-mission /
spec-producer), the behavioral specs that re-home `aligned` (`conductor.feature`, `acceptance/`), and
finally the root `sdd` spec + the `aces` sibling.

## Amendment — location-bounded spec recognition (discover-specs CR)

The original framing recognized a spec by **shape alone**: any git-tracked `spec.md` whose
frontmatter `status` is in the lifecycle enum, found by globbing `**/spec.md` repo-wide. That over-
scanned (a stray `spec.md` anywhere with a `status` would be loaded) and was costlier than the router
hot path needs. Recognition is **narrowed to location-bounded AND shape-confirmed** — a spec is a
git-tracked `spec.md` that **both** sits at one of three fixed SDD spec locations **and** carries a
lifecycle `status`:

1. `.agents/spec/spec.md` — repo-root single-project
2. `.agents/specs/<project>/spec.md` — repo-root multi-project
3. `<project-path>/.agents/spec/spec.md` — a nested project (the `**` is the project-path, any depth)

The `status` shape stays the confirming filter (so a stray non-spec `spec.md` at a location is not
loaded; a status-bearing `spec.md` outside the three locations is not a spec). The locations are
fixed conventions, **not** a stored registry — the router still derives, nothing to keep in sync. The
concrete engine is the **`discover-specs`** skill (`plugins/sdd-new/skills/discover-specs/`):
frontmatter-only, TOON output, consumed by the gateway's status scan. Reconciled sites:
`corpus/discovery` (spec + suite), `lifecycle-governance`, `corpus/README`, and this ADR.

## Related Decisions

- [ADR-0012](0012-spec-frontmatter-schema.md) — **superseded** by this ADR (status/priority/blocked-by).
- [ADR-0015](0015-three-tier-provenance-and-plan-handoff.md) — the ledger/plan that home the
  run-level (transient) state pulled out of the durable spec.
- [ADR-0016](0016-impl-judge-verification-independence.md) — the impl-judge suite run that now backs
  `implemented` legality instead of the `aligned` boolean.
