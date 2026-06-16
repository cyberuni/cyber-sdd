# Evidence — Prepare Skill Design

## E-PSD-01

- **Claim:** acplugin is a TypeScript CLI invokable via `npx @disdjj/acplugin convert .` with no package.json required in user project
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** acplugin GitHub repository
- **Source URL:** https://github.com/tokenRollAI/acplugin
- **Source type:** open source / code
- **Notes:** `bin.acplugin = "dist/index.js"`; CommonJS; supports `scan` and `convert` subcommands; interactive wizard when invoked without args

## E-PSD-02

- **Claim:** acplugin has no hook, no session-start trigger, and no sentinel file pattern — it is manual-only
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** acplugin GitHub repository (source code inspection)
- **Source URL:** https://github.com/tokenRollAI/acplugin
- **Source type:** open source / code
- **Notes:** `.claude/settings.local.json` in repo is dev permissions only; no `hooks` keys present

## E-PSD-03

- **Claim:** plugin-portability is a pure SKILL.md plugin with no binary, no Node.js runtime, and no npm install step
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** hiivmind/plugin-portability repository
- **Source URL:** https://github.com/hiivmind/plugin-portability
- **Source type:** open source / code
- **Notes:** `package.json` has no `bin`, no `scripts`, no `dependencies` — exists only as metadata carrier; actual logic is in SKILL.md

## E-PSD-04

- **Claim:** plugin-portability's session-start hook injection is mentioned in docs but the `hooks/` directory is absent from the repo
- **Date:** 2026-06-06
- **Status:** confirmed (feature planned, not implemented)
- **Confidence:** high
- **Source label:** hiivmind/plugin-portability repository (directory listing)
- **Source URL:** https://github.com/hiivmind/plugin-portability
- **Source type:** open source / code
- **Notes:** `.codex-plugin/plugin.json` references `"hooks": "./hooks/"` but directory not present

## E-PSD-05

- **Claim:** compound-engineering-plugin requires Bun; `npx` will fail because the bin entry points to a `.ts` file with a `#!/usr/bin/env bun` shebang and no compiled `dist/`
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** everyinc/compound-engineering-plugin repository
- **Source URL:** https://github.com/everyinc/compound-engineering-plugin
- **Source type:** open source / code
- **Notes:** `package.json` bin: `"compound-plugin": "src/index.ts"`; shebang confirmed in `src/index.ts`

## E-PSD-06

- **Claim:** compound-engineering-plugin uses explicit `bunx cleanup --target platform` for cleanup, moving artifacts to `legacy-backup/` rather than deleting
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** everyinc/compound-engineering-plugin repository
- **Source URL:** https://github.com/everyinc/compound-engineering-plugin
- **Source type:** open source / code
- **Notes:** Supported cleanup targets: codex, copilot, droid, qwen, opencode, pi, gemini, kiro

## E-PSD-07

- **Claim:** No Tier 1 vendor (Claude Code, Cursor, GitHub Copilot CLI, Codex) has a post-install or post-update plugin hook
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Vendor hook references (all four)
- **Source URL:** https://code.claude.com/docs/en/hooks, https://cursor.com/docs/hooks, https://docs.github.com/en/copilot/reference/hooks-configuration, https://developers.openai.com/codex/hooks
- **Source type:** official docs
- **Notes:** Claude Code feature request #11240 closed as dup; no public timeline

## E-PSD-08

- **Claim:** Claude Code's `Setup` hook fires only with explicit `--init-only`/`--init`/`--maintenance` flag, not automatically on plugin install
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Claude Code hooks reference
- **Source URL:** https://code.claude.com/docs/en/hooks
- **Source type:** official docs
- **Notes:** Supports only `command` and `mcp_tool` invocation types

## E-PSD-09

- **Claim:** On Claude Code plugin uninstall, `${PLUGIN_DATA}` is deleted immediately (unless `--keep-data`) and `installed_plugins.json` entry is removed; cache marked orphaned, deleted after 7 days
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Claude Code plugins reference
- **Source URL:** https://code.claude.com/docs/en/plugins-reference
- **Source type:** official docs
- **Notes:** Manually deleting plugin directory (not via CLI) breaks installed_plugins.json and marketplace.json — documented as bug #38714

## E-PSD-10

- **Claim:** Codex leaves orphaned entries in `~/.codex/hooks.json` when a plugin is uninstalled — known bug
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** FailproofAI issue #291
- **Source URL:** https://github.com/FailproofAI/failproofai/issues/291
- **Source type:** issue tracker
- **Notes:** failproofai's preuninstall script only cleans Claude Code; leaves orphaned entries in Codex, Copilot CLI, and Cursor

## E-PSD-11

- **Claim:** `update-notifier` (sindresorhus) is the standard Node.js pattern for notify-without-auto-update; used by npm itself and 5000+ packages
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** sindresorhus/update-notifier
- **Source URL:** https://github.com/sindresorhus/update-notifier
- **Source type:** open source / ecosystem standard
- **Notes:** Opt-out: `NO_UPDATE_NOTIFIER=1`, `CI=true`, `NODE_ENV=test`, `--no-update-notifier`; default check interval 24h; runs in unref'd child process

## E-PSD-12

- **Claim:** `npx tool@latest` is a supply chain risk; the 2025 Shai-Hulud worm and March 2026 axios compromise demonstrate that `@latest` in automated hooks is a meaningful attack vector
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** CISA advisory Sept 2025; Trend Micro axios report March 2026
- **Source URL:** https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem
- **Source type:** security advisory
- **Notes:** Explicit version pinning in SessionStart hooks is a security requirement, not just a preference

## E-PSD-13

- **Claim:** `~/.claude/plugins/installed_plugins.json` is a readable JSON file that records installed plugins and can be checked by a script to detect if a plugin is still installed
- **Date:** 2026-06-06
- **Status:** confirmed
- **Confidence:** high
- **Source label:** Claude Code plugins reference
- **Source URL:** https://code.claude.com/docs/en/plugins-reference
- **Source type:** official docs
- **Notes:** Removed on uninstall; presence/absence of entry is a reliable orphan detection signal for Claude Code as primary vendor
