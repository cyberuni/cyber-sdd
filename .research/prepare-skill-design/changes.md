# Changes — Prepare Skill Design

## 2026-06-06 — Initial research

- **What changed:** New topic created.
- **Why:** Investigating the best design for a `prepare` mechanism to sync plugins across vendors. Requirements: no package.json in user project, versioned npx invocation with minor auto-update and opt-out, analysis of acplugin/plugin-portability/compound-engineering-plugin, and vendor hook support for session-start/post-install triggers.
- **Conclusion changed materially:** N/A (first entry).
- **Evidence/source that triggered:** User requirements + web research on community tools and vendor hook documentation.
- **Note:** User identified that the design session conflated multiple distinct problems. Architecture needs restructuring once problems are decomposed. See open questions in topic.md.
