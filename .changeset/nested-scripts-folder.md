---
"cyber-aced": patch
---

`improve-skill`'s validate engine no longer crashes with `EISDIR` when a skill's `scripts/` holds a subfolder such as `scripts/vendor/`. It walks the subfolders, so the Q11 and E9 script checks also cover nested scripts.
