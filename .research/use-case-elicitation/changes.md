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

## 2026-08-11 — Correction: keep the name, fix the definition

- **What changed:** Recommendation 1 of `conclusion.md` ("rename `## Use Cases` to something honest
  about what it is, e.g. `## Entry Points`") is **withdrawn**. The corrected recommendation is the
  opposite: **keep the name and restore the definition** to carry actor, goal, and — critically —
  **extensions**.
- **Why:** The dossier inferred the section was misnamed, reasoning that the entry-point job is
  legitimate and the use-case name was pulling a second job into the same box. Git history refutes
  the inference about intent. The definition was authored as an entry point from the start
  (`ba974085`, 2026-06-23, "define use case and scenario as distinct concepts"; carried into
  `spec-format-governance` at `c61ee525`, 2026-06-27), by the project owner, and the owner has read
  the section as a use case ever since. So the name records the intent and the **definition** is
  what was too narrow — not the reverse. Renaming would have entrenched the smaller job and
  discarded the one actually wanted.
- **Conclusion changed materially:** Yes — recommendation 1 inverted. Recommendations 2–5 stand.
  The falsifiable/facilitation split (the dossier's load-bearing finding) is unaffected.
- **Evidence/source that triggered:** `git log --follow` over
  `plugins/sdd/skills/spec-format-governance/SKILL.md` back to its origin, plus the owner's own
  account of what he had been reading the section to mean.
- **Bearing on E01/E04:** Jacobson's and Cockburn's **extensions** field — the alternate, error, and
  divergence paths — is the specific missing element. It is where "what can go wrong for this
  actor" and "which of these inputs may be combined" live. SDD's trigger / inputs / outcome row has
  no room for it, which is why surface-level design interrogation (per-input justification, failure
  modes, valid combinations) has no home in a spec today.
