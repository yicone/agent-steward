## Summary

This change captures an IA decision, not a product implementation design.

The current evidence suggests that the product should remain project-first by
default, while provider-level preservation is treated as a separate candidate
preservation boundary that requires explicit acceptance before it changes the
top-level model.

## Current Model

The current model is:

- `Project` is the primary subject.
- `Sessions`, `Assets`, `Analysis`, and `Backup / Migration` are project
  sub-areas.
- `Provider` is currently a source label or bounded evidence dimension, not the
  main governance container.

This means the product currently assumes:

- overview and routing are project-scoped
- assets are explained in relation to the current project
- preservation workflows are entered from a project surface

## Problem Split

Two different issues must be separated:

### 1. Project identity gap

The IA already expects explicit project identity and project switching in the
page shell, but the current shipped shell still behaves more like a single
project surface.

This is a shell hardening problem unless stronger evidence proves otherwise.

### 2. Provider-level preservation request

The new request is not naturally equivalent to:

- single-session backup
- bulk session backup
- repo-local project assets
- current `project bundle`

It instead suggests a broader preservation unit centered on provider-owned user
context, which may include:

- multiple projects
- provider user files beyond session records
- manually preserved provider directories

That makes it a preservation-boundary question, not merely a bigger session
backup.

## Recommended Boundary

The default recommendation for follow-up is:

- keep the product's default IA project-first
- do not adopt provider as a new top-level peer to project yet
- allow future exploration of provider-level preservation only as a bounded
  preservation/portability workflow family if the product accepts that scope

This protects the current positioning:

- local-first
- project-first
- workflow-bounded

while still leaving room for a future provider-preservation line if the user
need proves durable and coherent.

## Decision Consequences

If project-first stays intact, then:

- `Project Overview` remains the default landing page
- `Sessions`, `Assets`, and `Analysis` remain project-subpages
- `Backup / Migration` may gain a new bounded family only if it preserves a
  clean preservation/portability mental model

If provider becomes a true top-level scope later, that should require a new
change because it would affect:

- shell identity
- navigation hierarchy
- routed context semantics
- project overview meaning
- bundle and preservation terminology
- low-fi and visual-direction assumptions
