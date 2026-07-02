@frozen
Feature: manage-model-runners — maintain the per-model runner agent-def family
  Unit suite for the manage-model-runners engine: an internal, non-invokable skill loaded by the
  manage gateway that adds, lists, and removes runner agent definitions (one per model) at their
  user-global canonical paths. Additive only — it never auto-removes a runner a target list omits.
  Authoring a bespoke single agent definition is define-agent; running the skills-under-test is a
  future eval-run capability. Cross-capability e2e scenarios live in ../../acceptance/.

  # ---- Reach ----

  Scenario: the engine is reached via the manage gateway, not a bare user invocation
    Given a user request to set up per-model runner agents
    When ACED routes the request
    Then the manage gateway loads manage-model-runners and the engine does not self-trigger from a bare user invocation

  # ---- add ----

  Scenario: add resolves and confirms the target model list before writing
    Given an add request with no explicit model list
    When manage-model-runners resolves the target models
    Then it proposes a model list from the curated config or the known model aliases and confirms it with the user rather than guessing

  Scenario: add creates a runner def for each model that has none
    Given a confirmed target model list and some models without a runner def
    When manage-model-runners runs add
    Then it creates one runner def for each target model that had no def

  Scenario: add is idempotent for models that already have a runner def
    Given a target model whose runner def already exists
    When manage-model-runners runs add
    Then it leaves the existing def untouched and creates no duplicate

  # ---- runner-def shape ----

  Scenario: the family varies over model only, one def per model
    Given a runner family for a set of models
    When manage-model-runners maintains it
    Then each model has exactly one runner def and effort is not a def axis

  Scenario: each runner def is a neutral executor pinned to its model
    Given manage-model-runners writes a runner def for a model
    When it drafts the def body
    Then the body is a neutral executor identical across the family, differing only in the pinned model

  Scenario: a runner def is written at its user-global canonical path with runtime symlinks
    Given manage-model-runners creates a runner def for a model
    When it writes the def
    Then the canonical file is written under the user-global agents path and one runtime symlink is created per selected runtime

  # ---- list ----

  Scenario: list reports the current runner family
    Given an existing runner family
    When manage-model-runners runs list
    Then it reports each model, its runner-def path, and any effort stamp

  # ---- remove (additive-only, never auto-remove) ----

  Scenario: remove deletes only the runner defs the user explicitly names
    Given a remove request naming a specific model
    When manage-model-runners runs remove
    Then it deletes only the named model's runner def and leaves the rest of the family intact

  Scenario: a model absent from a target list is never auto-removed
    Given a target model list that omits a model whose runner def exists
    When manage-model-runners runs add against that list
    Then it leaves the omitted model's runner def intact and reconcile-deletes nothing

  Scenario: a user-global runner def is deleted only after confirmation
    Given a remove request for an existing runner def
    When manage-model-runners carries it out
    Then it deletes the user-global file only after the user confirms

  # ---- optional effort stamp ----

  Scenario: an effort stamp may be applied to an existing runner def on request
    Given a request to stamp an effort on a model's runner def
    When manage-model-runners updates the def
    Then it writes the effort field on that def while keeping one def per model
