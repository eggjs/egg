---
title: CORS Plugin
type: package
summary: Egg plugin that applies @koa/cors with optional Security domain checks.
source_files:
  - plugins/cors/src/index.ts
  - plugins/cors/src/app.ts
  - plugins/cors/src/config/config.default.ts
updated_at: 2026-08-27
status: active
---

# CORS Plugin

`@eggjs/cors` installs `@koa/cors` at the front of Egg's core middleware list.
Applications can use the full upstream CORS option surface.

When an application does not configure `cors.origin`, the plugin consults the
optional Security plugin's `ctx.isSafeDomain()` check. If Security is not
enabled, it permits the request origin. A custom origin string or function
takes precedence and is recorded by `cors.hasCustomOriginHandler`.
