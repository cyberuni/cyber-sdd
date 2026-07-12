---
spec-type: behavioral
concept: [config-authoring, discovery]
---

# manage-skill-dirs — curate the extra skill-scan locations

Declare and curate the **extra skill-dir patterns** the `improve-skill` mechanical validate engine
scans on top of its two built-in defaults (`skills/`, `.agents/skills/`). The patterns live in an
opt-in `.agents/aced/skill-dirs.toml` under a single `anchors` key, mirroring SDD's `spec-anchors`
config (ADR-0019). An **internal, non-invokable** engine reached only through the ACED `manage`
gateway (`../../manage/`); it curates config the validate engine *reads*, so it lives beside
`improve-skill` in `config-authoring/`.

> **This is a single behavioral unit, not an overview** — one engine skill. This spec owns the
> behavior + suite ([`manage-skill-dirs.feature`](./manage-skill-dirs.feature)); the impl is the
> non-invokable `manage-skill-dirs` skill in `plugins/aced/skills/manage-skill-dirs/`.

## Use Cases

**Fit:** partial — the operations are mechanical (add / list / remove / edit / induce / preview over a
TOML array), reached via the `manage` gateway rather than by an activation decision, so trigger
near-miss balance is N/A; the behavior and structural layers still carry signal (the config format,
the additive-only defaults invariant, the pattern validator, and the preview-before-persist flow). The
one agentic behavior — the manage skill previewing a pattern's effect and confirming before it
writes — is the single `@rubric` scenario.

**Subject** — an internal engine, loaded by the `manage` gateway, that reads and writes **only**
`.agents/aced/skill-dirs.toml`: the config carries a single `anchors` array of repo-relative directory
patterns; the two fixed default roots (`skills/`, `.agents/skills/`) are implicit and never written;
CRUD over the custom patterns validates each before persisting; `induce` proposes a pattern from a
sample skill directory and `preview` lists the SKILL.md files a candidate pattern would discover
without persisting it.

**Non-goals** — scanning or validating skills (that is `improve-skill`'s validate engine, which
*reads* this config); writing any skill content, `spec.md`, `status`, or approval; a `<project>`
capture token. The skill-dir grammar is deliberately just `*` (one segment) and `**` (any depth):
spec-anchors needs a `<project>` capture because it derives a *spec name* from the matched path, but a
skill's name comes from its own directory basename inside the scan, so there is nothing to capture and
`<project>` is not part of this grammar at all. It is **not user-invocable** — it is reached via
`manage`.

Every scenario in [`manage-skill-dirs.feature`](./manage-skill-dirs.feature) maps to one of these
behaviors:

| Behavior | What it covers |
|---|---|
| **config format** | the single `anchors` array of repo-relative directory patterns; an absent config yields no extra locations |
| **fixed defaults implicit** | the two built-in roots are listed but never writable, never persisted to the config |
| **list** | reports the two fixed defaults (each explained) plus every custom pattern, flagged fixed/custom |
| **add / edit / remove** | CRUD over the custom patterns; add creates the config when absent; a no-op remove leaves it unchanged |
| **pattern validation** | a malformed pattern is rejected before it is persisted; a fixed default cannot be added/edited/removed |
| **induce** | from a sample skill-dir path, offer a literal-directory candidate and a `*`-generalized candidate |
| **preview** | list the SKILL.md files a candidate pattern would discover, without persisting the pattern |
| **boundaries** | writes only the skill-dirs config — never a skill, spec.md, status, approval, or freeze |
| **confirm before persist** | the manage skill previews the matched skills and confirms before writing (agentic, `@rubric`) |

## Why one config, mirroring spec-anchors

The validate engine must not bake a monorepo layout in (the repo's "no baked-in opinions — detect the
setup at runtime" rule): a single-package repo scanning `skills/` alone must see no change, while this
repo opts itself into `plugins/*/skills` and `packages/*/skills`. SDD already solved the identical
shape for spec discovery with `spec-anchors.toml` (ADR-0019), so this reuses that grammar and CRUD
surface rather than inventing a second one — a user who has curated spec anchors already knows this
config. The one divergence is the omitted `<project>` capture: spec discovery needs the captured name,
skill discovery reads the name from the skill's own directory, so the grammar drops `<project>`
entirely (only `*` and `**` remain).

## Scenarios (colocated)

The behavior suite is [`manage-skill-dirs.feature`](./manage-skill-dirs.feature) — the config format,
list, CRUD over the custom patterns, induce, preview, the boundary that only the config is written,
and the one agentic confirm-before-persist scenario. Cross-capability e2e scenarios live in
`../../acceptance/`.
