# Gherkin UI Testing Changes

## 2026-07-11

- Changed: initial research created (draft mode) and saved to `.research/gherkin-ui-testing/`.
- Why: user asked for deep research on whether Gherkin is good for UI testing, extensions, and alternatives; then asked to dig into writing-better-Gherkin guidance and expand extensions before saving.
- Material conclusion change: n/a (first save).
- Trigger: initial WebSearch/WebFetch sweep (E1-E9) plus a follow-up deep-dive sweep (E10-E17) on concrete Gherkin style rules, Three Amigos/Example Mapping, Screenplay Pattern detail, and tooling (gherkin-lint, Reqnroll, CucumberStudio).

## 2026-07-11 (same day, second update)

- Changed: added a dedicated Screenplay-vs-POM deep-dive section to topic.md and conclusion.md, with 3 new independent evidence entries (E18-E20).
- Why: user asked to dig further into Screenplay vs. POM specifically, since the initial write-up flagged that claim as resting on a single ecosystem's sources (Serenity/JS docs).
- Material conclusion change: yes — confidence in "Screenplay scales better than POM" raised from single-source to independently-corroborated (still qualitative, not benchmarked); added concrete failure mechanisms (page-method explosion, logic leakage, screen-vs-task reuse) and concrete costs (learning curve, adoption size, historically thin docs) that weren't in the first pass.
- Trigger: WebFetch of gunashekarr11 Medium comparison (E18), jberri.gitlab.io critical review (E19), and Cucumber's own "Understanding Screenplay part 1" (E20).

## 2026-07-11 (same day, third update)

- Changed: added a new "Bridging Gherkin to Playwright and Vitest Browser Mode" findings section to topic.md and a matching verdict section to conclusion.md, with 6 new evidence entries (E21-E26) covering playwright-bdd, Serenity/JS's Playwright Test integration, QuickPickle (+ its `/playwright` and `/vitest-browser` companions), and vitest-cucumber's browser mode.
- Why: user asked specifically whether Serenity/JS or alternatives can bridge Gherkin to Playwright or Vitest Browser Mode.
- Material conclusion change: yes — new finding that Playwright plays two distinct roles across these tools (test runner vs. mere browser driver/provider), which is the more decision-relevant axis than "does it support Gherkin." Recommends playwright-bdd for Playwright-first suites and vitest-cucumber (over QuickPickle, pending stability) for Vitest-first suites; clarifies Serenity/JS's Gherkin support is optional/narrow, not its main value proposition.
- Trigger: WebFetch/WebSearch on playwright-bdd (GitHub + TestDino writeup), Serenity/JS Playwright Test handbook + cucumber-playwright template, QuickPickle GitHub + npm page for @quickpickle/playwright, and vitest-cucumber's browser-mode docs.
