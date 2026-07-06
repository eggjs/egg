# @eggjs/service-worker-runtime

The protocol-agnostic half of the standalone service worker: an event-driven
runner on top of `@eggjs/standalone` that dispatches incoming events to
handlers by `event.type`.

Protocol packages (e.g. `@eggjs/service-worker` for fetch/HTTP/MCP) build on
this by contributing:

- an event handler: a class extending `AbstractEventHandler`, registered with
  `@EventHandlerProto('<event type>')`;
- whatever inner objects / lifecycle hooks their protocol needs, declared with
  the module plugin decorators (`@InnerObjectProto`, `@LoadUnitLifecycleProto`,
  …).

What this package provides:

- `ServiceWorkerRunner` — the `@Runner()` entry: resolves the handler for
  `event.type` and dispatches.
- `ContextProtoLoadUnitHook` / `ContextProtoProperty` — injects the current
  event into ContextProto objects (`@Inject() event`).
- `StandaloneEggObjectFactory` — qualifier-based handler resolution.
- `BackgroundTaskHelper` (re-exported from `@eggjs/background-task`) —
  request-scoped background tasks drained at ctx destroy. The host must
  provide `logger` and `config` inner objects (`ServiceWorkerApp` does).

Most applications should depend on `@eggjs/service-worker` instead; this
package is the extension surface for new event protocols.
