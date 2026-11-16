# Split a spec

Loaded by the `spec` skill's Write mode when a spec is split into a parent and child specs.

Decide the line once the use cases are settled, and move the text once every section is agreed, so a revision never
straddles files.

1. Table the tasks, the sections each needs, and its share of the spec. Split only when most shares are under half.
2. Put in the parent what every task needs: the What, Non-goals, Key terms, Actors, the criteria groups that span
   children (such as `Adapters` or the output contract), the open questions they share, References, and a table
   linking each child with its use cases.
3. Give each child its use cases, the criteria groups bound to them, its open questions, a title naming its own
   outcome, and a line linking the parent's terms. A child is never read without its parent.
4. Keep every ID: IDs are shared across the parent and its children, and a retired one stays retired. Move each graph
   edge with the criteria that cite it; edges several children cite stay in the parent's `graph.md`.
5. Make the split a commit of its own that moves text without rewording it, and check that no line was lost.
