# Changes — Use-Case Elicitation

## 2026-08-11 — Initial research

- **What changed:** New topic created.
- **Why:** Investigating a reported weakness in SDD's spec creation — the spec-producer accepts a
  change request's stated framing rather than digging into the real situations behind it — and
  investigating a discovered naming mismatch: `sdd:spec-format-governance`'s `## Use Cases`
  section is an API-surface entry-point inventory, not a use case in the requirements-engineering
  sense. Surveyed two clusters: (1) established requirements-elicitation methodology (Jacobson,
  Cockburn, JTBD, story mapping, event storming, impact mapping, example mapping/BDD discovery,
  design-doc/RFC practice) and (2) shipped agent-spec tooling and local skills (spec-kit, Kiro,
  BMAD-METHOD, Claude Code Superpowers, and this machine's `grilling`/`to-spec`/`triage`/
  `wayfinder` skills, plus SDD's own `spec-format-governance`/`spec-producer-governance`/
  `start-mission`).
- **Conclusion changed materially:** N/A (first entry).
- **Evidence/source that triggered:** Task brief from the SDD design investigation; web research
  (WebSearch/WebFetch) against primary sources where reachable (GitHub repos, vendor docs,
  authors' own sites), triangulated secondary sources where primary text was unavailable, plus
  direct reads of local `~/.claude/skills/*` files and this repo's `plugins/sdd/skills/*`
  governance files.
- **Note:** `bmad-orchestrator` on this machine (`~/.claude/skills/bmad-orchestrator`) is a broken
  symlink to a nonexistent `.agents/skills/bmad-orchestrator` path — could not be read locally.
  All BMAD findings in this dossier are sourced from the upstream `bmad-code-org/BMAD-METHOD`
  repo instead (see E32). A follow-up pass should either repair the symlink or explicitly confirm
  no local content was lost.
