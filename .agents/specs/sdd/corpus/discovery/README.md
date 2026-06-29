---
spec-type: behavioral
---

# discovery — find specs by shape, not location

The **discovery** procedure: locate the project specs in a repo by their **shape, not their
location**. A spec is any git-tracked `spec.md` whose frontmatter `status` is in the lifecycle enum.
Consumers glob `**/spec.md`, filter to those carrying a lifecycle `status`, and match a requested
name to a spec's **folder slug** (its root-relative path). No specs root is hardcoded, no
`specs/<domain>/` convention is assumed, and no registry, array, or index of paths is ever consulted
— discovery is a **pure derivation**, so no second place can drift.

## Use Cases

**Subject** — deriving the set of project specs in a repo, and resolving a name to one of them.
**Non-goals** — it reads no runtime behavior, owns no lifecycle state, and never writes. It locates
specs; it does not summarize them (that is `digest`) or compare them (that is `dedupe-specs`).

| Trigger | Inputs | Outcome |
|---|---|---|
| **list the specs** — a tool needs the corpus set | a repo root | every git-tracked `spec.md` carrying a lifecycle `status`, keyed by folder slug |
| **resolve a name** — a request names one spec | a repo root + a name | the spec whose folder slug matches; an ambiguous match is disambiguated with the user, never guessed |

Every scenario in [`discovery.feature`](./discovery.feature) maps to one of these two entry points.

## How a spec is recognized

The deciding factor is the frontmatter, not the path:

- A `spec.md` carrying a lifecycle `status` **is** a spec, wherever it sits in the tree (including a
  nested project).
- A `spec.md`-shaped file with no lifecycle `status` is **not** a spec and is skipped.
- The name match is against the **folder slug** (root-relative path), so a spec moved to a new
  location is still found by shape — there is no path list to update.

The lifecycle-`status` convention is owned by [`../../design/`](../../design/); discovery's
consumers defer to it rather than restate it.
