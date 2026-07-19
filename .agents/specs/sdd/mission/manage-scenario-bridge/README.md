---
spec-type: behavioral
concept: delivery
---

# manage-scenario-bridge — scaffold and curate a project's scenario-bridge config

The **manage-scenario-bridge** procedure: the curation interface for a project's
`<project-path>/.agents/sdd/scenario-bridge.toml` — the **one-time per-project wiring** the
[`../verify-scenarios/`](../verify-scenarios/README.md) bridge and the
[`../impl-judge/`](../impl-judge/README.md) step-0 consumption both read. It exists because that
wiring had **no owning skill**: [`impl-producer-governance`](../../../../plugins/sdd/skills/impl-producer-governance/)
authors the *binding tests* a source reports on, but never the config itself, so every prior
instance (`packages/cyberlegion/.agents/sdd/scenario-bridge.toml`) was hand-authored outside SDD.
The same split `manage-spec-anchors` and `manage-ignore` give their own configs. The concrete
engine is loaded in-session by the `../../gateway/manage/README.md`-fronted **manage** gateway's
**Setup & discovery** group.

## Use Cases

**Subject** — listing, scaffolding, and adding sources to a project's `scenario-bridge.toml`.

**Non-goals** — it does not author the binding tests a source reports on (the impl-producer does,
`sdd:impl-producer-governance`), does not run the bridge or judge anything (`../verify-scenarios/`
and `../impl-judge/` do), does not scaffold a project's `spec.md` (`scaffold-project-spec` does),
and writes **only** `scenario-bridge.toml` — never a `spec.md`, `status`, `approval`, or a freeze.
It opens no CR and invokes no gate.

| Trigger | Inputs | Outcome |
|---|---|---|
| **list** a project's configured sources | a project's `project-path` | every `[[source]]` block in its `scenario-bridge.toml`; a missing file lists nothing without error |
| **scaffold** a project's first source | a `project-path`, an `adapter`, a `command`, a `reportPath` | `<project-path>/.agents/sdd/scenario-bridge.toml` created with one `[[source]]` block |
| **add** an additional source to an existing config | a `project-path`, an `adapter`, a `command`, a `reportPath` | a new `[[source]]` block appended; existing sources are untouched |
| **scaffold when a config already exists** | a `project-path` with a config present | refused — the config exists; use add instead, so a second scaffold never clobbers a hand-tuned source |

Every scenario in [`manage-scenario-bridge.feature`](./manage-scenario-bridge.feature) maps to one
of these entry points.

## Rooted under the project, not the repo

Every read and write resolves under the **project's own `project-path`** (the root `spec.md`
frontmatter field `discover-specs` already surfaces) — a monorepo member's config sits at
`<project-path>/.agents/sdd/scenario-bridge.toml`, beside the code and reports it covers, never at
a single repo-root path. A colocated project's `project-path` is its own repo root, so the config
lands at the familiar `.agents/sdd/scenario-bridge.toml` there — no behavior change for a
single-project repo.

## Boundaries

Writes **only** `<project-path>/.agents/sdd/scenario-bridge.toml` — operational config, not spec
content, so the `manage` gateway's write-ownership guard holds. It does not run tests, does not
read or write a `.feature`, and does not resolve which sources exist beyond parsing the TOML it
manages. When `node` is absent, an agent performs the same edits by hand: read the file, apply the
list/scaffold/add, and refuse a scaffold over an existing file.
