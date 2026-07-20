# @eggjs/service-worker-runtime

The protocol-independent event dispatcher used by
`@eggjs/service-worker`. Most applications should depend on
`@eggjs/service-worker` instead of this package directly.

This package provides:

- `ServiceWorkerRunner`, which dispatches each event by its `type`;
- `ContextProtoLoadUnitHook` and `ContextProtoProperty`, which make the current
  event injectable in request-scoped objects;
- `StandaloneEggObjectFactory`, which resolves the matching event handler;
- `BackgroundTaskHelper`, which drains request-scoped background work during
  context destruction.

Protocol adapters register an `AbstractEventHandler` implementation with
`@EventHandlerProto('<type>')` and provide any required inner objects or
lifecycle hooks through their tegg module.
