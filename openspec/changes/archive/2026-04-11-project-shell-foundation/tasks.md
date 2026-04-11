## 1. Shell Structure

- [x] 1.1 Add a project-first shell component with top-level navigation labels for `Project Overview`, `Sessions`, `Assets`, `Analysis`, and `Backup / Migration`.
- [x] 1.2 Add page-selection state or routing glue for switching between the foundation surfaces without removing the existing viewer behavior.
- [x] 1.3 Update the root page to render the shell scaffold instead of exposing the raw session viewer as the whole product.

## 2. Sessions Containment

- [x] 2.1 Move or wrap the existing `HomeClient` viewer behavior under the `Sessions` surface.
- [x] 2.2 Preserve source selection, session list, compact/transcript/trajectory views, inspector, error center, diagnostics export, and session backup action in `Sessions`.
- [x] 2.3 Preserve global search selection so selecting a session result reveals `Sessions` and loads the selected session.

## 3. Foundation Surfaces

- [x] 3.1 Add a minimal `Project Overview` foundation surface that communicates project-first role without fake full analysis or inventory data.
- [x] 3.2 Add bounded placeholder surfaces for `Assets`, `Analysis`, and `Backup / Migration`.
- [x] 3.3 Ensure placeholders communicate intended role and do not replace current working session backup or diagnostics behavior.

## 4. Compatibility

- [x] 4.1 Preserve existing session URL deep-link restoration for source, session id, root id, view, filters, expanded groups, selected row, inspector, and include-cleared state.
- [x] 4.2 Preserve URL sync for session viewer interactions after the shell scaffold is introduced.
- [x] 4.3 Preserve source diagnostics visibility and copyable diagnostics evidence.
- [x] 4.4 Preserve direct session backup behavior, including source-copy opt-in where supported.

## 5. Styling Boundary

- [x] 5.1 Add shell-foundation styles additively using roles from `docs/design-system-baseline.md`.
- [x] 5.2 Keep existing transcript, trajectory, inspector, and diagnostic content readable and usable.
- [x] 5.3 Avoid broad global CSS replacement or complete visual redesign in this change.

## 6. Tests And Validation

- [x] 6.1 Add or update targeted tests for shell navigation and `Sessions` containment.
- [x] 6.2 Add or update targeted tests for preserving global search session selection through the shell.
- [x] 6.3 Add or update targeted tests for URL restoration and URL sync compatibility.
- [x] 6.4 Run targeted tests for affected UI and URL-state behavior.
- [x] 6.5 Run `openspec validate project-shell-foundation --strict`.
