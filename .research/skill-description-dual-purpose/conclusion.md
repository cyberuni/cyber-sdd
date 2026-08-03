# Skill/command description: trigger-matching vs display — cross-harness survey

Answers one question: does any major harness let an author supply **two separate strings** for a
skill/command — one purely for the model's auto-invocation matching, one purely for human-facing
display (command palette / `/` menu / listing) — or is there always a single `description` doing
both jobs?

Scope and citation conventions follow [Agent harness landscape — canonical comparison set](../agent-harness-landscape/conclusion.md).
Always-include tier checked in full: Claude Code, Cursor, Codex CLI, GitHub Copilot CLI, Gemini CLI.
Secondary tier checked for signal: Cline, OpenCode. Windsurf not checked (out of scope per the
landscape file's exclusion note; no time budget for it here).

Motivating tension (context, not a claim to verify): [ADR-0031](../../artifacts/adr/0031-selection-is-not-visibility.md)
makes a by-name skill's `description` the literal string `"By name only"` so nothing exists for the
model to match — but that string is useless if the same skill is also `user-invocable: true` and
needs to show something meaningful in a menu.

## Claude Code

- Single `description` frontmatter field on `SKILL.md`, used for both model-matching and (when not
  suppressed) display. High confidence.
  Source: [docs.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills), frontmatter
  reference table: `description` — "What the skill does... Claude uses this to decide when to load
  the skill."
- **`disable-model-invocation: true`** does not create a second string — it removes the *existing*
  description from Claude's context entirely, rather than swapping in an alternate display string.
  Quote (frontmatter behavior table): "`disable-model-invocation: true` | Yes [you can invoke] | No
  [Claude can invoke] | **Description not in context**, full skill loads when you invoke." High
  confidence, primary source, same page.
- Enforcement is **harness-guaranteed within Claude Code itself** (not merely advisory): the field
  structurally strips the description from what the model ever sees, so there is nothing to match
  against — confirmed by the same "Description not in context" line above, and by "Hide individual
  skills by adding `disable-model-invocation: true`... This removes the skill from Claude's context
  entirely." High confidence. Cross-harness enforcement is a separate question — this repo's own
  `apps/website/src/content/docs/agent-configuration/skills/commands.md` already documents that support for this flag
  is "not universal" (Copilot CLI, Codex CLI, Gemini CLI listed as not honoring it) — Medium
  confidence on that cross-harness table since it wasn't re-verified as part of this pass.
- `user-invocable: false` is the inverse: hides from the `/` menu, keeps the description in Claude's
  context for matching. Still one string, now visibility-gated rather than match-gated. Source: same
  page, "Control who invokes a skill" section.
- `skillOverrides` adds a `"name-only"` state ("Name and description" → "Name only" listed to Claude,
  still shown in `/` menu) — this trims what the *model* sees down to the name, it does not add a
  second human-facing string distinct from the (single) `description`. High confidence, same page,
  "Override skill visibility from settings" section.
- **Sub-question — is the legacy `commands/` folder structurally excluded from the auto-invocation
  matching pool?** Yes, per the harness's own framing of what `SKILL.md` *adds* over `commands/`:
  > "Skills add optional features: a directory for supporting files, frontmatter to control whether
  > you or Claude invokes them, and **the ability for Claude to load them automatically when
  > relevant**."
  This lists automatic loading as a capability `SKILL.md` skills gain *relative to* legacy
  `commands/` files — implying plain `commands/*.md` files were never in the candidate pool the model
  auto-matches against, independent of how rich their `description` is. High confidence, primary
  source: same page, top "Custom commands have been merged into skills" callout. This is a
  **structural exclusion**, not a two-field mechanism — see verdict section.
- **Sub-question — GitHub issue search.** No issue found on `anthropics/claude-code` requesting a
  dedicated "menu label separate from matching description" field. Searched terms including
  "display name", "separate from trigger", "label distinct from description". Closest hits are all
  about *truncation* of the single description (e.g. issue #44780: skill-creator validates against a
  1024-char spec limit but the `/skills` system-reminder listing truncates at 250 chars — a length
  mismatch, not a two-field request) and about the single description being silently dropped for some
  skills (issue #68677). Explicitly: **searched, found nothing on point.**

## Cursor

- Rules (`.mdc` files): single `description` field. Source:
  [cursor.com/docs/context/rules](https://cursor.com/docs/context/rules) — "Agent reads the
  description and pulls the rule in when relevant"; no separate label field documented. Cursor's own
  UI names the four modes (Always Apply / Apply Intelligently / Apply to Specific Files / Apply
  Manually) from `alwaysApply`/`description`/`globs` combinations, not from an author-supplied label.
  Medium-high confidence (fetched via summarizing tool, not a raw diff of the page, but corroborated
  by independent web-search results describing the same three-field schema).
- Skills (`SKILL.md`, agentskills-compatible): frontmatter is `name`, `description`
  ("Used by the agent to determine relevance"), `paths`, `disable-model-invocation`, `metadata`.
  Source: [cursor.com/docs/skills.md](https://cursor.com/docs/skills.md). `disable-model-invocation`
  works the same way as Claude Code's flag — gates matching, does not add a second string. No
  `display_name`/label field. High confidence.
- Commands (`.cursor/commands/*.md`): could not fetch `cursor.com/docs/agent/chat/commands.md`
  directly (404 on the `.md` URL variant); the HTML page confirmed only a bare `description` field in
  one example with no dual-field schema documented. Low-medium confidence on Commands specifically —
  flagged as not fully verified.
- GitHub issue search: no Cursor-specific issue tracker is public in the same way as Claude Code's
  (Cursor issues live on their private forum, not a public GitHub repo); searched
  `forum.cursor.com` via web search for "description field agent requested vs manual display label
  separate" — surfaced only general rules-authoring guides, no feature request found for a second
  field. Explicitly: **searched, found nothing on point.**

## Codex CLI (OpenAI)

- `SKILL.md`: `name` + `description`, description is "the only part of your skill loaded at startup"
  and is what the model matches against. Source:
  [developers.openai.com/codex/skills](https://developers.openai.com/codex/skills) (redirects to
  `learn.chatgpt.com/docs/build-skills`). High confidence.
- **`agents/openai.yaml`** (optional, sits alongside `SKILL.md`) documents a genuinely separate,
  structured schema — this is the one finding in this survey that looks like a real two-field
  mechanism:
  ```yaml
  interface:
    display_name: "Optional user-facing name"
    short_description: "Optional user-facing description"
    icon_small: "./assets/small-logo.svg"
    icon_large: "./assets/large-logo.png"
    brand_color: "#3B82F6"
    default_prompt: "Optional surrounding prompt to use the skill with"

  policy:
    allow_implicit_invocation: false

  dependencies:
    tools: [...]
  ```
  Quote: "Add `agents/openai.yaml` to configure UI metadata in the ChatGPT desktop app, to set
  invocation policy, and to declare tool dependencies." And on the policy field: "`allow_implicit_invocation`
  (default: `true`): When `false`, Codex won't implicitly invoke the skill based on user prompt;
  explicit `$skill` invocation still works." Source: same page, reproduced consistently across two
  independent fetches. Medium-high confidence on the schema's existence and wording; **Medium**
  confidence specifically on whether `interface.display_name` is what Codex **CLI's own terminal**
  slash/`$`-menu renders, versus being scoped to "the ChatGPT desktop app" surface as the quoted
  sentence literally says — this repo's investigation could not independently confirm the CLI-terminal
  menu consumes `display_name` (would require running Codex CLI locally with a skill carrying both
  fields, out of scope for a docs-only pass). Flagged explicitly as unverified rather than assumed.
- Deprecated custom prompts (`~/.codex/prompts/*.md`, pre-skills): `description` field only, "shown
  under the command name in the popup" — pure display, since custom prompts had **no auto-invocation
  concept at all** (explicit-only, like Gemini CLI below). Source:
  `developers.openai.com/codex/custom-prompts` (redirects to `learn.chatgpt.com/docs/custom-prompts`).
  High confidence.
- GitHub issue search on `openai/codex`: found issue **#13893**, "Add custom slash commands from
  SKILL.md" — a request to let `SKILL.md`-based skills also register as slash commands, adjacent to
  but not the same ask as separating matching-description from display-label. No issue found asking
  specifically to decouple `interface.display_name`/`short_description` from `description` (they are
  already decoupled by the existing `agents/openai.yaml` schema, which may be why no such request
  exists). Explicitly: **searched, found no distinct "separate the two" request** — plausibly because
  the schema above already provides it.

## GitHub Copilot CLI

- `SKILL.md`: `name` (required), `description` (required, "what the skill does, and when Copilot
  should use it"), `license` (optional), `allowed-tools`, `user-invocable`, `disable-model-invocation`
  (per this repo's own `commands.md` survey, Copilot CLI does *not* honor
  `disable-model-invocation` for skills — see that file's compatibility table). Single description
  field serves both matching and menu display; "Skills automatically appear as slash commands in
  chat. Type `/` to see all available skills." — same field is what's shown. Source:
  [docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills).
  High confidence on the field list; Medium on "no separate display field" since the fetched excerpt
  didn't show a dedicated menu-rendering spec, only the frontmatter reference and general prose.
- No separate display-label field documented anywhere in Copilot CLI's skills docs. No `interface`-
  style block analogous to Codex CLI's `agents/openai.yaml` was found.
- GitHub issue search: `docs.github.com` doesn't expose a public issue tracker the way
  `anthropics/claude-code` does for the CLI itself (issues go through GitHub feedback channels, not a
  browsable repo of feature requests for Copilot CLI skills specifically). Searched web for "Copilot
  CLI skill display name separate description" — no results on point. Explicitly: **searched, found
  nothing on point** (search surface itself is weaker for this harness — noted as a limitation, not a
  negative finding).

## Gemini CLI

- Custom commands (`.gemini/commands/*.toml` or `~/.gemini/commands/`): `prompt` (required) +
  `description` (optional, "brief, one-line description... displayed next to your command in the
  `/help` menu. If you omit this field, a generic description will be generated from the filename.").
  Source: [geminicli.com/docs/cli/custom-commands/](https://geminicli.com/docs/cli/custom-commands/).
  High confidence.
- Critical structural difference from the other four: Gemini CLI custom commands have **no
  model-driven auto-invocation concept at all** — they are strictly typed by the user as `/name`.
  There is no candidate pool the model matches descriptions against for these commands, so
  `description` is **purely a display string** by construction; the tension this research is
  investigating does not arise for Gemini CLI's command system because there is only ever one purpose
  to serve. High confidence, same source (no invocation-policy field of any kind exists in the
  documented TOML schema).
- This does not mean Gemini CLI has *no* concept of a harness-side model deciding to use something —
  Gemini CLI has tool-calling and MCP tool descriptions, which is a different mechanism (tool
  definitions, not user-authored skills/commands) and out of scope for this comparison.
- GitHub issue search on `google-gemini/gemini-cli`: not performed with a repo-scoped query in this
  pass (time-boxed); a general web search for "Gemini CLI custom command auto invoke description"
  turned up no evidence of any auto-invocation feature request or existing mechanism. Explicitly:
  **not exhaustively searched** — flagged as a gap rather than a verified negative.

## Secondary tier

### Cline

- `SKILL.md`: `name` + `description` ("tells Cline when to use this skill (max 1024 characters)").
  No separate display-label field documented. Source:
  [docs.cline.bot/customization/skills](https://docs.cline.bot/customization/skills). Medium-high
  confidence (fetched via summarizing tool). Cline does document an invocation-mode concept
  (`user`-only vs `auto`) similar to Claude Code's `disable-model-invocation`, gating the same single
  description rather than supplying a second string.

### OpenCode

- Commands (`.opencode/commands/*.md`): frontmatter includes `description`, `agent`, `subtask`, etc.
  "The description field is the most important — it needs to be specific enough that the agent can
  decide relevance without reading the body." Single field, dual-purpose (matching + whatever listing
  OpenCode shows). No separate display field found. Source:
  [opencode.ai/docs/commands/](https://opencode.ai/docs/commands/) and
  [opencode.ai/docs/skills/](https://opencode.ai/docs/skills/), corroborated via web search. Medium
  confidence — not fetched directly, summarized from search snippets only.

## Verdict

Direct, unambiguous, per always-include harness — does it support trigger/display description
separation **today**:

| Harness | Verdict | Strongest evidence |
| --- | --- | --- |
| **Claude Code** | **NO** — one `description` field. What it *does* have is a structural exclusion (legacy `commands/` folder was never in the model's auto-match candidate pool) and a suppression flag (`disable-model-invocation`) that removes the description from context rather than replacing it with a display string. | `docs.claude.com/docs/en/skills`: "Skills add... the ability for Claude to load them automatically when relevant" (framed as something `commands/` lacks) + `disable-model-invocation` table row "Description not in context." |
| **Cursor** | **NO** — one `description` field for both Rules and Skills; `disable-model-invocation` gates matching the same way Claude Code's does, no second string. | `cursor.com/docs/skills.md`: `description` — "Used by the agent to determine relevance," no `display_name`/label field in the schema. |
| **Codex CLI** | **YES** — the only harness surveyed with a genuine two-field mechanism: `SKILL.md`'s `description` (matching) is structurally distinct from `agents/openai.yaml`'s `interface.display_name` / `interface.short_description` (human-facing), plus an independent `policy.allow_implicit_invocation` switch. Caveat: primary source frames `display_name` as configuring "UI metadata in the ChatGPT desktop app" — this survey could not independently confirm Codex CLI's own terminal menu (vs. the ChatGPT app) renders `display_name`, so treat the CLI-terminal-menu part as Medium confidence, not High. | `learn.chatgpt.com/docs/build-skills` (redirect target of `developers.openai.com/codex/skills`): the `interface.display_name` / `interface.short_description` / `policy.allow_implicit_invocation` YAML schema, quoted verbatim above. |
| **GitHub Copilot CLI** | **NO** — one required `description` field, doubles as matching signal and what's shown when typing `/` in chat. | `docs.github.com/.../add-skills`: "description (required): A description of what the skill does, and when Copilot should use it" + "Skills automatically appear as slash commands in chat." |
| **Gemini CLI** | **NO, but the tension doesn't apply** — custom commands have no auto-invocation concept at all, so the single `description` is purely a display string by construction; there is no second purpose to separate it from. | `geminicli.com/docs/cli/custom-commands/`: `description` — "This text will be displayed next to your command in the `/help` menu" — no invocation-policy field exists in the schema. |

**Bottom line:** among the five always-include harnesses, four have exactly one `description` field
doing double duty, with Claude Code's `commands/`-folder exclusion being the closest thing to a
practical workaround (it achieves the same *effect* as two strings — a rich human-facing description
with zero auto-match risk — by removing the field from the matching pool entirely, not by adding a
second field). **Codex CLI is the one exception**: its `agents/openai.yaml` `interface.display_name`
/ `short_description` fields are a real, separate, author-supplied string from `SKILL.md`'s
`description`, plus an explicit `allow_implicit_invocation` toggle independent of that string. This
is the closest primary-sourced precedent found for the two-string mechanism the ADR-0031 tension is
asking about — but it is scoped by OpenAI's own docs to "UI metadata in the ChatGPT desktop app," and
this survey did not verify it renders in Codex CLI's own terminal-menu surface, so it should not be
cited as a fully-proven cross-surface precedent without that follow-up check.
