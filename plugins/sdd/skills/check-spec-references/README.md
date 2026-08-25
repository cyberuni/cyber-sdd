# check-spec-references

Internal SDD skill — the concrete engine for the **spec-reference resolution check**. Walks every
`.md` under one project spec, resolves each explicitly-relative reference against the file's own
directory, and reports the ones that resolve to nothing.

```bash
node scripts/check-spec-references.mts --spec-dir <specDir>
```

Exits non-zero on any unresolved reference, reporting each as `file:line: <ref> -> <resolved path>` — naming the resolved path is the
point, since the reference as written is exactly what read as plausible during review. Two forms
are extracted: markdown link targets and inline-code spans, and only when the path begins `./` or
`../`. Bare paths, URLs, `~/`-relative paths, and anything inside a fenced code block are prose,
not references — which is what makes a repo-root-relative reference pass by construction. A
directory target resolves, trailing slash and all. A line carrying `<!-- spec-ref-ignore: why -->`
has none of its references extracted, for the one real false-positive class: prose quoting a path
relative to something other than the file it sits in.

Read-only; writes nothing. Run from `check-project-specs`' engine set. See [`SKILL.md`](./SKILL.md)
for the full contract; the `project-spec/check-spec-references` node of the SDD project spec
(repo-only) carries the frozen spec. Not user-invocable.
