---
"cyber-sdd": minor
---

`start-mission` now splits its governance bars into an entry set the conductor reads before intake
and a deferred set it reads at the decision that invokes them, and requires the conductor to declare
the set it actually loaded.

The entry set — lifecycle, ownership, spec-format, suite-format, spec-producer, combat-log,
gate-validation — governs every mission, so reaching intake without it means acting unbound.
Remediation (on a `change` verdict) and impl-producer (at deliver) stay deferred: naming a governance
is not loading it. The split is by **reach, not phase** — `gate-validation` fires only at a gate yet
belongs to the entry set, because the spec-judge's pre-flight derives its expected set from its own
fixed-universal floor and checks it against the relayed producer declaration, so deferring it would
fail that pre-flight by construction.

The declaration makes the load visible: a skipped governance and a correctly loaded one no longer
look identical from outside. It is the conductor's own declaration, recorded separately from the
`producer_governances_declared` set it relays.
