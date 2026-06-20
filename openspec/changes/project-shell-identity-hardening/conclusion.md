## Acceptance Notes

This change is accepted only as a bounded shell-hardening line.

It does not widen the product subject beyond `Project`, and it does not bundle
provider-level preservation into the same scope.

## 1. Active Project Identity

The shell should expose a compact but explicit active-project cue.

Minimum required project identity fields:

- project display name
- project boundary cue
  - for example: repository root, configured workspace root, or equivalent
- project evidence state cue
  - enough to tell whether the shell is showing a resolved project context,
    loading context, or unavailable/empty context

Not required in the always-visible shell cue:

- full root inventory
- full source-health table
- workflow detail
- asset or session counts

Those remain page-level or expandable detail concerns.

Canonical project identity for this change:

- each switchable project must have a canonical `project_key`
- `project_key` is derived from the normalized root identity that defines the
  shell's project boundary for that project
- project equality for active selection, project switch, and stale-context
  clearing is determined by `project_key`
- display name or page-local evidence does not define project equality

## 2. Project Switch Behavior

Project switch is a shell-level context action.

It should behave as follows:

- switching project is explicit, not inferred from page-local filters
- switching project changes the shell-owned active project, not only local page
  state
- the post-switch landing target should be `Project Overview`
- the shell may preserve only compact shell-safe context that still makes sense
  for the new project

The real switch in this change may rely only on a bounded project list source,
derived from the shell's known local project roots already available to the
app. It must not expand into arbitrary directory picking, generic workspace
management, repository dedupe logic, or a separate derived project registry.

The switch action should not:

- reopen the previous project's selected session
- preserve a stale selected asset or finding by default
- continue an in-progress workflow automatically across projects

## 3. Routed Context Degradation Rules

When project context changes, routed context should degrade conservatively.

### Clear on project switch

These should clear by default when they belong to the old project:

- selected session
- selected asset
- selected finding
- backup / migration handoff
- page-local issue or return context

Belonging to the old project is determined by `project_key`. If the shell
cannot cheaply prove that routed context still matches the active `project_key`,
it should clear rather than guess.

### May persist only if still valid and project-agnostic

These may persist only if they remain meaningful after project change:

- top-level page selection if the destination page is still safe
- broad non-object filter preferences
- shell display preferences

If validity cannot be proved cheaply, the shell should clear rather than guess.

## 4. Zero / Unavailable Identity State

When project identity is not yet fully resolved, the shell should still remain
project-first.

Expected degraded states:

- loading project context
- no project context
- unavailable project identity

These states should not cause the shell to fall back to a session-first product
frame.

## 5. Minimal Implementation Contract

This change may introduce a minimal shell-owned active-project model and
bounded project identity helpers only as needed to support a real project
switch.

Expected bounded implementation pieces:

- canonical `project_key` as the shell-owned active project selection state
- concrete project display name and boundary cue derived from the active
  project
- bounded project list source for the switch UI, derived from shell-known local
  project roots
- project-scoped page inputs that refresh when the active project changes

## 6. Explicit Non-Goals

This change does not decide:

- provider-level preservation workflows
- provider-first or dual-scope navigation
- generic workspace management
- cross-project sync
- redesign of `Sessions`, `Assets`, `Analysis`, or `Backup / Migration`

## 7. Follow-Up Readiness

This proposal is ready to hand to an implementation/planning thread only for a
small shell-hardening slice that stays inside these notes.
