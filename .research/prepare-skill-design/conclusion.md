# Conclusion — Prepare Skill Design (June 2026)

## Question

What is the best design for a `prepare` mechanism that syncs a universal plugin installed via one vendor's marketplace to other vendors, without requiring `package.json` or npm dependencies in the user project?

## Verdict

**The design is viable but requires accepting two known limitations: a sync window after mid-session install, and no automatic cleanup on uninstall. No vendor provides the hooks needed to close either gap without workarounds.**

The recommended architecture has three layers:

**Layer 1 — SKILL.md (always-available, no binary):**
A `skills/prepare/SKILL.md` inside the plugin. Invokable manually in any agent session (`/prepare`). Based on the plugin-portability design — no dependencies, works in any runtime.

**Layer 2 — SessionStart hook + sentinel file (automated, once per plugin version):**
The plugin's `hooks/hooks.json` contains a `SessionStart`/`sessionStart` hook (both casings, generated per vendor target) that calls `npx universal-plugin@<pinned-version> prepare --sentinel`. A sentinel file at `~/.config/universal-plugin/prepared-<plugin>-<version>` guards against running on every session.

**Layer 3 — `npx universal-plugin` CLI (the sync engine):**
A Node CLI (CommonJS/ESM, not Bun) that detects installed vendor runtimes, copies/symlinks artifacts to correct paths, translates hook event casing per vendor, and reports what changed. No `package.json` required in user project.

**Version management:**
- Plugin author pins `universal-plugin@x.y.z` in hooks.json (explicit, no `@latest`)
- User approves minor upgrades via `/universal-plugin accept-minor`; stored in `~/.config/universal-plugin/config.json`
- `universal-plugin` re-execs at approved minor version without rewriting plugin files
- Major version bump: notify only; author must ship new plugin version
- Update checks respect `NO_UPDATE_NOTIFIER=1` / `UNI_PLUGIN_NO_UPDATE=1`

**Cleanup:**
No automatic cleanup on uninstall (no vendor has an uninstall hook). Explicit command: `npx universal-plugin cleanup <plugin-name>`. Sentinel TTL (Option B) provides eventual detection when another plugin's hook fires.

## Confidence

**High** that no post-install hook exists on any Tier 1 vendor. **High** that SessionStart + sentinel is the best available automation path. **Medium** that the minor-version re-exec model is safe (depends on strict semver discipline from universal-plugin authors). **Low** on cleanup completeness — the uninstall gap is real and the sentinel TTL approach only works if at least one other universal-plugin-using plugin remains installed.

## Strongest supporting evidence

- All four vendors' hook references confirm absence of post-install events; Claude Code issue #11240 confirms this is a known gap
- compound-engineering-plugin independently chose explicit cleanup (not automatic), confirming the limitation is accepted practice in this space
- `update-notifier` (5000+ packages, used by npm itself) is the established pattern for notification-without-auto-update
- `plugin-portability`'s SKILL.md-only design confirms no-binary approach is viable

## Strongest counterevidence / caveats

- The minor-version re-exec model has no precedent in the npm ecosystem; `update-notifier` notifies but never re-execs — this is novel and needs careful implementation
- Bun requirement in compound-engineering-plugin suggests that a pure-Node tool serving 10 runtimes may hit complexity limits that push toward Bun or Deno; Node may not stay simple
- The open questions (multiple distinct problems conflated in the design session) suggest the architecture may need restructuring once problems are decomposed clearly

## What is not supported

- Automatic sync immediately on install (no post-install hook anywhere)
- Automatic cleanup on uninstall (no pre-uninstall hook anywhere)
- Version pinning without any user action (security requires explicit opt-in to upgrades)

## Where evidence is thin

- Whether Claude Code revalidates/overwrites plugin cache files if the user edits them (relevant to any approach that rewrites hooks.json in-place)
- Whether the `universal-plugin` multi-version conflict scenario (multiple plugins, each pinning different `universal-plugin` versions) causes problems in practice
- The full list of distinct problems the prepare mechanism must solve (user noted these are conflated; decomposition pending)

## Recheck triggers

- If any Tier 1 vendor ships a post-install or post-update hook
- If Claude Code ships the PostInstall/PostUninstall feature request (issue #11240 or its parent)
- If `universal-plugin` is implemented and the minor re-exec pattern proves fragile in practice
- After the user decomposes the distinct problems — the design may need to be restructured per problem
