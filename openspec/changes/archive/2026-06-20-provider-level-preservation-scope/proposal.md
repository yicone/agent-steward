## Why

The product's current IA is explicitly project-first: `Project Overview`,
`Sessions`, `Assets`, `Analysis`, and `Backup / Migration` are all defined as
project-scoped surfaces. That model has worked for the recent governance and
backup/migration lines, but two new tensions now need an explicit decision.

First, the shell still lacks a clear project switch / project identity flow even
though the IA already expects one. Second, a new real preservation need has
appeared that is not naturally session-scoped or repo-local-project-scoped:
provider-level backup or sync of broader user-owned context, including
non-session provider files and manually preserved provider directories.

This change is not an implementation slice. It is an exploration and IA
decision line whose purpose is to decide whether provider-level preservation
belongs inside the current product model, and if so, at what boundary.

## What Changes

- Clarify the current shipped object model and scope model:
  - `Project` as primary subject
  - `Session` as evidence object
  - `Asset` as reusable context object
  - `Backup package` as workflow output
  - `Provider` as source dimension rather than current primary governance scope
- Evaluate whether the new provider-level preservation/sync request is:
  - a shell/UX gap in project identity only
  - a new bounded preservation workflow family
  - a new top-level scope requiring dual project/provider governance
  - or an out-of-scope future line
- Decide whether `project-first` remains the default product model.
- Decide whether provider-level preservation can be added without turning
  `Backup / Migration` into a generic tools drawer.
- Separate the homepage project-switch / project-identity gap from the broader
  provider-scope question so they do not get conflated into one oversized change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None yet. This change exists to decide whether future capability changes should
be proposed, and where they belong if they are proposed.

## Decision Targets

This exploration must resolve the following:

1. Does the product remain `project-first` as its only default top-level scope?
2. Is provider-level preservation a legitimate in-product concern?
3. If yes, should it enter as:
   - a bounded workflow family under preservation/portability semantics, or
   - a broader IA/scope change?
4. Is the missing project-selection behavior merely an unimplemented shell gap,
   or evidence that the current scope model is incomplete?

## Non-Goals

- No implementation work.
- No PR, UI, or routing code changes.
- No automatic expansion of `Backup / Migration` into a generic utilities area.
- No assumption that provider-level scope is already accepted as a first-class
  product subject.
- No vendor-runtime restore, cloud sync, or generic filesystem backup promises.

## Impact

- Product and IA clarification only.
- Expected outputs are a bounded conclusion, a recommended follow-up shape, and
  a decision on whether the next step should be:
  - a small UX/IA hardening issue, or
  - a future implementation proposal for bounded provider-level preservation.
