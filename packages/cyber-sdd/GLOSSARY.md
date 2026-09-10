# glossary — SDD 2 ubiquitous language

SDD 2 is the two-set instance of the [truss](https://github.com/cyberuni/cyber-truss)
model, so most of this vocabulary is **inherited** from that model rather than coined here.
Terms marked *(SDD 2)* are ours; the rest are truss's and must not drift from it.

This is deliberately **not** `.agents/specs/sdd/glossary.md`. That file is v1's ubiquitous
language, and v1 does not speak this vocabulary.

## The two nouns

Keep these apart. Conflating them is the most common misreading of the model, and truss's own
glossary invites it (see [Upstream](#upstream)).

- **connection** — a **relation between two artifact-sets that must hold**. Undirected, declared
  once, and standing: a connection is never consumed. It survives every evaluation and every
  discharge.
- **strain** — a **condition**, not a thing: the state of a connection whose relation does not
  currently hold *for a given criterion*. Typed `completeness` / `obligation` / `conformance`
  (C22). Raised by evaluation, removed by discharge — and the connection remains either way.

> **A connection is not a strain.** Discharge removes the strain and leaves the connection
> standing; that is the quickest test. And one connection carries many criteria with **one verdict
> per criterion** (C5, C26), so several independent strains can sit on one connection at once —
> which is incoherent if strain is a kind of connection.

## The connection lifecycle

One verb per step, and none of them makes the connection an actor. A connection is a
relation that must hold — never a handler, never a trigger. Procedural framing needs one
path per direction and loses confluence immediately.

> A change to `{test}` **unsettles** the `{spec} ↔ {test}` connection. The connection is
> **evaluated**. Either the relation **holds**, or **strain is raised**. The strain is
> **discharged** at a discharge point, and the connection is **settled**.

- **unsettle** *(SDD 2)* — what a delta does to a connection: puts it in a state where it
  is no longer known to be settled, and so must be evaluated. Deliberately
  **outcome-neutral** — it does not claim the relation broke, only that the question is
  open. The inverse of truss's *settles*.
- **evaluate** — what is done *to* a connection to learn whether its relation holds. The
  subject of the active verb is always the evaluator (a controller, a check, a judge),
  never the connection.
- **holds** / **strained** / **unevaluated** / **declined** — the four verdicts evaluation can
  yield (C26). `unevaluated` never reports as `holds`.
- **raise** — what a delta does to strain, once evaluation has found the relation broken.
- **discharge** — resolving strain, at a point the workflow names.
- **settle** — the state a connection returns to once discharged.

## Repair

- **repair direction** *(SDD 2)* — which end of a connection a repair is made on. It is a
  property of **the repair**, never of the connection: connections are undirected, and
  direction is a property of where the delta landed. Restoring a relation by amending
  criteria is as legitimate as amending the implementation, which is precisely why an
  upward repair needs an authority check rather than a prohibition.
  - **downward repair** — the delta landed in `{code, test, story}` and the repair is made
    there too. The ordinary case.
  - **upward repair** — the delta landed in the implementation set and the repair is made
    on `{spec}`, by amending criteria. Legitimate, and the shape a ratchet-down also takes,
    so it is the case that must be graded rather than waved through.

## Owner

- **owner** *(SDD 2)* — who may amend a criterion. Three values: **node** (the default —
  the node's producer may amend, subject to review of the criteria diff), **user**
  (v1's `@pinned`: propose only, never execute without in-session authorization), and
  **governance** (inherited from a cross-cutting rule the node does not own).
- **upward-repair scoping rule** *(SDD 2)* — an upward repair on an **inherited** criterion
  puts the **owner** in the mission's touch-set. Autonomy is then graded by the machinery
  that already exists: `blast-estimate` measures the owner's dependency fan-in, and the
  leash grades on that blast. A corpus-wide governance reads high and narrows the leash to
  stop-and-ask; a low-fan-in owner reads low and the agent self-asserts with a ledger
  record for async review. No second autonomy bar, and the grading is computed rather than
  judged.

## Terms deliberately not used

| Term | Why not |
|---|---|
| **trigger**, **handler**, **fire** | A connection states a relation that must hold. Procedural framing needs one path per direction and loses confluence. Use *unsettle* for the occasion and *evaluate* for the act. |
| **raises strain** *for the occasion of an evaluation* | Prejudges the outcome. A delta unsettles a connection; strain is raised only once evaluation finds the relation broken. |
| **direction** *on a connection* | Direction belongs to the repair, not the relation. See *repair direction*. |
| **approve** *for the autonomy bar* | `approval` is the gate **event** (`approval.<gate>: { verdict, by }`); the **leash** is the latitude. Two distinct things, both load-bearing. |

## Upstream

Two items belong in truss's own model glossary rather than here.

- **repair direction** is a general model term, not an SDD-specific one. It is recorded here
  because this is where it was coined.
- **strain is a condition, not a connection.** Truss defines it as *"a connection whose relation
  does not currently hold"*, which reads as making strain a kind of connection. Every other use in
  truss treats it as a condition: strain is *raised*, *carried across a crossing*, and
  *discharged*, none of which a connection does, and all of which it survives. SDD 2 uses the
  condition reading, and C5 and C26 require it.
