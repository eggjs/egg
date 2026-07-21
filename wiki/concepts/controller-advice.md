---
title: Controller Advice
type: concept
summary: Executes dependency-injected Advice at the bound controller invocation while preserving the existing AbstractControllerAdvice contract.
source_files:
  - tegg/core/controller-decorator/src/decorator/Middleware.ts
  - tegg/core/controller-decorator/src/model/AbstractControllerAdvice.ts
  - tegg/core/controller-runtime/src/lib/ControllerAdvice.ts
  - tegg/core/controller-runtime/src/lib/impl/http/HTTPMethodRegister.ts
  - tegg/core/controller-runtime/src/lib/impl/mcp/MCPServerHelper.ts
updated_at: 2026-07-21
status: active
---

# Controller Advice

`@Middleware(AdviceClass)` remains the declaration form for dependency-injected
controller middleware. `@Middleware` recognizes Advice classes through the
shared `IS_ADVICE` metadata key in `@eggjs/tegg-types`, so controller packages do
not depend on the AOP decorator or runtime packages.

At the actual controller invocation point, the controller runtime resolves every
Advice class recorded by `@Middleware`. Ordinary Advice classes contribute only
their `around(adviceContext, next)` hook; an Advice without `around()` immediately
advances to the next middleware. Method-level Advice wraps controller-level
Advice, matching the nesting order of the historical Pointcut conversion.

`AbstractControllerAdvice.around()` directly forwards to
`middleware(hostContext, next, adviceContext)`. The host context comes from the
invocation context, so this preserves the existing middleware contract without
an event-to-context global map. The controller runtime does not special-case the
base class: every Advice is executed through `around()`.

The invocation context includes the host request context, real controller
object, method name, and bound arguments. For HTTP controllers, the terminal
invocation writes the method return value to the host response before `next()`
unwinds, so Advice can observe or replace `ctx.body` or `ctx.response`. MCP
method-level Advice wraps the SDK callback and receives its bound arguments. The
service-worker host keeps controller-level Advice outside the transport dispatch,
preserving the legacy contract in which code after `next()` can observe or replace
the streaming `ctx.response`. Explicit `@Pointcut` declarations remain on the
independent AOP path.
