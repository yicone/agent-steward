## Context

The current shell already exposes project-first top-level navigation, but its
identity frame is still too implicit. The shell header says what the product is,
not clearly which project the user is currently governing.

The IA already expected a `Global Project Switch / Project Identity` module, so
this change is best understood as shell completion rather than a new product
subject.

## Goals

- Make the active project boundary explicit in the shell.
- Let users intentionally switch project context.
- Preserve the meaning of `Project Overview` as the default landing page.
- Keep routed context safe when project context changes.

## Non-Goals

- No dual `project + provider` top-level governance.
- No provider-level preservation model.
- No redesign of `Sessions`, `Assets`, `Analysis`, or `Backup / Migration`.
- No implementation of a generic workspace manager.

## Implementation Constraints

- A real project switch in this change must be backed by a minimal shell-owned
  active-project model, not by page-local filters.
- The shell may use only a bounded project list source derived from shell-known
  local project roots already available to the app.
- Each switchable project must expose a canonical `project_key` derived from its
  normalized root identity. Project equality for switch and stale-context
  clearing is determined by `project_key`, not display name, source presence, or
  page-local data.
- This change may introduce minimal project identity helpers or shell context
  helpers, but it must not expand into generic project discovery or generic
  local workspace management.

## Decisions

### Decision 1: Treat project identity as shell state, not as a hidden page detail

The active project should be visible from the shell itself, not only inferred
from page contents or repo-local evidence blocks.

### Decision 2: Project switching is a bounded shell action

Project switching should be explicit and intentional. It is not equivalent to
changing a local filter inside `Sessions` or `Assets`.

The real switch action in this change should only switch among a bounded set of
known shell projects. It should not imply arbitrary directory picking,
cross-project sync, or generic workspace administration.

For this change, the bounded project list source is the shell's known local
project roots only. The implementation must not invent a separate derived
project registry, repository dedupe layer, or workspace manager contract.

### Decision 3: Project change invalidates stale routed context

When the active project changes, shell-owned routed context that no longer
matches the new project should be cleared or degraded explicitly instead of
being silently reused.

### Decision 4: This change does not widen the product subject

Even if project switching becomes more explicit, the default product subject
remains `Project`, not `Provider`, `Session`, or generic local storage.

### Decision 5: Active project state is shell-owned and drives page inputs

The active project should be owned by the shell and should drive project-scoped
inputs for `Project Overview`, `Sessions`, `Assets`, `Analysis`, and
`Backup / Migration`.

This does not require a provider-level state model. It only requires a bounded
project identity source and shell-level project selection.

The minimum active project state for this change is:

- `project_key`
- display name
- boundary cue
- root identity used to load project-scoped inputs
