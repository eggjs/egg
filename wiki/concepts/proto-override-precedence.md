---
title: Proto Override Precedence (@Override / @ConditionalOnMissing)
type: concept
summary: Deterministic override of a same-name proto in the tegg IoC container — a framework default that an application can replace, resolved by pruning the loser before instantiation.
source_files:
  - tegg/core/core-decorator/src/decorator/Override.ts
  - tegg/core/core-decorator/src/decorator/ConditionalOnMissing.ts
  - tegg/core/core-decorator/src/util/PrototypeUtil.ts
  - tegg/core/metadata/src/model/graph/GlobalGraph.ts
  - tegg/core/metadata/src/model/ProtoDescriptorHelper.ts
  - tegg/core/common-util/src/Graph.ts
  - tegg/core/metadata/test/GlobalGraph.test.ts
updated_at: 2026-07-14
status: active
---

# Proto Override Precedence

Two proto-level decorators let one proto deterministically override another that
shares the same name in the IoC container. This is the tegg answer to the common
"the framework provides a default, the application supplies its own" need — a
sensible default that steps aside cleanly when replaced.

Without them, two protos that survive qualifier disambiguation for the same name
throw `MultiPrototypeFound` (there is no silent last-wins). These decorators turn
that ambiguity into a deterministic winner.

## Decorators

- `@ConditionalOnMissing()` — marks a **conditional default**: used only when it
  is the sole candidate for its name; dropped when any other proto provides the
  same name.
- `@Override()` — marks an **explicit replacement**: it wins over a same-name
  plain proto or a `@ConditionalOnMissing` default.

They are standalone decorators placed next to the proto decorator; no options are
added to `@SingletonProto` / `@ContextProto` / `@InnerObjectProto`.

```ts
// framework default
@ConditionalOnMissing()
@SingletonProto({ name: 'fooService' })
class DefaultFooService {}

// application replacement — the default is pruned, never instantiated
@Override()
@SingletonProto({ name: 'fooService' })
class MyFooService {}
```

## Precedence

Within a group of genuinely-competing protos, the highest non-empty tier wins and
the lower tiers are pruned:

```
@Override   >   plain proto   >   @ConditionalOnMissing
```

- A plain proto overrides a same-name `@ConditionalOnMissing` default (the default
  yields to _any_ provider — you do not need `@Override` for that).
- `@Override` overrides a same-name plain or conditional proto.
- A sole `@ConditionalOnMissing` proto is used as-is.
- Two plain same-name protos (no marker) keep the existing behavior — resolution
  disambiguates by qualifier or throws `MultiPrototypeFound`. This guards against
  accidental override.
- A tie within the winning tier (e.g. two `@Override`) is left to normal
  resolution (qualifier disambiguation / `MultiPrototypeFound`).

## Non-instantiation, not select-at-injection

The loser is **pruned from the graph before instantiation**, not merely
deselected at injection time. `GlobalGraph.#pruneOverriddenProtos()` runs at the
top of `build()` — before any inject edge is built and before `sort()` schedules
instantiation — and removes the loser vertex from the proto graph and from its
module's proto list (`Graph.removeVertex`).

This matters because tegg eagerly instantiates scanned protos, and a proto's
`@LifecyclePostInject` can have side effects (registering into a factory, mounting
routes, …). A select-at-injection model would still instantiate the replaced
default and run those side effects. Pruning ensures a replaced default never runs
its constructor or lifecycle at all — matching `@ConditionalOnMissingBean`
(Spring Boot) / `OptionalBinder.setDefault` (Guice) semantics rather than Spring's
selection-only `@Primary`.

## What counts as "competing"

Override only applies among protos that would actually resolve to the same
injection — `GlobalGraph.#protoCompeteKey` groups by:

- same **name**, and
- same **init type** (a `SINGLETON` and a `CONTEXT` proto do not compete), and
- same **user qualifiers**, and
- an **access-level scope**: `PUBLIC` protos compete globally (override works
  across modules); `PRIVATE` protos are module-local, so two private same-name
  protos in different modules never compete.

Every real proto carries auto-added `LoadUnitName` (module) and `InitType`
qualifiers; these are excluded from the user-qualifier signature so a cross-module
`PUBLIC` override still groups with its default. Protos differing in user
qualifier, init type, or private-module boundary are never pruned against each
other.

Deliberate boundaries:

- An override should match the visibility of what it replaces — a `PUBLIC`
  `@Override` does not replace a `PRIVATE` default (different scope, not grouped).
- Two same-name protos in the same module with the same identity already collide
  as `duplicate proto`, so same-module override is not a scenario.

## Implementation surface

- Decorators + metadata: `PrototypeUtil.setOverride/isOverride`,
  `setConditionalOnMissing/isConditionalOnMissing`.
- Descriptor fields: `override?` / `conditionalOnMissing?` on `ProtoDescriptor`,
  threaded from the class in `ProtoDescriptorHelper.createByInstanceClazz`.
- Prune pass: `GlobalGraph.#pruneOverriddenProtos()` + `Graph.removeVertex()`.

`@Primary` / `@Fallback` (a select-among-coexisting-candidates model, where losers
still instantiate) are intentionally **not** implemented — that need is already
served by qualifiers, and can be added later as a separate tier without changing
these semantics.
