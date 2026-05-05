---
title: Onerror Plugin
type: package
summary: Default Egg error-handling plugin and configurable response negotiation layer.
source_files:
  - plugins/onerror/README.md
  - plugins/onerror/src/app.ts
  - plugins/onerror/src/lib/onerror.ts
  - plugins/onerror/src/lib/error_view.ts
  - plugins/onerror/src/config/config.default.ts
updated_at: 2026-05-06
status: active
---

# Onerror Plugin

`@eggjs/onerror` is the default Egg error-handling plugin. It installs
`ctx.onerror` and supports configurable handlers for HTML, text, JSON, JSONP,
redirect, and catch-all error responses.

## Public Configuration

- `errorPageUrl` redirects production HTML requests after unexpected errors.
- `accepts` customizes content negotiation.
- `all`, `html`, `text`, `json`, and `jsonp` customize response handling for
  specific response types.
- `appErrorFilter` can suppress logging for selected errors.

## Current Behavior

The plugin owns its Koa-style `onerror()` implementation in
`plugins/onerror/src/lib/onerror.ts` instead of importing it from
`koa-onerror`. This keeps the response behavior local to the plugin and avoids
reading `koa-onerror` package templates when the plugin app boot hook is
imported, which is important for static bundling.

Default HTML error-page rendering still flows through `ErrorView` and the
plugin's local default template. Applications can continue to provide custom
templates and handlers through the documented `config.onerror` options.
