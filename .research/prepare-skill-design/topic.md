# Prepare Skill Design (June 2026)

## Question

What is the best design for a `prepare` mechanism that syncs a universal plugin installed via one vendor's marketplace to other vendor runtimes — without requiring a `package.json` or npm dependency in the user's project?

## Scope

**In scope:**
- Invocation model for a cross-vendor sync tool (`npx universal-plugin`)
- Versioning strategy: security pinning + minor auto-update + opt-out
- Vendor hook support for session-start and post-install triggers
- Deep analysis of acplugin, plugin-portability, compound-engineering-plugin
- Uninstall / cleanup lifecycle gap

**Out of scope:**
- Plugin authoring format (covered in `open-plugin-spec-comparison`)
- The sync target paths per vendor (covered in `plugin-consumption-leveling`)

## Source angles

- Community tool source code: acplugin, plugin-portability, compound-engineering-plugin
- Vendor hook documentation: Claude Code, Cursor, Codex, GitHub Copilot CLI
- npm versioning ecosystem: update-notifier, npx pinning, supply chain risk
- Vendor uninstall lifecycle documentation and issue trackers

## Findings

### Community tools: none satisfy all requirements

Three tools were analyzed in depth:

**acplugin** (`@disdjj/acplugin`, v1.5.3)
- TypeScript CLI; `npx @disdjj/acplugin convert .` works (no package.json needed)
- Direction: Claude Code → Codex, OpenCode, Cursor, Antigravity
- Invocation: **manual only** — no hook, no session-start trigger, no sentinel
- No update notification mechanism
- Conversion table maps skills, instructions, MCP, agents, commands, hooks per vendor

**plugin-portability** (`hiivmind/plugin-portability`, v0.2.1)
- **Pure SKILL.md** — no binary, no Node.js runtime required at all
- Invocation: on-demand, user invokes skill by name in agent session
- Nine-phase workflow: intent → detect → inventory → score → report → (optional uplift phases)
- Has YAML rubrics (160 conditions, 6 platform files) for scoring portability gaps
- `hooks/` directory referenced in manifest but absent; session-start injection planned but not implemented
- Best design pattern: no binary dependency, works in any agent session natively

**compound-engineering-plugin** (`@every-env/compound-plugin`, v3.11.2)
- **Requires Bun** — `bunx` shebang; `npx` will fail (no compiled dist/)
- 37 skills + 51 agents; canonical source is `.claude-plugin/plugin.json`, thin wrappers per vendor
- Converter CLI: `bunx @every-env/compound-plugin install <plugin> --to <target>`
- Supports 10 runtimes: Claude Code, Cursor, Codex, Copilot CLI, Factory Droid, Qwen Code, OpenCode, Gemini, Kiro, Pi
- **Explicit cleanup**: `bunx cleanup --target platform` moves artifacts to `legacy-backup/` (does not delete)
- No post-install automation; converter step is manual

### No vendor has a post-install or post-update hook

Confirmed across all four Tier 1 vendors:

| Vendor | Post-install hook | Closest alternative |
|---|---|---|
| Claude Code | ✗ (issue #11240, closed as dup) | `Setup` hook — requires explicit `--init-only`/`--init`/`--maintenance` flag |
| Cursor | ✗ | `workspaceOpen` — fires once per workspace open, only for already-installed plugins |
| GitHub Copilot CLI | ✗ | — |
| Codex | ✗ | — |

The `Setup` hook (Claude Code) does not fire automatically on plugin install or update. `workspaceOpen` (Cursor) is a chicken-and-egg: it only fires for plugins already installed in Cursor, which is the state we're trying to create.

### SessionStart + sentinel file is the best available approximation

All four vendors have a `SessionStart`/`sessionStart` hook. A sentinel file turns this into a "once per plugin version" trigger:

```bash
SENTINEL=~/.config/universal-plugin/prepared-${PLUGIN_NAME}-${PLUGIN_VERSION}
if [[ ! -f "$SENTINEL" ]]; then
  npx universal-plugin@1.2.3 prepare --plugin "${PLUGIN_ROOT}"
  touch "$SENTINEL"
fi
```

Sentinel location: `~/.config/universal-plugin/` (respecting `$XDG_CONFIG_HOME`). Vendor-specific `${PLUGIN_DATA}` won't work — it is vendor-scoped and deleted by Claude Code on uninstall.

**Known gap:** When a plugin is installed mid-session (Claude Code already running), the SessionStart for that session already fired. The new plugin's hook won't run until the next session start. There is a sync window between install and first session restart.

### npx versioning: pinning + user-level minor override

Security finding: `npx tool@latest` is a supply chain risk (2025 Shai-Hulud worm; March 2026 axios compromise). The hooks.json must pin an explicit version.

**Proposed model:**
- Plugin author ships hooks.json with `npx universal-plugin@1.2.3 prepare` (explicit pin)
- `universal-plugin@1.2.3` reads `~/.config/universal-plugin/config.json` for user-approved minor override
- If `approvedMinorVersion: "1.3.0"` is set, re-execs as `npx universal-plugin@1.3.0`
- No rewrite of plugin files; the override lives in user config

**Version bump model:**
- **Patch/minor** (`1.x.y`): `universal-plugin` notifies user; user runs `/universal-plugin accept-minor` to write override; next session uses new version
- **Major** (`2.x.y`): notify only; plugin author must ship new plugin version with updated pin

**Opt-out mechanism** (standard `update-notifier` pattern):
- `NO_UPDATE_NOTIFIER=1` or `UNI_PLUGIN_NO_UPDATE=1` env var
- `--no-update-notifier` CLI flag
- `"noUpdateNotifier": true` in `~/.config/universal-plugin/config.json`
- Auto-skip in CI (`CI=true`) and test (`NODE_ENV=test`) environments

### Uninstall / cleanup: design-limiting gap

No vendor has an uninstall hook. On Claude Code uninstall:
- `${PLUGIN_DATA}` deleted immediately (unless `--keep-data`)
- `~/.claude/plugins/installed_plugins.json` entry removed
- Cache marked orphaned, deleted after 7 days
- Synced artifacts in `~/.cursor/`, `~/.codex/`, etc.: **left in place, no notification**
- Codex additionally leaves orphaned entries in `~/.codex/hooks.json` (known bug #291)

Available cleanup approaches:

**Option A — `universal-plugin` as standalone plugin:**
Installed separately; its own SessionStart hook checks `~/.config/universal-plugin/manifests/` (install records) against `~/.claude/plugins/installed_plugins.json` to detect orphans and prompt cleanup.
- Pro: fully automated detection
- Con: requires separate install step before using any plugin

**Option B — Sentinel TTL (eventual consistency):**
Sentinel file includes a `renewBefore` timestamp. Any `universal-plugin prepare` call (from any plugin) scans all sentinels; if a sentinel is past its TTL, checks installed_plugins.json; if plugin gone, prompts cleanup.
- Pro: no separate install; works if at least one universal-plugin-using plugin is still installed
- Con: cleanup only triggers if another plugin's session-start hook fires; if all plugins uninstalled, orphans persist

**Option C — Explicit cleanup command (pragmatic fallback):**
Document: "Uninstalling from Claude Code does not auto-remove synced artifacts from other vendors. Run `npx universal-plugin cleanup <plugin-name>` to fully remove."
- Matches what compound-engineering-plugin does
- Honest about the limitation; does not over-promise automation

## Contradictions

- `workspaceOpen` (Cursor) seems like a secondary trigger but is a chicken-and-egg: Cursor can't fire a hook for a plugin it doesn't have yet
- `plugin-portability`'s session-start injection is mentioned in its docs but the `hooks/` directory is absent in the actual repo — the feature is planned, not implemented

## Open questions

- How does `universal-plugin` handle the case where the user has multiple plugins installed, each pinning different versions of `universal-plugin`? Does each version re-exec independently?
- Should cleanup be destructive (delete) or conservative (move to backup), given that compound-engineering-plugin chose backup?
- If a plugin is removed from Claude Code but the user intentionally keeps using it in Cursor, is cleanup the right default?
- What problems, exactly, are being solved? (User noted confusion about multiple distinct problems being conflated — needs structured decomposition before finalizing design.)

## Sources consulted

- tokenRollAI/acplugin — https://github.com/tokenRollAI/acplugin
- hiivmind/plugin-portability — https://github.com/hiivmind/plugin-portability
- everyinc/compound-engineering-plugin — https://github.com/everyinc/compound-engineering-plugin
- Claude Code hooks reference — https://code.claude.com/docs/en/hooks
- Claude Code plugins reference — https://code.claude.com/docs/en/plugins-reference
- Claude Code issue #11240 — https://github.com/anthropics/claude-code/issues/11240
- Cursor hooks reference — https://cursor.com/docs/hooks
- GitHub Copilot CLI hooks reference — https://docs.github.com/en/copilot/reference/hooks-configuration
- Codex hooks reference — https://developers.openai.com/codex/hooks
- sindresorhus/update-notifier — https://github.com/sindresorhus/update-notifier
- FailproofAI issue #291 — https://github.com/FailproofAI/failproofai/issues/291
- CISA npm supply chain advisory (Sept 2025) — https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem
