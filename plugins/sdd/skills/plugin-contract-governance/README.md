# plugin-contract-governance

Internal SDD governance (`user-invocable: false`). The **plugin contract** — what an SDD plugin must
implement: the five delegate roles (closed set), the per-role governance loadout (the Model-B
`(actor, gate)` bars + the fixed-universal set), and the `sdd-plugins[]` registry entry shape +
resolution by `artifact-type`.

A **single-owner** governance — its consumer family is the plugin/conductor resolution surface, so it
lives under `plugin/`, not `common-governances/`. Loaded by the conductor and by plugin authors. The
universal-plugin *format* is `plugin-design` (out of scope); resolution/composition mechanics are the
`resolve-governances` skill; the actor bars are the shipped
`sdd:{oracle,builder,architect}-{spec,impl}-governance` skills. Not triggered by users directly.
