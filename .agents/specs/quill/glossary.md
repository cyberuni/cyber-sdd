# glossary — Quill ubiquitous language

The documentation-eval vocabulary: artifact-type, doc-eval check, frozen `.feature`, reader path, the
production-chain roles.

## Subject

The ubiquitous language of documentation evaluation — the terms every Quill capability and its specs use with
one fixed meaning. The contract surface is the set of definitions below; conformance is verified **through the
consuming capabilities** (a term is "correct" when the `sdd-roles` delegates and `registry` use it as
defined), not by a `.feature` of its own.

| Term | Meaning |
|---|---|
| **documentation artifact** | A unit of documentation under evaluation: a guide, tutorial, article, reference page, or README. The eval subject. |
| **artifact-type** | The squad key naming what kind of doc a file is (`documentation`, `guide`, `tutorial`, `article`, `reference`) — how SDD resolves the Quill production chain for it. |
| **doc-eval check** | One of the four scenario-scoped static-inspection checks (existence, structure, completeness, reader-path) a scenario is verified by. |
| **instrument** | One of the two ways a document reaches a verdict: **inspection** (comparing two structured artifacts; boolean) or **judgment** (simulating a reader; graded). The split is by what decides the verdict, not by which file a criterion lives in. |
| **integrity pass** | The document-scoped pass, run once per document against `quill-builder-impl` because it grades relations *between* passages no scenario reads. It carries one inspection rule — a route reaching every option the document named — and the judged defect catalog. |
| **defect catalog** | The judged instrument's anchor: nine named prose defects in three groups (what the reader cannot retrieve; what misrepresents what they already have; where the document disagrees with its spec). It detects defects and never certifies quality. |
| **near-miss** | The case an entry looks like but must *not* fire on. Every catalog entry carries one; without it an entry is a style opinion with a rubric attached. |
| **calibration** | Running a catalog entry against documents the repo already accepts and already considers weak, and reporting its false-positive rate. An entry is advisory until calibrated and blocks only afterward. |
| **existence check** | Verifies the target document exists at the declared project-root-relative path. |
| **structure check** | Verifies the required headings / sections named by a scenario are present. |
| **completeness check** | Verifies the document has no placeholder text (`TBD`, `TODO`, `FIXME`) and no empty section. |
| **reader path** | A sequential flow through a document that must reach its stated outcome without gaps or undeclared prerequisites. |
| **frozen `.feature`** | The document's behavior contract, frozen at the spec gate; the impl-judge's independent anchor. |
| **acceptance check** | A per-scenario verification the impl-producer records and the impl-judge runs — never authored by the judge. |
| **spec-producer** | The role (`quill-spec-writer`) that authors `spec.md` + the boolean `.feature` for a doc artifact. |
| **impl-producer** | The role (`quill-doc-writer`) that writes the document and its acceptance checks against the frozen `.feature`. |
| **impl-judge** | The role (`quill-judge`) that runs the acceptance checks per frozen scenario and reports pass/fail. |
