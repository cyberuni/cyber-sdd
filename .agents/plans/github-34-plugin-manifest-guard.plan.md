---
status: active
todos:
  - content: "explore: draft the shipped-pointer rule as a behavioral child node under sdd/plugin"
    status: completed
  - content: "spec gate: cold sdd-spec-judge to convergence, freeze check-plugin-manifests.feature"
    status: completed
  - content: "deliver: drop the dead commands key from the aced manifests"
    status: completed
  - content: "deliver: check-plugin-manifests engine + wire check:plugins into verify"
    status: completed
  - content: "deliver: one verification per frozen scenario (unit tests for the engine)"
    status: completed
  - content: "impl gate: cold sdd-impl-judge, pnpm verify green with the guard live"
    status: completed
  - content: "handoff: changeset, commits, PR against main referencing issue #34"
    status: completed
---

# CR github-34 — a plugin manifest must declare only pointers the package ships

Source: https://github.com/cyberuni/cyber-sdd/issues/34

## Intent

`plugins/aced/.plugin/plugin.json` declares `"commands": "./commands"`. No such directory
exists. The build copies the key into the two generated vendor manifests, so all three ship
the dead pointer. Claude Code 2.1.267 reports `commands path not found` on install and flags
the plugin as not fully loaded. Skills (27) and the four `aced-*` agents load fine, so the
damage is a misleading warning, not lost function.

Two things land: the **data fix**, and the **guard** that would have caught it.

## Root cause (verified in this worktree)

- The key was inherited by `refactor(aced): rename ACES plugin to ACED` and never carried a
  `commands/` directory.
- Nothing in the repo compares a manifest's component pointers against disk. `pnpm verify`
  runs `check`, `build`, `typecheck`, `test`, `check:skills`, `check:private-skills`,
  `check:specs`, `knip` — none reads a plugin manifest.
- Swept all four manifests (`sdd`, `quill`, `aced`, `sdd2`): **aced's `commands` is the only
  dead pointer**. The rule has exactly one live instance.

## Scope decision (owner, this session)

The issue's alternative fix — add `commands` to `files` in `package.json` — is a **red
herring here**. The `cyberplace` marketplace sources the plugin via `git-subdir` from
`plugins/aced`, and `cyber-aced` is `private: true` and never npm-published, so `files` does
not gate what ships. Removing the key is the whole data fix.

The guard is repo-local rather than upstream in the manifest builder: it lands now and gates
this repo's own CI.

## Design

**Spec home** — `.agents/specs/sdd/plugin/`, whose frozen `plugin.feature` already owns the
manifest contract (`the public manifest declares the plugin name and its pointers`). The new
scenario is **additive** to that frozen suite, so it self-clears: no re-open, no clearance.

**Engine** — a new `plugins/sdd/skills/check-plugin-manifests/`, matching the repo's existing
no-deps `.mts` engine convention. For every plugin manifest it resolves each component pointer
(`commands` / `skills` / `agents` / `hooks`) against disk, and for a non-private package also
against its `files` list. Wired into `pnpm verify` as `check:plugins`.

## NEXT

Landed. Both gates passed and self-asserted `by: agent` within leash; no resume action remains.

- **Spec gate** — `check-plugin-manifests.feature` frozen at 17 scenarios, ALIGNED true across
  oracle, builder and architect. No existing `.feature` was touched at any point, so no Clearance
  was entered.
- **Impl gate** — 17/17 on the fourth cold round, no blocker. The three earlier rounds each found a
  real defect, all of them in the verification rather than the engine: the whole suite bound one
  level below the contract's subject, and a plugin-root branch that survived the suite while
  misreporting a correctly-shipped component in this repo.
- **Landed** — the dead pointer is out of the aced manifests, and the guard runs in `verify` as
  `check:plugins`.

Six follow-ups are recorded in the ledger shard. One is classed blocking: the guard reports a clean
run when its root is unusable, which is the green-over-a-defect the node itself rules out. It cannot
fire here (the chain passes a fixed root) but the guard ships to consumers. It needs a scenario
first, so it is a new CR, not a patch.
