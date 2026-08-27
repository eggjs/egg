---
title: Koa Override Package
type: package
summary: Method-override middleware used by Egg's default middleware stack.
source_files:
  - packages/koa-override/src/index.ts
  - packages/koa-override/package.json
  - packages/egg/src/app/middleware/override_method.ts
updated_at: 2026-08-27
status: active
---

# Koa Override Package

`@eggjs/koa-override` provides the method-override middleware used by Egg's
default `overrideMethod` middleware. It accepts `_method` from a parsed request
body before checking the `X-HTTP-Method-Override` header, validates the target
against Node.js HTTP methods, and only permits `POST` requests by default.

The package lives in the Egg monorepo so its TypeScript declarations, runtime
requirements, tests, and releases follow the Egg 4 toolchain. Egg consumes it
through a `workspace:*` dependency.
