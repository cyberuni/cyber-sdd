Feature: SDD's plugin nature — manifest, workspace init, and the registry init-WRITE
  Unit suite for the plugin capability. Packaging, workspace-init, and contract-registry
  init-WRITE behaviors only — never the registry shape (design/) or its read/resolution
  (mission/). Cross-capability outcomes (register then resolve) live in ../acceptance/.

  # ── Ships-as-plugin manifest ──

  Scenario: the public manifest declares the plugin name and its pointers
    Given the SDD plugin directory
    When its public manifest is read
    Then the manifest declares the plugin name
    And it declares the skills and agents directory pointers

  # ── Workspace init ──

  Scenario: init ensures the tracked plan directory
    Given a repo with no plan directory
    When SDD init runs
    Then it creates the .agents/plans directory

  Scenario: init symlinks the Cursor plan path with a relative target
    Given a repo with no Cursor plan path
    When SDD init runs
    Then .cursor/plans is a symlink to ../.agents/plans

  Scenario: init leaves an already-correct symlink as-is
    Given a repo whose .cursor/plans already points to ../.agents/plans
    When SDD init runs again
    Then it leaves the symlink unchanged

  Scenario: init does not clobber a real Cursor plan directory
    Given a repo where .cursor/plans is a real directory with contents
    When SDD init runs
    Then it moves the contents into .agents/plans
    And it replaces .cursor/plans with the symlink without losing the contents

  # ── Contract-registry init-WRITE ──

  Scenario: init-write creates the registry file when it is missing
    Given a repo with no .agents/universal-plugin.json
    When a plugin's init-write runs
    Then it creates the registry file
    And it adds the plugin's sdd-plugins entry

  Scenario: init-write appends a new plugin entry
    Given a registry that has no entry for the plugin
    When the plugin's init-write runs
    Then it appends the plugin's entry

  Scenario: init-write replaces the plugin's existing entry
    Given a registry that already has an entry for the plugin
    When the plugin's init-write runs
    Then it replaces that entry in place

  Scenario: init-write fails closed on a malformed registry
    Given a registry file that contains malformed JSON
    When a plugin's init-write runs
    Then it fails with an error
    And it does not overwrite the file

  Scenario: init-write reconciles a stale entry on a version mismatch
    Given a registry entry whose version differs from the plugin's version
    When the plugin's init-write runs
    Then it updates the entry version
    And it brings the entry's squads to the current shape

  Scenario: init-write rewrites a legacy-shape entry to the squads shape
    Given a registry entry in the legacy domains-and-roles shape
    When the plugin's init-write runs
    Then it rewrites the entry to the squads shape

  Scenario: init-write preserves the other plugins' entries
    Given a registry holding entries for several plugins
    When one plugin's init-write runs
    Then the other entries are left unreordered and unreformatted
