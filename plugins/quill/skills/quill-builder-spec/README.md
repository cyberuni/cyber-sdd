# quill-builder-spec

The Quill **Builder bar at the spec gate** — what a documentation spec must contain to be a complete contract. It fills the `builder-spec` governance slot in Quill's squad entry in `.agents/universal-plugin.json`, and **unions onto** `sdd:builder-spec-governance` (the generic testability and coverage bar still applies; this adds the documentation-specific requirements).

Loaded by name, never triggered by users. Two faces read it: `quill-spec-writer` reads it forward to self-align while authoring, and the spec gate reads it backward to grade. Quill leaves `spec-judge` unbound, so that slot degenerates to the SDD default cold judge (`sdd-spec-judge`), which grades this bar backward like any other resolved bar.

It specifies the shape of a documentation `spec.md`: an **audience table** (a role plus a goal, with the rule that an audience carrying no reader entry point is not an audience), a declared **doc type** (tutorial / how-to / reference / explanation, since the type sets what "good" means), a **north star** carrying a falsifiable failure mode, **why the document exists**, the **key points** it is incomplete without, **non-goals** with forwarding addresses, and **prerequisites**. It also fixes what a doc spec must *never* freeze — section order, wording, specific examples, tone — because a spec that freezes prose breaks on every honest revision while catching no real defect.

The complementary contract is `design/doc-eval-model.md`, which defines the four static checks (existence, structure, completeness, reader-path) every scenario must be verifiable by; this skill defines what the spec around those scenarios must say.
