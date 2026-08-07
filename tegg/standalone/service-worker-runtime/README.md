# @eggjs/service-worker-runtime

The protocol-independent event dispatcher used by
`@eggjs/service-worker`. Most applications should depend on
`@eggjs/service-worker` instead of this package directly.

This package provides:

- `ServiceWorkerRunner`, which dispatches each event by its `type`;
- `ContextProtoLoadUnitHook` and `ContextProtoProperty`, which make the current
  event injectable in request-scoped objects;
- `BackgroundTaskHelper`, which drains request-scoped background work during
  context destruction.

`ServiceWorkerRunner` expects the standalone host's module set to provide the
canonical PUBLIC `eggObjectFactory` from `@eggjs/dynamic-inject-runtime`; this
package does not provide a second private factory.

Protocol adapters register an `AbstractEventHandler` implementation with
`@EventHandlerProto('<type>')` and provide any required inner objects or
lifecycle hooks through their tegg module.
