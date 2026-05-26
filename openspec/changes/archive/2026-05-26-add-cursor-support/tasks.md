## 1. Validate Cursor source facts

- [x] 1.1 Confirm the supported Cursor local storage/runtime facts for the initial macOS implementation target and record them in project docs.
- [x] 1.2 Decide the initial Cursor session retrieval contract (file-backed, runtime-backed, or hybrid) and document bounded fallback/diagnostic behavior.
- [x] 1.3 Define the initial allowlist of Cursor repo-local files that map into project evidence asset kinds.

## 2. Extend shared source abstractions

- [x] 2.1 Add `cursor` to shared source/config/status/label/filter types and helpers.
- [x] 2.2 Update Settings and other source-selection surfaces so Cursor roots can be added and managed.
- [x] 2.3 Update shared routing, deep-link, and source-status consumers so Cursor is treated as a first-class source.

## 3. Implement bounded Cursor session support

- [x] 3.1 Add a dedicated Cursor server adapter for root scanning, session lookup, and source-status diagnostics.
- [x] 3.2 Add Cursor parsing/normalization logic that converts supported Cursor session material into the existing viewer model.
- [x] 3.3 Wire Cursor sessions into list/detail/search/export flows with explicit unsupported diagnostics where parity is not available.

## 4. Implement Cursor asset support and validation

- [x] 4.1 Extend the project evidence provider and context asset source labels with allowlisted Cursor repo-local assets.
- [x] 4.2 Update Assets and Analysis state-derivation paths so Cursor-backed assets and findings route correctly.
- [x] 4.3 Add or update targeted Vitest coverage for Cursor scanning, parsing, provider classification, and shared source state derivation.
- [x] 4.4 Update README and storage/support docs to describe the supported Cursor behavior, constraints, and validation commands.
