## 1. Canonical Session Record

- [x] 1.1 Inventory current normalized session and trajectory data paths used by Antigravity, Windsurf, and Codex.
- [x] 1.2 Define the minimal `Session Record` v1 field set and schema-version rules.
- [x] 1.3 Identify which existing types can be reused and which require new canonical record types.
- [x] 1.4 Document record-to-view separation so `Transcript` and other views remain derived projections.
- [x] 1.5 Add a canonical `SessionRecord` mapper that converts normalized trajectory content into `session-record/v1`.
- [x] 1.6 Add tests that verify record mapping for at least one supported source and one minimal empty-session case.

## 2. Backup Package Semantics

- [x] 2.1 Define the v1 session backup package structure, required metadata, and integrity/provenance fields.
- [x] 2.2 Define the default backup flow around canonical records only.
- [x] 2.3 Define the advanced opt-in `Source Backup` flow as copy-only and read-only with respect to upstream sources.
- [x] 2.4 Define v1 import/restore semantics as recovery into product-readable state only.
- [x] 2.5 Add manifest and record serializers/parsers for `session-backup/v1` and `session-record/v1`.
- [x] 2.6 Add validators that reject unsupported schema versions, malformed manifests, and record-count mismatches.

## 3. Product Surface And Safety

- [x] 3.1 Define product terminology and UI entry points for `Back Up Session`, `Import Backup`, and advanced source-preservation controls.
- [x] 3.2 Define safety constraints that forbid source mutation during backup and import flows.
- [x] 3.3 Define user-facing diagnostics for unsupported schema versions, invalid packages, and source-preservation risks.
- [x] 3.4 Add server-side backup storage services that write only into a product-managed backup root.
- [x] 3.5 Add import services that validate backup packages before materializing product-readable session state.
- [x] 3.6 Add API routes for create/import/verify flows after storage services and validators are in place.

## 4. Project Bundle Alignment

- [x] 4.1 Define how the session backup package can serve as a future `Project Bundle` session sub-format.
- [x] 4.2 Capture open questions that remain out of scope for v1, including third-party runtime restore and cross-tool round-trip guarantees.
- [x] 4.3 Keep research and design docs aligned with the finalized schema names `session-record/v1` and `session-backup/v1` when implementation starts.
