---
concept: spec-structure
model: true
---

# Spec layout — organization strategies

**How the top-level body of one spec is decomposed**, and how that choice is *declared* rather than
re-derived. The third doc in the structure trio: `project-unit.md` fixes the *external* boundary (what maps
to one spec), `spec-structure.md` fixes the *node taxonomy* (descriptive / reference / behavioral) and names
**screaming architecture** as the default; this doc generalizes that single recommendation into a small
**menu of strategies** with a selection rule, a fit reconciliation, and a declared record — the model behind
the `scaffold-project-spec` authoring unit (`../authoring/scaffold-project-spec/`).

The problem it answers ([#35](https://github.com/cyberuni/cyberplace/issues/35)): placing a concept
correctly today needs the whole system in your head. The owner places fast; a newcomer is slow and
error-prone, and misplacement becomes structural debt formation must later reconcile. A **pre-determined,
declared layout** turns an open placement decision into a closed slotting one.

## The invariant — strategy is only grouping

A strategy chooses **grouping**; it never touches SDD's **atomic unit contract**, which holds under every
strategy (`spec-structure.md`, `lifecycle-model.md`):

- a **behavioral leaf** = node `README.md` (`spec-type: behavioral`, `## Use Cases`) + a colocated
  `<unit>.feature` (frozen per-file at the gate) + optional `<unit>.solution.md` (ungated, out of the
  spec-judge's view);
- **a node carries only classification frontmatter** (`spec-type`, `artifact-types`, `concept`), never
  lifecycle; all lifecycle stays on the root `spec.md`; freeze is per-`.feature`; one lifecycle per project.

A strategy therefore **composes with SDD iff** every node it emits classifies to one `spec-type` and every
behavioral leaf can host that triple. "Where do the solution and suite go?" has one answer under all
strategies — *in the behavioral leaf folder, beside the spec* — and strategies only decide **where that leaf
folder sits**.

## The shared envelope

Every strategy ships the **same fixed slots** — the universal envelope every real large spec wraps its body
in (scope, terminology, conformance, references):

| Slot | Holds | Node type |
|---|---|---|
| `spec.md` (root) | `project-path` frontmatter + the descriptive index + the **declared organization** (the **placement map**, which names the strategy) | descriptive |
| `design/` | the architecture, rules/model, and the **`design/decisions/` ADR log** (the "why") | descriptive |
| `workflows/` | the workflows suite (cross-capability usage flows) | behavioral |
| a **tooling/project** home | build, CI, packaging, deps — the carve-out *every* scheme needs | descriptive |
| **glossary** | the ubiquitous language (load-bearing under bounded-context) | reference |

Strategies differ only in **how the body — the capability / behavioral nodes — is decomposed**.

## The strategy menu

**Shipped (in the v1 compass): S1 (strongly recommended) + S2.** The rest are recorded here as
**alternatives under investigation** — full pros/cons preserved so they can be promoted without
re-deriving them. **S4 (layered) is discouraged as a top-level strategy** and survives only as the
nest-inside-a-capability rule.

### S1 — Capability-first (Screaming Architecture) — *strongly recommended*

Top-level folders = what the project *does*, in domain language; the folder names scream the capability.

- **Pro:** lowest placement burden (match a concept to a business noun); framework-independent;
  self-documenting; Conway-aligned.
- **Con:** capabilities must be *derived* (not always readable off folders); over a **fixed-layout** source
  (an agentic plugin) it becomes a spec-side abstraction that **diverges** from the folders (see *Spec-org vs
  source-org*).
- **Fits:** domain-rich projects where legibility outweighs spec↔source divergence (including plugins, with
  that divergence accepted as a known cost).

**Why strongly recommended, not merely default (the partition stake).** Capability-first is the code-side
**partition** the mission scheduler depends on: node ↔ capability-folder is a clean 1:1, so a mission owns
one node and its collisions are legible. A **layered / framework-first** top level (S4, or `src/`
by technical role) **scatters one capability across many folders** — the node↔folder mapping breaks, a
single behavior smears across nodes, collisions explode, and the scheduler degrades toward serial. So
S1 is not one option among equals: **layered / framework-first as the *top* level is discouraged**
(it survives only as the nest-*inside*-a-capability rule below). The scheduler's **false-conflict rate**
is the standing metric of this partition's quality — a layout-quality signal the Warden surfaces
(`../formation/`).

### S2 — Mirror-the-source-tree

Spec nodes track the existing source layout (one per top-level `src/` area) + a separate tooling home;
overall design in `design/`.

- **Pro:** near-zero friction for contributors who navigate by code; co-evolves (docs-as-code); homes
  already exist — ideal for backfill.
- **Con:** **inherits the code's organization quality** and risks coupling the spec to source churn —
  mitigated by **boundary-aligned** mirroring (cap depth at the unit boundary; see *Spec-org vs source-org*).
- **Fits:** code already well-organized (ideally feature-first); engineer-authored, code-adjacent specs.

### Alternatives under investigation

**Decision (2026-06-28):** Ship **S1 (capability-first, default) + S2 (mirror-source)**. The three alternatives below — S3 bounded-context (DDD), S4 layered, S5 doc-envelope (arc42) — remain deferred and are promoted to first-class compass routes only when a concrete project demands one; decide by demand, not preemptively.

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

1. the declared **organization** — a body placement map naming the strategy (below); `project-path`
   frontmatter records the governed source dir, and the spec **location mode** is derived from it;
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

1. a discernible capability/domain decomposition → **S1** (strongly recommended — the default route);
2. code already well-organized **and** navigated-by **and** feature-first → **S2**;
3. layering / arc42 sections never become the *top* level — they are the **nest-inside-a-capability** rule
   regardless of the primary chosen, and **a layered / framework-first top level is discouraged** (it
   scatters capabilities → breaks node↔folder → degrades the scheduler).

Always present **S1 as the recommended strategy + rationale** and show the alternative (S2), letting the
user choose; **steer away from a layered / framework-first top level** unless the project genuinely *is*
its layering. The deferred strategies (S3/S4/S5) are reachable via "show more options," pointing at this
doc — with S4 carrying the top-level discouragement.

## Declared organization — the body placement map

The chosen layout is **declared, not inferred** — the same principle `spec-structure.md` applies to
`spec-type`. The organization is **not** a frontmatter field (ADR-0017: frontmatter is the router's
upfront index — the strategy is not something the cross-project router needs). It lives where the
people and the placement ops that consume it already read, the **body of the root `spec.md`**:

- **The placement map (body, human + machine readable) — a routing table, not prose.** The maintained
  "a concept of kind K lives in home H" taxonomy + the nesting rule, **naming the primary strategy** in
  its heading/intro (`capability-first | mirror-source | bounded-context | layered | doc-envelope`), so a
  newcomer routes a new concept without holding the tree in their head, and `backfill` / the Warden read
  the strategy on demand. Where capabilities share control-flow edges and a concept plausibly fits two
  homes, the table carries an explicit **tie-break rule** for each known overlap (e.g. *mission vs
  doctrine*, *design vs capability*, *gateway vs intake*): "if it touches both X and Y, prefer Z because…".
  A lookup, not a derivation.
- **The spec `location` mode** (`colocated | hoisted | monorepo-member`) is **derived** from the
  `project-path` frontmatter (hoisted iff `project-path` is not the spec's own dir) — not declared.

**Who writes it.** `scaffold-project-spec` — the step that *decides* the layout, running the compass with
the user from whichever evidence the project affords: **detection mode** reads an existing source tree,
**intent mode** has none to read and asks what the project will be. It writes the placement map (and
`project-path`) at its scaffold step, in the same act that writes root `spec.md`. (An earlier wording
called it "the only step that decides … it ran detection", which silently assumed every project arrives
with source to detect — greenfield projects then had no decider at all.) **Who reads it.** `start-mission`'s explore consults the routing
table for its **provisional** placement; the **handoff** Warden pass re-reads it to **finalize** placement
(below); the post-mission Warden reads it to judge cross-mission structural fit. A normal node-add never
re-derives the organization; the **Warden** rewrites the placement map only during a deliberate
reorganization.

## Placement is provisional in explore, finalized at handoff

Placement-correctness needs information explore does not yet have — you know where a node belongs *after*
you have built and verified it, not before. So placement is **two-phase**, and never blocks explore:

- **Explore places provisionally.** It splits the decision in two — first classify `spec-type`
  (mechanical, fail-closed checked: testable→behavioral, shipped-suite-less→reference, rule/index→
  descriptive), then pick a capability home from the routing table (via `../project-spec/` `place-node`). Any
  plausible home is fine; the move, if any, is cheap.
- **Handoff finalizes placement, in the same PR.** After the impl gate passes, a Warden pass **scoped to
  the mission's touched nodes** relocates any misplaced node to its blessed home via `git mv` and logs the
  relocation. The change then lands with every node already in the right place — no follow-up formation CR.
- **Relocation never re-gates.** A pure rename of a frozen `.feature` (zero content delta) does **not**
  unfreeze it (`lifecycle-model.md`, `../common-governances/gate-validation/`); freeze is a content-state,
  not a path-binding. Relocation moves the spec/suite node, not the impl, and resolution is by
  `artifact-types` not folder — so the impl gate's verdict and squad resolution are both path-independent.

**Division of labor** (#35's open question): explore *proposes* a home; the **handoff** Warden pass
*finalizes* it in-PR (per-mission); the **post-mission** Warden owns only **cross-mission** structural
drift (node-shape audit, align, reconcile across missions). Pre-determined organization is an **input to** formation,
not a replacement for it.

## How this lowers the #35 placement burden

The layout step emits, regardless of strategy: a **pre-determined skeleton** (contributors slot, not invent);
the **placement-map routing table** (the explicit, maintained taxonomy #35 asks for, with tie-breaks); a
**`place-node` lookup** reused by explore and the handoff pass (`spec-type` + signals → suggested home +
`concept:` tag + **"belongs near X" duplicate-catch** via `../project-spec/place-node`). Because explore's
placement is only **provisional** and the **handoff** pass finalizes it cheaply in-PR, a contributor never
has to get placement right up front — removing the back-and-forth #35 names.
