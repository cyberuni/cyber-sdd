# ADR-0035: An authored governance ships as a package file; a plugin's own actor bar stays a skill

## Status

Accepted

Refines [ADR-0013](0013-governance-skills.md) — it carves out the case ADR-0013 did not have:
a governance this repo *authors for other repositories to consume*. ADR-0013's core decision,
that reference content a plugin's own agents load is a skill, is unchanged.

## Context

ADR-0013 moved reference/criteria content off `cyberplace governance show <name>` and into
**governance skills** inside the owning plugin. Its drivers were NodeJS elimination (no runner in
the loop) and plugin scope (not `AGENTS.md`). `.agents/specs/sdd/design/project-unit.md` carried the
rule forward as packaging: *"The plugin's exported governances ship as skills in `skills/`, never as
a non-scanned `governances/` dir."*

Every governance the rule was written against is an SDD **actor bar** — criteria the plugin's own
producers and judges are graded against, loaded by name through the harness. There was no other kind.

The governance-retrieval migration (repobuddy/buddy-agent-harness#122) creates one. `skill-design`,
`skill-repo-structure`, `agent-tool-output`, and `cli-resolution` are agent-configuration authoring
standards. ACED authors them; skills in *other* repositories consume them. The consumption path is
`universal-plugin plugin build` (cyberuni/universal-plugin#87): the build copies each governance a
skill declares into `<skill>/references/governances/<name>.md`, committed, and resolves the name
against the plugin being built and then the packages its `package.json` declares — **from the owner
at `governances/<name>.md`**.

That resolver reads a file at a fixed path in the owning package. A skill cannot satisfy it: a
`SKILL.md` carries frontmatter and a name the resolver does not look for, at a path it does not read.

## Decision Drivers

- The build-time resolver's contract is external to this repo and already shipped in #87.
- ADR-0013's drivers must still hold: no NodeJS in the run-time loop, content scoped to its plugin.
- A reader must be able to tell the two kinds apart from where the file sits, without reading it.

## Considered Options

### Option 1: Author the four as governance skills

- **Pros**: one rule, no carve-out.
- **Cons**: the copy step cannot resolve them, so every consuming repository keeps the pinned
  `npx cyberplace@<version> governance show <name>` call the migration exists to delete. It also
  pollutes ACED's skill surface with four skills no ACED agent loads.

### Option 2: Ship the four from `plugins/aced/governances/`, keep actor bars as skills

- **Pros**: satisfies the resolver; keeps the run-time loop NodeJS-free, because the consumer reads
  a committed copy on disk, never a CLI; the two kinds stay visibly separate.
- **Cons**: amends a written packaging rule; the directory ships to every plugin install.

### Option 3: A separate npm package for the documents

- **Pros**: nothing ships to plugin consumers that they do not need.
- **Cons**: a fifth package to version and release for four Markdown files; splits ACED's subject
  from ACED.

## Decision

Two kinds of governance, distinguished by who loads them and when.

| Kind | Loaded | Home |
| --- | --- | --- |
| **Actor bar** — criteria this plugin's own producers and judges are graded against | at run time, by name, through the harness | `plugins/<plugin>/skills/<name>-governance/SKILL.md` |
| **Authored governance** — a standard this repo owns and other repositories' skills consume | at **build** time, by the copy step, into the consumer's own `references/governances/` | `plugins/<plugin>/governances/<name>.md` |

`.agents/specs/sdd/design/project-unit.md` is amended to state both. The four documents named above
move to `plugins/aced/governances/`, and `plugins/aced/package.json` lists `governances` under
`files`.

Nothing in this repository reads `plugins/aced/governances/` at run time. The directory is a source
the build step of a *consuming* repository resolves.

## Rationale

The two kinds have different consumers, different load times, and different failure modes, so one
home cannot serve both. ADR-0013's rule was never about the directory — it was about keeping a
NodeJS call out of the loop. Option 2 keeps that intact: the consumer reads a committed file, and
the only thing that runs is the build it already runs.

Shipping the directory to plugin installs is accepted. It is four Markdown files, inert to any
harness that copies the plugin directory.

## Consequences

### Positive

- A consuming repository resolves an ACED governance with no run-time CLI call and no network.
- ACED owns its subject's standards in the package that owns the subject.
- The placement is decidable from the file's path.

### Negative

- Two governance homes in one plugin. A new governance needs the table above to be placed.
- Plugin installs carry four files no harness reads.

### Risks

- `cyber-aced` is private and marketplace-distributed by git subdirectory, not published to npm. The
  copy step resolves a governance from an **installed package**, so a consuming repository cannot
  reach `governances/<name>.md` through a dev dependency until `cyber-aced` publishes. Adoption
  (step 6 of #122) is blocked on that, not on this ADR.

## Related Decisions

- [ADR-0013](0013-governance-skills.md) — reference content as non-user-invocable skills
- [ADR-0031](0031-selection-is-not-visibility.md) — how a governance skill declares itself
- repobuddy/buddy-agent-harness#122 — the governance-retrieval migration
- cyberuni/universal-plugin#87 — the build-time copy step and its resolution order
