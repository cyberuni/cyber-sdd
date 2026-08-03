# quill-builder-impl

The Quill **Builder bar at the impl gate** — what an authored document must satisfy beyond conforming to its frozen scenarios. It fills the `builder-impl` governance slot in Quill's squad entry in `.agents/universal-plugin.json`, and **unions onto** `sdd:builder-impl-governance` (the generic conformance bar still applies; this adds what a per-scenario check cannot reach).

Loaded by name, never triggered by users. Two faces read it: `quill-doc-writer` reads it forward while authoring, and `quill-judge` reads it backward while running the impl gate.

It exists because Quill's four static checks are **scenario-scoped** — each reads only the passage its scenario names. Two defect classes survive that scope intact, because every occurrence is well-formed on its own and only the pair fails: a **claim restated** in a second passage (which satisfies its scenario twice, so an unquantified suite scores redundancy higher than concision), and a **term drifting past its subject class** (a verb of holding predicated of an act rather than a container, which still asserts whatever the scenario asked for). The bar grades both **once per document**, not once per scenario.

The boundary against style is **evidence**: a failure must quote both locations, so *"these two sentences land the same claim, here they are"* is reportable while *"this reads redundant"* is not. Tone, register, length, word choice, section order, and the mechanism-neighbor question in `explanation`-type prose stay out of scope — the last is writer-side, since no citation settles it.

The complementary contracts are `design/doc-eval-model.md`, which defines both inspection scopes, and `quill-builder-spec`, whose scenario-map rule quantifies a claim's place count in the spec so the suite itself stops paying for restatement.
