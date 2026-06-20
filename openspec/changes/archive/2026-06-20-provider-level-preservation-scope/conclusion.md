## Conclusion

### Decision

`Agent Steward` should remain `project-first` as its default scope model.

The product should not yet expand from a single-layer `project` governance model
into a dual `project + provider` governance model.

Provider-level preservation is acknowledged as a real emerging need, but it is
not yet strong enough evidence to redefine the product's top-level subject.

### What We Clarified

The current effective object model is:

- `Project` as the primary product subject
- `Session` as an evidence object
- `Asset` as a reusable context object
- `Backup package` as a workflow output
- `Provider` as a source or preservation-boundary candidate, not the current
  default governance container

The current IA therefore still assumes that:

- `Project Overview` is the default landing surface
- `Sessions`, `Assets`, `Analysis`, and `Backup / Migration` are project
  sub-areas
- `Project Bundle` is a project-scoped preservation container, not a
  provider-scoped snapshot

### Tension Split

Two different issues must remain separate:

1. **Project identity / selection gap**
   - The IA already expects explicit project identity and project switching.
   - The current shell does not fully realize that expectation.
   - This is a shell / UX hardening problem first.

2. **Provider-level preservation request**
   - The new request is broader than session backup and broader than the current
     repo-local project evidence/provider model.
   - It suggests a new preservation boundary centered on provider-owned user
     context, including non-session files and manually preserved provider
     directories.
   - This is not equivalent to "make session backup bigger."

### Recommended Product Position

For now:

- keep the top-level model project-first
- do not introduce provider-first navigation or a second default overview
- do not reinterpret the missing project switch as proof that the whole scope
  model is wrong
- treat provider-level preservation as a **candidate bounded workflow family**
  only if a future change explicitly accepts that scope

### Follow-Up Boundary

The next concrete work should be split:

1. a small UX / IA hardening issue for explicit project identity and project
   switching in the shell
2. a separate future proposal only if we want to define a bounded
   provider-level preservation workflow family without converting
   `Backup / Migration` into a generic tools surface

### Explicit Non-Decision

This exploration does **not** conclude that provider-level scope is out of
scope forever.

It concludes only that:

- the current evidence supports `project-first` remaining the default
- provider-level preservation is a follow-up scope question, not an automatic
  IA rewrite
