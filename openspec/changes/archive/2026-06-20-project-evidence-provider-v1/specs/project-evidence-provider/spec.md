## ADDED Requirements

### Requirement: Project evidence provider SHALL discover explicit repo-local agent evidence
The system SHALL discover explicit agent-facing evidence from the current
repository without scanning arbitrary source files or external runtime stores.

#### Scenario: Known instruction files are discovered
- **WHEN** the current repository contains files such as `AGENTS.md`,
  `.github/copilot-instructions.md`, `.github/instructions/*.md`, or
  `.windsurf/rules/*.md`
- **THEN** the provider reports them as local project evidence
- **AND** each item includes a project-relative path and evidence source label

#### Scenario: Known skill workflow prompt and hook files are discovered
- **WHEN** the current repository contains files matching the provider's
  recognized agent-facing path allowlist for skills, workflows, prompts, hooks,
  or commands
- **THEN** the provider reports those files as local project evidence
- **AND** it identifies the file class when the path pattern is recognized
- **AND** it does not traverse outside the current repository root

#### Scenario: Arbitrary source files are not scanned
- **WHEN** the repository contains ordinary application source files
- **THEN** the provider does not classify them as agent evidence by keyword
  search alone
- **AND** it does not inflate asset counts with unrelated source files

### Requirement: Project evidence provider SHALL normalize evidence into reusable context assets
The system SHALL normalize discovered repo-local evidence into reusable context
asset inputs with explicit subtype, scope, source, provenance, status, and usage
metadata.

#### Scenario: Rule-like evidence becomes rule assets
- **WHEN** discovered evidence comes from recognized instruction or rule paths
- **THEN** the provider emits a reusable context asset with subtype `rule`
- **AND** the asset provenance references the project-relative file path

#### Scenario: Skill-like evidence becomes skill assets
- **WHEN** discovered evidence comes from recognized skill paths such as
  `SKILL.md` files under agent skill directories
- **THEN** the provider emits a reusable context asset with subtype `skill`
- **AND** the asset identity remains stable across repeated scans of the same
  path

#### Scenario: Command-like evidence becomes command assets
- **WHEN** discovered evidence comes from workflow, prompt, hook, or command-like
  paths
- **THEN** the provider emits a reusable context asset with subtype `command`
- **AND** it does not claim the command has been executed

#### Scenario: Ambiguous evidence remains unknown
- **WHEN** discovered evidence cannot be mapped to a known reusable asset subtype
- **THEN** the provider emits subtype `unknown`
- **AND** the asset remains visible with an explicit explanation instead of being
  silently dropped or defaulted

### Requirement: Project evidence provider SHALL expose provider status and diagnostics
The system SHALL expose provider-level status and diagnostics so consuming
surfaces can distinguish available, empty, partial, and unavailable evidence.

#### Scenario: Provider has evidence
- **WHEN** at least one recognized local evidence item is discovered
- **THEN** the provider status is `available`
- **AND** consuming surfaces can identify the evidence as repo-local rather than
  seed data

#### Scenario: Provider finds no evidence
- **WHEN** discovery completes but no recognized local evidence item exists
- **THEN** the provider status is `empty`
- **AND** consuming surfaces show explicit zero-state behavior rather than
  fabricated assets

#### Scenario: Provider has unreadable evidence
- **WHEN** one or more repo-local allowlist evidence paths cannot be read
- **THEN** the provider status is `partial` or `unavailable` depending on whether
  other evidence remains available
- **AND** diagnostics describe the unreadable evidence without leaking sensitive
  absolute paths

#### Scenario: Provider is unavailable
- **WHEN** provider discovery cannot run in the current environment
- **THEN** the provider status is `unavailable`
- **AND** consuming surfaces show unavailable cues instead of claiming complete
  local project coverage
