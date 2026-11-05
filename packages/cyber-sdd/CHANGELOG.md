# cyber-sdd-2

## 0.2.0

### Minor Changes

- b7ccdc9: `spec`: Write brackets each criterion with its strictest and most lenient reasonable reading and checks both against the use case's paths, applying the placement test before tightening. Review sends a criterion revised in two or more rounds through the placement test before revising it again.
- 34bca09: `spec`: a criterion's identity is its self-contained text. Its ID is a label; after the spec is first ready, changing the text (or a key term it names) retires the ID. Each criterion carries any context it depends on.
- 3b97743: `spec`: Derive tests may add a test that pins an encoding the spec leaves open, but changing what an existing test asserts goes to the owner. A new route sends a criterion whose verdict flipped on an unchanged state back to Write, to split its graph path after the placement test.
- 68ebed8: `spec`: the design spec holds the outcome and moves the encoding (names, codes, exit numbers, fields, flag syntax, wording) to the lower rung, unless the actor needs that particular encoding. It decides in prose only what building cannot settle. The `Adapters` group states what each adapter's actor needs, and tests pin the mapping to exit codes and streams.

## 0.1.0

### Minor Changes

- 55484fe: feat(sdd2): first release of SDD 2, with the `spec` skill
  
  `cyber-sdd-2@0.1.0` is a git tag, not an npm release: the package stays private, and the cyber-uni marketplace installs `sdd2` from this tag.
