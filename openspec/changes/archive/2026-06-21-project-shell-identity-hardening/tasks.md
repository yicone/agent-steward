## 1. Shell identity

- [x] 1.1 Wire a concrete active-project identity model into the shell.
- [x] 1.2 Render project display name, boundary cue, and evidence state from
  the active project instead of generic placeholders.
- [x] 1.3 Support zero / unavailable identity states without falling back to a
  session-first frame.

## 2. Project switch behavior

- [x] 2.1 Implement a bounded real project-switch entry in the shell.
- [x] 2.2 Back the switch with a bounded project list source and shell-owned
  active project state.
- [x] 2.3 On project switch, land on `Project Overview` and conservatively clear
  stale routed object/filter/workflow context.

## 3. Validation boundary

- [x] 3.1 Keep the change project-first only.
- [x] 3.2 Explicitly exclude provider-level preservation and dual-scope
  governance from this change.
- [x] 3.3 Run `openspec validate project-shell-identity-hardening --strict`.
