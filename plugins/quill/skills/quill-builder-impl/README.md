# quill-builder-impl

The Quill **Builder bar at the impl gate** — what an authored document must satisfy beyond conforming to its frozen scenarios. It fills the `builder-impl` governance slot in Quill's squad entry in `.agents/universal-plugin.json`, and **unions onto** `sdd:builder-impl-governance` (the generic conformance bar still applies; this adds what a per-scenario check cannot reach).

Loaded by name, never triggered by users. Two faces read it: `quill-doc-writer` reads it forward while authoring, and `quill-judge` reads it backward while running the impl gate.

It exists because Quill's four static checks are **scenario-scoped** — each reads only the passage its scenario names. Defect classes that hold *between* passages survive that scope intact, because every occurrence is well-formed on its own and only the pair fails:

- a **route skipping an option the document itself named** — the destination the scenario asserts is present, so the omission of a sibling never surfaces;
- a **term drifting past its subject class** — a verb of holding predicated of an act rather than a container, which still asserts whatever the scenario asked for;
- a **contradiction** between two passages — each claim is present as its own scenario requires, and only the pair is impossible.

The bar carries **two instruments**, split by how a verdict is reached, and both run once per document rather than once per scenario. The first defect above is **inspection**: the set is enumerable, the routing is enumerable, and a comparison settles it. The other two are **judgment** — deciding that a term has changed subject class, or that two claims cannot both hold, means reading as a reader, and no comparison settles that. They are the seed of a **defect catalog** whose remaining entries are specified but not yet authored.

A judged pass runs **blind, then scores**: it simulates a reader on one declared control-flow path without the catalog in hand, then grades that transcript against it, so a finding is evidence about a reader rather than an opinion about prose. Entries stay **advisory until calibrated** against documents this repo already accepts and already considers weak, and the producer may defend any finding as a deliberate violation. The catalog **detects defects and never certifies quality** — zero findings is not an endorsement.

The boundary against style is **evidence** at both instruments: a failure must quote both locations — each naming *where* it came from, not only what it said, and confirmed to be two different places — so *"this routing skips a member of the set it enumerated, here they are"* is reportable while *"this reads clumsy"* is not. Tone, register, length, word choice, and section order stay out of scope.

**Recurrence is retracted.** An earlier revision held a claim landed in two passages as a defect; it has no empirical warrant, and its prescribed fix — pointing back rather than restating — is the worse defect for a reader who arrives at the later passage first.

The complementary contracts are `design/doc-eval-model.md`, which defines both instruments, and `quill-builder-spec`, whose scenario-map rule requires a load-bearing claim be retrievable on each control-flow path that reaches it.
