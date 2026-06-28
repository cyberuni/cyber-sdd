# Spec layout — organization strategies

**How the top-level body of one spec is decomposed**, and how that choice is *declared* rather than
re-derived. The third doc in the structure trio: `project-unit.md` fixes the *external* boundary (what maps
to one spec), `spec-structure.md` fixes the *node taxonomy* (descriptive / reference / behavioral) and names
**screaming architecture** as the default; this doc generalizes that single recommendation into a small
**menu of strategies** with a selection rule, a fit reconciliation, and a declared record — the model behind
the `backfill-project-spec` authoring unit (`../authoring/backfill-project-spec/`).

The problem it answers ([#35](https://github.com/cyberuni/cyber-skills/issues/35)): placing a concept
correctly today needs the whole system in your head. The owner places fast; a newcomer is slow and
error-prone, and misplacement becomes structural debt formation must later reconcile. A **pre-determined,
declared layout** turns an open placement decision into a closed slotting one.

## The invariant — strategy is only grouping

A strategy chooses **grouping**; it never touches SDD's **atomic unit contract**, which holds under every
strategy (`spec-structure.md`, `lifecycle-model.md`):

- a **behavioral leaf** = node `README.md` (`spec-type: behavioral`, `## Use Cases`) + a colocated
  `<unit>.feature` (frozen per-file at the gate) + optional `<unit>.solution.md` (ungated, out of the
  spec-judge's view);
- **`spec-type` is the only per-node frontmatter**; all lifecycle stays on the root `spec.md`; freeze is
  per-`.feature`; one lifecycle per project.

A strategy therefore **composes with SDD iff** every node it emits classifies to one `spec-type` and every
behavioral leaf can host that triple. "Where do the solution and suite go?" has one answer under all
strategies — *in the behavioral leaf folder, beside the spec* — and strategies only decide **where that leaf
folder sits**.

## The shared envelope

Every strategy ships the **same fixed slots** — the universal envelope every real large spec wraps its body
in (scope, terminology, conformance, references):

| Slot | Holds | Node type |
|---|---|---|
| `spec.md` (root) | the declared **`spec-layout`** frontmatter + the descriptive index + the **placement map** | descriptive |
| `design/` | the architecture, rules/model, and the **`design/decisions/` ADR log** (the "why") | descriptive |
| `acceptance/` | the e2e behavior suite (cross-capability outcomes) | behavioral |
| a **tooling/project** home | build, CI, packaging, deps — the carve-out *every* scheme needs | descriptive |
| **glossary** | the ubiquitous language (load-bearing under bounded-context) | reference |

Strategies differ only in **how the body — the capability / behavioral nodes — is decomposed**.

## The strategy menu

**Shipped (in the v1 compass): S1 (default) + S2.** The rest are recorded here as **alternatives under
investigation** — full pros/cons preserved so they can be promoted without re-deriving them.

### S1 — Capability-first (Screaming Architecture) — *default*

Top-level folders = what the project *does*, in domain language; the folder names scream the capability.

- **Pro:** lowest placement burden (match a concept to a business noun); framework-independent;
  self-documenting; Conway-aligned.
- **Con:** capabilities must be *derived* (not always readable off folders); over a **fixed-layout** source
  (an agentic plugin) it becomes a spec-side abstraction that **diverges** from the folders (see *Spec-org vs
  source-org*).
- **Fits:** domain-rich projects where legibility outweighs spec↔source divergence (including plugins, with
  that divergence accepted as a known cost).

### S2 — Mirror-the-source-tree

Spec nodes track the existing source layout (one per top-level `src/` area) + a separate tooling home;
overall design in `design/`.

- **Pro:** near-zero friction for contributors who navigate by code; co-evolves (docs-as-code); homes
  already exist — ideal for backfill.
- **Con:** **inherits the code's organization quality** and risks coupling the spec to source churn —
  mitigated by **boundary-aligned** mirroring (cap depth at the unit boundary; see *Spec-org vs source-org*).
- **Fits:** code already well-organized (ideally feature-first); engineer-authored, code-adjacent specs.

### Alternatives under investigation

- **S3 — Bounded-context (DDD) + glossary.** Top-level by subdomain/bounded context; context-map index +
  glossary at root. **Pro:** boundaries follow business + team ownership (socially-obvious placement); the
  glossary kills the vocabulary ambiguity that wrecks topical schemes. **Con:** heavy strategic analysis;
  over-built for small projects; the same term differs per context. **Fits:** large, multi-team,
  domain-complex projects.
- **S4 — Layered / technical-role** *(with a warning)*. Top-level by ring/layer (domain/application/adapters;
  or frontend/backend/infra). **Pro:** matches a strongly-layered repo's own mental model. **Con:** the
  **highest** placement burden — you must classify a concept's technical role first (the fluency #35 says
  newcomers lack); a feature's story smears across layers. **Fits:** only when the project *is* its layering —
  otherwise layering **nests inside** a capability, never at the top.
- **S5 — Document-type envelope (arc42 / Diátaxis)**. A predetermined section skeleton (context & scope,
  building blocks, runtime, decisions, quality, constraints, glossary). **Pro:** strongest *predetermined*
  placement guidance — section titles are a routing table; great for section-by-section backfill. **Con:**
  can feel heavy; the static/runtime/deploy split smears a feature. **Fits:** documentation-heavy or
  domain-flat projects; and as the **internal structure of `design/`** under any other strategy.

### The composition rule

Strategies are not exclusive picks. The standing rule:

> **Capability-first at the top (S1); layering / arc42 sections *inside* a capability (the S4/S5 nesting
> rule); facets (`spec-type`, `artifact-type`, tags) for cross-cutting concerns; an ADR log for the why.**

So the only true *body-decomposition* strategies are **S1, S2, S3**; **S4 and arc42 structure are nesting
rules**, and **ADR is a facet** (below) — not peers.

## Spec-org vs source-org — the divergence tension

Choosing a strategy is choosing **how far the spec's organization may diverge from the source's** — and that
divergence *is* the maintenance tradeoff the layout step must surface:

- **Fixed-layout projects (agentic plugins).** A plugin's source layout is fixed by the format (`skills/`,
  `agents/`, `.plugin/`); it cannot be reshaped to capabilities, and the spec cannot ship inside it — forcing
  the **hoist** to `<repo>/.agents/specs/<plugin>/` (`project-unit.md`). Capability-first stays preferred for
  the **spec** (legibility), but it is then a spec-side abstraction over a fixed source: a capability spans
  several fixed folders, so maintainers map "capability → which skills/agents." A real, accepted cost.
- **Mirror depth (S2).** Mirroring is **boundary/unit-aligned, not folder-for-folder.** Mirror only to the
  **spec-type boundary** — a folder with a testable surface becomes one behavioral leaf that owns its whole
  subtree; the nested `src/` folders below it are **implementation detail, not spec nodes**. Full-depth
  mirroring is an **anti-pattern** (every rename drags the spec); the step caps depth at the unit boundary and
  warns when a tree is so deeply nested or layer-split that mirroring would couple the spec to churn. At the
  leaves S2 converges on S1 — behavioral units are use-case-shaped; only the *top-level grouping* follows
  source.
- **ADR is a facet, not a body strategy.** You cannot organize a *behavioral* spec by ADR — ADRs carry no
  `## Use Cases` and no suite. ADR is the **decisions facet** every tree gets regardless of strategy: the
  per-unit `<unit>.solution.md` (unit scope) and a project-level `design/decisions/NNN-*.md` log (project
  scope), both **descriptive, ungated, never frozen**, out of the spec-judge's view (like the solution and the
  ledger). A decision change appends a *new* (superseding) ADR; if it changes behavior, the affected
  behavioral unit's spec + suite re-open via the normal draft→gate path — the ADR has no suite to update.

## Strategy ↔ SDD fit

| Strategy / format | Node-type mapping | SDD change needed |
|---|---|---|
| **S1 capability-first** | capability folders = descriptive indexes; leaves = behavioral units | none — this *is* the SDD model |
| **S2 mirror-source** | per `src/` folder: testable→behavioral, structural→descriptive, suite-less artifact→reference; mirror **boundary-aligned** | the spec-type classifier + a depth cap; clean only when `src/` is feature-first |
| **S3 DDD** *(alt)* | bounded context = capability folder; glossary→reference; context-map→descriptive | additive node kinds: glossary, context-map |
| **S4 layered** *(alt)* | layer folders have no testable surface → descriptive indexes only | none — but the contract forbids layers as behavioral leaves, so layering only **nests inside** a capability |
| **S5 arc42** *(alt)* | Context/Constraints/Building-Block/Crosscutting→descriptive; Decisions/Solution-Strategy→ADR; Runtime+Quality scenarios→behavioral; Glossary→reference | an explicit section→spec-type map |
| **ADR (facet)** | descriptive/solution, never behavioral | off the strategy menu; the `design/decisions/` log + per-unit solution |

**Net additions to SDD — all additive, no break to the unit contract:**

1. the declared **`spec-layout`** root frontmatter field (below);
2. the per-strategy **spec-type classifier** the layout step runs while scaffolding (testable surface →
   behavioral; shipped suite-less artifact → reference + `## Subject`; index / rule / structural grouping →
   descriptive);
3. two new **node conventions** — **glossary** + **context-map** (reference / descriptive) and a project-level
   **ADR decision-log** `design/decisions/` (descriptive, ungated; the project-scope sibling of the per-unit
   solution);
4. the stated **structural constraint** — behavioral leaves are use-case-shaped, so purely-structural slots
   (layers, arc42 building-block/context sections) are **descriptive indexes, never behavioral**.

## The selection compass

After auto-detecting signals — monorepo (`apps/`+`packages/`), framework markers, whether `src/` is feature-
or layer-organized, plugin shape (`.plugin/`+`skills/`+`agents/`), owners (`CODEOWNERS`), size — route:

1. a discernible capability/domain decomposition → **S1** (default);
2. code already well-organized **and** navigated-by **and** feature-first → **S2**;
3. layering / arc42 sections never become the *top* level — they are the **nest-inside-a-capability** rule
   regardless of the primary chosen.

Always present **one recommended strategy + rationale**, show the alternative, let the user choose. The
deferred strategies (S3/S4/S5) are reachable via "show more options," pointing at this doc.

## Declared organization — `spec-layout`

The chosen layout is **declared, not inferred** — the same principle `spec-structure.md` applies to
`spec-type`. It is recorded in **two complementary places on the root `spec.md`**, so a later edit reads a
field instead of re-scanning the tree:

- **Frontmatter — `spec-layout` (machine-readable).** Declares the primary `strategy`, the spec `location`
  mode, and a pointer to the placement map. On the root lifecycle frontmatter (`lifecycle-model.md`),
  validated by `check-spec-state.mts`:

  ```yaml
  spec-layout:
    strategy: capability-first   # capability-first | mirror-source | bounded-context | layered | doc-envelope
    location: hoisted            # colocated | hoisted | monorepo-member
    placement-map: "#placement-map"   # anchor/path to the body map
  ```

- **Body — the placement map (human-readable).** The maintained "a concept of kind K lives in home H"
  taxonomy + the nesting rule, so a newcomer routes a new concept without holding the tree in their head.

**Who writes it.** `backfill-project-spec` — the only step that *decides* the layout (it ran detection + the
compass with the user) — stamps both at its scaffold step, in the same act that writes root `spec.md`.
**Who reads it.** `start-mission`'s explore consults it to place a new node; the formation **Warden** reads it
to judge structural fit. A normal node-add never re-derives the organization; the **Warden** rewrites
`spec-layout` + the placement map only during a deliberate reorganization. That read/write split is the
concrete mechanism behind "never re-scan the tree."

## How this lowers the #35 placement burden

The layout step emits, regardless of strategy: a **pre-determined skeleton** (contributors slot, not invent);
the **placement map** (the explicit, maintained taxonomy #35 asks for); a **placement compass** reused by
explore (≤2 closed questions → suggested home) plus **"belongs near X" + duplicate-catch** via `../corpus/`
discovery+digest. **Division of labor** (#35's open question): the contributor *proposes* a home via the
compass; the formation **Warden** *confirms/relocates*. Pre-determined organization is an **input to**
formation, not a replacement for it.
