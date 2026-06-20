## Why

The product already has a project-first shell and treats `Project Overview` as
the default landing surface, but the shell still does not make the active
project boundary explicit enough. Users cannot clearly answer which project is
currently active, nor can they treat project switching as a first-class shell
action.

Recent exploration in `provider-level-preservation-scope` concluded that this
is a shell / UX hardening gap first, not evidence that the whole product should
immediately move to dual `project + provider` governance. This change narrows
scope to the shell identity problem only.

## What Changes

- Define explicit project identity cues for the app shell.
- Add a bounded real project-switch entry / flow to the shell.
- Clarify what happens to routed page context when the active project changes.
- Define the minimum shell-owned active-project model and bounded project list
  source needed to support a real project switch.
- Define canonical project identity equality for switch and stale-context
  clearing.
- Keep the product subject project-first.
- Keep provider-level preservation, dual-scope governance, and broader
  preservation model changes out of scope.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-shell`: Adds explicit project identity and project-switch behavior to
  the existing project-first shell contract.

## Impact

- Shell/navigation behavior only.
- Expected affected implementation areas later would be:
  - `ProjectShellClient`
  - shell-owned active project state
  - bounded project list / project shell context helpers
  - shell-level route context handling
  - any project identity / root summary helpers used by the shell
- No backup schema, bundle schema, provider-preservation semantics, or
  top-level IA rewrite is intended in this change.
