# Agent Work Continuity five-task validation

**Date:** 2026-09-20

**Runtime:** isolated production build at `http://127.0.0.1:3110`

**Project root:** temporary validation root
**Data roots:** temporary Work Item and Work Package directories; the retained ego-lite demo data was not used

The validation script `pnpm validate:continuity` created and organized five manual Work Items, ran handoff preflight, created a local package, and recorded a separate manual `confirmed` outcome for each package.

| Task class | Preflight | Package | Manual confirmation |
| --- | --- | --- | --- |
| bug-fix | `ready_with_warnings` | created | confirmed |
| feature | `ready_with_warnings` | created | confirmed |
| investigation | `ready_with_warnings` | created | confirmed |
| documentation | `ready_with_warnings` | created | confirmed |
| blocked | `ready_with_warnings` | created | confirmed |

Results: **5/5 packages created**, **5/5 handoffs manually confirmed**. Every package was warning-only because these representative tasks were manual Work Items without Session evidence. The warnings preserved the intended boundary: package generation does not claim verified continuation when no source Session is attached.

The validation also verified that the outcome records preserve package ID and canonical SHA-256, and that the Work Item retains the handoff history after the API round trip.

The same isolated service was then exercised with `targetProvider=cursor`; it returned HTTP 201, a canonical hash, and a provider-specific `cursor-handoff.md` path while keeping `sessionInjection: unsupported` in the projection contract.
