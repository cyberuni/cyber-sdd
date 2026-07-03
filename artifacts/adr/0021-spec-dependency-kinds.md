# ADR-0021: Dependency kinds across specs and skills — which may cycle

## Status

Accepted

## Context

Specs routinely reference other units — a routing skill names what it fires *away from* (`init`'s
near-misses and Non-goals name `init-aced`, `define-skill`, `publish-universal-plugin`), and a chaining
skill names what it invokes (`init` chains `aced/init-aced`). In a monorepo these references cross
**project** boundaries: `init` lives in the `cyberspace` project spec, `init-aced` in `aced`, each with
its own lifecycle and its own right to be renamed by a CR that never touches the other's spec.

Traditional programming forbids circular dependencies. The instinct is to port that rule to specs and
skills. But "dependency" is not one relationship here, and porting the rule wholesale would forbid
references that are not merely harmless but **correct** (a boundary is inherently two-sided:
`skillify` and `define-skill` reference each other on purpose — two faces of one routing decision).

Three costs make this decision needed now:

1. **Maintainability of the spec**, and more importantly the **suite** — the `.feature` is frozen, so a
   naive cross-reference bakes another project's identity into a contract that is expensive to change.
2. **Drift on rename.** A rename CR against `aced` does not sweep `cyberspace`'s frozen suite; SDD has
   no mechanism that auto-catches cross-project name references, so they rot silently.
3. **Leakage into the implementation.** A slug named in the spec/suite tends to get copied into the
   `SKILL.md`, where a rename breaks it **silently at runtime** — the `aces`→`aced` and fabricated
   `sdd:builder` class of bug already seen. This is worse than spec drift because the impl is runtime.

A settled anchor is needed because every future node re-litigates "may I reference that other project?"

## Decision Drivers

- Keep each spec **independently comprehensible** (the real reason code forbids cycles).
- Keep the **production/bootstrapping order** acyclic.
- Do **not** forbid references that are correct (boundaries) or legal (guarded invocation / mutual
  recursion is legal in code too).
- Minimize the cost of an external rename on a **frozen** suite.
- Turn silent cross-project drift into a **loud** failure.
- Specs are **not** read at runtime (ADR-0017 lineage) — a runtime call is not a spec dependency.

## Considered Options

### Option 1: Port "no circular dependency" wholesale

- **Pros**: familiar; one blunt rule.
- **Cons**: forbids two-sided boundaries, which are correct and complete only when mutual; conflates
  four different relationships under one ban; does nothing about the real failure (leakage/drift).

### Option 2: Allow references freely

- **Pros**: least authoring friction.
- **Cons**: permits comprehension cycles (spec A unreadable without spec B and vice versa) and unbounded
  slug-coupling; maximizes drift and leakage.

### Option 3: Classify by dependency kind; depend on intent, not slug *(chosen)*

- **Pros**: restricts exactly the relationships with a real failure mode, permits the rest; the
  discipline that fixes comprehension cycles (reference intent) also minimizes rename drift and
  leakage; composes with existing freeze-transition rules.
- **Cons**: requires distinguishing four kinds; needs a drift guard to be trustworthy.

## Decision

Adopt **Option 3**. "No circular dependency" ports as three concrete failure modes, not one ban. A
reference between units is one of four kinds, each with its own cycle-tolerance:

| Kind | "A depends on B" means | Cycle allowed? | Because |
|---|---|---|---|
| **Comprehension** | A's spec cannot be understood without reading B's | **No — acyclic** | Independent understandability (the real reason code bans cycles). |
| **Production order** | B must be produced before A | **No — DAG** | Bootstrapping; the `blocked-by` delivery graph. |
| **Invocation** | A calls/chains B at runtime | **Yes, with a termination guard** | Mutual recursion is legal when it terminates. |
| **Boundary / routing** | A defines itself as *not* B | **Yes — natural and often required** | A boundary is two-sided; both sides should name the fence. |

Governing rules:

1. **Depend on intent/interface, never internals or slug.** A spec references another unit by its
   **stable capability/intent** ("the ACED registry write", "ACED's domain: authoring & evaluating agent
   config"), not by enumerating its skill slugs. This is dependency inversion (SOLID's D) ported to
   specs. It makes comprehension cycles *impossible to write* and removes most rename drift.
2. **Name an exact slug only where it is load-bearing** — the one place a skill actually invokes another
   (chaining). There the coupling is real; accept it, keep it to a single authoritative mention.
3. **Say a boundary once.** Do not repeat a cross-project reference across Fit, Subject, Non-goals, the
   scenario table, and the suite — that multiplies the drift surface for one fact.
4. **Reference-rename is freeze-preserving reconciliation.** Updating a renamed external identity in a
   frozen `.feature` is a **pure identity substitution with zero behavioral delta** — the same shape as
   the existing freeze-preserving transitions (additive scenario; pure `git mv`). The formation Warden
   sweeps it **without a ratified re-open**. The guard: it is freeze-preserving *only* when the boundary
   and behavior are unchanged; if the referenced capability's **meaning** moved (not just its name),
   that is a narrowing/rewrite and requires a re-open. Distinguishing renamed-vs-boundary-moved is a
   Warden judgment (as with placement-drift).
5. **Guard drift in two layers, over one shared engine.** *Detect (mechanical):* a cross-reference
   resolver asserts every cross-project slug in specs, suites, and impls resolves to a live unit; run in
   `pnpm verify`/CI so drift is a red build, not a silent runtime break — and so the check enumerates
   what the Warden must reconcile. *Prevent (judgment):* ACED's architect lens flags gratuitous
   slug-coupling in agent-config artifacts. These are not split by owner: the **same engine** is consumed
   by SDD's formation loop, `pnpm verify`/CI, **and ACED's spec-judge and impl-judge**, which run the
   mechanical resolve and then layer their agent-config-quality judgment on top.

6. **Exception — project-global config is the composition root.** Rules 1–3 bind **bounded units** (a
   node's spec, a `.feature`, a `SKILL.md`) — the things meant to be independently comprehensible and
   versioned. They do **not** bind **project-global agent config** (`AGENTS.md` and its kin), which is
   global to the project: the router/index loaded for every interaction, neither independently
   comprehensible nor independently versioned. That is the **composition root** of the agent-config graph
   — the one place concrete cross-references are legitimate (dependency injection's composition-root
   pattern). The resolver treats global surfaces as roots: it checks that their references *resolve*, but
   does **not** flag them as gratuitous coupling.

Runtime invocation between skills is a **skill-graph** fact governed by the *terminate* rule; it never
touches the **spec-graph**, because specs are not read at runtime.

## Rationale

The code rule is a proxy for "terminate, be orderable, stay independently comprehensible." Restricting
by failure mode keeps what those goals demand (acyclic comprehension and production order) and drops
what they never demanded (forbidding two-sided boundaries or guarded mutual invocation). The single
discipline "reference intent, not slug" simultaneously prevents comprehension cycles, minimizes rename
drift, and reduces leakage — one rule, three payoffs — while the two-layer guard makes the residual
load-bearing couplings safe to leave in.

## Consequences

### Positive

- Two-sided boundaries stay correct and symmetric; routing skills read naturally.
- An external rename usually touches no frozen suite at all (intent, not slug); where it does, it
  reconciles without an unfreeze.
- Cross-project drift and impl leakage become loud (CI) instead of silent (runtime).

### Negative

- Authors must classify the reference kind and prefer intent language — more thought per reference.
- The reconciliation carve-out adds a renamed-vs-boundary-moved judgment to the Warden's load.

### Risks

- **Over-applying reconciliation:** sweeping a boundary *move* as if it were a rename would silently
  weaken a frozen contract. Mitigation: the Warden treats ambiguity as re-open, not sweep.
- **Intent language drifting from any real unit:** "the ACED registry capability" with no skill behind
  it. Mitigation: the mechanical resolver checks capability references too, not only slugs.

## Implementation Notes

Follow-up CRs (not part of this ADR):

- **Cross-reference resolver** — generally useful in *any* monorepo, so it ships as a capability, not an
  SDD-internal tool. The deterministic engine is a `universal-plugin` npm CLI subcommand (offload to the
  tool, token-efficient); a `cyberspace` skill surfaces it (a new behavioral node in the cyberspace
  spec). SDD's formation loop, `pnpm verify`/CI, **and ACED's spec-judge + impl-judge consume** the
  engine — no single owner. It detects drift, drives the reference-rename reconciliation, and feeds
  ACED's architect-lens judgment. Dogfooded in this repo. Resolves cross-project slugs *and* capabilities
  across specs, suites, and impls, treating project-global config (`AGENTS.md`) as a composition root
  (references checked for resolution, not flagged as coupling).
- **ACED architect-lens guard** against gratuitous cross-project slug-coupling in agent-config artifacts.
- **`sdd:spec-format-governance`** gains the "reference intent, not slug" rule; **`sdd:lifecycle-governance`**
  gains reference-rename as a freeze-preserving transition alongside additive and pure-move.
- **Apply to `init`** (`cyberspace/bootstrap/init`): de-couple Fit/Non-goals/suite from ACED slugs,
  keeping the one load-bearing `aced/init-aced` chaining mention.
- **Website**: a concept page explaining dependency kinds and the intent-not-slug rule.

## Related Decisions

- [ADR-0017](0017-frontmatter-is-the-router-index.md) — specs are the router index, not runtime input;
  grounds "runtime invocation is not a spec dependency."
- [ADR-0016](0016-impl-judge-verification-independence.md) — the impl-judge re-derives the oracle;
  the architect-lens leakage guard extends judge independence to cross-project coupling.
- [ADR-0020](0020-sharded-ledger.md) — same "make the bad state impossible over auto-resolving it"
  driver applied to the ledger.
