## Purpose

Define the accepted behavior for `Project Overview` as the project-level
governance and routing surface. The overview summarizes project-scoped agent
context, highlights attention items, and routes users into the owning surfaces
without becoming an inventory, transcript viewer, or workflow execution page.

## Requirements

### Requirement: Project Overview SHALL provide a governance foundation surface
The system SHALL present `Project Overview` as a project-level governance and routing surface, not a static placeholder or a session-first homepage.

#### Scenario: Overview shows governance module spine
- **WHEN** the user opens `Project Overview`
- **THEN** the page shows the Project Header, Context Snapshot, In-Effect Assets, Recent Sessions, Attention Needed, and Quick Actions modules when data is available
- **AND** each module uses compact summary content rather than detailed inventories or workflow internals

#### Scenario: Overview preserves product subject
- **WHEN** the user opens the app without session URL parameters
- **THEN** `Project Overview` remains the default landing page
- **AND** the page frames the subject as project-scoped agent context rather than a single session

### Requirement: Project Overview SHALL derive a compact context snapshot
The system SHALL derive a compact context snapshot that summarizes what agent-relevant context exists in the current project.

#### Scenario: Snapshot summarizes context classes
- **WHEN** session, asset, analysis, or backup-migration summary data is available
- **THEN** the Context Snapshot shows compact counts or status cues for the relevant classes
- **AND** each cue routes to the owning page for detailed inspection

#### Scenario: Snapshot does not fabricate unavailable data
- **WHEN** a provider or summary input is unavailable
- **THEN** the Context Snapshot shows an explicit unknown, unavailable, or zero-state cue
- **AND** it does not invent counts, sessions, assets, findings, or workflow results

### Requirement: Project Overview SHALL show in-effect assets as compact routed summaries
The system SHALL show reusable context assets that currently matter to the project in compact form.

#### Scenario: In-effect assets route to Assets
- **WHEN** in-effect rule, memory, skill, or command summaries are available
- **THEN** the In-Effect Assets module shows asset identity, subtype, scope or provenance cue, and status
- **AND** selecting an item routes to `Assets` with explicit object or filter handoff context

#### Scenario: In-effect assets does not become inventory
- **WHEN** many reusable context assets exist
- **THEN** the In-Effect Assets module remains a capped summary
- **AND** it routes to `Assets` for full inventory, body, provenance, and usage detail

### Requirement: Project Overview SHALL show recent sessions without becoming Sessions
The system SHALL show recent session activity as compact project context, while keeping full evidence review inside `Sessions`.

#### Scenario: Recent sessions route to Sessions
- **WHEN** recent session summaries are available
- **THEN** the Recent Sessions module shows compact session identity, source, recency or status cue, and route target
- **AND** selecting a session routes to `Sessions` with explicit session selection context

#### Scenario: Recent sessions excludes transcript detail
- **WHEN** rendering recent session summaries
- **THEN** the module does not render transcript excerpts, tool output detail, or long session lists

### Requirement: Project Overview SHALL prioritize attention items in issue states
The system SHALL surface the highest-priority governance issues in `Attention Needed` and route users to the owning correction or review surface.

#### Scenario: Issue state prioritizes Attention Needed
- **WHEN** high-priority conflicts, stale assets, failed validation, missing provenance, or backup risk exists
- **THEN** `Attention Needed` becomes the primary issue summary block on Overview
- **AND** it remains above or more prominent than Recent Sessions in the issue state

#### Scenario: Attention item routes to owning surface
- **WHEN** the user selects an attention item
- **THEN** the app routes to `Analysis`, `Assets`, `Sessions`, or `Backup / Migration` with compact issue, object, filter, or workflow context
- **AND** Overview does not expose the full finding table, asset editor, transcript evidence, or workflow execution body inline

#### Scenario: No attention state stays explicit
- **WHEN** no attention items are available
- **THEN** the module shows a compact no-current-issues or no-evidence state
- **AND** it does not create synthetic problems just to fill the module

### Requirement: Project Overview SHALL keep Quick Actions routing-first
The system SHALL provide compact Quick Actions that route into existing pages and bounded workflow entry points without executing work on Overview.

#### Scenario: Quick action starts bounded workflow by route
- **WHEN** the user selects an existing session-backup, bulk-session-backup, migration-preview, project-bundle, import-backup, or validate-package quick action
- **THEN** the app routes to `Backup / Migration` with workflow handoff context
- **AND** the workflow selector and applicable workflow states remain inside `Backup / Migration`
- **AND** preview-only workflows do not gain confirmation or execution states from the Overview route

#### Scenario: Quick actions do not imply unsupported scope
- **WHEN** Quick Actions are rendered
- **THEN** no action implies runtime orchestration, cloud sync, migration apply, vendor-runtime restore, or privacy redaction

### Requirement: Project Overview SHALL support explicit page states
The system SHALL support loading, no-project-context, normal, and issue states for `Project Overview`.

#### Scenario: Loading preserves overview identity
- **WHEN** project summary data is loading
- **THEN** the page keeps the Project Overview shell visible
- **AND** it shows placeholder summary modules rather than switching to another page or a blank state

#### Scenario: No project context provides starting routes
- **WHEN** the project has no sessions and no reusable assets
- **THEN** the page shows a zero-state Context Snapshot and Quick Actions
- **AND** it routes users to `Sessions`, `Assets`, or `Backup / Migration` import/package workflows as appropriate

#### Scenario: Normal state shows fixed backbone
- **WHEN** project summary data is available and no high-priority issue dominates
- **THEN** the page shows the full module backbone with balanced summary and routing content
