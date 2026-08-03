# Changes — documentation craft above the page level

## 2026-08-02 — dossier opened

**What changed:** initial investigation and conclusion.

**Why:** a live design problem — quill's per-page doc contract flagged a "claim stated twice" defect
in the Target article, and the reported defect turned out to be partly a false positive. Before
adjusting the criterion by taste, we wanted to know what the evidence actually supports, and
specifically which parts are safe to encode as automated gate criteria.

**Material findings:**

- Haviland & Clark's repetition null (E03) reframes the criterion: the measured cost is
  *unresolvable presupposition*, not *recurrence*. "A claim appears in exactly one place" loses its
  warrant.
- Gopen & Swan disclaim rule status for their own principles (E05), which rules out encoding
  old-before-new or any craft principle as a boolean check, and explains why a CFG plus a claim list
  cannot yield well-crafted prose.
- The reverse cohesion effect (E06) makes the right amount of redundancy audience-relative, which
  turns the checkable question into agreement-with-declared-audience rather than quantity.
- No site-level rubric with empirical grounding was found (E13); ordering and cross-page overlap are
  corpus-level judgment.

**Conclusion changed materially:** n/a — first entry.

**Weakest joint, recorded up front:** no empirical study was found on cross-page repetition in
documentation sets (E14). Every corpus-level recommendation is an inference from within-text
coherence results and is marked as such.

## 2026-08-02 — verdict 2 revised: lint vs judge

**What changed:** verdict 2 split. Previously "do not encode craft principles as gate criteria",
which over-generalized from the source. Now: no craft **lint**; a craft **judge** is admissible under
two conditions. Added E16–E18 and section D2 to `evidence.md`, plus verdict 2b (detect bad writing,
do not certify good writing).

**Why:** every primary source here predates LLM judges — 1974, 1990, 1996. Gopen & Swan's "no fixed
algorithm" has two stated reasons, and they do not fare alike under a nondeterministic
reader-simulator: the "too many expectations at once" reason is a claim about a *decision
procedure's* capacity and does not transfer; the "any expectation can be violated to good effect"
reason transfers intact and becomes a process requirement (a deliberate-violation defense) rather
than a bar to judging at all.

**Conclusion changed materially:** yes. The earlier verdict would have ruled out the craft tier that
the CR now proposes to build.

**Triggered by:** user challenge — the research predates the AI era, and an agent can make
nondeterministic judgments like a human given good instructions and process.

**Caveat carried forward:** E17 is our inference, not a finding. D2 records what would falsify it —
calibration against known-good and known-weak documents. The judged tier should not gate until that
has been run.

## 2026-08-02 — citation corrected: the warrant is a replication, not a null

**What changed:** E03 rewritten and E03b split out. The "19 ms in the wrong direction" figure was
attributed to Experiment II and described as the load-bearing result; both were wrong. Experiment II
is a *controlled replication* — the Indirect contexts were rewritten so the critical noun is repeated
without positing existence ("Andrew was especially fond of beer. / The beer was warm."), repetition
thereby equalized, and the effect held at 1031 vs 1168 ms, minF′(1,23)=15.7, p<.001. The 19 ms figure
is from Experiment III: a within-condition contrast among Direct-Antecedent pairs, t(47)=1.72, n.s.

Also: the headline effect size is now **137 ms** (Exp. II, repetition controlled), not 181 ms
(Exp. I, confounded with word repetition).

**Why it changed:** the numbers were questioned; re-reading the paper's Experiment II section showed
the mis-attribution.

**Conclusion changed materially:** no — the verdict is unchanged and is in fact better supported,
since repetition was excluded twice: once by design and once by a corroborating null. What changed is
which result carries it. A non-significant within-condition contrast cannot bear a design decision;
a controlled replication at p<.001 can.
