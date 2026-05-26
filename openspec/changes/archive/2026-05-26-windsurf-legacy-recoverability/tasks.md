# Windsurf Legacy Recoverability Tasks

## 1. Recoverability model and diagnostics

- [x] 1.1 Add a bounded Windsurf recoverability model for LS-readable, partial, and unavailable session states.
- [x] 1.2 Extend Windsurf diagnostic export to include recoverability evidence such as local `.pb` presence, LS `trajectory not found`, and bounded brain sidecar metadata.
- [x] 1.3 Update Windsurf error mapping so trajectory absence is reported as data unavailability rather than a generic transport failure.

## 2. Windsurf attach/token compatibility

- [x] 2.1 Refine Windsurf token-source detection to recognize live process-environment sourcing in addition to historical command-line args and Settings override.
- [x] 2.2 Update Windsurf source status messaging and diagnostics guidance to reflect version-aware token sourcing and separate token failures from trajectory absence.
- [x] 2.3 Add or update targeted tests for Windsurf token-source classification and trajectory-not-found diagnostics.

## 3. Sessions and workflow UX

- [x] 3.1 Update the Sessions viewer to show recoverability-aware messaging and bounded next steps for unreadable Windsurf legacy sessions.
- [x] 3.2 Route compact recoverability context from Sessions into Backup / Migration without implying transcript availability or vendor-runtime restoration.
- [x] 3.3 Validate Backup / Migration behavior for unreadable and partially recoverable Windsurf sessions, including blocking canonical backup when readable content is unavailable.

## 4. Documentation and validation

- [x] 4.1 Update `docs/storage/local-storage-notes.md` with version-scoped Windsurf token findings and legacy `trajectory not found` recovery evidence.
- [x] 4.2 Update any relevant viewer or backup workflow documentation to explain recoverability semantics and bounded recovery claims.
- [x] 4.3 Run targeted validation for the touched Windsurf diagnostics, session viewer, and backup workflow paths.
