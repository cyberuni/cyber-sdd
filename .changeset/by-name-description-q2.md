---
"cyber-aced": patch
---

`improve-skill`'s validate engine no longer flags a description of exactly `"By name only"` as too short. That description marks a by-name skill on its own (ADR-0031), so a visible by-name skill such as `bench` passes Q2 without padding its description or hiding the command.
