# Skill kinds — the axes we actually use (July 2026)

Background survey behind issue #380 (`improve-skill`: `user-invocable: false` should not imply
partial skill). Written to answer a narrower question — *what is a "partial skill" versus a "private
skill"?* — which turned out to have no single answer because **"kind" is one word covering five
independent axes**, and the repo's doctrine settles only three of them.

Census below is over **124 `SKILL.md`** files in this repo (all placements, `examples/` included),
taken 2026-07-24. This note is **evidence, not a normative rule**.

---

## 1. The five axes

> **Superseded in part.** The taxonomy settled after this survey is on the website at
> [Skill Kinds](/concepts/skill-kinds/): three live axes (Selection, Visibility, Effect) plus the
> three settled elsewhere (Placement, Distribution, Pattern). "Partial" was demoted to documentation
> and "name-only" became the kind that carries a mechanical rule. The census below is unaffected —
> it is the evidence that drove those calls. See § 5.

Every skill in the corpus answers five questions independently. Collapsing any two produces a real
bug — #380 is the collapse of axis 3 into axis 4.

| # | Axis | Question | Carrier | Settled by |
|---|---|---|---|---|
| 1 | **Placement** | Where does the file live, and who consumes it? | directory | ADR-0005 |
| 2 | **Distribution** | Is it shipped to strangers or repo-local? | `metadata.internal` | AGENTS.md |
| 3 | **Selection** | How does it get loaded — situation match, or by name? | `description` shape | *this CR* |
| 4 | **Visibility** | Does it appear in the user's slash-command list? | `user-invocable` | *this CR* |
| 5 | **Pattern** | What shape of work does the body encode? | body | ADR-0005 |

**"Private skill" is ambiguous between axes 1 and 2.** **"Name-only" is axis 3.** They are unrelated,
and the corpus proves it: 10 skills are private (axis 2) *and* situational (axis 3), while 52 are
name-only (axis 3) *and* publicly shipped (axis 1).

### Why 3 and 4 are genuinely independent

`user-invocable: false` is a **harness/UI hint** — it suppresses the skill from the slash-command
list. It says nothing about how the model loads the skill. A **partial skill** has no situational
trigger and is loaded **by name** by a caller. The two co-vary in this repo purely by history, not by
necessity:

- A partial skill *should* be hidden (nobody should slash-invoke a fragment) — so `false` is right.
- But a **hidden situational** skill is equally legitimate: a governance enforcement rule that
  auto-loads when a relevant tool runs, yet would be noise in the slash list. It is `false` **and**
  trigger-shaped.

That fourth combination is what #380 reports. **It occurs zero times in this repo** — the reporting
case (`prefer-cyber-asana`) lives in `central-ux/panwds`. The validator's rule was never wrong about
*this* corpus; it was wrong about the concept, and only an external repo exercised the difference.

---

## 2. Census: what the corpus actually contains

Combinations of exposure × distribution × description-prefix × trigger-language, all 124 files:

| n | `user-invocable` | `metadata.internal` | description prefix | trigger language | What it is |
|---|---|---|---|---|---|
| 28 | `false` | — | `Partial Skill` | — | shipped partial (plugin bars, engines) |
| 25 | — | — | — | yes | **public situational skill** |
| 24 | `false` | `true` | `Partial Skill` | — | repo-local partial |
| 16 | `false` | — | — | — | `examples/` fixtures |
| 16 | — | — | — | — | public skill **missing** trigger language |
| 10 | — | `true` | — | yes | **project-private contributor skill** |
| 4 | `false` | `true` | `Internal skill` | — | legacy ADR-0013 spelling |
| 1 | — | `true` | — | — | private, no trigger language |
| **0** | `false` | any | any | **yes** | **hidden situational — the #380 case** |

Per area:

| Area | n | `ui:false` | `internal` | `Partial Skill` | `Internal skill` | trigger |
|---|---|---|---|---|---|---|
| `plugins/sdd` | 49 | 42 | 23 | 38 | 4 | 3 |
| `plugins/aced` | 22 | 9 | 5 | 9 | 0 | 10 |
| `examples/` | 16 | 16 | 0 | 0 | 0 | 0 |
| `.agents/skills` | 11 | 0 | 11 | 0 | 0 | 10 |
| `plugins/cyberspace` | 8 | 0 | 0 | 0 | 0 | 3 |
| `plugins/cyberlegion` | 7 | 4 | 0 | 4 | 0 | 2 |
| `plugins/cyberfleet` | 5 | 1 | 0 | 1 | 0 | 2 |
| others | 6 | 0 | 0 | 0 | 0 | 5 |

---

## 3. The patterns we have so far

### 3a. Declared patterns (ADR-0005, axis 5)

ADR-0005 fixes four **pattern** values for workflow shape: `process`, `tool-based`, `standard`,
`persona`. These are authoring guidance — **no skill carries a `pattern` field**, so the axis is
documented but unenforced. A crude body probe splits the corpus 56 procedure-shaped (numbered steps
or a Workflow heading) versus 68 reference-shaped.

### 3b. Observed kinds (axes 3+4, undeclared)

These are the kinds the corpus really has. Only the first two are named in any ADR.

| Kind | Loads by | Exposure | Description shape | n |
|---|---|---|---|---|
| **Public situational** | situation match | slash list | `"Use this skill when …"` | 25 |
| **Project-private situational** | situation match | slash list | `"Use this skill when …"` + `internal: true` | 10 |
| **Partial** | name, by a caller | hidden | `"Partial Skill: …"` | 52 |
| **Governance bar** (ADR-0013) | name, by a producer/judge | hidden | `"Partial Skill: …"` + actor metadata | ~24 |
| **Legacy internal** | name, by a caller | hidden | `"Internal skill: …"` | 4 |
| **Hidden situational** | situation match | hidden | `"Use this skill when …"` + `ui:false` | 0 |
| **Fixture** | never (test data) | hidden | none | 16 |

**Governance bar** is a *sub-kind of partial*, not a peer: it is a partial whose body is pure
reference content and which carries the SDD resolution metadata — `actor` (24), `gate` (24),
`compose` (23), `artifact-type` (16), `face` (16 — `producer` / `judge` / `both`). That metadata
vocabulary is richer and more used than either `type` (2 uses) or `persona`.

### 3c. Persona

ADR-0005 requires `metadata.persona: true` for persona skills. Five skills declare it —
`researcher`, and cyberfleet's `operator` / `crimp` / `mechanic` / `pod` — but **all five write it as
the string `"true"`, not the boolean**. Any check testing `persona === true` silently misses every
persona in the repo. Worth confirming against `audit-skill`'s E2 exemption, which ADR-0005 says keys
on that flag.

---

## 4. Where the doctrine lives today

The partial-skill rule is stated in **seven** places. One is canonical; six restate it in full, so
changing the definition is a seven-site sweep.

| Site | Role |
|---|---|
| `packages/cyberplace/governances/skill-design.md` § Narrow and composable | **canonical** |
| `AGENTS.md` § Adding a New Skill | restates, adds the `metadata.internal` distinction |
| `apps/website/…/governances/skill-design.md` | published copy |
| `apps/website/…/concepts/skills.md` | concept-doc copy |
| `apps/website/…/aced/define-governance.md` | drafting instruction |
| `.agents/specs/aced/…/define-skill/README.md` | scenario row |
| `.agents/specs/aced/…/define-governance/README.md` | scenario row |

Plus the **mechanical** statement in `plugins/aced/skills/improve-skill/scripts/validate.mts`, whose
`isPartialSkill = fmInternal` is the line #380 reports.

### The contradiction

**ADR-0013 deliberately decided the dual marker** — `user-invocable: false` **and** an
`Internal skill:` description prefix — and defends it explicitly:

> This is belt-and-suspenders by necessity, not redundancy — the two markers cover disjoint harness
> capabilities.

The reasoning was sound for its problem: the frontmatter field expresses intent where honored, and
the prefix guarantees no-user-trigger on harnesses that ignore frontmatter. But it means ADR-0013
**intends** the frontmatter field to be a partial-skill marker, which is exactly what #380 says it
must not be.

Since then the prefix spelling changed from `Internal skill:` to `Partial Skill:` — 52 skills use the
new spelling, 4 still use ADR-0013's — **and ADR-0013 was never updated**. So the corpus follows a
convention no ADR records, while the ADR of record describes a convention 4 skills still follow.

Neither ADR-0005 (the skill *taxonomy* ADR) nor ADR-0013 has an axis for activation-vs-exposure.
ADR-0005's axes are Placement, Pattern, Role, Style, Capabilities, Knowledge, Activation — where its
"Activation" means *hook lifecycle event* (`session-start`, `post-tool-use`), a fifth distinct sense
of the word, unrelated to the situational-vs-by-name distinction at issue here.

---

## 5. Decisions taken

Settled after this survey, recorded on the website at [Skill Kinds](/concepts/skill-kinds/):

1. **`user-invocable` is a Visibility signal only.** It never determines how a skill is selected. This
   amends ADR-0013's dual-marker decision, which must be superseded rather than silently contradicted.
2. **"Partial" is demoted to documentation.** Whether a skill can run alone is worth stating in its
   README and changes nothing mechanically — a fragment and a self-contained engine are selected the
   same way. No check polices it.
3. **"Name-only" is the kind that carries a rule:** a skill triggered by name keeps its description to
   the minimum, because the description is the only surface a spurious match can grab. The minimal
   description *is* the mechanism, not a label for it.
4. **The marker is the whole description** — `"By name only"`, nothing else. Identity moves to the
   body and README. All name-only skills therefore share one description; they are distinguished by
   `name`, which is how callers address them.
5. **Doctrine home is general, not ACED's** — `skill-design` governance for the rule, an ADR (amending
   0005, superseding 0013's marker clause) for the why. Not under `.agents/specs/aced/`.
6. **The kind-aware checks collapse.** Q3 re-keys to "warn on text beyond the marker"; Q17 and Q18 are
   subsumed by it and retire; Q1 and Q2 skip name-only skills, keyed on the marker rather than on
   `user-invocable`.

### Still open

- **"Activation" is overloaded.** It means hook event in ADR-0005 and situational-vs-by-name here. Two
  senses, one word — the failure mode ADR-0005 was written to stop. The website doc uses *Selection*
  for the second sense to avoid the clash; ADR-0005 has not been amended to match.
- **`persona: "true"` is a string in all 5 declarations**, not a boolean. Any check testing
  `persona === true` misses every persona in the repo. Separate defect, unrelated to #380.
- **Q2 flags 13 skills** with genuinely terse descriptions, independent of the name-only exemption.

## Related

- [ADR-0005: Skill Taxonomy](../../artifacts/adr/0005-skill-taxonomy.md) — placement / pattern / activation axes
- [ADR-0013: Governance Skills](../../artifacts/adr/0013-governance-skills.md) — the dual-marker decision
- [ADR-0001: Governance vs Discipline Taxonomy](../../artifacts/adr/0001-governance-vs-discipline-taxonomy.md)
- [Partial-skill vocabulary](../partial-skill-vocabulary/conclusion.md) — governance vs the neighboring terms
