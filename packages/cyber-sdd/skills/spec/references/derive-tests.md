# Derive tests

Loaded by the `spec` skill's Derive tests mode.

Build tests from the criteria list, one test or group per criterion ID, as native, deterministic tests of the
project's own test stack. Put the criterion ID in the name of its test or group. Do not write a feature file for an
agent to run: an agent running prose scenarios spends tokens on every run and cannot be relied on to follow them. A
criterion of a skill-instruction use case is the exception: an eval run of the skill checks it. Any other criterion
that cannot become such a test fails C5; send it back to Write instead of guessing.

Lower-rung writes may add, never change. A test that pins an encoding the spec leaves open, such as the exit code for
an outcome, is the build adding to a lower rung: a minor change, made freely. Changing what an existing test
asserts is a breaking change: take it to the owner instead of making it.
